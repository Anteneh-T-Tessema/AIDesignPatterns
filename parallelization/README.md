# 📊 Parallelization Pattern — Code Audit Suite

Demonstrates the **parallelization** agentic design pattern using [Ollama](https://ollama.com/) with **Llama 3.2**.

## What is the Parallelization Pattern?

Parallelization runs multiple independent LLM tasks **concurrently** (simultaneously) and merges their results into a single synthesized output.

```
                      ┌──▶ 🔒 Security Auditor (AppSec Expert) ──────────┐
                      │                                                   │
Source Code ──────────├──▶ ⚡ Performance Auditor (Big O & Optimization) ──┼──▶ 📊 Synthesizer ──▶ Unified Report
                      │                                                   │
                      └─── 🎨 Style & Best Practices (Tech Lead) ─────────┘
```

### Why Parallelization?

1. **Massive Speedup**: In an asynchronous execution context (like Node.js), running 3 audits concurrently takes only as long as the slowest individual run. If each audit takes 4 seconds:
   * **Sequential Execution**: 4s (Security) + 4s (Performance) + 4s (Style) = **12 seconds**
   * **Parallel Execution**: `Promise.all([Security, Performance, Style])` = **4 seconds**
2. **Domain Specialization**: Instead of asking one generic prompt to evaluate code against 20 different dimensions, we query three highly focused experts concurrently. This yields deeper, more accurate critiques.
3. **Consolidation**: A dedicated **Synthesizer** LLM aggregates the parallel outputs, resolves overlaps, structures a prioritized severity table, and generates clean refactored code.

---

## Project Structure

```
parallelization/
├── auditor.js             ← Core logic (runs parallel audits & consolidates)
├── index.js               ← CLI entry point (handles flags, file read, & savings)
├── samples/               ← Code inputs with bugs/perf issues
│   ├── user-service.js       → SQL injection, sync I/O in loop, secrets in code
│   └── data-exporter.js      → Insecure eval(), unbounded cache memory leaks
├── reports/               ← Generated markdown reports (--save)
├── package.json
└── README.md
```

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

### Audit pre-configured samples
Use these scripts to audit the sample files and auto-save complete markdown reports:
```bash
npm run audit:user-service     # Audits the user database service
npm run audit:data-exporter    # Audits the insecure data exporter
```

### Audit custom files
Run the auditor against any custom JavaScript file on your machine:
```bash
node index.js path/to/your/file.js
```
Add the `--save` flag to export the synthesized markdown audit report:
```bash
node index.js path/to/your/file.js --save
```

---

## Customizing

* **Add more parallel auditors**: Extend the `AUDITORS` object in `auditor.js` with new expert definitions.
* **Tune synthesizer criteria**: Edit `buildSynthesizerPrompt` in `auditor.js` to change how findings are formatted, sorted, or merged.
* **Change model**: Update the `MODEL` constant in `auditor.js` (e.g. to `llama3` or `mistral`).
