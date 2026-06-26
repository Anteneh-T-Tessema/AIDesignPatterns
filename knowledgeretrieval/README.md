# 🔍 Knowledge Retrieval (RAG) Pattern — Policy Support Agent

This project demonstrates the **Knowledge Retrieval (RAG - Retrieval-Augmented Generation)** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model + **Nomic Embed Text** embeddings via **Ollama**.

## What is the Knowledge Retrieval (RAG) Pattern?

Retrieval-Augmented Generation (RAG) is a pattern that allows LLM agents to answer questions using external, dynamic knowledge bases. Rather than relying on the model's static training parameters (which can lead to hallucinations or out-of-date responses), the agent retrieves relevant snippets from local policy files, feeds them to the LLM, and asks the LLM to draft a response cited directly to the source files.

```
                  📂 policy files (docs/*.txt)
                           │
                           ▼
                  ✂️  chunking (paragraphs)
                           │
                           ▼
             🧬 local vector embedding (Ollama)
                           │
                           ▼
           💾 vector database (vector-store.json)
                           │
  🙋 User Query            │
         │                 │
         ├───▶ [Semantic Embedding] ──▶ 🔍 Cosine Similarity Search
         │                                       │
         ├───▶ [Offline Fallback]  ──▶ 🛡️  Lexical Keyword Search Match
         │                                       │
         ▼                                       ▼
    (Top 3 context chunks retrieved with similarity scores)
         │
         ▼
    🧠 Augmented Prompt Generation (Llama 3.2)
         │
         ▼
    📝 Fact-based Answer with File Citations (e.g. [refund-policy.txt])
```

### Core Design Elements in this Demo:
1. **Document Ingestion & Chunking**: Reads files from `docs/`, segments them into paragraph-sized chunks, and converts them to 768-dimension vector embeddings using `nomic-embed-text`.
2. **Persistence**: Saves vectors to `vector-store.json` on the first run, loading instantly on subsequent runs.
3. **Semantic Similarity Search**: Embeds user queries and computes the **Cosine Similarity** natively in JavaScript to retrieve the top 3 matches.
4. **Lexical Keyword Fallback (Exception Recovery)**: If the embedding server is offline or fails (e.g., connection timed out), the system automatically triggers a keyword overlap parser to retrieve articles based on term frequency, keeping the Q&A fully functional.
5. **Citations & Generation**: Prompts `llama3.2` with strict constraints—it must *only* answer using the provided context, state if the answer cannot be found in the context, and append square-bracket citations (e.g., `[shipping-policy.txt]`) for any assertion.

---

## Project Structure

```
knowledgeretrieval/
├── package.json          ← Node configuration & dependencies (ollama)
├── README.md             ← This documentation file
├── docs/                 ← Policy text documents (refund, shipping, support escalation rules)
├── rag-system.js         ← Cosine similarity math, loading, embedding, search lookup, and generation
└── index.js              ← Interactive CLI support chat Q&A loop
```

---

## Prerequisites

1. Install [Node.js](https://nodejs.org/) (v18+)
2. Install [Ollama](https://ollama.com/)
3. Pull the local embedding and reasoning models:
   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3.2
   ```
4. Ensure Ollama is running (`ollama serve`).

---

## Setup & Running

### Installation
From the `knowledgeretrieval/` directory, install dependencies:
```bash
npm install
```

### Run the Interactive Support Q&A Session
Start the session:
```bash
npm start
```

### Scenarios to Test in CLI:

1. **Semantic Search over Policies**:
   - Ask: `"How long do refund reviews take?"`
     * (Should fetch `refund-policy.txt` and report 5 to 7 business days, citing `[refund-policy.txt]`).
   - Ask: `"What is the priority phone line for severity 1 outages?"`
     * (Should fetch `support-escalation.txt` and report the 1-800 number, citing `[support-escalation.txt]`).
   - Ask: `"Do you ship to Australia?"`
     * (Should fetch `shipping-policy.txt` and report shipping costs, citing `[shipping-policy.txt]`).

2. **Negative Constraint Check (No Hallucinations)**:
   - Ask: `"What is the CEO's favorite food?"`
     * (The agent should politely decline to answer, stating that it cannot find the information in the provided policies).

3. **Keyword Fallback Check**:
   - Stop Ollama (`ollama serve` process) or temporarily disable embeddings by simulating an error in `rag-system.js`'s semantic try-catch block. The system will report a `[Retrieval Warning]` and seamlessly switch to lexical keyword matching.
