/**
 * CLI Entry Point — Prioritization Agent Runner
 * ==============================================
 * 
 * Usage:
 *   npm start                         # Runs the default multi-scenario simulation
 *   node index.js "Your custom task"  # Runs the agent on a custom task request
 */

import { runAgent, taskManager } from "./agent.js";

async function main() {
  const args = process.argv.slice(2);

  console.log("=============================================================");
  console.log("  📋  PRIORITIZATION PATTERN — Project Manager Agent");
  console.log("=============================================================\n");

  if (args.length > 0) {
    // Custom user query
    const customQuery = args.join(" ");
    console.log("🚀 Running agent on custom request...\n");
    await runAgent(customQuery);
    
    console.log("📋 Final Task Board State:");
    console.log(taskManager.listAllTasks());
    console.log("\n=============================================================\n");
  } else {
    // Multi-scenario simulation mode
    console.log("🏁 Running default Project Manager simulation...\n");

    // Scenario 1: Urgent task with explicit assignee
    console.log("📍 [Scenario 1] Urgent feature request with assignee");
    console.log("-------------------------------------------------------------");
    await runAgent(
      "Create a task to implement a new login system. It's urgent and should be assigned to Worker B."
    );

    console.log("\n");

    // Scenario 2: Less urgent task with no priority or assignee (should use defaults)
    console.log("📍 [Scenario 2] Content task without priority or assignee details");
    console.log("-------------------------------------------------------------");
    await runAgent(
      "Manage a new task: Review marketing website content."
    );

    console.log("\n🏁 Simulation Complete!");
    console.log("📋 Final Task Board State:");
    console.log(taskManager.listAllTasks());
    console.log("\n=============================================================\n");
  }
}

main().catch((err) => {
  console.error("❌ Execution failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
