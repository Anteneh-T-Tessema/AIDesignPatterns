/**
 * Prompt Chaining — Code Review Pipeline (Reusable Module)
 * =========================================================
 *
 * A 3-step prompt chain using Ollama (Llama 3.2):
 *
 *   Step 1 — Analyze:   Understand the code's purpose, structure, and patterns
 *   Step 2 — Identify:  Find bugs, code smells, security issues, and improvements
 *   Step 3 — Fix:       Generate concrete, actionable fix suggestions with code
 *
 * Each step's output is fed as context into the next step,
 * demonstrating the core prompt chaining pattern.
 *
 * Usage:
 *   import { runCodeReviewChain } from "./chain.js";
 *   const results = await runCodeReviewChain(codeString);
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";

const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Prompt Templates ──────────────────────────────────────────────────────────

const PROMPTS = {
  /**
   * Step 1: Analyze the code
   * Input:  raw source code
   * Output: structured analysis (purpose, patterns, complexity)
   */
  analyze: (code) => `
You are an expert code analyst. Analyze the following code and provide a structured summary.

**Code to analyze:**
\`\`\`
${code}
\`\`\`

Respond with ONLY the following sections:

## Purpose
What does this code do? Summarize in 2-3 sentences.

## Structure
- List the key functions/classes and their roles
- Describe the control flow

## Patterns
- What design patterns or idioms are used?
- What is the overall code style?

## Complexity Assessment
Rate the complexity as LOW / MEDIUM / HIGH and explain why.
`.trim(),

  /**
   * Step 2: Identify issues
   * Input:  original code + analysis from Step 1
   * Output: categorized list of issues
   */
  identify: (code, analysis) => `
You are an expert code reviewer. Using the analysis below, identify all issues in the code.

**Original Code:**
\`\`\`
${code}
\`\`\`

**Code Analysis:**
${analysis}

Find and categorize issues into these groups. For each issue, reference the specific line or function.

## 🐛 Bugs
Logical errors, off-by-one errors, null/undefined issues, race conditions.

## 🔒 Security
Injection risks, data exposure, unsafe operations.

## 🧹 Code Smells
Duplication, long functions, poor naming, magic numbers, dead code.

## ⚡ Performance
Unnecessary iterations, memory leaks, blocking operations.

## 📐 Best Practices
Missing error handling, no input validation, poor separation of concerns.

If a category has no issues, write "None found." under it.
Rank issues by severity: CRITICAL > HIGH > MEDIUM > LOW.
`.trim(),

  /**
   * Step 3: Suggest fixes
   * Input:  original code + issues from Step 2
   * Output: concrete fix suggestions with code examples
   */
  fix: (code, issues) => `
You are an expert software engineer. Based on the issues identified below, provide concrete fixes.

**Original Code:**
\`\`\`
${code}
\`\`\`

**Identified Issues:**
${issues}

For each issue, provide:

1. **Issue**: One-line summary
2. **Severity**: CRITICAL / HIGH / MEDIUM / LOW
3. **Fix**: Explain the fix in 1-2 sentences
4. **Code**: Show the corrected code snippet

After addressing all individual issues, provide a **Final Refactored Version** of the complete code with all fixes applied.
`.trim(),
};

// ─── Chain Runner ───────────────────────────────────────────────────────────────

/**
 * Calls Ollama and returns the response text.
 */
async function callLLM(prompt, stepName) {
  const startTime = Date.now();

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  ${stepName} completed in ${elapsed}s\n`);

  return response.message.content;
}

/**
 * Runs the full 3-step prompt chain on the given source code.
 *
 * @param {string} code - The source code to review
 * @returns {object} - Results from each step of the chain
 */
export async function runCodeReviewChain(code) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔗  PROMPT CHAINING — Code Review Pipeline");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Step 1: Analyze ─────────────────────────────────────────────────────
  console.log("━━━ Step 1/3: 🔍 Analyzing Code ━━━━━━━━━━━━━━━━━━━━━━━━━");
  const analysis = await callLLM(PROMPTS.analyze(code), "Analysis");
  console.log(analysis);
  console.log("\n");

  // ── Step 2: Identify Issues ─────────────────────────────────────────────
  // Chain: feed Step 1 output (analysis) into Step 2
  console.log("━━━ Step 2/3: 🐛 Identifying Issues ━━━━━━━━━━━━━━━━━━━━━");
  const issues = await callLLM(PROMPTS.identify(code, analysis), "Issue Detection");
  console.log(issues);
  console.log("\n");

  // ── Step 3: Suggest Fixes ───────────────────────────────────────────────
  // Chain: feed Step 2 output (issues) into Step 3
  console.log("━━━ Step 3/3: 🔧 Suggesting Fixes ━━━━━━━━━━━━━━━━━━━━━━━");
  const fixes = await callLLM(PROMPTS.fix(code, issues), "Fix Generation");
  console.log(fixes);
  console.log("\n");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ✅  Pipeline complete!");
  console.log("═══════════════════════════════════════════════════════════\n");

  return { analysis, issues, fixes };
}
