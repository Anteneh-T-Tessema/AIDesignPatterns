/**
 * Report Agent — Specialist in Report Writing & Formatting
 * =========================================================
 *
 * Skills: report_writing, formatting, executive_summary
 *
 * This agent handles TASK_REQUEST messages for producing polished reports.
 * It demonstrates A2A negotiation by:
 *   - ACCEPTING report tasks that include analysis data
 *   - COUNTERING if given raw research without analysis (requests analysis first)
 *   - REJECTING tasks outside its domain
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

export const reportAgentCard = new AgentCard({
  id: "report-agent-001",
  name: "Report Writer",
  description: "Produces polished, well-structured executive reports and summaries from analyzed data",
  skills: ["report_writing", "formatting", "executive_summary"],
  inputTypes: [MessageType.TASK_REQUEST, MessageType.NEGOTIATE],
  outputTypes: [MessageType.TASK_RESPONSE, MessageType.NEGOTIATE],
  version: "1.0.0",
});

// ─── Skill Check ─────────────────────────────────────────────────────────────

function isReportTask(task) {
  const lower = (task || "").toLowerCase();
  const keywords = ["report", "write", "draft", "format", "summary", "executive", "document", "compile"];
  return keywords.some((kw) => lower.includes(kw));
}

// ─── LLM Call ────────────────────────────────────────────────────────────────

async function generateReport(topic, researchData, analysisData) {
  const prompt = `
You are an Executive Report Writer. You produce polished, professional reports from research and analysis data.

**Topic:** "${topic}"

**Research Data:**
${JSON.stringify(researchData, null, 2)}

**Analysis Data:**
${JSON.stringify(analysisData, null, 2)}

**Instructions:**
Write a complete executive report with:
1. **Executive Summary** — 2-3 sentence high-level overview
2. **Key Findings** — Cover each trend with facts and analysis
3. **Strategic Implications** — Risks, opportunities, and connections
4. **Recommendations** — 3-4 actionable recommendations
5. **Conclusion** — Forward-looking summary

Write in professional tone. Use Markdown formatting with headers, bullet points, and bold text.
Output ONLY the raw Markdown text of the report.
`.trim();

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  return response.message.content;
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/**
 * Handles incoming A2A messages for the Report Agent.
 *
 * @param {object} message - A2A protocol message envelope
 * @returns {object} Response message envelope
 */
export async function reportAgentHandler(message) {
  const { type, from, id: msgId, payload } = message;

  // ── Handle TASK_REQUEST ─────────────────────────────────────────────────
  if (type === MessageType.TASK_REQUEST) {
    const taskDescription = payload?.task || "";

    // Check skill match
    if (!isReportTask(taskDescription)) {
      console.log(`   📝 Report Agent: REJECTING — not a report task`);
      return createNegotiation(
        reportAgentCard.id,
        from,
        msgId,
        NegotiationStatus.REJECT,
        `Task "${taskDescription.slice(0, 50)}…" is outside my domain. I handle: report writing, formatting, and executive summaries.`
      );
    }

    // Check for analysis data (the Report Agent's primary dependency)
    const analysisData = payload?.context?.analysisData;
    const researchData = payload?.context?.researchData;

    // If we have research but no analysis, COUNTER to request analysis first
    if (researchData && !analysisData) {
      console.log(`   📝 Report Agent: COUNTER — have research but need analysis first`);
      return createNegotiation(
        reportAgentCard.id,
        from,
        msgId,
        NegotiationStatus.COUNTER,
        "I received raw research data but need analyzed insights to produce a quality report. Please run analysis first.",
        {
          requirement: "analysisData",
          suggestedSkill: "data_analysis",
          message: "Run an analysis agent on the research data, then resubmit with analysisData in context."
        }
      );
    }

    // If we have neither, COUNTER more strongly
    if (!researchData && !analysisData) {
      console.log(`   📝 Report Agent: COUNTER — need both research and analysis data`);
      return createNegotiation(
        reportAgentCard.id,
        from,
        msgId,
        NegotiationStatus.COUNTER,
        "I need both research findings and analysis insights to produce a comprehensive report.",
        {
          requirement: "researchData + analysisData",
          suggestedSkills: ["web_research", "data_analysis"],
          message: "Run research and analysis agents first, then resubmit with both datasets in context."
        }
      );
    }

    // Accept and process — we have both research and analysis
    console.log(`   📝 Report Agent: ACCEPTING task — "${taskDescription.slice(0, 60)}…"`);

    try {
      const topic = payload?.context?.topic || taskDescription;
      console.log(`   📝 Report Agent: Writing report on "${topic}"...`);

      const report = await generateReport(topic, researchData, analysisData);

      console.log(`   📝 Report Agent: Report generated (${report.length} chars)`);

      return createTaskResponse(
        reportAgentCard.id,
        from,
        msgId,
        { report, format: "markdown" },
        "completed"
      );
    } catch (err) {
      console.error(`   ❌ Report Agent: LLM call failed — ${err.message}`);
      return createTaskResponse(
        reportAgentCard.id,
        from,
        msgId,
        { error: err.message },
        "failed"
      );
    }
  }

  // ── Handle NEGOTIATE ────────────────────────────────────────────────────
  if (type === MessageType.NEGOTIATE) {
    console.log(`   📝 Report Agent: Received negotiation — ${payload?.status}`);
    return null;
  }

  return null;
}
