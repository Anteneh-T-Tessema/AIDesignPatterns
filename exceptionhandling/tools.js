/**
 * Tool Definitions — Exception Handling and Recovery
 * ==================================================
 * 
 * Defines schemas and implementations for the resilient billing system.
 * These tools simulate:
 *   - Database outages (primary always down)
 *   - Transient connection errors (fails twice, succeeds on third)
 *   - Schema/formatting constraints (requires numeric input, rejects strings)
 *   - Business limit violations (requires rollback & escalation)
 *   - Compensating actions (rollback mechanism)
 */

// Global counters to simulate transient failures
let taxQueryAttempts = 0;
const customerDb = {
  "CUST-101": { id: "CUST-101", name: "Sarah Connor", status: "active", balance: 2500.00, allowedLimit: 5000.00 },
  "CUST-999": { id: "CUST-999", name: "John Doe", status: "flagged", balance: 12000.00, allowedLimit: 1000.00 } // Low limit to trigger fraud rejection
};

// ─── 1. Tool Schemas (Passed to Ollama) ───────────────────────────────────────

export const tools = [
  {
    type: "function",
    function: {
      name: "get_customer_record_primary",
      description: "Retrieves the user account record (balance, status, limit) from the primary high-speed database. Use this first.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The unique customer ID (e.g., 'CUST-101')"
          }
        },
        required: ["customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_record_backup",
      description: "Retrieves the user account record from the slower fallback database. Use ONLY if the primary database is unavailable.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The unique customer ID (e.g., 'CUST-101')"
          }
        },
        required: ["customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_tax_rate",
      description: "Calculates the tax rate for a specific zip code based on state regulation.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "A 5-digit US zip code (e.g. '90210')"
          }
        },
        required: ["zipCode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "charge_account",
      description: "Charges the specified dollar amount to the customer's balance. Requires a verified customerId and a numeric amount.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The unique customer ID"
          },
          amount: {
            type: "number",
            description: "The raw positive floating-point dollar amount to charge (do NOT send currency symbols, units, or strings like '$100.00')."
          }
        },
        required: ["customerId", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "release_held_funds",
      description: "Reverses a previously authorized or failed charge, releasing the funds back to the user account (compensating rollback action).",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The unique customer ID"
          },
          amount: {
            type: "number",
            description: "The floating-point dollar amount to release"
          }
        },
        required: ["customerId", "amount"]
      }
    }
  }
];

// ─── 2. Tool Implementations (Local JavaScript execution) ──────────────────────

export const toolImpls = {
  get_customer_record_primary: ({ customerId }) => {
    console.log(`   ⚙️  [Local Tool] get_customer_record_primary for "${customerId}"`);
    // Simulates an outage of the primary DB
    throw new Error("500 Internal Server Error: Database cluster 'primary-db-01' is unreachable.");
  },

  get_customer_record_backup: ({ customerId }) => {
    console.log(`   ⚙️  [Local Tool] get_customer_record_backup for "${customerId}"`);
    const record = customerDb[customerId];
    if (record) {
      return JSON.stringify({ status: "success", source: "backup_db", record });
    }
    return JSON.stringify({ status: "error", code: "CUSTOMER_NOT_FOUND", message: `Customer "${customerId}" not found in backup system.` });
  },

  calculate_tax_rate: ({ zipCode }) => {
    taxQueryAttempts++;
    console.log(`   ⚙️  [Local Tool] calculate_tax_rate for zip "${zipCode}" (Attempt #${taxQueryAttempts})`);
    
    // Simulate transient error for first two attempts
    if (taxQueryAttempts <= 2) {
      throw new Error("503 Service Unavailable: Timeout connecting to state tax server.");
    }

    const rate = zipCode === "90210" ? 0.09 : 0.08;
    return JSON.stringify({ status: "success", zipCode, taxRate: rate });
  },

  charge_account: ({ customerId, amount }) => {
    console.log(`   ⚙️  [Local Tool] charge_account for customer "${customerId}", amount: ${JSON.stringify(amount)}`);

    let parsedAmount = amount;
    if (typeof amount === "string") {
      // Check if the string has non-numeric characters (except a leading minus or a single decimal dot)
      if (/[^\d.]/.test(amount.trim().replace(/^-/, ''))) {
        console.log(`   ⚠️  [Local Tool] Format Validation Failed: amount string "${amount}" contains non-numeric characters.`);
        return JSON.stringify({
          status: "error",
          code: "INVALID_AMOUNT_FORMAT",
          message: `Validation failed: The 'amount' parameter must be a raw number/float. Received: ${JSON.stringify(amount)}. Please strip currency symbols (e.g. '$') and provide it strictly as a float.`
        });
      }
      parsedAmount = parseFloat(amount);
    }

    if (typeof parsedAmount !== "number" || isNaN(parsedAmount)) {
      console.log(`   ⚠️  [Local Tool] Format Validation Failed: amount is of type '${typeof amount}' instead of number.`);
      return JSON.stringify({
        status: "error",
        code: "INVALID_AMOUNT_FORMAT",
        message: `Validation failed: The 'amount' parameter must be a raw number/float. Received: ${JSON.stringify(amount)}.`
      });
    }

    if (parsedAmount <= 0) {
      return JSON.stringify({
        status: "error",
        code: "INVALID_AMOUNT_VALUE",
        message: "Validation failed: 'amount' must be greater than zero."
      });
    }

    const record = customerDb[customerId];
    if (!record) {
      return JSON.stringify({ status: "error", code: "CUSTOMER_NOT_FOUND", message: `Customer "${customerId}" does not exist.` });
    }

    // Business Logic / Fraud Policy Check
    if (parsedAmount > record.allowedLimit) {
      console.log(`   ⚠️  [Local Tool] Fraud Prevention Triggered: Charge of $${parsedAmount} exceeds limit of $${record.allowedLimit}`);
      return JSON.stringify({
        status: "error",
        code: "FRAUD_LIMIT_EXCEEDED",
        message: `Transaction blocked: The requested charge of $${parsedAmount} exceeds the allowed risk limit of $${record.allowedLimit} for customer "${customerId}".`
      });
    }

    // Transaction execution success
    record.balance -= parsedAmount;
    return JSON.stringify({
      status: "success",
      transactionId: "TX-" + Math.floor(100000 + Math.random() * 900000),
      customerId,
      chargedAmount: parsedAmount,
      newBalance: record.balance
    });
  },

  release_held_funds: ({ customerId, amount }) => {
    console.log(`   ⚙️  [Compensating action] release_held_funds for customer "${customerId}", amount: $${amount}`);
    const record = customerDb[customerId];
    if (record) {
      record.balance += amount;
      return JSON.stringify({ status: "success", action: "funds_released", newBalance: record.balance });
    }
    return JSON.stringify({ status: "error", message: `Customer "${customerId}" not found for releasing funds.` });
  },

  // Helper function to reset transient error state for testing
  resetState: () => {
    taxQueryAttempts = 0;
  }
};
