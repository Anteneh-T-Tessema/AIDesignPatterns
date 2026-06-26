/**
 * Goal Setting and Monitoring Agent Module
 * =========================================
 * Implements the Goal Setting and Monitoring pattern:
 * 
 * 1. GoalBreakdown: Breaks down high-level objectives into specific checklist items.
 * 2. CodeGenerator: Generates or refines code to satisfy objectives and checklist.
 * 3. MonitorReviewer: Audits generated code against the checklist and provides feedback.
 *    (Optionally executes the code inside a sandboxed VM to verify correctness.)
 * 4. GoalJudge: Evaluates the reviewer's audit and determines if all goals are fully met.
 */

import { Ollama } from "ollama";
import vm from "vm";

// Utility to clean Markdown code block wrappers
function cleanCodeBlock(code) {
  let lines = code.trim().split("\n");
  if (lines.length > 0 && lines[0].trim().startsWith("```")) {
    lines.shift();
  }
  if (lines.length > 0 && lines[lines.length - 1].trim() === "```") {
    lines.pop();
  }
  return lines.join("\n").trim();
}

/**
 * Sandboxed code executor to verify logic correctness without risking host safety.
 */
function testCodeInSandbox(codeString, testCases, functionName) {
  if (!testCases || testCases.length === 0) {
    return { success: true, summary: "No test cases provided." };
  }

  // Strip ES6 ESM exports so the code can execute inside node vm context as standard script
  let cleanCode = codeString
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+const\s+/g, "const ")
    .replace(/export\s+function\s+/g, "function ")
    .replace(/export\s+class\s+/g, "class ");

  // Strip CommonJS exports to avoid "module is not defined" or "exports is not defined" crashes
  cleanCode = cleanCode
    .replace(/module\.exports\s*=\s*[a-zA-Z0-9_]+;?/g, "")
    .replace(/exports\.[a-zA-Z0-9_]+\s*=\s*[a-zA-Z0-9_]+;?/g, "");

  // Default target function parsing/guessing if not explicitly passed
  let targetFnName = functionName;
  if (!targetFnName) {
    const match = cleanCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
    if (match) {
      targetFnName = match[1];
    } else {
      const arrowMatch = cleanCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\(/);
      if (arrowMatch) targetFnName = arrowMatch[1];
    }
  }

  if (!targetFnName) {
    return {
      success: false,
      summary: "Error: Could not identify target function name to test."
    };
  }

  const scriptWrapped = `
    ${cleanCode}
    if (typeof ${targetFnName} === 'function') {
      globalThis.targetFn = ${targetFnName};
    }
  `;

  const sandbox = {};
  let passedCount = 0;
  const errors = [];

  try {
    const script = new vm.Script(scriptWrapped, { timeout: 1000 });
    const context = vm.createContext(sandbox);
    script.runInContext(context);

    const targetFn = sandbox.targetFn;
    if (typeof targetFn !== "function") {
      return {
        success: false,
        summary: `Error: Function '${targetFnName}' is not defined or is not a function.`
      };
    }

    for (const tc of testCases) {
      try {
        const result = targetFn(tc.input);
        if (result === tc.expected) {
          passedCount++;
        } else {
          errors.push(`Input ${JSON.stringify(tc.input)}: Expected ${JSON.stringify(tc.expected)}, but got ${JSON.stringify(result)}`);
        }
      } catch (err) {
        errors.push(`Input ${JSON.stringify(tc.input)}: Threw exception: ${err.message}`);
      }
    }
  } catch (err) {
    return {
      success: false,
      summary: `Compilation/execution crash inside sandbox: ${err.message}`
    };
  }

  const success = passedCount === testCases.length;
  const summary = success
    ? `All ${testCases.length} automated test cases passed successfully.`
    : `${passedCount}/${testCases.length} automated test cases passed. Failures:\n` + errors.map(e => `  - ${e}`).join("\n");

  return { success, summary };
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildGoalBreakdownPrompt(useCase, goalsInput) {
  return `
You are an expert software architect.
We need to generate high-quality JavaScript code for the following task:
**Task:** "${useCase}"

The user has specified these high-level quality goals:
**Goals:** "${goalsInput}"

Your task is to decompose these goals into a concrete, itemized checklist of exactly 3 to 4 specific, measurable success criteria (e.g., handles null/undefined, uses standard ES6 export, passes all test cases).

**Important Guidelines:**
1. Do NOT generate checklists that are logically impossible or contradict the problem requirements.
2. Keep items focused on concrete and objective properties: functional correctness, type/input validation, code style, and standard exports.
3. Every item must be distinct and straightforward to verify.

Respond with ONLY a valid JSON object matching this schema (do not include any conversational text or formatting outside the JSON):
{
  "checklist": [
    "Specific criterion 1",
    "Specific criterion 2",
    "Specific criterion 3"
  ]
}
`.trim();
}

function buildGeneratorPrompt(useCase, checklist, previousCode = "", feedback = "", sandboxSummary = "", testCases = null, functionName = "") {
  const checklistString = checklist.map((item, idx) => `- [ ] ${item}`).join("\n");
  
  let prompt = `
You are a senior JavaScript developer.
Write high-quality JavaScript code for the following task:
**Task:** "${useCase}"

**Concrete Quality Checklist to Satisfy:**
${checklistString}
`;

  if (testCases && testCases.length > 0 && functionName) {
    prompt += `
**Expected Test Case Behaviors:**
${testCases.map(tc => `- \`${functionName}(${JSON.stringify(tc.input)})\` must return \`${JSON.stringify(tc.expected)}\``).join("\n")}
`;
  }

  if (previousCode) {
    prompt += `
**Previous Code Draft:**
\`\`\`javascript
${previousCode}
\`\`\`

**Actual Sandbox Test Execution Results on the Previous Draft:**
${sandboxSummary || "No automated tests were run."}

**Feedback from Code Reviewer:**
${feedback}

**Instructions for Refinement:**
You MUST write functionally correct code that passes all the automated test cases. Look closely at the Sandbox Test Execution Results above. If there are test failures, it means your function returned incorrect results for those inputs. Diagnose the logical bug, rewrite the code to correct it, and ensure it satisfies all other checklist items.

**Critical Requirements:**
1. Do NOT use CommonJS syntax (\`module.exports\` or \`require\`). Only use ES6 module syntax (\`export default ...\` or \`export function ...\`).
2. Do NOT copy code changes recommended by the reviewer blindly if they break the functional correctness or cause test failures. Focus on writing correct logic first.
3. Make sure you don't miss key logical components (like incrementing gap counters when encountering zeros).
`;
  } else {
    prompt += `
**Instructions:**
Draft the initial implementation of the JavaScript code. Follow standard ES6 module syntax if exporting. Make sure the code is completely self-contained.
Do NOT use CommonJS syntax (\`module.exports\` or \`require\`). Only use ES6 module syntax (\`export default ...\` or \`export function ...\`).
`;
  }

  prompt += `
Output ONLY the raw JavaScript code inside a single markdown code block (e.g., \`\`\`javascript ... \`\`\`).
Do NOT include any extra explanations, introductory text, or usage examples outside of the code block.
`;

  return prompt.trim();
}

function buildReviewerPrompt(code, checklist, sandboxSummary) {
  const checklistString = checklist.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
  
  return `
You are a thorough JavaScript code auditor.
Evaluate the code snippet provided below against the following success checklist.

**Checklist:**
${checklistString}

**Code to Evaluate:**
\`\`\`javascript
${code}
\`\`\`

**Automated Sandbox Test Execution Results:**
${sandboxSummary || "No automated tests were run."}

Write a review report.
For each checklist item, you must determine its status: "MET" or "UNMET".

**Evaluation Guidelines:**
- For functional/correctness goals (e.g. passing test cases, handling edge cases): The "Automated Sandbox Test Execution Results" are the final authority. If all automated tests passed successfully (outcome is SUCCESS), all functional/correctness goals are MET.
- For export goals: The use of ES6 module syntax (like \`export default function ...\` or \`export function ...\`) is correct and MET.
- For code style/naming: Standard naming conventions (like camelCase) are correct and MET.
- Only mark a checklist item as UNMET if there is an actual, explicit bug or violation in the code. If the code is correct, mark all items as MET.

Respond with ONLY a valid JSON object matching this schema (do not include any conversational text or formatting outside the JSON):
{
  "evaluations": [
    {
      "index": 1,
      "criterion": "Criterion description",
      "status": "MET",
      "justification": "Why it is met or unmet"
    }
  ]
}
`.trim();
}

function buildJudgePrompt(checklist, reviewReport) {
  const checklistString = checklist.map((item, idx) => `${idx + 1}. ${item}`).join("\n");

  return `
You are an objective QA inspector.
Review the following audit report compiled by the code reviewer.

**Checklist:**
${checklistString}

**Review Report:**
"""
${reviewReport}
"""

Based on the review report, have ALL items on the checklist been fully and successfully MET?
Answer with exactly one word: "true" or "false".
Do NOT include any punctuation, explanation, or extra words. Output ONLY "true" or "false".
`.trim();
}

// ─── Agent Orchestrator ──────────────────────────────────────────────────────

export class GoalMonitoringAgent {
  constructor(ollamaInstance, modelName) {
    this.ollama = ollamaInstance || new Ollama({ host: "http://localhost:11434" });
    this.model = modelName || "llama3.2";
  }

  /**
   * Run the LLM helper
   */
  async callLLM(prompt, label, format = undefined) {
    const options = {
      model: this.model,
      messages: [{ role: "user", content: prompt }]
    };
    if (format) {
      options.format = format;
    }
    const response = await this.ollama.chat(options);
    return response.message.content.trim();
  }

  /**
   * Run the Goal Setting and Monitoring loop
   * 
   * @param {string} useCase - Coding problem definition
   * @param {string} goalsInput - User quality goals
   * @param {number} maxIterations - Limit on iteration cycles
   * @param {object} callbacks - Optional callbacks for stdout tracking
   * @param {Array} testCases - Optional test cases to run in sandbox
   * @param {string} functionName - Target function name to run tests on
   */
  async run(useCase, goalsInput, maxIterations = 5, callbacks = {}, testCases = null, functionName = null) {
    const trace = (msg, type = "debug") => {
      if (callbacks.onTrace) callbacks.onTrace(msg, type);
    };

    trace("Decomposing high-level goals into criteria...", "info");
    const breakdownPrompt = buildGoalBreakdownPrompt(useCase, goalsInput);
    const rawBreakdown = await this.callLLM(breakdownPrompt, "GoalBreakdown", "json");

    let checklist = [];
    try {
      const jsonMatch = rawBreakdown.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawBreakdown);
      checklist = parsed.checklist || parsed.goals || [];
    } catch (e) {
      trace("⚠️ JSON parsing failed on GoalBreakdown. Falling back to default checklist.", "warn");
      checklist = goalsInput.split(",").map(g => g.trim());
    }

    trace(`Generated success checklist:`, "info");
    checklist.forEach((item, index) => {
      trace(`  [${index + 1}] ${item}`, "checklist");
    });

    let currentCode = "";
    let reviewReport = "";
    let sandboxSummary = "";
    let approved = false;
    let iteration = 0;
    const history = [];

    for (iteration = 1; iteration <= maxIterations; iteration++) {
      trace(`\n=== 🔁 Iteration ${iteration} of ${maxIterations} ===`, "header");

      // 1. Generate / Refine Code using previous code, review, previous sandbox summary AND expected test cases
      trace("Generating JavaScript code...", "generator-start");
      const generatorPrompt = buildGeneratorPrompt(useCase, checklist, currentCode, reviewReport, sandboxSummary, testCases, functionName);
      const rawCode = await this.callLLM(generatorPrompt, "CodeGenerator");
      currentCode = cleanCodeBlock(rawCode);
      
      trace(`Code Draft:\n----------------------------------------\n${currentCode}\n----------------------------------------`, "code");

      // 2. Automated sandbox test execution
      sandboxSummary = "No automated tests were run.";
      let testSuccess = true;
      if (testCases && testCases.length > 0) {
        trace("Executing code inside sandbox...", "info");
        const testResult = testCodeInSandbox(currentCode, testCases, functionName);
        sandboxSummary = testResult.summary;
        testSuccess = testResult.success;
        trace(`Sandbox execution outcome: ${testSuccess ? "💚 SUCCESS" : "❤️ FAILURE"}\n${sandboxSummary}`, "info");
      }

      // 3. Monitor and Review
      trace("Auditing code against checklist...", "reviewer-start");
      const reviewerPrompt = buildReviewerPrompt(currentCode, checklist, sandboxSummary);
      reviewReport = await this.callLLM(reviewerPrompt, "MonitorReviewer", "json");
      trace(`Audit Report:\n----------------------------------------\n${reviewReport}\n----------------------------------------`, "review");

      // 4. Judge Goal Completion
      trace("Judging goal satisfaction...", "judge-start");
      approved = false;
      let judgeVerdict = "false";
      try {
        const jsonMatch = reviewReport.match(/\{[\s\S]*\}/);
        const parsedReport = JSON.parse(jsonMatch ? jsonMatch[0] : reviewReport);
        const evaluations = parsedReport.evaluations || [];
        
        if (evaluations.length > 0) {
          const unmetItems = evaluations.filter(ev => ev.status === "UNMET");
          if (unmetItems.length === 0) {
            approved = true;
            judgeVerdict = "true (All items marked MET)";
          } else {
            judgeVerdict = `false (Unmet criteria: ${unmetItems.map(ev => `${ev.criterion || ev.item} - ${ev.justification}`).join("; ")})`;
          }
        } else {
          throw new Error("No evaluations found in parsed JSON.");
        }
      } catch (e) {
        trace(`⚠️ JSON parsing/evaluation failed (${e.message}). Falling back to LLM judge.`, "warn");
        const judgePrompt = buildJudgePrompt(checklist, reviewReport);
        const verdictText = await this.callLLM(judgePrompt, "GoalJudge");
        approved = verdictText.toLowerCase().includes("true");
        judgeVerdict = approved ? `true (via LLM fallback: "${verdictText}")` : `false (via LLM fallback: "${verdictText}")`;
      }
      
      trace(`Verdict: Goals Met = ${approved ? "💚 TRUE" : "❤️ FALSE"} (Verdict: ${judgeVerdict})`, "judge-result");

      history.push({
        iteration,
        code: currentCode,
        review: reviewReport,
        approved,
        sandbox: sandboxSummary
      });

      if (approved) {
        trace("🎉 Success! All objectives met. Terminating review loop.", "success");
        break;
      } else {
        trace("Checklist not fully satisfied. Preparing for refinement...", "refining");
      }
    }

    return {
      success: approved,
      iterationsRun: Math.min(iteration, maxIterations),
      finalCode: currentCode,
      checklist,
      history
    };
  }
}
