/**
 * CLI Entry Point — Reflection Pattern Runner
 * 
 * Usage:
 *   node index.js                              → lists sample tasks, runs the first
 *   node index.js tasks/merge-intervals.txt    → runs on specific task
 *   node index.js tasks/merge-intervals.txt --save → runs and saves refinement log
 */

import fs from "fs";
import path from "path";
import { runReflectionLoop } from "./reflector.js";

const TASKS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "tasks");
const REPORTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "reports");

async function main() {
  const args = process.argv.slice(2);
  const saveIndex = args.indexOf("--save");
  const shouldSave = saveIndex !== -1;

  if (shouldSave) {
    args.splice(saveIndex, 1);
  }

  const fileArg = args.find(a => !a.startsWith("--"));

  let taskDescription;
  let taskName;
  let fileAbsolutePath;

  if (fileArg) {
    fileAbsolutePath = path.resolve(fileArg);
    if (!fs.existsSync(fileAbsolutePath)) {
      console.error(`❌ Task file not found: ${fileAbsolutePath}`);
      process.exit(1);
    }
    taskDescription = fs.readFileSync(fileAbsolutePath, "utf-8").trim();
    taskName = path.basename(fileAbsolutePath);
  } else {
    // List sample tasks and run the first
    if (!fs.existsSync(TASKS_DIR)) {
      console.error("❌ No tasks/ folder found.");
      process.exit(1);
    }

    const tasks = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith(".txt"));

    if (tasks.length === 0) {
      console.error("❌ No sample task files found in tasks/.");
      process.exit(1);
    }

    console.log("📂 Available coding tasks for Reflection:\n");
    tasks.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });

    console.log(`\nUsage: node index.js tasks/<filename> [--save]`);
    console.log(`Running first task: ${tasks[0]}\n`);

    fileAbsolutePath = path.join(TASKS_DIR, tasks[0]);
    taskDescription = fs.readFileSync(fileAbsolutePath, "utf-8").trim();
    taskName = tasks[0];
  }

  // ── Show Task Description ───────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log(`│  📝 Task: ${taskName.padEnd(46)} │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  taskDescription.split("\n").forEach(line => {
    console.log(`│ ${line.padEnd(55).slice(0, 55)} │`);
  });
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Run Reflection Loop ────────────────────────────────────────────────
  // Run with 3 max iterations
  const result = await runReflectionLoop(taskDescription, 3);

  // ── Show Final Code ────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  🚀 Final Refined Code                                  │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(result.finalCode);
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Save History and Code ──────────────────────────────────────────────
  if (shouldSave) {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const reportName = `reflection-${taskName.split(".")[0]}_${timestamp}.md`;
    const reportPath = path.join(REPORTS_DIR, reportName);

    // Build the md report content with detailed loop history
    let historyMd = "";
    result.history.forEach((step, idx) => {
      historyMd += `
### Iteration ${step.iteration} (Reflector Score: ${step.critique.score}/100, Passed: ${step.critique.pass})
- **Reasoning**: ${step.critique.reasoning}
- **Critiques**:
${step.critique.critiques.map(c => `  - ${c}`).join("\n") || "  - None"}

#### Draft Code:
\`\`\`javascript
${step.code}
\`\`\`

---
`;
    });

    const fullReportContent = `
# Reflection / Self-Correction Report: ${taskName}
Generated: ${new Date().toLocaleString()}

## Loop Metrics
- **Iterations Completed**: ${result.meta.iterations}
- **Final Reflector Score**: ${result.meta.finalScore}/100
- **Loop Status**: ${result.meta.passed ? "APPROVED" : "TERMINATED (MAX ITERATIONS)"}
- **Total Loop Duration**: ${result.meta.duration} seconds

## 📝 Original Task
${taskDescription}

## 🔄 Critique and Refinement History
${historyMd}

## 🏆 Final Refined Code
\`\`\`javascript
${result.finalCode}
\`\`\`
`.trim();

    fs.writeFileSync(reportPath, fullReportContent, "utf-8");
    console.log(`📝 Saved full reflection loop report to:`);
    console.log(`   [${reportName}](file://${reportPath})\n`);
  }
}

main().catch((err) => {
  console.error("❌ Reflection failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
