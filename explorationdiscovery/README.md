# Agentic Design Pattern: Exploration & Discovery (Autonomous Research Co-Scientist)

This repository demonstrates the **Exploration & Discovery** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

Inspired by Google's Co-Scientist and AI Agent Laboratories, this pattern implements an autonomous research loop that ideates, peer-reviews, debates, and refines scientific or technical hypotheses.

```
             ┌─────────────────────────────────────────────────────────────┐
             │                   🔬 Research Lab                          │
             │                                                             │
             │  Topic ──▶ 🧬 Generator ──▶ [H1, H2, H3]                 │
             │                                    │                        │
             │              ┌─────────────────────┤                        │
             │              ▼          ▼          ▼                        │
             │         👩‍🔬 Rev1  👨‍🔬 Rev2  🧑‍🔬 Rev3  (× 3 hypotheses)     │
             │              └─────────────────────┘                        │
             │                         │                                   │
             │                         ▼                                   │
             │              🏆 Tournament Ranker                           │
             │                         │                                   │
             │                    Top Hypothesis                           │
             │                         ▼                                   │
             │              🔭 Evolution Agent                             │
             │                         │                                   │
             │                  Final Proposal                             │
             │                         ▼                                   │
             │              📄 Professor Synthesis                         │
             └─────────────────────────────────────────────────────────────┘
```

---

## Key Roles & Pipeline Phases

1. **Hypothesis Generation (Generator Agent)**
   - Decomposes the research topic/problem into exactly 3 distinct, creative, and conceptually sound hypotheses.
   - Each hypothesis represents a different technical angle (e.g., physical, biological, or chemical principles).

2. **Multi-Persona Peer Review (Reviewer Agents)**
   - Simulates 3 expert reviewer personas evaluating each hypothesis (totaling 9 separate reviews):
     - **Experimentation Reviewer**: Focuses on scientific methodology, testability, parameters, and replication.
     - **Field Impact Reviewer**: Evaluates industrial scale, cost-benefit feasibility, and macro-level significance.
     - **Scientific Novelty Reviewer**: Penalizes generic or incremental ideas; rewards paradigm-shifting, creative angles.
   - Each reviewer outputs a detailed JSON review containing a score (1-10), verdict (Accept/Reject), strengths, weaknesses, and detailed critique.

3. **Elo Tournament Ranking (Tournament Ranker Agent)**
   - Conducts simulated head-to-head matches between all pairs of hypotheses (H1 vs H2, H2 vs H3, H1 vs H3).
   - Weighs peer critiques and scores to determine match winners.
   - Computes an Elo leaderboard ranking the hypotheses.

4. **Hypothesis Evolution (Evolution Agent)**
   - Selects the highest-ranked hypothesis and refines it into a comprehensive research proposal.
   - Explicitly mitigates the criticisms and weaknesses raised by the peer reviewers.

5. **Academic Synthesis (Professor Agent)**
   - Synthesizes the entire exploration trajectory, reviews, debates, and final evolved proposal into a beautifully structured, publication-quality academic report in Markdown.

---

## File Structure

- [agents.js](file://./agents.js): Houses the core LLM communicator (`callLLM`), agent personas, and prompt generators for each role.
- [research-lab.js](file://./research-lab.js): Coordinates the asynchronous execution pipeline across the 5 phases of research.
- [index.js](file://./index.js): CLI entry point that runs the pipeline on default or custom research questions and supports saving report outputs.
- [package.json](file://./package.json): Defines dependencies (`ollama`) and run scripts.

---

## Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) running locally.
- `llama3.2` model pulled locally:
  ```bash
  ollama pull llama3.2
  ```

### Installation
From the `explorationdiscovery/` directory, install the required dependencies:
```bash
npm install
```

### Usage
Run the pipeline on the default research topic (*"Next-generation solid-state battery electrolytes that enable full charge in under 5 minutes"*):
```bash
npm start
```

Run the pipeline on a custom research question and save the final report inside a `reports/` folder:
```bash
node index.js "Methods to biologically decompose microplastics in municipal wastewater treatment plants" --save
```
