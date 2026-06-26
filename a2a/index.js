/**
 * A2A Inter-Agent Communication — CLI Coordinator
 * =================================================
 *
 * This is the orchestrator that demonstrates the full A2A protocol:
 *
 *   1. Boots the MessageBus
 *   2. Registers all specialist agents (with their AgentCards)
 *   3. Accepts a user topic via CLI args
 *   4. Discovers agents by skill for each pipeline phase
 *   5. Sends TASK_REQUESTs and handles NEGOTIATE responses
 *   6. Chains agent outputs (Research → Analysis → Report)
 *   7. Displays the full message trace and final report
 *
 *  ┌──────────────┐    discover("web_research")     ┌────────────────┐
 *  │              │ ──────────────────────────────▶  │ Research Agent │
 *  │              │    TASK_REQUEST                  │   🔍           │
 *  │              │ ──────────────────────────────▶  │                │
 *  │              │    TASK_RESPONSE (research)      │                │
 *  │              │ ◀──────────────────────────────  └────────────────┘
 *  │              │
 *  │  Coordinator │    discover("data_analysis")     ┌────────────────┐
 *  │    (Bus)     │ ──────────────────────────────▶  │ Analysis Agent │
 *  │              │    TASK_REQUEST + researchData   │   📊           │
 *  │              │ ──────────────────────────────▶  │                │
 *  │              │    TASK_RESPONSE (analysis)      │                │
 *  │              │ ◀──────────────────────────────  └────────────────┘
 *  │              │
 *  │              │    discover("report_writing")    ┌────────────────┐
 *  │              │ ──────────────────────────────▶  │ Report Agent   │
 *  │              │    TASK_REQUEST + both datasets  │   📝           │
 *  │              │ ──────────────────────────────▶  │                │
 *  │              │    TASK_RESPONSE (report)        │                │
 *  │              │ ◀──────────────────────────────  └────────────────┘
 *  └──────────────┘
 *
 * Usage:
 *   node index.js
 *   node index.js "The future of quantum computing"
 */

import { MessageBus } from "./message-bus.js";
import { MessageType, NegotiationStatus, createTaskRequest } from "./a2a-protocol.js";
import { researchAgentCard, researchAgentHandler } from "./agents/research-agent.js";
import { analysisAgentCard, analysisAgentHandler } from "./agents/analysis-agent.js";
import { reportAgentCard, reportAgentHandler } from "./agents/report-agent.js";

const COORDINATOR_ID = "coordinator-001";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printBanner() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  🔗  A2A INTER-AGENT COMMUNICATION PATTERN");
  console.log("  Agent Discovery • Message Protocol • Task Negotiation");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

function printPhase(num, title) {
  console.log(`\n━━━ Phase ${num}: ${title} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function printDiscovery(skill, matches) {
  console.log(`\n   🔎 Discovery Query: skill="${skill}"`);
  if (matches.length === 0) {
    console.log(`      ❌ No agents found with skill "${skill}"`);
  } else {
    matches.forEach((card) => {
      console.log(`      ✅ Found: ${card.toString()}`);
    });
  }
}

function printNegotiation(response) {
  if (!response) return;
  const { type, payload } = response;
  if (type === MessageType.NEGOTIATE) {
    const icon = {
      [NegotiationStatus.ACCEPT]: "✅",
      [NegotiationStatus.REJECT]: "❌",
      [NegotiationStatus.COUNTER]: "🔄",
    }[payload.status] || "❓";
    console.log(`\n   ${icon} Negotiation: ${payload.status}`);
    console.log(`      Reason: ${payload.reason}`);
    if (payload.counterProposal) {
      console.log(`      Counter: ${JSON.stringify(payload.counterProposal)}`);
    }
  }
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const topic = process.argv.slice(2).join(" ") || "Emerging trends in artificial intelligence agents";

  printBanner();
  console.log(`📌 Topic: "${topic}"\n`);

  // ── Phase 0: Boot Bus & Register Agents ───────────────────────────────
  printPhase(0, "🚌 Booting MessageBus & Registering Agents");

  const bus = new MessageBus();

  // Listen for registration events
  bus.on("agent:registered", (card) => {
    console.log(`   ✅ Registered: ${card.toString()}`);
  });

  // Register all specialist agents
  bus.register(researchAgentCard, researchAgentHandler);
  bus.register(analysisAgentCard, analysisAgentHandler);
  bus.register(reportAgentCard, reportAgentHandler);

  console.log(`\n   📋 Total agents on bus: ${bus.getRegisteredAgents().length}`);

  // ── Phase 1: Discover & Execute Research ──────────────────────────────
  printPhase(1, "🔍 Research Phase — Discover & Delegate");

  const researchAgents = bus.discover("web_research");
  printDiscovery("web_research", researchAgents);

  let researchData = null;

  if (researchAgents.length > 0) {
    const targetAgent = researchAgents[0];
    const researchRequest = createTaskRequest(
      COORDINATOR_ID,
      targetAgent.id,
      "Research and gather facts, emerging trends, and key data",
      { topic }
    );

    console.log(`\n   📨 Sending TASK_REQUEST → ${targetAgent.id}`);
    console.log(`      Message ID: ${researchRequest.id.slice(0, 8)}…`);

    const response = await bus.send(researchRequest);

    if (response?.type === MessageType.TASK_RESPONSE && response.payload.status === "completed") {
      researchData = response.payload.result;
      console.log(`\n   ✅ Research completed successfully`);
    } else if (response?.type === MessageType.NEGOTIATE) {
      printNegotiation(response);
    } else {
      console.log(`   ⚠️  Unexpected response from research agent`);
    }
  }

  if (!researchData) {
    console.error("\n   ❌ Research phase failed. Cannot continue pipeline.");
    process.exit(1);
  }

  // ── Phase 2: Discover & Execute Analysis ──────────────────────────────
  printPhase(2, "📊 Analysis Phase — Discover & Delegate (with Negotiation)");

  // First, demonstrate the COUNTER negotiation by intentionally sending
  // a report task to the Report Agent WITHOUT analysis data
  console.log("\n   🧪 [Demo] Sending premature report request to show COUNTER negotiation...");
  const prematureReportAgents = bus.discover("report_writing");
  if (prematureReportAgents.length > 0) {
    const prematureRequest = createTaskRequest(
      COORDINATOR_ID,
      prematureReportAgents[0].id,
      "Write an executive report and compile findings",
      { topic, researchData }  // Note: no analysisData — this will trigger COUNTER
    );
    const counterResponse = await bus.send(prematureRequest);
    printNegotiation(counterResponse);

    if (counterResponse?.payload?.status === NegotiationStatus.COUNTER) {
      console.log(`\n   💡 Coordinator: Report Agent needs analysis first. Routing to Analysis Agent...`);
    }
  }

  // Now discover and execute analysis properly
  const analysisAgents = bus.discover("data_analysis");
  printDiscovery("data_analysis", analysisAgents);

  let analysisData = null;

  if (analysisAgents.length > 0) {
    const targetAgent = analysisAgents[0];
    const analysisRequest = createTaskRequest(
      COORDINATOR_ID,
      targetAgent.id,
      "Analyze research findings and synthesize strategic insights",
      { topic, researchData }
    );

    console.log(`\n   📨 Sending TASK_REQUEST → ${targetAgent.id}`);
    console.log(`      Message ID: ${analysisRequest.id.slice(0, 8)}…`);

    const response = await bus.send(analysisRequest);

    if (response?.type === MessageType.TASK_RESPONSE && response.payload.status === "completed") {
      analysisData = response.payload.result;
      console.log(`\n   ✅ Analysis completed successfully`);
    } else if (response?.type === MessageType.NEGOTIATE) {
      printNegotiation(response);
    }
  }

  if (!analysisData) {
    console.error("\n   ❌ Analysis phase failed. Cannot continue pipeline.");
    process.exit(1);
  }

  // ── Phase 3: Discover & Execute Report Generation ─────────────────────
  printPhase(3, "📝 Report Phase — Discover & Delegate");

  // Also demonstrate REJECT by sending a report task to the Research Agent
  console.log("\n   🧪 [Demo] Sending report task to Research Agent to show REJECT...");
  const wrongAgentRequest = createTaskRequest(
    COORDINATOR_ID,
    researchAgentCard.id,
    "Write an executive report and compile findings",
    { topic }
  );
  const rejectResponse = await bus.send(wrongAgentRequest);
  printNegotiation(rejectResponse);

  // Now send to the correct agent — Report Agent with full context
  const reportAgents = bus.discover("report_writing");
  printDiscovery("report_writing", reportAgents);

  let finalReport = null;

  if (reportAgents.length > 0) {
    const targetAgent = reportAgents[0];
    const reportRequest = createTaskRequest(
      COORDINATOR_ID,
      targetAgent.id,
      "Write an executive report and compile all findings",
      { topic, researchData, analysisData }
    );

    console.log(`\n   📨 Sending TASK_REQUEST → ${targetAgent.id}`);
    console.log(`      Message ID: ${reportRequest.id.slice(0, 8)}…`);

    const response = await bus.send(reportRequest);

    if (response?.type === MessageType.TASK_RESPONSE && response.payload.status === "completed") {
      finalReport = response.payload.result.report;
      console.log(`\n   ✅ Report generation completed successfully`);
    } else if (response?.type === MessageType.NEGOTIATE) {
      printNegotiation(response);
    }
  }

  // ── Phase 4: Output & Audit ───────────────────────────────────────────
  printPhase(4, "📋 Final Output & Message Audit Trail");

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (finalReport) {
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log("│  🚀 FINAL EXECUTIVE REPORT                                │");
    console.log("├─────────────────────────────────────────────────────────────┤");
    console.log(finalReport);
    console.log("└─────────────────────────────────────────────────────────────┘");
  } else {
    console.log("\n   ⚠️  Report generation failed. See audit trail for details.");
  }

  // Print the full message audit trail
  bus.printAuditTrail();

  // Print summary statistics
  const log = bus.getMessageLog();
  const taskRequests = log.filter((m) => m.type === MessageType.TASK_REQUEST).length;
  const taskResponses = log.filter((m) => m.type === MessageType.TASK_RESPONSE).length;
  const negotiations = log.filter((m) => m.type === MessageType.NEGOTIATE).length;

  console.log("📊 ─── Pipeline Statistics ────────────────────────────────────");
  console.log(`   Total messages exchanged:  ${log.length}`);
  console.log(`   Task requests sent:        ${taskRequests}`);
  console.log(`   Task responses received:   ${taskResponses}`);
  console.log(`   Negotiations:              ${negotiations}`);
  console.log(`   Agents on bus:             ${bus.getRegisteredAgents().length}`);
  console.log(`   Total duration:            ${duration}s`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ A2A Pipeline failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
