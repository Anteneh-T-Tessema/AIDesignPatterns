# Agentic Design Pattern: Inter-Agent Communication (A2A)

This project demonstrates the **Inter-Agent Communication (Agent-to-Agent / A2A)** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

In this pattern, independently defined agents **discover** each other by capability, communicate through a **structured message protocol**, and **negotiate** task assignments — all routed through a central **MessageBus**.

```
  ┌──────────────┐    discover("web_research")     ┌────────────────┐
  │              │ ──────────────────────────────▶  │ Research Agent │
  │              │    TASK_REQUEST                  │   🔍           │
  │              │ ──────────────────────────────▶  │                │
  │              │    TASK_RESPONSE (research)      │                │
  │              │ ◀──────────────────────────────  └────────────────┘
  │              │
  │  Coordinator │    discover("data_analysis")     ┌────────────────┐
  │    (Bus)     │ ──────────────────────────────▶  │ Analysis Agent │
  │              │    TASK_REQUEST + researchData   │   📊           │
  │              │ ──────────────────────────────▶  │                │
  │              │    TASK_RESPONSE (analysis)      │                │
  │              │ ◀──────────────────────────────  └────────────────┘
  │              │
  │              │    discover("report_writing")    ┌────────────────┐
  │              │ ──────────────────────────────▶  │ Report Agent   │
  │              │    TASK_REQUEST + both datasets  │   📝           │
  │              │ ──────────────────────────────▶  │                │
  │              │    TASK_RESPONSE (report)        │                │
  │              │ ◀──────────────────────────────  └────────────────┘
  └──────────────┘
```

---

## Key Concepts

### 1. Agent Cards (Discovery Protocol)
Each agent publishes an **AgentCard** — a JSON manifest advertising its identity, skills, and supported message types. The MessageBus uses these cards for **capability-based discovery** instead of hard-coded references.

### 2. Message Envelope Protocol
All inter-agent communication uses standardized **message envelopes** with:
- **Unique IDs** and **timestamps** for traceability
- **Correlation IDs** linking responses to originating requests
- **Type-safe message categories**: `TASK_REQUEST`, `TASK_RESPONSE`, `NEGOTIATE`, `STATUS_UPDATE`, `DISCOVERY_REQUEST`, `DISCOVERY_RESPONSE`

### 3. MessageBus (Central Hub)
Routes messages between agents, maintains an agent registry, supports skill-based discovery queries, and records a full audit trail of all message exchanges.

### 4. Task Negotiation Protocol
When receiving a `TASK_REQUEST`, agents can:
- **ACCEPT** → Process the task and return a `TASK_RESPONSE`
- **REJECT** → Decline with a reason (e.g., wrong skill domain)
- **COUNTER** → Propose a modification (e.g., "run analysis first, then resubmit")

### 5. How This Differs from Multi-Agent Collaboration

| Aspect | Multi-Agent Collab | A2A Inter-Agent Comm |
|---|---|---|
| Discovery | Hard-coded pipeline | Capability-based via bus |
| Communication | Implicit function calls | Structured message envelopes |
| Negotiation | None | Accept / Reject / Counter |
| Topology | Linear chain | Hub-and-spoke via MessageBus |
| Autonomy | Orchestrator-driven | Agents decide based on AgentCard |

---

## File Structure

- [a2a-protocol.js](file://./a2a-protocol.js): Message types, envelope factory, negotiation enums
- [agent-card.js](file://./agent-card.js): AgentCard class with skill matching
- [message-bus.js](file://./message-bus.js): Central bus — registry, discovery, routing, audit log
- [agents/research-agent.js](file://./agents/research-agent.js): Research specialist (fact extraction, trends)
- [agents/analysis-agent.js](file://./agents/analysis-agent.js): Analysis specialist (trend synthesis, strategic insights)
- [agents/report-agent.js](file://./agents/report-agent.js): Report writer (executive summaries, formatting)
- [index.js](file://./index.js): CLI coordinator — discovery, negotiation demo, message trace

---

## Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) running locally
- Llama 3.2 model pulled:
  ```bash
  ollama pull llama3.2
  ```

### Installation
```bash
cd a2a/
npm install
```

### Run
Default topic (*"Emerging trends in artificial intelligence agents"*):
```bash
npm start
```

Custom topic:
```bash
node index.js "The future of quantum computing"
```

### What You'll See
1. **Agent registration** on the MessageBus
2. **Discovery queries** finding agents by skill
3. **COUNTER negotiation** — Report Agent requesting analysis before accepting
4. **REJECT negotiation** — Research Agent declining a report-writing task
5. **Full message pipeline**: Research → Analysis → Report
6. **Audit trail** with all messages, correlation IDs, and types
7. **Final executive report** compiled from the agent chain
