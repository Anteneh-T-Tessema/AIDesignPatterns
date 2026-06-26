# 🔄 Reflection Pattern — Self-Reflecting Code Generator

Demonstrates the **reflection (self-correction)** agentic design pattern using [Ollama](https://ollama.com/) with **Llama 3.2**.

## What is the Reflection Pattern?

Reflection is a design pattern where an LLM evaluates its own outputs (or has a peer persona evaluate them) against constraints, edge cases, and quality checks, then refines the output iteratively based on that critique.

```
                      Feedback / Critiques
                   ┌─────────────────────────┐
                   │                         │
                   ▼                         │
User Prompt ──▶ Generator ──────────▶ Reflector ──[Approved?]──(Yes)──▶ Final Refined Code
(Task/Schema)  (Writes Code)          (Critiques Code)   │
                                                         ▼
                                                       (No) ──▶ Refiner ──┐
                                                                           │
                                                                           ▼
                                                                     (Loop Refines)
```

### Key Elements of this Suite:
1. **Generator**: Takes the task instructions and writes a pure JavaScript ES6 module function.
2. **Reflector (QA Auditor)**: Evaluates the code against logic bugs, unhandled input edge cases (empty arrays, boundary parameters, missing types), and security concerns (e.g. prototype pollution). Output is strictly structured as JSON to ensure programmatic loops.
3. **Refiner**: Takes the critiques and the previous code draft, and optimizes the code to fix the flaws.
4. **Self-Correction Loop**: Loops dynamically up to a limit (e.g. 3 attempts) or until the Reflector reports a `pass: true`.

---

## Project Structure

```
reflection/
├── reflector.js           ← Core logic (runs generator, reflector critique, and refiner loop)
├── index.js               ← CLI runner (accepts tasks, parses flags, saves markdown reports)
├── tasks/                 ← Coding challenges containing tricky edge cases
│   ├── merge-intervals.txt   → Merging intervals (requires sorting, boundary checks, and empty checks)
│   └── url-parser.txt        → Query parameter parser (requires prototype pollution prevention & URI decoding)
├── reports/               ← Generated iteration logs and markdown reports (--save)
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

### Run pre-configured code generation challenges
These scripts run the generator, let it self-correct over multiple cycles, and save the complete critique/refinement logs as a report:
```bash
npm run reflect:intervals     # Generates overlapping interval merger
npm run reflect:url           # Generates prototype-pollution safe query parameter parser
```

### Run custom coding prompts
Create a `.txt` file containing your coding instructions and run:
```bash
node index.js path/to/prompt.txt --save
```

---

## Customizing

* **Tune the Reflector's criteria**: Modify the prompt in `buildReflectorPrompt` inside `reflector.js` to demand checks for performance, framework guidelines, or language-specific rules.
* **Adjust loop depth**: Edit the iteration limit parameter in `runReflectionLoop(task, maxIterations)` inside `index.js`.
