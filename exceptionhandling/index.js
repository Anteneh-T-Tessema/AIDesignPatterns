/**
 * CLI Entry Point — Exception Handling & Recovery Pattern
 * ========================================================
 * 
 * Usage:
 *   node index.js                       → Runs all 4 scenarios sequentially
 *   node index.js --scenario retry      → Runs Scenario 1: Transient tax server errors (Retries)
 *   node index.js --scenario fallback   → Runs Scenario 2: Primary DB outage (Fallback to backup DB)
 *   node index.js --scenario correction → Runs Scenario 3: Formatting validation error (Self-Correction)
 *   node index.js --scenario escalate   → Runs Scenario 4: Fraud limit exception (Rollback & Escalation)
 *   node index.js --all                 → Runs all scenarios
 */

import { runResilientAgent } from "./resilient-agent.js";

const SCENARIOS = {
  retry: {
    title: "Scenario 1: Transient API Failures (Automatic Retries)",
    query: "Please calculate the tax rate for the zip code 90210. Do not do anything else.",
    description: "The tax API fails on the first two attempts with a 503 error, but succeeds on the third. The agent should retry and complete successfully."
  },
  fallback: {
    title: "Scenario 2: Primary System Down (Fallback Database)",
    query: "Retrieve the record for customer CUST-101 and display their name and balance.",
    description: "The primary database is completely down (returns 500). The agent should detect the failure, switch to the backup database, and successfully retrieve the profile."
  },
  correction: {
    title: "Scenario 3: Input Validation Mismatch (LLM Self-Correction)",
    query: "Retrieve the record for CUST-101, then charge their account the amount of '$150.00'. Make sure you pass the exact text '$150.00' first to the tool.",
    description: "The billing system requires a numeric float. When the agent passes '$150.00' as a string, the tool rejects it. The agent will read the error, strip the '$', and try again with the float 150.00."
  },
  escalate: {
    title: "Scenario 4: Policy Violation / Fraud Trigger (Rollback & Escalation)",
    query: "Retrieve the record for customer CUST-999. If their account exists, charge their account the amount of 4500.00.",
    description: "Customer CUST-999 has a low risk threshold of $1,000. Charging $4,500 triggers a FRAUD_LIMIT_EXCEEDED business validation failure. The agent rolls back the database operation, aborts, and saves an escalation incident report to the reports/ directory."
  }
};

async function executeScenario(key) {
  const scenario = SCENARIOS[key];
  if (!scenario) {
    console.error(`❌ Unknown scenario: ${key}`);
    process.exit(1);
  }

  console.log("\n================================================================================");
  console.log(`🚀 RUNNING: ${scenario.title}`);
  console.log(`📖 Description: ${scenario.description}`);
  console.log("================================================================================");

  try {
    const result = await runResilientAgent(scenario.query);
    console.log(`📊 Result Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED (EXPECTED)"}`);
  } catch (err) {
    console.error(`❌ Scenario execution crashed:`, err.message);
  }
  console.log("================================================================================\n");
}

async function main() {
  const args = process.argv.slice(2);
  const scenarioIndex = args.indexOf("--scenario");
  const runAll = args.includes("--all");

  if (scenarioIndex !== -1 && args[scenarioIndex + 1]) {
    const key = args[scenarioIndex + 1].toLowerCase();
    await executeScenario(key);
    return;
  }

  if (runAll || args.length === 0) {
    console.log("================================================================================");
    console.log("🌟 RUNNING ALL RESILIENCE AND RECOVERY SCENARIOS 🌟");
    console.log("================================================================================");

    for (const key of Object.keys(SCENARIOS)) {
      await executeScenario(key);
      console.log("\nPress Enter/Wait for next scenario...\n");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("🎉 All scenarios completed.");
  } else {
    console.log("Usage:");
    console.log("  node index.js                       -> Run all scenarios");
    console.log("  node index.js --scenario <name>     -> Run a specific scenario (retry, fallback, correction, escalate)");
    console.log("  node index.js --all                 -> Run all scenarios");
  }
}

main().catch(err => {
  console.error("❌ Application entry point error:", err);
  process.exit(1);
});
