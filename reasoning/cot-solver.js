/**
 * Chain-of-Thought (CoT) Solver
 * =============================
 * 
 * Instructs the LLM to structure its internal reasoning linearly using
 * <thought>...</thought> blocks before outputting a final response inside
 * <answer>...</answer> tags. This reduces hallucinations by allowing
 * the model to dedicate computation to intermediate steps.
 */

import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

export class CotSolver {
  constructor() {}

  /**
   * Solve a given puzzle using Chain-of-Thought logic.
   */
  async solve(puzzle) {
    const systemPrompt = `You are a logical reasoning assistant. You solve puzzles using Chain-of-Thought reasoning.
You MUST output your step-by-step thinking process inside <thought>...</thought> tags. Break down clues, identify rules, and explain contradictions.
Once you have solved the puzzle, write your final brief answer inside <answer>...</answer> tags.
Output ONLY the XML tags. No other conversational text.`;

    const userPrompt = `Solve the following logic puzzle:
Riddle: ${puzzle.description}
Clues:
${puzzle.clues.map(c => ` - ${c}`).join("\n")}
Rules:
${puzzle.rules.map(r => ` - ${r}`).join("\n")}

Identify which of the candidate solutions is correct and explain your logic.`;

    const startTime = Date.now();
    let response;
    let fallbackUsed = false;

    try {
      response = await ollama.chat({
        model: "llama3.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        options: {
          temperature: 0.1, // Low temp for deterministic logic
          num_predict: 800
        }
      });
    } catch (err) {
      console.log(`\n\x1b[33m[CoT] Ollama offline. Simulating CoT reasoning locally...\x1b[0m`);
      response = this.getMockResponse(puzzle.id);
      fallbackUsed = true;
    }

    const latency = (Date.now() - startTime) / 1000;
    const content = response.message.content;

    // Extract tags
    const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/i);
    const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/i);

    const thought = thoughtMatch ? thoughtMatch[1].trim() : "Failed to extract thought block.";
    const answer = answerMatch ? answerMatch[1].trim() : content.trim();

    return {
      technique: "Chain-of-Thought (CoT)",
      thought,
      answer,
      latency,
      inputTokens: response.prompt_eval_count || Math.ceil((systemPrompt.length + userPrompt.length) / 4),
      outputTokens: response.eval_count || Math.ceil(content.length / 4),
      fallbackUsed
    };
  }

  /**
   * Safe fallback generator if local Ollama is offline.
   */
  getMockResponse(puzzleId) {
    if (puzzleId === "three-boxes") {
      return {
        message: {
          content: `<thought>
1. Let's analyze the clues under each possible gold location:
   - Case A: Gold is in Red. Red Label ("Gold is not in Blue") is True. Blue Label ("Gold is in Blue") is False. Green Label ("Gold is not in Green") is True. We have 2 True labels. Violates Rule 2.
   - Case B: Gold is in Blue. Red Label ("Gold is not in Blue") is False. Blue Label ("Gold is in Blue") is True. Green Label ("Gold is not in Green") is True. We have 2 True labels. Violates Rule 2.
   - Case C: Gold is in Green. Red Label ("Gold is not in Blue") is True. Blue Label ("Gold is in Blue") is False. Green Label ("Gold is not in Green") is False. We have exactly 1 True label (Red). This satisfies Rule 2!
2. Therefore, the gold is in the Green box.
</thought>
<answer>Green</answer>`
        },
        prompt_eval_count: 150,
        eval_count: 175
      };
    } else {
      return {
        message: {
          content: `<thought>
1. Let's analyze A's statement: "We are both knaves."
2. Possibility 1: A is a Knight. A's statement must be True. But if they are both knaves, then A would have to be a Knave, which contradicts our assumption that A is a Knight. So A cannot be a Knight.
3. Possibility 2: A is a Knave. A's statement must be False. That means they are NOT both knaves. Since we know A is a Knave, the only way for A's statement to be False is if B is a Knight.
4. Let's check for contradictions: A is a Knave (lies), B is a Knight (truths). A says "We are both knaves" which is False (since B is a Knight). A's statement is False, matching A's Knave identity. Contradiction-free!
5. Conclusion: A is a Knave, B is a Knight.
</thought>
<answer>A is a Knave, B is a Knight</answer>`
        },
        prompt_eval_count: 160,
        eval_count: 190
      };
    }
  }
}
