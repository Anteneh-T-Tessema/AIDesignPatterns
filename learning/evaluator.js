/**
 * Evaluator Pool Module — Benchmarking Program Performance
 * ========================================================
 * Runs generated code inside a Node.js 'vm' sandbox, running unit tests,
 * measuring execution speeds, and computing a weighted fitness score.
 */

import vm from "vm";
import { performance } from "perf_hooks";

// ─── Test Cases ──────────────────────────────────────────────────────────────

export const FIB_TEST_CASES = [
  { input: 0, expected: 0 },
  { input: 1, expected: 1 },
  { input: 5, expected: 5 },
  { input: 10, expected: 55 },
  { input: 20, expected: 6765 },
  { input: 30, expected: 832040 },
  { input: 35, expected: 9227465 } // Recursive O(2^n) takes ~30-100ms; Iterative O(n) takes <0.1ms
];

// ─── Sandboxed Execution ─────────────────────────────────────────────────────

/**
 * Runs a generated JavaScript code string against a set of test cases.
 * 
 * @param {string} codeString - The raw JS code
 * @param {Array} testCases - List of { input, expected } cases
 * @param {string} functionName - Target function name to extract
 * @returns {object} - Benchmark metrics and score
 */
export function evaluateCode(codeString, testCases, functionName = "fibonacci") {
  let passedCount = 0;
  const totalCount = testCases.length;
  let start, end;
  let durationMs = 0;
  let errors = [];

  const sandbox = {};
  
  // Wrap code and bind function to global sandbox context
  const scriptCode = `
    ${codeString}
    if (typeof ${functionName} === 'function') {
      globalThis.targetFn = ${functionName};
    }
  `;

  try {
    // Compile script with a strict execution timeout (1000ms limit to prevent infinite loops)
    const script = new vm.Script(scriptCode, { timeout: 1200 });
    const context = vm.createContext(sandbox);
    script.runInContext(context);

    const targetFn = sandbox.targetFn;
    if (typeof targetFn !== "function") {
      return {
        successRate: 0,
        passedCount: 0,
        totalCount,
        durationMs: 999,
        codeSizeChars: codeString.length,
        score: -1000,
        errors: [`No valid function named '${functionName}' found in generated code.`]
      };
    }

    // Warm up call
    try {
      targetFn(testCases[0].input);
    } catch (e) {}

    // Run tests and record timing
    start = performance.now();
    for (const tc of testCases) {
      try {
        const result = targetFn(tc.input);
        if (result === tc.expected) {
          passedCount++;
        } else {
          errors.push(`Input ${tc.input}: Expected ${tc.expected}, got ${result}`);
        }
      } catch (e) {
        errors.push(`Input ${tc.input}: Threw error: ${e.message}`);
      }
    }
    end = performance.now();
    durationMs = end - start;

  } catch (e) {
    return {
      successRate: 0,
      passedCount: 0,
      totalCount,
      durationMs: 999,
      codeSizeChars: codeString.length,
      score: -2000,
      errors: [`Compilation or execution timeout/crash: ${e.message}`]
    };
  }

  const successRate = passedCount / totalCount;
  
  // Calculate performance score (fitness function)
  // Base reward: 1000 points for 100% correctness
  // Speed penalty: 10 points per millisecond (favors O(n) or O(log n) over O(2^n))
  // Size penalty: 0.05 points per character (favors clean code)
  const speedPenalty = durationMs * 10;
  const sizePenalty = codeString.length * 0.05;
  const score = (successRate * 1000) - speedPenalty - sizePenalty;

  return {
    successRate,
    passedCount,
    totalCount,
    durationMs,
    codeSizeChars: codeString.length,
    score,
    errors
  };
}
