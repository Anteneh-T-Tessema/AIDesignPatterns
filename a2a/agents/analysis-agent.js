/**
 * Analysis Agent — Specialist in Data Analysis & Trend Synthesis
 * ==============================================================
 *
 * Skills: data_analysis, trend_synthesis, comparison
 *
 * This agent handles TASK_REQUEST messages related to analysis tasks.
 * It demonstrates inter-agent dependency: it expects research data as
 * input context (from the Research Agent's output) and synthesizes
 * higher-level insights.
 *
 * Negotiation behavior:
 *   - ACCEPTS analysis tasks that include research data in context
 *   - COUNTERS tasks missing research data (requests research first)
 *   - REJECTS tasks outside its analytical domain
 */

import { Ollama } from "ollama";
import { AgentCard } from "../agent-card.js";
import {
  MessageType,
  NegotiationStatus,
  createNegotiation,
  createTaskResponse,
} from "../a2a-protocol.js";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Agent Card ──────────────────────────────────────────────────────────────

export const analysisAgentCard = new AgentCard({
  id: "analysis-agent-001",
  name: "Analysis Specialist",
  description: "Synthesizes research data into strategic insights, trend analysis, and comparative assessments",
  skills: ["data_analysis", "trend_synthesis", "comparison"],
  inputTypes: [MessageType.TASK_REQUEST, MessageType.NEGOTIATE],
  outputTypes: [MessageType.TASK_RESPONSE, MessageType.NEGOTIATE],
  version: "1.0.0",
});

// ─── Skill Check ─────────────────────────────────────────────────────────────

function isAnalysisTask(task) {
  const lower = (task || "").toLowerCase();
  const keywords = ["analyze", "analysis", "synthesize", "synthesis", "compare", "comparison", "assess", "evaluate", "insight", "trends"];
  return keywords.some((kw) => lower.includes(kw));
}

// ─── LLM Call ────────────────────────────────────────────────────────────────

async function performAnalysis(topic, researchData) {
  const formattedResearch = JSON.stringify(researchData, null, 2);

  const prompt = `
You are a Strategic Analysis Specialist. You receive research findings and produce a deeper analytical synthesis.

**Topic:** "${topic}"

**Research Findings:**
${formattedResearch}

**Your Task:**
Analyze the research findings and produce a strategic analysis. For each trend:
1. Assess its potential impact (high/medium/low)
2. Identify connections between trends
3. Highlight risks and opportunities

Respond with ONLY a JSON object (no markdown, no code fences, just raw JSON):
{
  "topic": "${topic}",
  "analysis": [
    {
      "trend": "Trend Name (from research)",
      "impact": "high|medium|low",
      "insights": "2-3 sentence deeper analysis of implications",
      "risks": ["risk 1"],
      "opportunities": ["opportunity 1"]
    }
  ],
  "connections": "1-2 sentences on how trends relate to each other",
  "strategicOutlook": "2-3 sentence overall strategic recommendation"
}
`.trim();

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    format: "json",
  });

  const raw = response.message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/**
 * Handles incoming A2A messages for the Analysis Agent.
 *
 * @param {object} message - A2A protocol message envelope
 * @returns {object} Response message envelope
 */
export async function analysisAgentHandler(message) {
  const { type, from, id: msgId, payload } = message;

  // ── Handle TASK_REQUEST ─────────────────────────────────────────────────
  if (type === MessageType.TASK_REQUEST) {
    const taskDescription = payload?.task || "";

    // Check skill match
    if (!isAnalysisTask(taskDescription)) {
      console.log(`   📊 Analysis Agent: REJECTING — not an analysis task`);
      return createNegotiation(
        analysisAgentCard.id,
        from,
        msgId,
        NegotiationStatus.REJECT,
        `Task "${taskDescription.slice(0, 50)}…" is outside my domain. I handle: trend synthesis, data analysis, and strategic comparison.`
      );
    }

    // Check for required research data dependency
    const researchData = payload?.context?.researchData;
    if (!researchData) {
      console.log(`   📊 Analysis Agent: COUNTER — need research data first`);
      return createNegotiation(
        analysisAgentCard.id,
        from,
        msgId,
        NegotiationStatus.COUNTER,
        "I need research data to perform analysis. Please run research first and include the results in context.researchData.",
        {
          requirement: "researchData",
          suggestedSkill: "web_research",
          message: "Run a research agent first, then resubmit with researchData in context."
        }
      );
    }

    // Accept and process
    console.log(`   📊 Analysis Agent: ACCEPTING task — "${taskDescription.slice(0, 60)}…"`);

    try {
      const topic = payload?.context?.topic || taskDescription;
      console.log(`   📊 Analysis Agent: Analyzing "${topic}"...`);

      const analysisResult = await performAnalysis(topic, researchData);

      console.log(`   📊 Analysis Agent: Produced ${analysisResult.analysis?.length || 0} trend analyses`);
      analysisResult.analysis?.forEach((a, i) => {
        console.log(`      ${i + 1}. ${a.trend} [Impact: ${a.impact}]`);
      });

      return createTaskResponse(
        analysisAgentCard.id,
        from,
        msgId,
        analysisResult,
        "completed"
      );
    } catch (err) {
      console.error(`   ❌ Analysis Agent: LLM call failed — ${err.message}`);
      return createTaskResponse(
        analysisAgentCard.id,
        from,
        msgId,
        { error: err.message },
        "failed"
      );
    }
  }

  // ── Handle NEGOTIATE ────────────────────────────────────────────────────
  if (type === MessageType.NEGOTIATE) {
    console.log(`   📊 Analysis Agent: Received negotiation — ${payload?.status}`);
    return null;
  }

  return null;
}
