/**
 * Self-Correction (Reflective Critique) Solver
 * ===========================================
 * 
 * Implements a generator-critique loop.
 * 1. An initial candidate solution is drafted.
 * 2. A separate critic prompt checks the solution against all constraints/rules.
 * 3. If a contradiction is detected, the validator provides feedback,
 *    and the generator refines the solution.
 * 4. This repeats until all rules are satisfied (or max attempts are reached).
 */

import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

// Terminal log colors
const C_DRAFT = "\x1b[35m";   // Purple for draft gen
const C_CRITIQUE = "\x1b[33m"; // Yellow for critique feedback
const C_REFINE = "\x1b[32m";   // Green for corrected outputs
const C_RESET = "\x1b[0m";

export class Reflector {
  constructor() {}

  /**
   * Solve puzzle by generating a draft, critiquing it against rules,
   * and self-correcting if flaws are identified.
   */
  async solve(puzzle) {
    console.log(`\n🔄 [Self-Correction] Starting generator-critique loop.`);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let accumulatedLatency = 0;
    let fallbackUsed = false;

    // 1. Generate Initial Draft
    const draftSystemPrompt = `You are a quick puzzle solver. Provide a direct, short answer to the riddle. Output ONLY the answer without explanations.`;
    const draftUserPrompt = `Riddle: ${puzzle.description}\nClues:\n${puzzle.clues.join("\n")}\nRules:\n${puzzle.rules.join("\n")}`;

    console.log(`\n${C_DRAFT}[Step 1: Draft Gen] Generating initial candidate solution...${C_RESET}`);
    
    const startTime = Date.now();
    let response;
    try {
      response = await ollama.chat({
        model: "llama3.2",
        messages: [
          { role: "system", content: draftSystemPrompt },
          { role: "user", content: draftUserPrompt }
        ],
        options: { temperature: 0.7 } // Higher temperature to simulate potential errors
      });
    } catch (err) {
      fallbackUsed = true;
      // Return an intentionally flawed initial answer to showcase the self-correction capability
      response = {
        message: { content: puzzle.id === "three-boxes" ? "Red" : "A is a Knight, B is a Knight" },
        prompt_eval_count: 100,
        eval_count: 10
      };
    }

    let currentDraft = response.message.content.trim();
    console.log(`   - Draft Generated: "${currentDraft}"`);

    let elapsed = (Date.now() - startTime) / 1000;
    accumulatedLatency += elapsed;
    totalInputTokens += response.prompt_eval_count || Math.ceil((draftSystemPrompt.length + draftUserPrompt.length) / 4);
    totalOutputTokens += response.eval_count || Math.ceil(currentDraft.length / 4);

    const critiqueHistory = [];
    const maxAttempts = 3;
    let attempt = 0;
    let isCorrect = false;

    // 2. Loop Critique & Refinement
    while (attempt < maxAttempts && !isCorrect) {
      attempt++;
      console.log(`\n${C_CRITIQUE}[Step 2: Critique Loop (Attempt ${attempt}/${maxAttempts})] Evaluating draft against clues...${C_RESET}`);

      const critiqueUserPrompt = `Candidate Solution: "${currentDraft}"
Puzzle Details:
${puzzle.description}
Clues:
${puzzle.clues.map(c => ` - ${c}`).join("\n")}
Rules:
${puzzle.rules.map(r => ` - ${r}`).join("\n")}

Does the Candidate Solution satisfy ALL clues and rules without contradiction?
Output your critique strictly in this JSON format:
{
  "isCorrect": true or false,
  "feedback": "Explain any contradiction, or verify correctness if no flaws exist."
}`;

      const critiqueSystemPrompt = `Output ONLY valid JSON matching the schema. No conversational text.`;
      
      const critiqueStart = Date.now();
      let critiqueResponse;

      try {
        critiqueResponse = await ollama.chat({
          model: "llama3.2",
          messages: [
            { role: "system", content: critiqueSystemPrompt },
            { role: "user", content: critiqueUserPrompt }
          ],
          format: "json",
          options: { temperature: 0.1 }
        });
      } catch (err) {
        fallbackUsed = true;
        // Mock critiques based on draft
        critiqueResponse = this.getMockCritiqueResponse(puzzle.id, currentDraft);
      }

      const critiqueLatency = (Date.now() - critiqueStart) / 1000;
      accumulatedLatency += critiqueLatency;
      totalInputTokens += critiqueResponse.prompt_eval_count || Math.ceil((critiqueSystemPrompt.length + critiqueUserPrompt.length) / 4);
      totalOutputTokens += critiqueResponse.eval_count || Math.ceil((critiqueResponse.message?.content || "").length / 4);

      let critiqueResult;
      try {
        critiqueResult = JSON.parse(critiqueResponse.message.content.trim());
      } catch (e) {
        critiqueResult = { isCorrect: false, feedback: "Failed to parse critique JSON." };
      }

      critiqueHistory.push({
        attempt,
        draft: currentDraft,
        isCorrect: critiqueResult.isCorrect,
        feedback: critiqueResult.feedback
      });

      if (critiqueResult.isCorrect) {
        console.log(`   - ${C_REFINE}✅ Critique Passed! Solution verified as correct.${C_RESET}`);
        console.log(`     Feedback: ${critiqueResult.feedback}`);
        isCorrect = true;
      } else {
        console.log(`   - ${C_CRITIQUE}⚠️ Critique Failed: Contradiction identified!${C_RESET}`);
        console.log(`     Feedback: ${critiqueResult.feedback}`);
        console.log(`\n${C_REFINE}[Step 3: Self-Correction] Refining answer based on critic feedback...${C_RESET}`);

        // Refine prompt
        const refineUserPrompt = `Riddle: ${puzzle.description}
Clues:
${puzzle.clues.join("\n")}
Rules:
${puzzle.rules.join("\n")}

Your previous answer was: "${currentDraft}"
Contradiction Feedback:
"${critiqueResult.feedback}"

Provide a corrected short answer to the riddle. Output ONLY the answer without explanations.`;

        const refineStart = Date.now();
        let refineResponse;

        try {
          refineResponse = await ollama.chat({
            model: "llama3.2",
            messages: [
              { role: "system", content: draftSystemPrompt },
              { role: "user", content: refineUserPrompt }
            ],
            options: { temperature: 0.2 }
          });
        } catch (err) {
          fallbackUsed = true;
          // Set to corrected mock answer
          refineResponse = {
            message: { content: puzzle.id === "three-boxes" ? "Green" : "A is a Knave, B is a Knight" },
            prompt_eval_count: 100,
            eval_count: 10
          };
        }

        const refineLatency = (Date.now() - refineStart) / 1000;
        accumulatedLatency += refineLatency;
        totalInputTokens += refineResponse.prompt_eval_count || Math.ceil((draftSystemPrompt.length + refineUserPrompt.length) / 4);
        totalOutputTokens += refineResponse.eval_count || Math.ceil((refineResponse.message?.content || "").length / 4);

        currentDraft = refineResponse.message.content.trim();
        console.log(`   - Refined Answer: "${currentDraft}"`);
      }
    }

    return {
      technique: "Self-Correction (Reflective)",
      initialDraft: critiqueHistory[0]?.draft || currentDraft,
      critiqueHistory,
      answer: currentDraft,
      latency: accumulatedLatency,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      fallbackUsed
    };
  }

  /**
   * Safe mock validator responses to demonstrate self-correction logic.
   */
  getMockCritiqueResponse(puzzleId, draft) {
    let mockContent = "";

    if (puzzleId === "three-boxes") {
      // Correct answer is Green
      const isGreen = draft.toLowerCase().includes("green");
      if (isGreen) {
        mockContent = JSON.stringify({
          isCorrect: true,
          feedback: "The gold in Green hypothesis results in exactly 1 True label (Red Box Label). The other labels are False. This matches all criteria."
        });
      } else {
        mockContent = JSON.stringify({
          isCorrect: false,
          feedback: `Draft "${draft}" is incorrect. If the gold is in ${draft}, this results in more than one label being True (Red Label and Green Label are both True), violating Rule 2 that exactly one label is true.`
        });
      }
    } else { // knights-knaves
      // Correct answer is "A is a Knave, B is a Knight"
      const isCorrectDraft = draft.toLowerCase().includes("a is a knave") && draft.toLowerCase().includes("b is a knight");
      if (isCorrectDraft) {
        mockContent = JSON.stringify({
          isCorrect: true,
          feedback: "A is a Knave (so his statement 'We are both knaves' is False since B is a Knight). Matches all identities without contradictions."
        });
      } else {
        mockContent = JSON.stringify({
          isCorrect: false,
          feedback: `Draft "${draft}" contains contradictions. If ${draft}, then Person A's statement truth value does not match A's assumed identity.`
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
