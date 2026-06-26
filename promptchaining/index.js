/**
 * CLI Entry Point — Run the code review chain on any file or example.
 *
 * Usage:
 *   node index.js                              → list examples, run the first one
 *   node index.js examples/shopping-cart.js     → review a specific file
 *   node index.js path/to/your/code.py          → review any file
 *   node index.js examples/auth-system.js --save  → review and save report to reports/
 */

import fs from "fs";
import path from "path";
import { runCodeReviewChain } from "./chain.js";

const EXAMPLES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "examples");
const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

/**
 * Generates a markdown report from the chain results.
 */
function generateReport(fileName, code, results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportName = `${path.basename(fileName, path.extname(fileName))}_${timestamp}.md`;

  const report = `# 🔗 Code Review Report: ${fileName}

> Generated on ${new Date().toLocaleString()} by Prompt Chaining Pipeline (Llama 3.2)

---

## 📄 Code Reviewed

\`\`\`${path.extname(fileName).slice(1) || "text"}
${code}
\`\`\`

---

## Step 1 — 🔍 Analysis

${results.analysis}

---

## Step 2 — 🐛 Issues Identified

${results.issues}

---

## Step 3 — 🔧 Suggested Fixes

${results.fixes}
`;

  return { reportName, report };
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const saveFlag = args.includes("--save");
  const fileArg = args.find((a) => !a.startsWith("--"));

  let code;
  let fileName;

  if (fileArg) {
    // ── Run on a specific file ──────────────────────────────────────────
    const filePath = path.resolve(fileArg);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    code = fs.readFileSync(filePath, "utf-8");
    fileName = path.basename(filePath);
    console.log(`📄 Reviewing: ${fileName}\n`);
  } else {
    // ── No argument — list available examples ───────────────────────────
    const examples = fs.readdirSync(EXAMPLES_DIR).filter((f) => !f.startsWith("."));

    if (examples.length === 0) {
      console.error("❌ No examples found in the examples/ folder.");
      process.exit(1);
    }

    console.log("📂 Available examples:\n");
    examples.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    console.log(`\nUsage: node index.js examples/<filename>\n`);
    console.log(`Running first example: ${examples[0]}\n`);

    const filePath = path.join(EXAMPLES_DIR, examples[0]);
    code = fs.readFileSync(filePath, "utf-8");
    fileName = examples[0];
    console.log(`📄 Reviewing: ${fileName}\n`);
  }

  // ── Show the code being reviewed ──────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  Code Under Review                                     │");
  console.log("├─────────────────────────────────────────────────────────┤");
  code.split("\n").forEach((line, i) => {
    const lineNum = String(i + 1).padStart(3, " ");
    console.log(`│ ${lineNum} │ ${line}`);
  });
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Run the chain ─────────────────────────────────────────────────────
  const results = await runCodeReviewChain(code);

  // ── Save report if --save flag is present ─────────────────────────────
  if (saveFlag) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const { reportName, report } = generateReport(fileName, code, results);
    const reportPath = path.join(REPORTS_DIR, reportName);
    fs.writeFileSync(reportPath, report, "utf-8");

    console.log(`\n📝 Report saved to: reports/${reportName}`);
  }
}

main().catch((err) => {
  console.error("❌ Pipeline failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
