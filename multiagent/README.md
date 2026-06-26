# Agentic Design Pattern: Multi-Agent Collaboration

This repository demonstrates the **Multi-Agent Collaboration** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

In this pattern, a complex, multi-domain task is solved by a team of specialized agents working together. Instead of relying on a single generalist model, we instantiate multiple agents with specific roles, goals, and instructions, coordinating them in a sequential and iterative feedback loop.

```
                  ┌───────────────────┐
                  │ 📋 Topic Request  │
                  └─────────┬─────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ 🔍 Researcher Agent   │
                │ (Outlines key trends) │
                └───────────┬───────────┘
                            │ (Handoff Research JSON)
                            ▼
                ┌───────────────────────┐
  ┌────────────▶│    ✍️ Writer Agent     │◀───────────┐
  │             │ (Drafts/Refines blog) │            │
  │             └───────────┬───────────┘            │
  │                         │                        │
  │                         ▼                        │ (Refinement Feedback)
  │             ┌───────────────────────┐            │
  │             │   🔎 Editor Agent     ├────────────┘
  │             │ (Critiques & Reviews) │
  │             └───────────┬───────────┘
  │                         │
  └──────────[Approved?]────┼────(No)
                            │
                          (Yes)
                            ▼
                 ┌─────────────────────┐
                 │  🚀 Final Blog Post │
                 └─────────────────────┘
```

---

## Key Roles & Workflow

1. **Senior Research Analyst (Researcher Agent)**
   - Decomposes the topic into a structured JSON outline of 3 key trends, facts, and applications.
   - Using structured JSON ensures factual consistency and clear downstream consumption.

2. **Technical Content Writer (Writer Agent)**
   - Takes the researcher's JSON findings and drafts a detailed, engaging blog post.
   - If rejected by the Editor, the writer receives specific critiques and iteratively refines the draft.

3. **Editorial Director (Editor Agent)**
   - Acts as a critic-reviewer, comparing the writer's draft against the original research checklist.
   - Evaluates on facts, style, flow, and structure.
   - Outputs JSON feedback indicating overall score, critiques list, and approval status (`approved: true/false`).

4. **Collaboration Loop**
   - Orchestrates the transitions. If approved, the loop exits. Otherwise, the writer refines the text.
   - Runs for a maximum of 3 loops to avoid infinite execution.

---

## File Structure

- [agent.js](file://./agent.js): Houses the Researcher, Writer, and Editor prompt construction, LLM callers, and the orchestrator loop.
- [index.js](file://./index.js): CLI entry point to accept user topics, run the pipeline, print metrics, and optionally save output.
- [package.json](file://./package.json): Project dependencies and run scripts.

---

## Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) running locally.
- Llama 3.2 pulled locally:
  ```bash
  ollama pull llama3.2
  ```

### Installation
From the `multiagent/` directory, install dependencies:
```bash
npm install
```

### Usage
Run the default topic (*"Emerging trends in clean energy technologies"*):
```bash
npm start
```

Run a custom topic and save the synthesized report package to `reports/`:
```bash
node index.js "The impact of deep learning on genomics" --save
```

Or run the pre-configured script:
```bash
npm run collab:energy
```
