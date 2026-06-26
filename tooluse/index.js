/**
 * CLI Entry Point — Tool Use Assistant
 * 
 * Usage:
 *   node index.js
 *   node index.js "Retrieve Bob and calculate cost for 35 hours"
 */

import { runAgent } from "./agent.js";

async function main() {
  const args = process.argv.slice(2);
  
  // Default query that triggers multiple tools sequentially
  let query = "Find Bob Jones in the database and calculate his total cost for 35 hours of design work.";
  
  if (args.length > 0) {
    query = args.join(" ");
  }

  await runAgent(query);
}

main().catch((err) => {
  console.error("❌ Agent execution failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
