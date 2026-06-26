/**
 * Reasoning Techniques — CLI Coordinator
 * ========================================
 * 
 * Orchestrator CLI to select logic puzzles, apply distinct reasoning
 * techniques (CoT, ToT, Self-Correction), and compare their execution
 * metrics (latency, token costs, structural depth) side-by-side.
 */

import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PUZZLES } from "./puzzles.js";
import { CotSolver } from "./cot-solver.js";
import { TotSolver } from "./tot-solver.js";
import { Reflector } from "./reflector.js";

// Terminal colors
const C_TITLE = "\x1b[95m";   // Bright Magenta
const C_PHASE = "\x1b[94m";   // Bright Blue
const C_ALERT = "\x1b[91m";   // Bright Red
const C_SUCCESS = "\x1b[92m"; // Bright Green
const C_INFO = "\x1b[90m";    // Gray
const C_RESET = "\x1b[0m";
const C_BOLD = "\x1b[1m";

const rl = readline.createInterface({ input, output });

const cotSolver = new CotSolver();
const totSolver = new TotSolver();
const reflector = new Reflector();

function printBanner() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  🧠  ${C_BOLD}REASONING TECHNIQUES DESIGN PATTERN${C_RESET}`);
  console.log("  Chain-of-Thought • Tree-of-Thoughts • Self-Correction Loops");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

/**
 * Visual report formatter for CoT results
 */
function printCotResult(res) {
  console.log(`\n${C_SUCCESS}🎉 Chain-of-Thought Solver Completed!${C_RESET}`);
  console.log(`================================================================`);
  console.log(`${C_BOLD}THINKING PROCESS (<thought>):${C_RESET}`);
  console.log(`${C_INFO}${res.thought}${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`${C_BOLD}FINAL ANSWER (<answer>):${C_RESET} ${C_SUCCESS}${res.answer}${C_RESET}`);
  console.log(`================================================================`);
  printMetrics(res);
}

/**
 * Visual report formatter for ToT results
 */
function printTotResult(res) {
  console.log(`\n${C_SUCCESS}🎉 Tree-of-Thoughts Solver Completed!${C_RESET}`);
  console.log(`================================================================`);
  console.log(`${C_BOLD}TREE TRAVERSAL & BRANCH PRUNING HISTORY:${C_RESET}`);
  res.branchesEvaluated.forEach((b, index) => {
    const status = b.hasContradiction ? `${C_ALERT}[Pruned]${C_RESET}` : `${C_SUCCESS}[Approved]${C_RESET}`;
    console.log(`  ${index + 1}. Hypothesis "${b.assumption}": ${status}`);
    console.log(`     ↳ Details: ${b.explanation}`);
  });
  console.log(`----------------------------------------------------------------`);
  console.log(`${C_BOLD}VERIFIED SOLUTION PATH:${C_RESET} ${C_SUCCESS}${res.answer}${C_RESET}`);
  console.log(`================================================================`);
  printMetrics(res);
}

/**
 * Visual report formatter for Self-Correction results
 */
function printReflectorResult(res) {
  console.log(`\n${C_SUCCESS}🎉 Self-Correction Solver Completed!${C_RESET}`);
  console.log(`================================================================`);
  console.log(`${C_BOLD}INITIAL DRAFT GENERATED:${C_RESET} "${res.initialDraft}"`);
  console.log(`----------------------------------------------------------------`);
  console.log(`${C_BOLD}CRITIQUE & REFINEMENT HISTORY:${C_RESET}`);
  res.critiqueHistory.forEach((h) => {
    const status = h.isCorrect ? `${C_SUCCESS}PASSED${C_RESET}` : `${C_ALERT}FAILED (Contradiction Found)${C_RESET}`;
    console.log(`  [Attempt ${h.attempt}] Evaluation: ${status}`);
    console.log(`    ↳ Validator Feedback: "${h.feedback}"`);
  });
  console.log(`----------------------------------------------------------------`);
  console.log(`${C_BOLD}FINAL VALIDATED ANSWER:${C_RESET} ${C_SUCCESS}${res.answer}${C_RESET}`);
  console.log(`================================================================`);
  printMetrics(res);
}

function printMetrics(res) {
  console.log(
    `📊 ${C_BOLD}Metrics:${C_RESET}` +
    `  ⏱️  Latency: ${res.latency.toFixed(2)}s |` +
    `  📥  Input Tokens: ${res.inputTokens} |` +
    `  📤  Output Tokens: ${res.outputTokens} |` +
    `  Fallback Mode: ${res.fallbackUsed ? `${C_ALERT}Yes (Local Simulation)${C_RESET}` : `${C_SUCCESS}No (Live LLM)${C_RESET}`}\n`
  );
}

/**
 * Outputs a comparison dashboard benchmark table
 */
function printComparisonTable(results) {
  console.log(`\n${C_SUCCESS}📊 Side-by-Side Reasoning Techniques Comparison:${C_RESET}`);
  console.log(`==================================================================================================`);
  
  // Table Header
  console.log(
    `| ${C_BOLD}${"Reasoning Technique".padEnd(25)}${C_RESET} ` +
    `| ${C_BOLD}${"Extracted Answer".padEnd(30)}${C_RESET} ` +
    `| ${C_BOLD}${"Latency".padEnd(8)}${C_RESET} ` +
    `| ${C_BOLD}${"Total Tokens".padEnd(14)}${C_RESET} ` +
    `| ${C_BOLD}${"Simulation?".padEnd(12)}${C_RESET} |`
  );
  console.log(`|---------------------------|--------------------------------|----------|--------------|--------------|`);

  // Table Body
  results.forEach(res => {
    const totalTokens = res.inputTokens + res.outputTokens;
    console.log(
      `| ${res.technique.padEnd(25)} ` +
      `| ${res.answer.substring(0, 30).padEnd(30)} ` +
      `| ${(res.latency.toFixed(2) + "s").padEnd(8)} ` +
      `| ${String(totalTokens).padEnd(14)} ` +
      `| ${(res.fallbackUsed ? "Yes" : "No").padEnd(12)} |`
    );
  });
  console.log(`==================================================================================================\n`);
  
  console.log(`${C_BOLD}Analysis Notes:${C_RESET}`);
  console.log(`  1. ${C_BOLD}Chain-of-Thought (CoT)${C_RESET} solves problems linearly. It is fast, but if the initial logic path drifts, it can hallucinate the final output without backtracking.`);
  console.log(`  2. ${C_BOLD}Tree-of-Thoughts (ToT)${C_RESET} explores all possible assumptions. Although it requires more API calls and has higher total latency, it is structurally guarantee-driven because it systematically prunes branches that lead to contradictions.`);
  console.log(`  3. ${C_BOLD}Self-Correction (Reflector)${C_RESET} utilizes a critic. It generates drafts, validates constraints, and refines mistakes. It is highly token-efficient when initial answers are correct, and dynamically scales up computation only if mistakes occur.`);
}

async function main() {
  printBanner();

  // 1. Puzzle Selection
  console.log("Select a Logic Puzzle to solve:");
  PUZZLES.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}\n     ↳ Clues: ${p.description}`));
  
  const puzzleInput = await rl.question("\nEnter Choice (1-2, default 1): ");
  const puzzleIdx = parseInt(puzzleInput) - 1;
  const puzzle = PUZZLES[puzzleIdx] || PUZZLES[0];

  console.log(`\nSelected Riddle: ${C_BOLD}${puzzle.name}${C_RESET}`);

  // 2. Technique Selection
  console.log("\nSelect a Reasoning Technique:");
  console.log("  1. Chain-of-Thought (CoT) - Linear step-by-step thinking");
  console.log("  2. Tree-of-Thoughts (ToT) - Branching search with backtracking");
  console.log("  3. Self-Correction (Reflector) - Critique and refine loops");
  console.log("  4. Compare All Techniques (Benchmark Dashboard)");

  const techInput = await rl.question("\nEnter Choice (1-4, default 4): ");
  const techChoice = techInput.trim() || "4";

  console.log(`\nStarting solvers... Hold on...`);

  switch (techChoice) {
    case "1": {
      const res = await cotSolver.solve(puzzle);
      printCotResult(res);
      break;
    }
    case "2": {
      const res = await totSolver.solve(puzzle);
      printTotResult(res);
      break;
    }
    case "3": {
      const res = await reflector.solve(puzzle);
      printReflectorResult(res);
      break;
    }
    case "4":
    default: {
      console.log(`\n${C_PHASE}━━━ Running Chain-of-Thought Solver ━━━${C_RESET}`);
      const resCot = await cotSolver.solve(puzzle);
      console.log(`   Done. Answer: "${resCot.answer}"`);

      console.log(`\n${C_PHASE}━━━ Running Tree-of-Thoughts Solver ━━━${C_RESET}`);
      const resTot = await totSolver.solve(puzzle);
      console.log(`   Done. Answer: "${resTot.answer}"`);

      console.log(`\n${C_PHASE}━━━ Running Self-Correction Solver ━━━${C_RESET}`);
      const resReflect = await reflector.solve(puzzle);
      console.log(`   Done. Answer: "${resReflect.answer}"`);

      printComparisonTable([resCot, resTot, resReflect]);
      break;
    }
  }

  rl.close();
}

main().catch(err => {
  console.error("Critical error in Orchestrator:", err);
  rl.close();
});
