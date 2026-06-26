/**
 * Agent Personas and Prompt Templates
 * =====================================
 * 
 * Defines the specialized agent templates and functions for:
 *   1. Generation Agent (explores topic, writes 3 hypotheses)
 *   2. Reviewer Agents (3 expert personas: Experimentation, Impact, Novelty)
 *   3. Ranking Agent (runs Elo tournament matchups)
 *   4. Evolution Agent (refines top hypothesis based on feedback)
 *   5. Professor Agent (synthesizes report into publication-ready Markdown)
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Persona Definitions ──────────────────────────────────────────────────────

export const REVIEWER_PERSONAS = {
  experimentation: {
    name: "Experimentation Reviewer",
    role: "A highly rigorous, detail-oriented experimentalist. You focus strictly on scientific methodology, reproducibility, parameter controls, testability, and whether the proposed hypothesis can actually be verified in a laboratory or simulation context."
  },
  impact: {
    name: "Field Impact Reviewer",
    role: "A macro-minded technology strategist. You focus on scalability, societal or industrial impact, manufacturing feasibility, cost-benefit analysis, and whether solving this problem with this hypothesis will make a meaningful difference in the industry."
  },
  novelty: {
    name: "Scientific Novelty Reviewer",
    role: "An open-minded but highly critical academic. You search for creative, out-of-the-box ideas. You penalize generic, obvious, or incremental solutions. You reward unique angles, interdisciplinary connections, and paradigm shifts."
  }
};

// ─── Prompt Generators ────────────────────────────────────────────────────────

export function buildGeneratorPrompt(topic) {
  return `
You are a visionary principal research scientist specializing in proposing creative solutions to challenging scientific and engineering problems.

Review the research topic: "${topic}"

Your task is to generate exactly 3 distinct, creative, and conceptually sound scientific hypotheses. Each hypothesis must represent a different technical angle (e.g. different materials, biological systems, physics principles, or structural designs).

Respond with ONLY a JSON object (no markdown formatting, no text, just the raw JSON) matching this schema:
{
  "hypotheses": [
    {
      "id": "H1",
      "title": "Short descriptive title",
      "description": "Detailed description of the hypothesis and how it addresses the topic (100-150 words).",
      "mechanism": "The underlying physics, chemistry, biology, or mechanical principles explaining why it works."
    },
    {
      "id": "H2",
      "title": "Short descriptive title",
      "description": "Detailed description of the hypothesis (100-150 words).",
      "mechanism": "The underlying principles explaining why it works."
    },
    {
      "id": "H3",
      "title": "Short descriptive title",
      "description": "Detailed description of the hypothesis (100-150 words).",
      "mechanism": "The underlying principles explaining why it works."
    }
  ]
}
`.trim();
}

export function buildReviewerPrompt(topic, hypothesis, persona) {
  return `
You are a peer reviewer evaluating a scientific hypothesis.
Your persona/perspective is: ${persona.role}

**Research Topic:** "${topic}"
**Hypothesis to Evaluate:**
- ID: "${hypothesis.id}"
- Title: "${hypothesis.title}"
- Description: "${hypothesis.description}"
- Proposed Mechanism: "${hypothesis.mechanism}"

Analyze the hypothesis thoroughly from your specific perspective. Be critical, analytical, and fair.

Respond with ONLY a JSON object (no markdown, no extra text, just raw JSON) conforming to this schema:
{
  "reviewer_type": "${persona.name}",
  "verdict": "Accept or Reject",
  "score": 7, // Score from 1 (poor) to 10 (outstanding)
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2"
  ],
  "critique": "A detailed paragraph explaining your evaluation and constructive feedback (100-150 words)."
}
`.trim();
}

export function buildRankingPrompt(topic, hypotheses, reviews) {
  // Format the board
  const boardString = hypotheses.map(h => {
    const hReviews = reviews.filter(r => r.hypothesisId === h.id);
    const reviewsFormatted = hReviews.map(r => `  - [${r.reviewer_type}] Score: ${r.score}/10, Verdict: ${r.verdict}. Critique: "${r.critique}"`).join("\n");
    return `
Hypothesis ${h.id}: "${h.title}"
Description: ${h.description}
Mechanism: ${h.mechanism}
Peer Reviews:
${reviewsFormatted}
`.trim();
  }).join("\n\n---\n\n");

  return `
You are a scientific jury coordinator. Your task is to rank the proposed hypotheses based on their peer reviews, novelty, feasibility, and impact.

**Research Topic:** "${topic}"

**Hypothesis Board (with reviews):**
${boardString}

Evaluate the hypotheses and run a simulated head-to-head debate/tournament between all pairs of hypotheses:
- Match 1: H1 vs H2
- Match 2: H2 vs H3
- Match 3: H1 vs H3

Compare their strengths, weaknesses, and reviewer scores. Determine the winner of each match, and compile an Elo-based ranking.

Respond with ONLY a JSON object (no markdown, no text, just raw JSON) conforming to this schema:
{
  "matches": [
    {
      "matchUp": "H1 vs H2",
      "winner": "H1", // or "H2"
      "reasoning": "One sentence explaining why the winner won."
    },
    {
      "matchUp": "H2 vs H3",
      "winner": "H2", // or "H3"
      "reasoning": "One sentence explaining why the winner won."
    },
    {
      "matchUp": "H1 vs H3",
      "winner": "H1", // or "H3"
      "reasoning": "One sentence explaining why the winner won."
    }
  ],
  "leaderboard": [
    {
      "hypothesis_id": "H1", // or "H2", "H3"
      "rank": 1,
      "elo_score": 1200,
      "reasoning": "Summary of why this hypothesis earned the top rank."
    },
    {
      "hypothesis_id": "H2",
      "rank": 2,
      "elo_score": 1000,
      "reasoning": "Summary of why this hypothesis earned second rank."
    },
    {
      "hypothesis_id": "H3",
      "rank": 3,
      "elo_score": 800,
      "reasoning": "Summary of why this hypothesis earned third rank."
    }
  ]
}
`.trim();
}

export function buildEvolutionPrompt(topic, topHypothesis, reviews) {
  const reviewsFormatted = reviews.map(r => `  - [${r.reviewer_type}] Score: ${r.score}/10, Verdict: ${r.verdict}. Critique: "${r.critique}"`).join("\n");
  
  return `
You are a senior principal investigator. Your task is to evolve and refine the top-ranked hypothesis into a high-quality, comprehensive research proposal.
You must synthesize the original idea and explicitly address the critiques and weaknesses raised by the peer reviewers.

**Topic:** "${topic}"

**Top Hypothesis to Evolve:**
- Original Title: "${topHypothesis.title}"
- Description: "${topHypothesis.description}"
- Proposed Mechanism: "${topHypothesis.mechanism}"

**Peer Critiques to Mitigate:**
${reviewsFormatted}

Respond with ONLY a JSON object (no markdown, no extra text, just raw JSON) conforming to this schema:
{
  "title": "Evolved descriptive research title",
  "abstract": "Summary of the evolved proposal, chemical/physical/biological mechanisms, and anticipated impact (150-200 words).",
  "experimental_design": "Detailed step-by-step experimental protocol or verification methodology to validate the hypothesis (150-200 words).",
  "mitigation_plan": "Specific actions addressing the weaknesses raised by the peer reviewers (100-150 words)."
}
`.trim();
}

export function buildProfessorPrompt(topic, hypotheses, reviews, ranking, evolvedProposal) {
  const hFormatted = hypotheses.map(h => {
    const hReviews = reviews.filter(r => r.hypothesisId === h.id);
    const reviewsFormatted = hReviews.map(r => `  - **${r.reviewer_type}**: Grade ${r.score}/10 (Verdict: ${r.verdict})\n    *Critique:* ${r.critique}`).join("\n");
    return `### Hypothesis ${h.id}: ${h.title}\n* **Description:** ${h.description}\n* **Mechanism:** ${h.mechanism}\n\n**Peer Review Feedback:**\n${reviewsFormatted}`;
  }).join("\n\n---\n\n");

  const matchesFormatted = ranking.matches.map(m => `- **${m.matchUp}**: Winner: **${m.winner}**\n  *Reasoning:* ${m.reasoning}`).join("\n");
  const boardFormatted = ranking.leaderboard.map(l => `${l.rank}. **${l.hypothesis_id}** (Elo: ${l.elo_score})\n   *Reasoning:* ${l.reasoning}`).join("\n");

  return `
You are a distinguished University Professor.
Your task is to compile the complete trajectory of our research exploration into a single, publication-quality academic report in Markdown format.

**Research Topic:** "${topic}"

**Explored Hypotheses & Reviews:**
${hFormatted}

**Tournament Debate Outcomes:**
Matches:
${matchesFormatted}

Leaderboard:
${boardFormatted}

**Evolved Final Research Proposal:**
- **Title:** ${evolvedProposal.title}
- **Abstract:** ${evolvedProposal.abstract}
- **Experimental Design:** ${evolvedProposal.experimental_design}
- **Mitigation Plan:** ${evolvedProposal.mitigation_plan}

Generate a comprehensive, beautifully formatted Academic Exploration Report. 
Include sections:
# Academic Exploration & Discovery Report: [Descriptive Title]
## 1. Introduction & Research Topic (contextualize the problem: "${topic}")
## 2. Generated Hypotheses & Peer Evaluations (list the 3 hypotheses and review reports in full)
## 3. Tournament Ranking & Matchups (discuss the matches and final Elo rankings)
## 4. Final Evolved Research Proposal (the abstract, experimental design, and mitigation plan in full)
## 5. Next Steps & Laboratory Validation

Make the report look extremely professional, clean, and publication-ready. Output ONLY the raw Markdown text. Do not include markdown code blocks (\`\`\`markdown) wrapping the entire response.
`.trim();
}

// ─── Core LLM Communicator ─────────────────────────────────────────────────────

/**
 * Calls local Ollama Llama 3.2 model.
 * 
 * @param {string} prompt - Prompt to send.
 * @param {string} label - Print label for timing.
 * @param {boolean} jsonMode - Set to true to enforce JSON format.
 * @returns {string} Response text.
 */
export async function callLLM(prompt, label, jsonMode = false) {
  const startTime = Date.now();
  const options = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  };
  
  if (jsonMode) {
    options.format = "json";
  }

  const response = await ollama.chat(options);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  [Agent CPU] ${label} completed in ${elapsed}s`);
  return response.message.content;
}
