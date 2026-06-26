/**
 * CLI Entry Point — Learning & Adaptation Code Evolver
 * 
 * Usage:
 *   node index.js
 */

import { Ollama } from "ollama";
import { CodeEvolver } from "./evolver.js";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// Inefficient exponential O(2^n) baseline implementation
const BASELINE_CODE = `
function fibonacci(n) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`.trim();

async function main() {
  const evolver = new CodeEvolver(ollama, MODEL);

  // Initialize DB with baseline code
  console.log("🚀 Initializing OpenEvolve system...");
  const baselineMetrics = evolver.initializeDatabase(BASELINE_CODE);
  console.log(`   Baseline: Correctness: ${(baselineMetrics.successRate * 100).toFixed(1)}% | Speed: ${baselineMetrics.durationMs.toFixed(4)}ms | Score: ${baselineMetrics.score.toFixed(2)}\n`);

  // Run evolutionary cycles (3 generations)
  const result = await evolver.runEvolution(3);

  const best = result.best;
  const initial = result.database[0];

  // ── Print Results Comparison ───────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  🚀 Evolutionary Code Optimization Results              │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`  Initial Version (Gen 0 - Inefficient Recursion):`);
  console.log(`    - Correctness:   ${(initial.metrics.successRate * 100).toFixed(1)}% (${initial.metrics.passedCount}/${initial.metrics.totalCount} tests)`);
  console.log(`    - Latency:       ${initial.metrics.durationMs.toFixed(4)}ms`);
  console.log(`    - Fitness Score: ${initial.metrics.score.toFixed(2)}`);
  console.log("");
  console.log(`  Best Evolved Version (Gen ${best.generation} - Adapted Algorithm):`);
  console.log(`    - Correctness:   ${(best.metrics.successRate * 100).toFixed(1)}% (${best.metrics.passedCount}/${best.metrics.totalCount} tests)`);
  console.log(`    - Latency:       ${best.metrics.durationMs.toFixed(4)}ms`);
  console.log(`    - Fitness Score: ${best.metrics.score.toFixed(2)}`);
  
  const speedup = (initial.metrics.durationMs / best.metrics.durationMs).toFixed(1);
  console.log(`\n  ⚡ Speedup: ${speedup}x faster!`);
  console.log("└─────────────────────────────────────────────────────────┘\n");

  console.log("┌─── 📜 Evolved Source Code ───────────────────────────────");
  console.log(best.code);
  console.log("└───────────────────────────────────────────────────────────\n");

  console.log("💡 [Adaptation Insights]");
  console.log("- The agent observed the high latency penalty of the O(2^n) recursion and mutated the logic.");
  console.log("- It adapted the code to use an O(n) iterative loop or dynamic programming, dramatically reducing computation times for large numbers (like n=35).");
  console.log("- The program database successfully logged and ranked candidate codes, preserving the best versions.");
}

main().catch(err => {
  console.error("❌ Evolution failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
