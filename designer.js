/**
 * AI System Architect Designing Agent CLI
 * ========================================
 * 
 * Usage:
 *   node designer.js "Your system description here"
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

const PATTERNS_CATALOG = `
Available Agentic Design Patterns:
1. Prompt Chaining: Sequential execution steps with context handoffs.
2. Routing: Dynamic classification and branching to handlers.
3. Parallelization: Concurrently running agent tasks and voting/consensus.
4. Reasoning (Tree-of-Thoughts): Non-linear branch search and backtracking.
5. Planning (Plan-and-Execute): Decomposing high-level tasks into dynamic sub-steps.
6. Reflection (Self-Correction): Multi-step output critiquing and self-refinement.
7. Tool Use & Verification: Executing external tools and verifying schema safety.
8. Model Context Protocol (MCP): Standardizing access to remote servers and file resources.
9. Human-in-the-Loop (HITL): Interweaving human approvals/inputs into loops.
10. Prioritization: Urgency mapping and task manager backlog priority routing.
11. Memory: Semantic memory retrievals, short/long-term context caching.
12. Goal Monitoring: Running safety checkers to detect plan drift and dynamically replanning.
13. Resource-Aware Execution: Imposing token limit budgets and computational thresholds.
14. Multi-Agent Collaboration: Specialized role communication (Researcher ➜ Writer ➜ Editor).
15. Exploration & Discovery: Open-ended research loop (Generate ➜ Review ➜ Tournament ➜ Evolve ➜ Professor).
16. Agent-to-Agent (A2A): Message buses and protocols for decentralized peer-to-peer helper handoffs.
17. Guardrails & Policy: Input pre-screening and output post-validation compliance audits.
18. Exception Handling: Retry mechanics, fallback models, and graceful degradation.
19. Evaluation & Monitoring: Trace telemetry, latency profiling, and metric evaluations.
20. Learning & Optimization: Dynamic prompt modification from system rewards.
21. Knowledge Retrieval (RAG): Document semantic retrieval using local vector indexing.
`;

function buildSystemArchitectPrompt(userPrompt) {
  return `
You are a Principal AI System Architect.
Your task is to analyze the user's system description and requirements, select the most appropriate Agentic Design Patterns from the catalog, and generate an exceptionally detailed and professional implementation architecture blueprint.

**User System Description:**
"${userPrompt}"

**Catalog of Available Design Patterns:**
${PATTERNS_CATALOG}

Respond with a comprehensive system architecture blueprint in Markdown. Focus on creating a publication-quality reference design. Do not make generic recommendations; name specific patterns and describe exactly how they will interact.

Include the following sections in your report:

# AI Agent System Blueprint: [Descriptive System Title]

## 1. Executive Design Summary
- High-level summary of the system.
- Recommended Design Patterns and the detailed technical rationale for choosing them.

## 2. Agent Architecture & Choreography (ASCII Diagram)
- A clear, structured ASCII sequence diagram or flowchart showing how agents, routers, tools, and the user interact.
- Detail the path of data flow.

## 3. Specialized Agent Personas & Specifications
- List the specific agent personas required (e.g. Router, Planner, Reviewer, etc.).
- Define their:
  - System Instructions
  - Input/Output formats
  - Required tools

## 4. Prompt Engineering Templates
- Write actual, production-ready system prompt templates for the key agents suggested above.

## 5. Reliability, Security & Budget Recommendations
- Describe how Exception Handling, Guardrails, or Resource-Aware Execution should be set up to ensure the system is stable and cost-efficient.
`.trim();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Please provide a system description/requirements prompt.");
    console.log("Usage: node designer.js \"Your requirements here\"");
    process.exit(1);
  }

  const userPrompt = args.join(" ");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧠  AI SYSTEM ARCHITECT — Designing Agent CLI");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\nRequirements: "${userPrompt}"\n`);
  console.log("Analyzing patterns and synthesizing blueprint...\n");

  const architectPrompt = buildSystemArchitectPrompt(userPrompt);

  try {
    const response = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: architectPrompt }],
      stream: true
    });

    for await (const part of response) {
      process.stdout.write(part.message.content);
    }
    console.log("\n\n═══════════════════════════════════════════════════════════");
    console.log("  ✅ System architecture blueprint generated successfully!");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n❌ Design generation failed:", err.message);
    console.error("\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)");
    process.exit(1);
  }
}

main();
