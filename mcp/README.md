# Agentic Design Patterns: Model Context Protocol (MCP)

This repository contains a native JavaScript implementation of the **Model Context Protocol (MCP)** pattern, inspired by Chapter 10 of *Agentic Design Patterns*.

## What is Model Context Protocol?

The **Model Context Protocol (MCP)** is an open standard designed to resolve integration silos between Large Language Models (LLMs) and external tools, applications, or data sources. Rather than writing ad-hoc, custom API wrappers for every database, service, or tool a model needs, MCP establishes a unified, client-server contract.

### Key Concepts
1. **MCP Server**: A standalone application or gateway that exposes a set of:
   * **Tools**: Executable functions (e.g. databases updates, API calls, calculation utilities).
   * **Resources**: Static data sources (e.g. text documents, database schemas, local notes).
   * **Prompts**: Interactive, pre-configured templates that help guide model requests.
2. **MCP Client**: An intermediary wrapper around the LLM that handles discovery, authentication, connections, and message transmission.
3. **Transport Layer**: The underlying network protocol for message exchange. For local agents, MCP uses **JSON-RPC 2.0 over Standard Input/Output (STDIO)**. For remote setups, it leverages HTTP Stream/Server-Sent Events (SSE).

---

## Our Implementation Architecture

To ensure transparent visibility into the protocol, this package implements a lightweight, dependency-free **JSON-RPC 2.0 over STDIO transport** natively in Node.js.

```
       ┌────────────────────────────────────────────────────────┐
       │                 💻 CLI Runner (index.js)               │
       └──────────────┬──────────────────────────▲──────────────┘
                      │ Prompts                  │ Result
                      ▼                          │
       ┌──────────────────────────┐    JSON-RPC  │
       │    🤖 MCP Client         ├──────────────┼──────────────┐
       │      (client.js)         │              │              │
       └──────┬────────────▲──────┘              │              │
              │ JSON-RPC   │ JSON-RPC            │              │
              │ (stdio)    │ (stdio)             │              │
              ▼            │                     ▼              ▼
       ┌───────────────────┴──────┐      ┌──────────────────────────────┐
       │    ⚙️ MCP Server          │      │      🦙 Ollama Client        │
       │      (server.js)         │      │     (Model: llama3.2)        │
       └──────┬────────────▲──────┘      └──────────────┬───────────────┘
              │            │                            │
              ▼            │                            │
       ┌───────────────────┴──────┐                     │
       │   🛠️ Tools & Resources   │◀────────────────────┘
       │  (Calculator, Policies)  │ (Ollama requests tool call; Client delegates)
       └──────────────────────────┘
```

1. **`server.js`**:
   * Reads request packets from `process.stdin` and writes response packets to `process.stdout`.
   * Implements protocol handlers for `initialize` (handshake), `tools/list`, `tools/call`, `resources/list`, and `resources/read`.
   * Hosts a mock notes database and a math-evaluation engine.
2. **`client.js`**:
   * Spawns `server.js` as a subprocess.
   * Leverages Node's built-in `readline` stream interface on process stdout to process complete, newline-delimited JSON-RPC messages.
   * Exposes promise-based client methods (`listTools()`, `callTool()`, etc.) mapped to request IDs.
3. **`index.js`**:
   * Orchestrates the agent loop:
     1. Performs the MCP handshake.
     2. Discovers the discount policy resource from the server and fetches its text contents.
     3. Forwards the policy text alongside the user prompt to Ollama.
     4. Detects Ollama's tool call request (`calculate`) and delegates execution to the MCP server.
     5. Synthesizes the final output and displays the raw, color-coded protocol trace.

---

## Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Ollama** running locally:
  ```bash
  ollama serve
  ```
* **Llama 3.2** pulled:
  ```bash
  ollama pull llama3.2
  ```

### Installation
From the root of this folder, install the necessary dependencies:
```bash
npm install
```

### Running the Orchestrator
Execute the CLI script:
```bash
npm start
```

### Example Log Output
You will see:
1. Green client logs showing process spawns and handshake events.
2. Complete, color-coded JSON-RPC packet printouts showing the exact request/response sequence.
3. The final synthesized message showing the discount logic evaluation.
