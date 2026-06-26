/**
 * Parallelization Pattern — Code Audit Suite
 * ============================================
 * 
 * Demonstrates the PARALLELIZATION agentic design pattern:
 * 
 *   1. Dispatches security, performance, and style/best-practice audits concurrently.
 *   2. Uses Promise.all to run all three audits simultaneously.
 *   3. Collects findings and invokes a Synthesizer LLM to produce a cohesive Markdown report.
 * 
 *                                ┌─── 🔒 Security Audit (concurrent)
 *                                │
 *   Code Input ──▶ Promise.all ──┼─── ⚡ Performance Audit (concurrent)  ──▶ 📊 Synthesizer ──▶ Unified Report
 *                                │
 *                                └─── 🎨 Style & Practices Audit (concurrent)
 * 
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Auditor Prompts ─────────────────────────────────────────────────────────

const AUDITORS = {
  security: {
    name: "Security Auditor",
    emoji: "🔒",
    prompt: (code) => `
You are an expert Application Security Engineer (AppSec).
Audit the following code for security vulnerabilities, injection risks, hardcoded credentials, data exposure, timing attacks, weak cryptography, and input validation failures.

**Source Code:**
\`\`\`javascript
${code}
\`\`\`

List all security issues found. For each issue, provide:
- **Issue**: Short description
- **Severity**: CRITICAL, HIGH, MEDIUM, or LOW
- **Lines**: Approximate line numbers
- **Impact & Fix**: Explanation of the risk and how to fix it

Keep your analysis strictly technical, concise, and focused only on security issues.
`.trim(),
  },

  performance: {
    name: "Performance Auditor",
    emoji: "⚡",
    prompt: (code) => `
You are a Principal Performance Engineer.
Audit the following code for performance bottlenecks, algorithmic complexity (Big O), blocking synchronous calls (especially in Event Loops), memory leaks, unbounded caches, unawaited promises, and resource management issues.

**Source Code:**
\`\`\`javascript
${code}
\`\`\`

List all performance issues found. For each issue, provide:
- **Issue**: Short description
- **Severity**: HIGH, MEDIUM, or LOW
- **Lines**: Approximate line numbers
- **Impact & Fix**: Explanation of the bottleneck and how to optimize it

Keep your analysis strictly technical, concise, and focused only on performance/efficiency.
`.trim(),
  },

  style: {
    name: "Style & Best Practices Auditor",
    emoji: "🎨",
    prompt: (code) => `
You are a Technical Lead focusing on code quality and best practices.
Audit the following code for readability, separation of concerns, robust error handling, naming conventions (clean code), long functions, duplicate code, and general best practices.

**Source Code:**
\`\`\`javascript
${code}
\`\`\`

List all code smells, style infractions, and best practice issues. For each issue, provide:
- **Issue**: Short description
- **Severity**: HIGH, MEDIUM, or LOW
- **Lines**: Approximate line numbers
- **Impact & Fix**: Explanation of why it's a code smell and how to refactor it

Keep your analysis strictly technical, concise, and focused on clean code, maintainability, and error handling.
`.trim(),
  }
};

// ─── Synthesizer Prompt ──────────────────────────────────────────────────────

function buildSynthesizerPrompt(code, securityResult, performanceResult, styleResult) {
  return `
You are a Principal Software Engineer compiling a final Unified Code Audit Report.
You are given the original source code and the independent reviews of three specialist auditors: Security, Performance, and Style/Best Practices.

Compile these findings into a single, beautifully organized Markdown report.

**Original Source Code:**
\`\`\`javascript
${code}
\`\`\`

---

**Auditor Findings:**

### Security Auditor Findings:
${securityResult}

### Performance Auditor Findings:
${performanceResult}

### Style & Best Practices Auditor Findings:
${styleResult}

---

**Instructions for the Final Report:**
1. Create a structured markdown summary.
2. Rank all discovered issues across all categories in a unified table sorted by Severity (CRITICAL first, then HIGH, MEDIUM, LOW). Include columns: Category, Issue, Severity, Line Range.
3. Group detailed issues by Auditor Category, removing any redundant findings if auditors overlapped.
4. Provide a single, final "Refactored Code" block at the bottom that applies all recommendations (fixes, optimizations, refactoring) to make the code production-ready. Do not use placeholders; write the complete, refactored code.

Respond with ONLY the finalized Markdown report.
`.trim();
}

// ─── Core Runner ─────────────────────────────────────────────────────────────

/**
 * Invokes Ollama for a single auditor prompt.
 */
async function runSingleAuditor(key, code) {
  const auditor = AUDITORS[key];
  const startTime = Date.now();
  console.log(`   ${auditor.emoji}  Starting ${auditor.name}...`);

  try {
    const response = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: auditor.prompt(code) }]
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅  Finished ${auditor.name} in ${duration}s`);
    return {
      success: true,
      key,
      name: auditor.name,
      content: response.message.content
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`   ❌  Failed ${auditor.name} after ${duration}s: ${error.message}`);
    return {
      success: false,
      key,
      name: auditor.name,
      content: `Failed to run ${auditor.name}: ${error.message}`
    };
  }
}

/**
 * Runs the parallel audit suite on the provided code.
 * 
 * @param {string} code - The source code to audit
 * @returns {object} - Compilation of audit outputs and final unified report
 */
export async function runParallelAudit(code) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  📊  PARALLELIZATION PATTERN — Code Audit Suite");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Step 1: Run Auditors in Parallel ───────────────────────────────────
  console.log("━━━ Step 1: 🕒 Running Auditors Concurrently ━━━━━━━━━━━━");
  const overallStartTime = Date.now();

  const auditPromises = Object.keys(AUDITORS).map(key => runSingleAuditor(key, code));
  const auditResults = await Promise.all(auditPromises);
  
  const parallelDuration = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  console.log(`\n   ⏱  All parallel audits completed in ${parallelDuration}s total!\n`);

  // Map results to variables
  const securityRes = auditResults.find(r => r.key === "security").content;
  const performanceRes = auditResults.find(r => r.key === "performance").content;
  const styleRes = auditResults.find(r => r.key === "style").content;

  // ── Step 2: Synthesize Results ─────────────────────────────────────────
  console.log("━━━ Step 2: 📊 Synthesizing Findings ━━━━━━━━━━━━━━━━━━━━");
  const synthStartTime = Date.now();

  const synthPrompt = buildSynthesizerPrompt(code, securityRes, performanceRes, styleRes);
  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: synthPrompt }]
  });

  const synthDuration = ((Date.now() - synthStartTime) / 1000).toFixed(1);
  console.log(`   ⏱  Synthesis completed in ${synthDuration}s\n`);

  const report = response.message.content;
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ✅  Code audit completed successfully!");
  console.log("═══════════════════════════════════════════════════════════\n");

  return {
    audits: {
      security: securityRes,
      performance: performanceRes,
      style: styleRes
    },
    report,
    meta: {
      parallelDuration,
      synthDuration,
      totalDuration: ((Date.now() - overallStartTime) / 1000).toFixed(1)
    }
  };
}
