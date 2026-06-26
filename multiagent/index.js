/**
 * CLI Entry Point — Multi-Agent Collaboration Runner
 * 
 * Usage:
 *   node index.js
 *   node index.js "Emerging trends in clean energy technologies" --save
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runCollaborationPipeline } from "./agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, "reports");

async function main() {
  const args = process.argv.slice(2);
  const saveIndex = args.indexOf("--save");
  const shouldSave = saveIndex !== -1;

  if (shouldSave) {
    args.splice(saveIndex, 1);
  }

  // Default topic if none provided
  let topic = "Emerging trends in clean energy technologies";
  if (args.length > 0) {
    topic = args.join(" ");
  }

  // Run the multi-agent collaboration pipeline
  const result = await runCollaborationPipeline(topic);

  // ── Show Final Document ────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  🚀 Final Compiled Collaborative Report                  │");
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
    const reportName = `collab-${fileName}_${timestamp}.md`;
    const reportPath = path.join(REPORTS_DIR, reportName);

    fs.writeFileSync(reportPath, result.finalDocument, "utf-8");
    console.log(`📝 Saved compiled report to:`);
    console.log(`   [${reportName}](file://${reportPath})\n`);
  }
}

main().catch((err) => {
  console.error("❌ Collaboration failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
