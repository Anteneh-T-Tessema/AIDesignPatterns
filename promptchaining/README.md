# 🔗 Prompt Chaining Examples

Two complete demonstrations of the **prompt chaining** design pattern using [Ollama](https://ollama.com/) with **Llama 3.2**.

## What is Prompt Chaining?

Prompt chaining breaks a complex task into a sequence of simpler steps, where **each step's output feeds into the next step's prompt**. This produces better results than a single monolithic prompt because each step can focus on one specific aspect.

---

## Chain 1: 🔍 Code Review Pipeline

Analyzes source code through 3 progressive steps:

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Step 1      │────▶│  Step 2           │────▶│  Step 3         │
│  Analyze     │     │  Identify Issues  │     │  Suggest Fixes  │
│              │     │                   │     │                 │
│  Input: Code │     │  Input: Code +    │     │  Input: Code +  │
│  Output:     │     │         Analysis  │     │         Issues  │
│   Analysis   │     │  Output: Issues   │     │  Output: Fixes  │
└─────────────┘     └──────────────────┘     └────────────────┘
```

**Files:** [chain.js](chain.js) (module) · [index.js](index.js) (CLI)

**Examples in `examples/`:**
| File | Bugs Planted |
|------|-------------|
| `user-api.js` | Sync XHR, SQL injection, password logging, off-by-one |
| `shopping-cart.js` | Assignment in condition, splice misuse, floating point |
| `auth-system.js` | Plaintext passwords, Math.random tokens, no validation |
| `data-processor.js` | eval() injection, memory leak, unawaited promises |

---

## Chain 2: 📊 Data Pipeline (ETL)

Processes raw unstructured data through 3 ETL steps:

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  Step 1       │────▶│  Step 2            │────▶│  Step 3          │
│  📥 Extract   │     │  🔄 Transform      │     │  📊 Summarize    │
│               │     │                    │     │                  │
│  Raw text  →  │     │  Structured JSON → │     │  Clean data   →  │
│  Structured   │     │  Cleaned, normed,  │     │  Stats, insights │
│  JSON         │     │  enriched          │     │  recommendations │
└──────────────┘     └───────────────────┘     └─────────────────┘
```

**Files:** [data-chain.js](data-chain.js) (module) · [data-index.js](data-index.js) (CLI)

**Samples in `data-samples/`:**
| File | What's Messy |
|------|-------------|
| `messy-sales.txt` | 15 sales records, wildly inconsistent dates/names/prices |
| `messy-employees.txt` | 10 employee records, every format style imaginable |
| `messy-logs.txt` | 20 server logs, mixed timestamps/levels/services |

---

## Project Structure

```
promptchaining/
├── chain.js               ← Code review chain module
├── index.js               ← Code review CLI
├── data-chain.js          ← Data pipeline chain module
├── data-index.js          ← Data pipeline CLI
├── examples/              ← Buggy code samples
│   ├── user-api.js
│   ├── shopping-cart.js
│   ├── auth-system.js
│   └── data-processor.js
├── data-samples/          ← Messy raw data samples
│   ├── messy-sales.txt
│   ├── messy-employees.txt
│   └── messy-logs.txt
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

## Quick Start

```bash
npm install
```

### Code Review Chain

```bash
npm run review:user-api            # review user API bugs
npm run review:shopping-cart       # review shopping cart bugs
npm run review:auth                # review auth system bugs
npm run review:data                # review data processor bugs
npm run review:all-save            # review ALL & save reports
node index.js path/to/your/file.js --save   # review your own code
```

### Data Pipeline Chain

```bash
npm run data:sales                 # ETL on messy sales data
npm run data:employees             # ETL on messy employee data
npm run data:logs                  # ETL on messy server logs
node data-index.js mydata.csv --save   # process your own data
```

### Use as Modules

```js
import { runCodeReviewChain } from "./chain.js";
import { runDataPipelineChain } from "./data-chain.js";

// Code review
const { analysis, issues, fixes } = await runCodeReviewChain(codeString);

// Data pipeline
const { extracted, transformed, summary } = await runDataPipelineChain(rawData, "sales");
```

## Customizing

- **Add examples**: Drop code files into `examples/` or data files into `data-samples/`
- **Modify prompts**: Edit the `PROMPTS` object in `chain.js` or `data-chain.js`
- **Change model**: Update the `MODEL` constant (e.g., `llama3.1`, `codellama`, `mistral`)
