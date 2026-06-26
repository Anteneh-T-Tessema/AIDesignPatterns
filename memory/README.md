# Agentic Design Pattern: Memory Management

This repository demonstrates the **Memory Management** agentic design pattern, built natively in Node.js using ES Modules and local **Llama 3.2** (for reasoning) + **Nomic Embed Text** (for semantic vector embedding) via **Ollama**.

In this pattern, the agent maintains context across conversation turns and persistent sessions by segregating memory into three distinct tiers. This enables stateful, personalized, and context-aware interactions.

```
                     ┌──────────────────────────────────────────┐
                     │              👤 User Prompt              │
                     └────────────────────┬─────────────────────┘
                                          │
                                          ▼
                     ┌──────────────────────────────────────────┐
                     │          🔍 Memory Retrieval             │
                     │  Embeds prompt -> Searches vector store  │
                     └────────────────────┬─────────────────────┘
                                          │
                                          ▼ (Injects retrieved memories)
                     ┌──────────────────────────────────────────┐
                     │          🧠 Short-Term Buffer            │
                     │  Merges profile state + past history     │
                     └────────────────────┬─────────────────────┘
                                          │
                                          ▼
                     ┌──────────────────────────────────────────┐
                     │          🔮 Llama 3.2 Response           │
                     └────────────────────┬─────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
      ┌─────────────────────────┐                   ┌─────────────────────────┐
      │  📝 State Extraction    │                   │  💾 Long-Term Storage   │
      │  Updates profile state  │                   │  Saves facts to vector  │
      └─────────────────────────┘                   └─────────────────────────┘
```

---

## Memory Tiers

1. **Short-Term Memory (Context Buffer)**
   - Tracks active chat messages.
   - Implements **buffer compaction** (summarization): when the message history exceeds a threshold (8 messages), a background prompt summarizes all earlier messages (from 0 to N-2) into a concise system recap bullet list, preserving the last 2 messages intact to stay within context budgets.

2. **State (Scratchpad Profiling)**
   - Dictionary storing key-value pairs (using namespaces/prefixes like `user:`).
   - Injected directly into the system instructions to inform the agent of user details (e.g. name, configurations, preferences).
   - Dynamically updated in the background using Llama 3.2 JSON extraction.

3. **Long-Term Memory (Semantic memory)**
   - Searchable vector-store implemented natively in JavaScript.
   - Generates text embeddings using local `nomic-embed-text` embeddings.
   - Computes **cosine similarity** to retrieve the top 3 semantically related past statements or facts, injecting them as reference background context.
   - Persists state and memories to local JSON database files.

---

## File Structure

- [memory.js](file://./memory.js): Implements `ShortTermMemory` compaction, `StateManager` profiling, and `SemanticMemory` cosine similarity search.
- [assistant.js](file://./assistant.js): Connects the chat loop, assembling prompts and orchestrating background profile and fact extraction.
- [index.js](file://./index.js): Console CLI readline wrapper for chatting with the assistant and displaying real-time memory diagnostics.
- [package.json](file://./package.json): NPM dependencies and scripts.

---

## Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) running locally.
- Llama 3.2 and Nomic Embed Text pulled locally:
  ```bash
  ollama pull llama3.2
  ollama pull nomic-embed-text
  ```

### Installation
From the `memory/` directory, install dependencies:
```bash
npm install
```

### Usage
Start the interactive memory assistant chat:
```bash
npm start
```
Inside the interactive session, you can run the following special commands:
* `/state` - Output the current persistent user profile state.
* `/clear` - Clear the current short-term conversation context.
* `/exit` - Close the chat session.
