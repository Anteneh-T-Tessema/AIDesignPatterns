/**
 * Tool Definitions — Node.js & Ollama
 * =====================================
 * 
 * Defines the schemas and local JS implementations for all available agent tools.
 * Separating this from the agent runner makes the system modular, standardized,
 * and easy to extend.
 */

// ─── 1. Tool Schemas (JSON schemas passed to Llama) ───────────────────────────

export const tools = [
  {
    type: "function",
    function: {
      name: "search_user_database",
      description: "Queries the corporate database for a user's role and hourly rate. Use this whenever user payment/costs or roles are requested.",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "The username to search for (e.g. 'alice', 'bob', 'charlie'). case-insensitive."
          }
        },
        required: ["username"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_invoice",
      description: "Calculates the total invoice amount by multiplying hours worked by the hourly rate.",
      parameters: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "The total hours worked."
          },
          rate: {
            type: "number",
            description: "The hourly rate."
          }
        },
        required: ["hours", "rate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Retrieves the current system date and time in a human-readable format.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// ─── 2. Tool Implementations (Local JavaScript execution) ──────────────────────

export const toolImpls = {
  search_user_database: ({ username }) => {
    const userKey = username.toLowerCase().trim();
    console.log(`   ⚙️  [Local Tool] Querying database for user: "${userKey}"`);
    
    const db = {
      alice: { id: 1, name: "Alice Smith", role: "Lead Developer", rate: 75 },
      bob: { id: 2, name: "Bob Jones", role: "UI Designer", rate: 60 },
      charlie: { id: 3, name: "Charlie Brown", role: "Project Manager", rate: 90 }
    };

    if (db[userKey]) {
      return JSON.stringify({ status: "success", user: db[userKey] });
    }
    return JSON.stringify({ status: "error", message: `User "${username}" not found.` });
  },

  calculate_invoice: ({ hours, rate }) => {
    console.log(`   ⚙️  [Local Tool] Calculating invoice: ${hours} hours @ $${rate}/hr`);
    const total = hours * rate;
    return JSON.stringify({ status: "success", hours, rate, total: total.toFixed(2) });
  },

  get_current_time: () => {
    console.log(`   ⚙️  [Local Tool] Fetching system time`);
    return JSON.stringify({ status: "success", time: new Date().toLocaleString() });
  }
};
