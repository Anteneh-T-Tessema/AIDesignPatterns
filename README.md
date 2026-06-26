# Agentic Design Patterns (ADPs) Catalog & Tutorials

Welcome to the **Agentic Design Patterns** repository. This project is a comprehensive educational catalog showcasing **21 foundational agentic design patterns**, implemented natively in Node.js (ES Modules) using local LLMs (Llama 3.2 via **Ollama**).

Rather than relying on heavy agentic frameworks, these implementations are written using clean, direct Javascript, demonstrating the core prompts, loops, state transitions, and coordination mechanisms of each pattern from first principles.

---

## 🚀 Prerequisites & Global Setup

### 1. Install Node.js
Ensure you have **Node.js** (v18+) installed.

### 2. Install Ollama
Download and run [Ollama](https://ollama.com/) locally.

### 3. Pull the Default Model
We use `llama3.2` (3B model) as the default driver for the local agent loops:
```bash
ollama pull llama3.2
```

---

## 📚 Pattern Index & Tutorials

Each folder contains a self-contained tutorial and codebase for a specific pattern. Below is a categorized roadmap of the implementations:

### 1. Core Prompting & Flow Control
* **[Prompt Chaining](./promptchaining/)**: Sequentially chains LLM prompts together where the output of one step becomes the input to the next.
  * *Run*: `cd promptchaining && npm install && npm start`
* **[Routing](./routing/)**: Dynamically routes user intent to specialized handlers or models based on classification.
  * *Run*: `cd routing && npm install && npm start`
* **[Parallelization](./parallelization/)**: Executes multiple LLM requests concurrently (e.g., voting, multi-perspective reviews) and aggregates outputs via consensus logic.
  * *Run*: `cd parallelization && npm install && npm start`

### 2. Cognitive Operations
* **[Reasoning (Tree-of-Thoughts)](./reasoning/)**: Searches a tree of thoughts non-linearly, evaluating paths, backtracking, and pruning branches that fail criteria.
  * *Run*: `cd reasoning && npm install && npm start`
* **[Planning (Plan-and-Execute)](./planning/)**: Outlines a structured step-by-step plan for a complex topic, then executes each step sequentially, leveraging preceding outputs as context.
  * *Run*: `cd planning && npm install && npm start`
* **[Reflection (Self-Correction)](./reflection/)**: Iteratively evaluates its own drafts against structured guidelines and self-corrects until constraints are met.
  * *Run*: `cd reflection && npm install && npm start`

### 3. Interaction & Agency
* **[Tool Use & Verification](./tooluse/)**: Allows agents to call external functions (API, DB, Calculators) and verifies the outputs before finalizing responses.
  * *Run*: `cd tooluse && npm install && npm start`
* **[Model Context Protocol (MCP)](./mcp/)**: Standardizes access to remote documents, tools, and servers using the open Model Context Protocol.
  * *Run*: `cd mcp && npm install && npm start`
* **[Human-in-the-Loop (HITL)](./humanintheloop/)**: Seamlessly pauses agent execution loops to solicit human approval or direction for critical or sensitive actions.
  * *Run*: `cd humanintheloop && npm install && npm start`

### 4. State & Orchestration
* **[Prioritization](./prioritization/)**: Orchestrates an backlog task manager, dynamically prioritizing and assigning tasks using urgency-based rules.
  * *Run*: `cd prioritization && npm install && npm start`
* **[Memory](./memory/)**: Implements semantic memory storage using embeddings, long-term state, and short-term conversational context.
  * *Run*: `cd memory && npm install && npm start`
* **[Goal Monitoring](./goalmonitoring/)**: Periodically monitors execution paths against high-level goals, dynamically modifying plans when drift is detected.
  * *Run*: `cd goalmonitoring && npm install && npm start`
* **[Resource-Aware Execution](./resourceaware/)**: Tracks token counts and costs during agent loops, gracefully scaling down models or terminating when budget thresholds are breached.
  * *Run*: `cd resourceaware && npm install && npm start`

### 5. Collaborative Frameworks
* **[Multi-Agent Collaboration](./multiagent/)**: Coordinates groups of specialized agents (e.g., Researcher, Writer, Editor) collaborating in feedback loops.
  * *Run*: `cd multiagent && npm install && npm start`
* **[Exploration & Discovery](./explorationdiscovery/)**: Decomposes open-ended topics into hypotheses, conducts multi-persona peer reviews, ranks them in Elo tournaments, and evolves the best idea into a proposal.
  * *Run*: `cd explorationdiscovery && npm install && npm start`
* **[Agent-to-Agent (A2A)](./a2a/)**: Orchestrates decentralized message-passing protocols enabling independent agents to register, request help, and trade tasks.
  * *Run*: `cd a2a && npm install && npm start`

### 6. Systems Integrity
* **[Guardrails & Policy](./guardrails/)**: Screens user inputs and LLM outputs against behavioral safety, trademark compliance, and domain-relevance policies.
  * *Run*: `cd guardrails && npm install && npm start`
* **[Exception Handling](./exceptionhandling/)**: Implements robust fault tolerance using automatic retries, fallback models, and graceful degradation protocols.
  * *Run*: `cd exceptionhandling && npm install && npm start`
* **[Evaluation & Monitoring](./evaluationmonitoring/)**: Captures execution trace logs, measures task accuracy, and profiles latency metrics for production safety.
  * *Run*: `cd evaluationmonitoring && npm install && npm start`
* **[Learning & Optimization](./learning/)**: Continuously refines system prompts and configurations based on execution rewards and historical performance data.
  * *Run*: `cd learning && npm install && npm start`
* **[Knowledge Retrieval (RAG)](./knowledgeretrieval/)**: Enhances LLM context with relevant documentation retrieved dynamically using vector semantic search.
  * *Run*: `cd knowledgeretrieval && npm install && npm start`

---

## 🛠️ General Execution Recipe

Every design pattern follows a similar execution pattern:

1. **Move into the pattern directory**:
   ```bash
   cd <pattern-name>
   ```
2. **Install local dependencies**:
   ```bash
   npm install
   ```
3. **Execute the default simulation CLI**:
   ```bash
   npm start
   ```
4. **Run a custom query** (where supported):
   ```bash
   node index.js "Your custom instruction here" [--save]
   ```
