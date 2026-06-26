/**
 * Tree-of-Thoughts (ToT) Solver
 * =============================
 * 
 * Expands Chain-of-Thought reasoning by branching to evaluate multiple
 * hypothetical possibilities (candidates). Each branch is evaluated
 * against logic rules. If a branch results in a contradiction, the agent
 * prunes it and backtracks to explore alternative paths.
 */

import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

// Terminal log colors
const C_BRANCH = "\x1b[36m";  // Cyan for branch evaluation
const C_PRUNE = "\x1b[31m";   // Red for pruning / backtracking
const C_PATH = "\x1b[32m";    // Green for approved path
const C_RESET = "\x1b[0m";

export class TotSolver {
  constructor() {}

  /**
   * Solve the puzzle by exploring all possible branches, evaluating each,
   * backtracking upon contradictions, and picking the valid path.
   */
  async solve(puzzle) {
    console.log(`\n🌲 [ToT] Tree-of-Thoughts search started. Candidates: ${puzzle.candidateBranches.join(" | ")}`);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let accumulatedLatency = 0;
    let fallbackUsed = false;

    const evaluatedBranches = [];
    let finalAnswer = "Could not find a valid solution branch.";

    for (const candidate of puzzle.candidateBranches) {
      console.log(`\n${C_BRANCH}🌿 [Branch Node] Assuming hypothesis: "${candidate}"...${C_RESET}`);
      
      const evaluatorPrompt = puzzle.evaluatorInstructions(candidate);
      const systemInstructions = `Output ONLY valid JSON. Your response must match the exact JSON schema provided by the user. Do NOT write preamble, markdown fences, or postamble.`;

      const startTime = Date.now();
      let response;

      try {
        response = await ollama.chat({
          model: "llama3.2",
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: evaluatorPrompt }
          ],
          format: "json", // Enforce JSON
          options: {
            temperature: 0.1
          }
        });
      } catch (err) {
        fallbackUsed = true;
        response = this.getMockBranchResponse(puzzle.id, candidate);
      }

      const branchLatency = (Date.now() - startTime) / 1000;
      accumulatedLatency += branchLatency;

      const inTokens = response.prompt_eval_count || Math.ceil((systemInstructions.length + evaluatorPrompt.length) / 4);
      const outTokens = response.eval_count || Math.ceil((response.message?.content || "").length / 4);
      totalInputTokens += inTokens;
      totalOutputTokens += outTokens;

      // Parse result
      let result;
      try {
        const rawContent = response.message.content.trim();
        // Strip markdown backticks if any slipped through
        const cleanContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        result = JSON.parse(cleanContent);
      } catch (e) {
        console.log(`${C_PRUNE}❌ [Error] Failed to parse JSON from evaluator. Pruning branch by default.${C_RESET}`);
        result = { assumption: candidate, hasContradiction: true, explanation: "JSON parse failed." };
      }

      evaluatedBranches.push(result);

      if (result.hasContradiction) {
        console.log(
          `  ${C_PRUNE}🥀 [Pruned & Backtrack] Hypothesis failed: "${candidate}"` +
          `\n    ↳ Contradiction found: ${result.explanation}${C_RESET}`
        );
      } else {
        console.log(
          `  ${C_PATH}👑 [Path Approved] Hypothesis is valid: "${candidate}"` +
          `\n    ↳ Verification: ${result.explanation}${C_RESET}`
        );
        finalAnswer = candidate;
      }
    }

    return {
      technique: "Tree-of-Thoughts (ToT)",
      branchesEvaluated: evaluatedBranches,
      answer: finalAnswer,
      latency: accumulatedLatency,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      fallbackUsed
    };
  }

  /**
   * Safe mock responses for offline executions, evaluating each branch logically.
   */
  getMockBranchResponse(puzzleId, candidate) {
    let mockContent = "";

    if (puzzleId === "three-boxes") {
      if (candidate === "Red") {
        mockContent = JSON.stringify({
          assumption: "Red",
          redLabel: "True",
          blueLabel: "False",
          greenLabel: "True",
          trueLabelCount: 2,
          hasContradiction: true,
          explanation: "Under Red box gold hypothesis: Red label is True ('gold not in Blue') and Green label is True ('gold not in Green'). This gives 2 True labels, violating Rule 2 (exactly one label is true)."
        });
      } else if (candidate === "Blue") {
        mockContent = JSON.stringify({
          assumption: "Blue",
          redLabel: "False",
          blueLabel: "True",
          greenLabel: "True",
          trueLabelCount: 2,
          hasContradiction: true,
          explanation: "Under Blue box gold hypothesis: Blue label is True ('gold in Blue') and Green label is True ('gold not in Green'). This gives 2 True labels, violating Rule 2."
        });
      } else {
        mockContent = JSON.stringify({
          assumption: "Green",
          redLabel: "True",
          blueLabel: "False",
          greenLabel: "False",
          trueLabelCount: 1,
          hasContradiction: false,
          explanation: "Under Green box gold hypothesis: Only Red label is True ('gold not in Blue'). Blue label is False ('gold in Blue') and Green label is False ('gold not in Green'). Exactly 1 label is True. No contradictions!"
        });
      }
    } else { // knights-knaves
      if (candidate === "A is a Knight, B is a Knight") {
        mockContent = JSON.stringify({
          assumption: "A is a Knight, B is a Knight",
          statementTruthValue: "False",
          matchesIdentity: false,
          hasContradiction: true,
          explanation: "If A is a Knight, his statement must be True. But A says 'We are both knaves' which is False (since both are assumed Knights). Contradiction!"
        });
      } else if (candidate === "A is a Knight, B is a Knave") {
        mockContent = JSON.stringify({
          assumption: "A is a Knight, B is a Knave",
          statementTruthValue: "False",
          matchesIdentity: false,
          hasContradiction: true,
          explanation: "If A is a Knight, his statement must be True. But A says 'We are both knaves' which is False. Contradiction!"
        });
      } else if (candidate === "A is a Knave, B is a Knave") {
        mockContent = JSON.stringify({
          assumption: "A is a Knave, B is a Knave",
          statementTruthValue: "True",
          matchesIdentity: false,
          hasContradiction: true,
          explanation: "If A is a Knave, his statement must be False. But A says 'We are both knaves' which would be True under this hypothesis. Contradiction!"
        });
      } else {
        mockContent = JSON.stringify({
          assumption: "A is a Knave, B is a Knight",
          statementTruthValue: "False",
          matchesIdentity: true,
          hasContradiction: false,
          explanation: "If A is a Knave, his statement must be False. A says 'We are both knaves', which is False because B is a Knight. Since A is a Knave and statement is False, it matches. No contradiction!"
        });
      }
    }

    return {
      message: { content: mockContent },
      prompt_eval_count: 80,
      eval_count: 90
    };
  }
}
