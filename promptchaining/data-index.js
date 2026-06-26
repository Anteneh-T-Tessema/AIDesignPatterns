/**
 * CLI Entry Point — Run the data pipeline chain on any raw data file.
 *
 * Usage:
 *   node data-index.js                                → list data samples, run the first
 *   node data-index.js data-samples/messy-sales.txt   → process a specific file
 *   node data-index.js mydata.csv --save              → process and save report
 */

import fs from "fs";
import path from "path";
import { runDataPipelineChain } from "./data-chain.js";

const SAMPLES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "data-samples");
const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

/**
 * Infer the data type from the filename.
 */
function inferDataType(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes("sales") || name.includes("order")) return "sales/orders";
  if (name.includes("customer") || name.includes("user")) return "customer";
  if (name.includes("employee") || name.includes("staff")) return "employee/HR";
  if (name.includes("product") || name.includes("inventory")) return "product/inventory";
  if (name.includes("log") || name.includes("event")) return "log/event";
  return "general";
}

/**
 * Generate a markdown report from pipeline results.
 */
function generateReport(fileName, rawData, dataType, results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportName = `data-${path.basename(fileName, path.extname(fileName))}_${timestamp}.md`;

  const report = `# 📊 Data Pipeline Report: ${fileName}

> Generated on ${new Date().toLocaleString()} by Data Pipeline Chain (Llama 3.2)
> Data Type: **${dataType}**

---

## 📄 Raw Input Data

\`\`\`
${rawData}
\`\`\`

---

## Step 1 — 📥 Extraction

${results.extracted}

---

## Step 2 — 🔄 Transformation & Enrichment

${results.transformed}

---

## Step 3 — 📊 Analysis & Summary

${results.summary}
`;

  return { reportName, report };
}

async function main() {
  const args = process.argv.slice(2);
  const saveFlag = args.includes("--save");
  const fileArg = args.find((a) => !a.startsWith("--"));

  let rawData;
  let fileName;

  if (fileArg) {
    // ── Run on a specific file ──────────────────────────────────────────
    const filePath = path.resolve(fileArg);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    rawData = fs.readFileSync(filePath, "utf-8");
    fileName = path.basename(filePath);
    console.log(`📄 Processing: ${fileName}\n`);
  } else {
    // ── No argument — list available samples ────────────────────────────
    if (!fs.existsSync(SAMPLES_DIR)) {
      console.error("❌ No data-samples/ folder found. Create one with sample data files.");
      process.exit(1);
    }

    const samples = fs.readdirSync(SAMPLES_DIR).filter((f) => !f.startsWith("."));

    if (samples.length === 0) {
      console.error("❌ No data samples found in the data-samples/ folder.");
      process.exit(1);
    }

    console.log("📂 Available data samples:\n");
    samples.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    console.log(`\nUsage: node data-index.js data-samples/<filename>\n`);
    console.log(`Running first sample: ${samples[0]}\n`);

    const filePath = path.join(SAMPLES_DIR, samples[0]);
    rawData = fs.readFileSync(filePath, "utf-8");
    fileName = samples[0];
    console.log(`📄 Processing: ${fileName}\n`);
  }

  const dataType = inferDataType(fileName);

  // ── Show raw data preview ─────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log(`│  Raw Data — ${dataType}`.padEnd(58) + "│");
  console.log("├─────────────────────────────────────────────────────────┤");
  rawData.split("\n").forEach((line, i) => {
    const lineNum = String(i + 1).padStart(3, " ");
    console.log(`│ ${lineNum} │ ${line}`);
  });
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Run the chain ─────────────────────────────────────────────────────
  const results = await runDataPipelineChain(rawData, dataType);

  // ── Save report if --save flag ────────────────────────────────────────
  if (saveFlag) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const { reportName, report } = generateReport(fileName, rawData, dataType, results);
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
