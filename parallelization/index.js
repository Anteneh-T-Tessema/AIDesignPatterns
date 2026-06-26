/**
 * CLI Entry Point — Parallel Code Auditor Suite
 * 
 * Usage:
 *   node index.js                              → lists sample files, runs the first
 *   node index.js samples/user-service.js       → audits a specific file
 *   node index.js samples/user-service.js --save → audits a file and saves markdown report
 */

import fs from "fs";
import path from "path";
import { runParallelAudit } from "./auditor.js";

const SAMPLES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "samples");
const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

async function main() {
  const args = process.argv.slice(2);
  const saveIndex = args.indexOf("--save");
  const shouldSave = saveIndex !== -1;
  
  // Remove --save from args to find target file
  if (shouldSave) {
    args.splice(saveIndex, 1);
  }

  const fileArg = args.find((a) => !a.startsWith("--"));

  let code;
  let fileName;
  let fileAbsolutePath;

  if (fileArg) {
    fileAbsolutePath = path.resolve(fileArg);
    if (!fs.existsSync(fileAbsolutePath)) {
      console.error(`❌ File not found: ${fileAbsolutePath}`);
      process.exit(1);
    }
    code = fs.readFileSync(fileAbsolutePath, "utf-8");
    fileName = path.basename(fileAbsolutePath);
  } else {
    // List samples and run the first
    if (!fs.existsSync(SAMPLES_DIR)) {
      console.error("❌ No samples/ folder found.");
      process.exit(1);
    }

    const samples = fs.readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".js"));

    if (samples.length === 0) {
      console.error("❌ No sample js files found in samples/.");
      process.exit(1);
    }

    console.log("📂 Available sample files to audit:\n");
    samples.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });

    console.log(`\nUsage: node index.js samples/<filename> [--save]`);
    console.log(`Running first sample: ${samples[0]}\n`);

    fileAbsolutePath = path.join(SAMPLES_DIR, samples[0]);
    code = fs.readFileSync(fileAbsolutePath, "utf-8");
    fileName = samples[0];
  }

  // ── Print Code Preview ────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log(`│  📄 Code Under Review: ${fileName.padEnd(32)} │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  
  const lines = code.split("\n");
  lines.forEach((line, index) => {
    // Print first 50 lines max as preview to avoid spamming the console
    if (index < 50) {
      console.log(`│ ${String(index + 1).padStart(3)} │ ${line.padEnd(52).slice(0, 52)} │`);
    }
  });
  if (lines.length > 50) {
    console.log(`│ ... │ ... (${lines.length - 50} more lines truncated) ... │`);
  }
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Run parallel audit ────────────────────────────────────────────────
  const result = await runParallelAudit(code);

  // ── Print Synthesized Report ──────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  📊 Final Synthesized Report                            │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(result.report);
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Print Diagnostics ──────────────────────────────────────────────────
  console.log("⏱  Performance Diagnostics:");
  console.log(`   - Parallel Audits Runtime: ${result.meta.parallelDuration}s`);
  console.log(`   - Report Synthesis Runtime: ${result.meta.synthDuration}s`);
  console.log(`   - Total End-to-End Pipeline: ${result.meta.totalDuration}s`);
  console.log(`\n   💡 Note: Running security, performance, and style audits`);
  console.log(`      sequentially would have taken ~3x longer! Parallelization`);
  console.log(`      saved significant time by using JavaScript's event loop.\n`);

  // ── Save Report ───────────────────────────────────────────────────────
  if (shouldSave) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const reportName = `audit-${fileName.split(".")[0]}_${timestamp}.md`;
    const reportPath = path.join(REPORTS_DIR, reportName);

    // Build the report content with performance metadata at the top
    const fullReportContent = `
# Code Audit Report: ${fileName}
Generated: ${new Date().toLocaleString()}

## ⏱ Diagnostics
- **Parallel Audit Phase**: ${result.meta.parallelDuration} seconds
- **Synthesis Phase**: ${result.meta.synthDuration} seconds
- **Total Pipeline Duration**: ${result.meta.totalDuration} seconds

---

${result.report}
`.trim();

    fs.writeFileSync(reportPath, fullReportContent, "utf-8");
    console.log(`📝 Saved final synthesized audit report to:`);
    console.log(`   [${reportName}](file://${reportPath})\n`);
  }
}

main().catch((err) => {
  console.error("❌ Audit failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
