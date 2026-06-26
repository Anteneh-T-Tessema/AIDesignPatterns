/**
 * Reflection Pattern — Self-Reflecting Code Generator
 * ====================================================
 * 
 * Demonstrates the REFLECTION / SELF-CORRECTION agentic design pattern:
 * 
 *   1. Generator LLM writes an initial draft code block.
 *   2. Reflector LLM critiques the draft against a list of edge cases, security, and bugs.
 *   3. If the Reflector approves (pass = true) or max iterations is reached, the loop stops.
 *   4. Otherwise, the Refiner LLM rewrites the code resolving the critiques.
 * 
 *                                 Feedback & Critiques
 *                              ┌─────────────────────────┐
 *                              │                         │
 *                              ▼                         │
 *   Task Input ──▶ Generator ──▶ Reflector ──[Approved?]──┼──(No)──▶ Refiner
 *                              │                          │            │
 *                              │                          └────────────┘
 *                              ▼
 *                           (Yes) ──▶ Final Corrected Code
 * 
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildGeneratorPrompt(taskDescription) {
  return `
You are an expert JavaScript software developer. Write a clean, modern ES6 JavaScript function that solves the following coding task.

**Task Description:**
${taskDescription}

**Formatting Guidelines:**
- Output ONLY the JavaScript code inside a single markdown code block (e.g. \`\`\`javascript ... \`\`\`).
- Do not write any introduction, explanation, or usage examples outside the code block.
- Focus on basic correctness first.
`.trim();
}

function buildReflectorPrompt(taskDescription, codeDraft) {
  return `
You are a Senior Code Reviewer, QA Engineer, and Security Auditor.
Your job is to analyze the provided JavaScript code against the original task description and output a structured JSON critique.

Evaluate the code strictly for:
1. **Logic Bugs**: Missing code pathways, incorrect index handling, or wrong math/conditionals.
2. **Edge Cases**: Empty arrays/objects, null/undefined inputs, invalid parameter types, adjacent boundaries, or extreme value sizes.
3. **Security Vulnerabilities**: Potential Prototype Pollution (specifically in URL/query parsers), injection vectors, or ReDoS (Regular Expression Denial of Service).

**Original Task:**
${taskDescription}

**Code to Evaluate:**
\`\`\`javascript
${codeDraft}
\`\`\`

You must respond with ONLY a JSON object (do not include any markdown formatting, explanation, or text. Just the raw JSON) matching this schema:
{
  "pass": <true if the code has zero bugs, handles all edge cases perfectly, and is 100% production ready; false otherwise>,
  "score": <integer from 0 to 100 reflecting the code quality. 100 means flawless, 90+ means minor issues, <80 means major bugs/vulnerabilities>,
  "critiques": [
    "<string description of issue 1 (e.g., 'Does not sort intervals first, causing incorrect merges on unsorted inputs')>",
    "<string description of issue 2 (e.g., 'Fails to prevent prototype pollution on __proto__ keys')>"
  ],
  "reasoning": "<one sentence summarizing the overall evaluation>"
}
`.trim();
}

function buildRefinerPrompt(taskDescription, previousDraft, critiques) {
  const formattedCritiques = critiques.map(c => `- ${c}`).join("\n");

  return `
You are a Senior Refactoring Engineer. Your job is to correct the provided JavaScript code based on peer review critiques.

**Original Task:**
${taskDescription}

**Previous Code Draft:**
\`\`\`javascript
${previousDraft}
\`\`\`

**Review Critiques / Issues to Address:**
${formattedCritiques}

**Refactoring Guidelines:**
- Modify the code to address every single critique listed above.
- Make the code extremely robust against malformed inputs, type mismatches, and boundary edge cases.
- Output ONLY the updated JavaScript code inside a single markdown code block (e.g. \`\`\`javascript ... \`\`\`).
- Do not write any introduction or explanation.
`.trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Utility to extract code blocks from Markdown responses.
 */
function extractCodeBlock(text) {
  const match = text.match(/```javascript([\s\S]*?)```/) || text.match(/```js([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return text.trim();
}

// ─── Core Loop ───────────────────────────────────────────────────────────────

/**
 * Runs the self-reflection correction loop on a code generation task.
 * 
 * @param {string} taskDescription - The requirements and constraints
 * @param {number} maxIterations - Maximum iterations of critique-refine loops
 * @returns {object} - Final code, loop history, and stats
 */
export async function runReflectionLoop(taskDescription, maxIterations = 3) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔄  REFLECTION PATTERN — Self-Correction Loop");
  console.log("═══════════════════════════════════════════════════════════\n");

  const overallStartTime = Date.now();
  const history = [];

  // ── Step 1: Generate Initial Draft ────────────────────────────────────
  console.log("━━━ Step 1: ✍️  Generating Initial Draft ━━━━━━━━━━━━━━━━━━");
  const initPrompt = buildGeneratorPrompt(taskDescription);
  const rawInitCode = await callLLM(initPrompt, "Generator (Initial Draft)");
  let currentCode = extractCodeBlock(rawInitCode);
  
  console.log("   Initial code generated. Entering critique loop...\n");

  let iteration = 0;
  let finalStatus = { pass: false, score: 0, critiques: [] };

  // ── Step 2: Iterate (Critique & Refine) ───────────────────────────────
  while (iteration < maxIterations) {
    iteration++;
    console.log(`━━━ Loop Iteration ${iteration}/${maxIterations} ━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Critique the draft
    console.log("   🔍  Reflecting on current draft...");
    const critiquePrompt = buildReflectorPrompt(taskDescription, currentCode);
    const rawCritique = await callLLM(critiquePrompt, `Reflector (Critique)`, "json");
    
    let critique;
    try {
      const jsonMatch = rawCritique.match(/\{[\s\S]*\}/);
      critique = JSON.parse(jsonMatch ? jsonMatch[0] : rawCritique);
    } catch (e) {
      console.log("   ⚠️  Failed to parse critique JSON, falling back to basic schema");
      critique = {
        pass: false,
        score: 60,
        critiques: ["Could not parse structured critique. Refine general correctness."],
        reasoning: "JSON parse error on critique response."
      };
    }

    console.log(`   Score:      ${critique.score}/100`);
    console.log(`   Passes QC:  ${critique.pass ? "✅ YES" : "❌ NO"}`);
    console.log(`   Reasoning:  ${critique.reasoning}`);
    if (critique.critiques.length > 0) {
      console.log("   Issues Identified:");
      critique.critiques.forEach((c, idx) => console.log(`      ${idx + 1}. ${c}`));
    }
    console.log("");

    history.push({
      iteration,
      code: currentCode,
      critique
    });

    finalStatus = critique;

    // Check termination condition
    if (critique.pass) {
      console.log(`   ✨  Reflector APPROVED the code in iteration ${iteration}!`);
      break;
    }

    if (iteration === maxIterations) {
      console.log("   ⚠️  Reached maximum iterations. Terminating loop.");
      break;
    }

    // Refine based on critiques
    console.log("   🔧  Refining code based on critiques...");
    const refinePrompt = buildRefinerPrompt(taskDescription, currentCode, critique.critiques);
    const rawRefinedCode = await callLLM(refinePrompt, `Generator (Refinement)`);
    currentCode = extractCodeBlock(rawRefinedCode);
    console.log("   Draft updated successfully.\n");
  }

  const duration = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  ✅  Reflection completed in ${duration}s total!`);
  console.log("═══════════════════════════════════════════════════════════\n");

  return {
    finalCode: currentCode,
    history,
    meta: {
      iterations: iteration,
      duration,
      finalScore: finalStatus.score,
      passed: finalStatus.pass
    }
  };
}

/**
 * Helper to call Ollama.
 */
async function callLLM(prompt, label, format = undefined) {
  const startTime = Date.now();
  const options = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  };
  if (format) {
    options.format = format;
  }

  const response = await ollama.chat(options);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  ${label} completed in ${elapsed}s`);
  return response.message.content;
}
