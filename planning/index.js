/**
 * CLI Entry Point — Planning Agent Runner
 * 
 * Usage:
 *   node index.js
 *   node index.js "The importance of Reinforcement Learning in AI" --save
 */

import fs from "fs";
import path from "path";
import { runPlanningPipeline } from "./planner.js";

const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

async function main() {
  const args = process.argv.slice(2);
  const saveIndex = args.indexOf("--save");
  const shouldSave = saveIndex !== -1;

  if (shouldSave) {
    args.splice(saveIndex, 1);
  }

  // Default topic if none provided (as seen in Chapter 6 example)
  let topic = "The importance of Reinforcement Learning in AI";
  if (args.length > 0) {
    topic = args.join(" ");
  }

  // Run the planning pipeline
  const result = await runPlanningPipeline(topic);

  // ── Show Final Document ────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  🚀 Final Compiled Document                             │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(result.finalDocument);
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Save Document ──────────────────────────────────────────────────────
  if (shouldSave) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const fileName = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const reportName = `plan-${fileName}_${timestamp}.md`;
    const reportPath = path.join(REPORTS_DIR, reportName);

    fs.writeFileSync(reportPath, result.finalDocument, "utf-8");
    console.log(`📝 Saved compiled document to:`);
    console.log(`   [${reportName}](file://${reportPath})\n`);
  }
}

main().catch((err) => {
  console.error("❌ Planning failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
