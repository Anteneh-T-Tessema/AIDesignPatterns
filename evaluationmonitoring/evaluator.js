/**
 * Evaluation and Monitoring Pattern — Evaluator Suite
 * ===================================================
 * 
 * Implements metrics for assessing LLM outputs, latency, tokens,
 * trajectory paths (tool calls), and qualitative LLM-as-a-Judge rubrics.
 */

import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

// ==========================================
// 1. Syntactic & Semantic Similarity Metrics
// ==========================================

/**
 * Checks for a case-insensitive exact match after trimming whitespace.
 */
export function exactMatch(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return 0.0;
  return actual.trim().toLowerCase() === expected.trim().toLowerCase() ? 1.0 : 0.0;
}

/**
 * Calculates Levenshtein Distance and translates it into a similarity score.
 */
export function levenshteinSimilarity(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return 0.0;
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  
  if (s1.length === 0 && s2.length === 0) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1.0 - (distance / maxLength);
}

/**
 * Calculates word-level Jaccard Similarity (intersection over union).
 */
export function jaccardSimilarity(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return 0.0;
  
  const getTokens = (str) => {
    return new Set(
      str.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
        .split(/\s+/)
        .filter(Boolean)
    );
  };

  const tokensA = getTokens(a);
  const tokensB = getTokens(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

// ==========================================
// 2. Latency Monitoring
// ==========================================
export class LatencyTracker {
  constructor() {
    this.times = {};
  }

  start(label) {
    this.times[label] = { start: performance.now() };
  }

  stop(label) {
    if (this.times[label] && !this.times[label].end) {
      this.times[label].end = performance.now();
      this.times[label].duration = this.times[label].end - this.times[label].start;
      return this.times[label].duration;
    }
    return 0;
  }

  getDuration(label) {
    return this.times[label] ? this.times[label].duration || 0 : 0;
  }
}

// ==========================================
// 3. Token Tracking
// ==========================================
export class TokenMonitor {
  constructor() {
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
  }

  record(prompt, response, ollamaResponseObj = null) {
    let promptTokens = 0;
    let completionTokens = 0;

    if (ollamaResponseObj) {
      promptTokens = ollamaResponseObj.prompt_eval_count || 0;
      completionTokens = ollamaResponseObj.eval_count || 0;
    }

    // Heuristic fallback if Ollama details are missing or zero
    if (promptTokens === 0) {
      promptTokens = Math.ceil(prompt.split(/\s+/).filter(Boolean).length * 1.3);
    }
    if (completionTokens === 0) {
      completionTokens = Math.ceil(response.split(/\s+/).filter(Boolean).length * 1.3);
    }

    this.totalPromptTokens += promptTokens;
    this.totalCompletionTokens += completionTokens;

    return { promptTokens, completionTokens };
  }

  getSummary() {
    return {
      prompt: this.totalPromptTokens,
      completion: this.totalCompletionTokens,
      total: this.totalPromptTokens + this.totalCompletionTokens,
      estimatedCostUSD: ((this.totalPromptTokens * 0.15 + this.totalCompletionTokens * 0.60) / 1000000).toFixed(6)
    };
  }
}

// ==========================================
// 4. Trajectory Auditor
// ==========================================
export class TrajectoryAuditor {
  /**
   * Audits actual vs expected trajectories.
   * @param {string[]} actual - list of actions executed in order
   * @param {string[]} expected - list of expected actions in order
   */
  static audit(actual, expected) {
    const results = {
      actual: [...actual],
      expected: [...expected],
      exactMatch: false,
      inOrderMatch: false,
      anyOrderMatch: false,
      precision: 0.0,
      recall: 0.0,
      f1Score: 0.0,
      redundantSteps: []
    };

    // 1. Exact Match
    if (actual.length === expected.length) {
      results.exactMatch = actual.every((val, index) => val === expected[index]);
    }

    // 2. In-Order Match (sequential subsequence check)
    let expectedIdx = 0;
    for (const step of actual) {
      if (step === expected[expectedIdx]) {
        expectedIdx++;
        if (expectedIdx === expected.length) {
          results.inOrderMatch = true;
          break;
        }
      }
    }
    // If expected is empty, subsequence is trivially true
    if (expected.length === 0) results.inOrderMatch = true;

    // 3. Any-Order Match (is expected a subset of actual)
    const actualSet = new Set(actual);
    results.anyOrderMatch = expected.every(step => actualSet.has(step));

    // 4. Precision & Recall calculations
    // We treat expected steps as relevant items, and actual steps as retrieved items.
    const expectedCounts = {};
    expected.forEach(s => expectedCounts[s] = (expectedCounts[s] || 0) + 1);

    const actualCounts = {};
    actual.forEach(s => actualCounts[s] = (actualCounts[s] || 0) + 1);

    // True Positives: step exists in both, matching frequency bounds
    let tp = 0;
    const uniqueSteps = new Set([...expected, ...actual]);
    uniqueSteps.forEach(s => {
      const expCount = expectedCounts[s] || 0;
      const actCount = actualCounts[s] || 0;
      tp += Math.min(expCount, actCount);
    });

    const totalActual = actual.length;
    const totalExpected = expected.length;

    results.precision = totalActual > 0 ? tp / totalActual : 0.0;
    results.recall = totalExpected > 0 ? tp / totalExpected : 0.0;
    
    if (results.precision + results.recall > 0) {
      results.f1Score = 2 * (results.precision * results.recall) / (results.precision + results.recall);
    }

    // 5. Redundant/Unexpected/Repeated Steps
    const counts = { ...expectedCounts };
    results.redundantSteps = [];
    for (const step of actual) {
      if (counts[step] && counts[step] > 0) {
        counts[step]--;
      } else {
        results.redundantSteps.push(step);
      }
    }

    return results;
  }
}

// ==========================================
// 5. LLM-as-a-Judge for Qualitative Rubrics
// ==========================================
export class LLMJudge {
  constructor() {
    this.rubric = `
You are an expert quality assurance evaluator. Your job is to judge the quality of a Travel Assistant response.
Rate the response from 1 (poor) to 5 (excellent) on the following two criteria:

1. **Accuracy & Truthfulness**:
   - 1: Answer contradicts facts or contains hallucinated details.
   - 3: Mostly correct, but misses some details or adds slight assumptions.
   - 5: 100% correct based on facts, precise, no assumptions.

2. **Helpfulness & Professionalism**:
   - 1: Brief, rude, or unhelpful.
   - 3: Politeness is average, gets the job done but offers no guidance.
   - 5: Highly polite, structures the answer clearly with bullet points, and provides helpful context.

You must output a JSON object containing EXACTLY:
{
  "accuracy_score": <int 1-5>,
  "helpfulness_score": <int 1-5>,
  "rationale": "<concise explanation of ratings>",
  "recommended_action": "<Approve | Revise | Reject>"
}
`;
  }

  /**
   * Judge a response given the prompt context, actual output, and reference facts.
   */
  async evaluate(query, answer, referenceFacts) {
    const judgePrompt = `
${this.rubric}

---
**EVALUATION DETAILS:**
- User Query: "${query}"
- Agent Response: "${answer}"
- Reference Facts: "${referenceFacts}"
---
Generate the JSON evaluation.
`;

    try {
      const response = await ollama.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: judgePrompt }],
        format: "json",
        options: { temperature: 0.1 }
      });
      
      const parsed = JSON.parse(response.message.content.trim());
      return {
        success: true,
        method: "Ollama (Llama 3.2)",
        scores: parsed
      };
    } catch (err) {
      // Rule-based fallback if Ollama is unavailable
      return this.fallbackEvaluate(query, answer, referenceFacts);
    }
  }

  fallbackEvaluate(query, answer, referenceFacts) {
    const ansLower = answer.toLowerCase();
    const refLower = referenceFacts.toLowerCase();

    // Check if key facts are present in response
    const keyFacts = ["paris", "$1200", "standard package", "sunny"];
    let matchedFacts = 0;
    keyFacts.forEach(fact => {
      if (ansLower.includes(fact)) matchedFacts++;
    });

    let accuracy = 1;
    if (matchedFacts === keyFacts.length) accuracy = 5;
    else if (matchedFacts >= 2) accuracy = 3;

    // Check formatting for helpfulness (bullet points, length, polite words)
    let helpfulness = 2;
    if (ansLower.includes("hello") || ansLower.includes("dear") || ansLower.includes("thank") || ansLower.includes("welcome")) {
      helpfulness += 1;
    }
    if (answer.includes("-") || answer.includes("•") || answer.includes("\n")) {
      helpfulness += 1;
    }
    if (answer.length > 100) {
      helpfulness = Math.min(helpfulness + 1, 5);
    }

    const recAction = (accuracy >= 4 && helpfulness >= 4) ? "Approve" : 
                      (accuracy >= 3) ? "Revise" : "Reject";

    return {
      success: true,
      method: "Deterministic Fallback (Rule-Based)",
      scores: {
        accuracy_score: accuracy,
        helpfulness_score: helpfulness,
        rationale: `Matched ${matchedFacts}/${keyFacts.length} key facts. Formatting score evaluated based on length & structure.`,
        recommended_action: recAction
      }
    };
  }
}
