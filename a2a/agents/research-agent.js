/**
 * Research Agent — Specialist in Fact Extraction & Trend Identification
 * =====================================================================
 *
 * Skills: web_research, fact_extraction, trend_identification
 *
 * This agent handles TASK_REQUEST messages related to research tasks.
 * It uses Ollama/Llama 3.2 to generate structured research findings,
 * and demonstrates the A2A negotiation protocol by:
 *   - ACCEPTING research-related tasks
 *   - REJECTING tasks outside its skill domain
 *   - Sending STATUS_UPDATE messages during processing
 */

import { Ollama } from "ollama";
import { AgentCard } from "../agent-card.js";
import {
  MessageType,
  NegotiationStatus,
  createNegotiation,
  createTaskResponse,
  createStatusUpdate,
} from "../a2a-protocol.js";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Agent Card ──────────────────────────────────────────────────────────────

export const researchAgentCard = new AgentCard({
  id: "research-agent-001",
  name: "Research Specialist",
  description: "Gathers facts, trends, and key data on any topic using LLM-powered research synthesis",
  skills: ["web_research", "fact_extraction", "trend_identification"],
  inputTypes: [MessageType.TASK_REQUEST, MessageType.NEGOTIATE],
  outputTypes: [MessageType.TASK_RESPONSE, MessageType.NEGOTIATE, MessageType.STATUS_UPDATE],
  version: "1.0.0",
});

// ─── Research Skills ─────────────────────────────────────────────────────────

const RESEARCH_SKILLS = ["web_research", "fact_extraction", "trend_identification", "research"];

/**
 * Checks if a task description is research-related.
 */
function isResearchTask(task) {
  const lower = (task || "").toLowerCase();
  const keywords = ["research", "gather", "find", "facts", "trends", "investigate", "explore", "discover", "information"];
  return keywords.some((kw) => lower.includes(kw));
}

// ─── LLM Call ────────────────────────────────────────────────────────────────

async function performResearch(topic) {
  const prompt = `
You are a Senior Research Analyst. Your job is to research a topic and extract the 3 most important trends, key facts, and practical applications.

**Topic:** "${topic}"

Respond with ONLY a JSON object (no markdown, no code fences, just raw JSON):
{
  "topic": "${topic}",
  "trends": [
    {
      "trend": "Trend Name",
      "summary": "2-3 sentence overview of why this trend matters.",
      "keyFacts": ["Fact 1", "Fact 2"]
    }
  ]
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
 * Handles incoming A2A messages.
 * This is the function registered with the MessageBus.
 *
 * @param {object} message - A2A protocol message envelope
 * @returns {object} Response message envelope
 */
export async function researchAgentHandler(message) {
  const { type, from, id: msgId, payload } = message;

  // ── Handle TASK_REQUEST ─────────────────────────────────────────────────
  if (type === MessageType.TASK_REQUEST) {
    const taskDescription = payload?.task || "";

    // Check if this is a task we can handle
    if (!isResearchTask(taskDescription)) {
      console.log(`   🔍 Research Agent: REJECTING — not a research task`);
      return createNegotiation(
        researchAgentCard.id,
        from,
        msgId,
        NegotiationStatus.REJECT,
        `Task "${taskDescription.slice(0, 50)}…" is outside my research domain. I handle: fact extraction, trend identification, and research synthesis.`
      );
    }

    // Accept and process
    console.log(`   🔍 Research Agent: ACCEPTING task — "${taskDescription.slice(0, 60)}…"`);

    try {
      // Extract the topic from context or task description
      const topic = payload?.context?.topic || taskDescription;

      console.log(`   🔍 Research Agent: Researching "${topic}"...`);
      const researchData = await performResearch(topic);

      console.log(`   🔍 Research Agent: Found ${researchData.trends?.length || 0} trends`);
      researchData.trends?.forEach((t, i) => {
        console.log(`      ${i + 1}. ${t.trend}`);
      });

      return createTaskResponse(
        researchAgentCard.id,
        from,
        msgId,
        researchData,
        "completed"
      );
    } catch (err) {
      console.error(`   ❌ Research Agent: LLM call failed — ${err.message}`);
      return createTaskResponse(
        researchAgentCard.id,
        from,
        msgId,
        { error: err.message, fallback: true, topic: payload?.context?.topic || taskDescription },
        "failed"
      );
    }
  }

  // ── Handle NEGOTIATE ────────────────────────────────────────────────────
  if (type === MessageType.NEGOTIATE) {
    console.log(`   🔍 Research Agent: Received negotiation — ${payload?.status}`);
    // If someone counters with a modified research request, accept it
    if (payload?.status === NegotiationStatus.COUNTER && payload?.counterProposal) {
      console.log(`   🔍 Research Agent: Accepting counter-proposal`);
      return createNegotiation(
        researchAgentCard.id,
        from,
        msgId,
        NegotiationStatus.ACCEPT,
        "Counter-proposal accepted. Ready to process."
      );
    }
    return null;
  }

  return null;
}
