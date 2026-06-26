/**
 * CLI Entry Point — Exploration & Discovery Co-Scientist
 * =======================================================
 * 
 * Usage:
 *   npm start                              # Runs on the default research topic
 *   node index.js "Your topic here"        # Runs on a custom research topic
 *   node index.js "Your topic" --save      # Saves final report to reports/
 */

import fs from "fs";
import path from "path";
import { runResearchLab } from "./research-lab.js";

const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

const DEFAULT_TOPIC = "Next-generation solid-state battery electrolytes that enable full charge in under 5 minutes";

async function main() {
  const args = process.argv.slice(2);
  const saveIdx = args.indexOf("--save");
  const shouldSave = saveIdx !== -1;
  if (shouldSave) args.splice(saveIdx, 1);

  const topic = args.length > 0 ? args.join(" ") : DEFAULT_TOPIC;

  const { report, evolved, hypotheses, ranking } = await runResearchLab(topic);

  // ── Print Final Report ──────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────────┐");
  console.log("│  📄 Final Academic Exploration Report                          │");
  console.log("└─────────────────────────────────────────────────────────────────┘\n");
  console.log(report);

  // ── Save Report ────────────────────────────────────────────────────────────
  if (shouldSave) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const reportName = `exploration-${slug}_${timestamp}.md`;
    const reportPath = path.join(REPORTS_DIR, reportName);

    fs.writeFileSync(reportPath, report, "utf-8");
    console.log(`\n📝 Report saved to:`);
    console.log(`   [${reportName}](file://${reportPath})\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:", err.message);
  console.error(
    "💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
