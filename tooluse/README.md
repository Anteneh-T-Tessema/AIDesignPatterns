# 🛠️ Tool Use (Function Calling) Pattern — Node.js & Ollama

Demonstrates the **Tool Use (Function Calling)** agentic design pattern in Node.js using **Ollama** with **Llama 3.2**.

## What is the Tool Use Pattern?

In this pattern, the local LLM is provided with available tools via declarations (JSON schemas). Llama 3.2 determines which tool to execute, outputs a structured `tool_calls` block, and pauses. The JS runtime executes the corresponding JavaScript function locally, appends the result to the history, and re-queries the model to produce a final synthesized response.

```
                      [JS Function execution]
                  ┌──────────────────────────────┐
                  │                              ▼
User Prompt ──▶ 🧠 Llama 3.2 ──[tool_calls]──▶ ⚙️ Local JS Tool (e.g. queryDatabase)
                  ▲                              │
                  │                              ▼
                  └──────────[tool response]─────┘
```

---

## Project Structure

```
tooluse/
├── agent.js               ← Core runner (manages conversation loop and prompts)
├── tools.js               ← Tool definitions (schemas + JS implementations)
├── index.js               ← CLI entry point (accepts user queries and invokes the agent)
├── package.json
└── README.md              ← This guide
```

---

## Prerequisites

1. Install [Ollama](https://ollama.com/)
2. Pull the model:
   ```bash
   ollama pull llama3.2
   ```
3. Make sure Ollama is running:
   ```bash
   ollama serve
   ```

---

## Run Commands

```bash
npm install
```

### Run pre-configured test scenarios
* Queries Bob's hourly rate from the database and runs the invoice calculation tool to compute the cost of 35 hours of work:
  ```bash
  npm run run:invoice
  ```

* Queries the local system time:
  ```bash
  npm run run:time
  ```

### Run custom queries
Pass any custom query directly:
```bash
node index.js "Retrieve Alice and calculate her cost for 12 hours"
node index.js "Retrieve Charlie, and check the time"
```
Llama 3.2 will automatically decide which tools to call and run them in sequence!
