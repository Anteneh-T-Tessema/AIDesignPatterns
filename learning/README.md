# Agentic Design Pattern: Learning and Adaptation

This repository demonstrates the **Learning and Adaptation** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

In this pattern, agents go beyond fixed static configurations. They observe their environments, evaluate their performance using test frameworks, record outcomes in a "program database", and mutate/adapt their behavior or code base autonomously based on experience (similar to **SICA** and Google's **OpenEvolve** described in Chapter 9).

```
                  ┌──────────────────────────────┐
                  │ 📝 Inefficient Code Input    │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
             ┌───▶│   🧬 LLM Mutator (Gemini)    │
             │    │ (Proposes code revisions)    │
             │    └──────────────┬───────────────┘
             │                   │
             │                   ▼
             │    ┌──────────────────────────────┐
             │    │   🔬 Evaluator Pool          │
             │    │ (Checks test specs & timers) │
             │    └──────────────┬───────────────┘
             │                   │ (Outputs metrics: speed, size, bugs)
             │                   ▼
             │    ┌──────────────────────────────┐
             │    │   📊 Program Database        │
             │    │ (Records scores & select best)│
             └────┤                              │
                  └──────────────┬───────────────┘
                                 │ (Max generations reached)
                                 ▼
                  ┌──────────────────────────────┐
                  │  🚀 Final Optimized Code      │
                  └──────────────────────────────┘
```

---

## Architectural Components

1. **Evolutionary Controller (`evolver.js`)**
   - Coordinates the iterations (generations).
   - Prompts the LLM (Llama 3.2) to mutate code by feeding it the current best source code, execution failure logs, and latency metrics.

2. **Evaluator Pool (`evaluator.js`)**
   - Sandboxes the generated code using Node's `vm` module to ensure compile-safe benchmarks.
   - Runs unit tests and measures execution latency using high-resolution performance timers.
   - Computes a weighted **fitness score**:
     `score = (successRate * 1000) - (durationMs * 10) - (codeSizeChars * 0.05)`

3. **Program Database**
   - Stores candidate versions and their metrics.
   - Samples the highest-ranked candidate to act as the parent for the next mutation generation.

---

## File Structure

- [evaluator.js](file://./evaluator.js): Sandboxes, compiles, executes, and scores target code benchmarks.
- [evolver.js](file://./evolver.js): Handles mutation prompts and coordinates the evolution cycles.
- [index.js](file://./index.js): Configures the initial recursive Fibonacci code and executes the optimization runs.
- [package.json](file://./package.json): NPM scripts and dependencies.

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
From the `learning/` directory, install dependencies:
```bash
npm install
```

### Usage
Start the code evolution pipeline:
```bash
npm start
```
The console will log details for each generation, show metric improvements, and print the final evolved algorithm.
