# 🧭 Routing Pattern — Customer Support Router

Demonstrates the **routing** agentic design pattern using [Ollama](https://ollama.com/) with **Llama 3.2**.

## What is the Routing Pattern?

A **classifier LLM** reads the input, categorizes it, and routes it to a **specialized handler** — each with its own optimized prompt and personality.

```
                          ┌─── 💳 Billing (refunds, charges, pricing)
                          │
Customer Message ──▶ 🧠 ──├─── 🔧 Technical (bugs, errors, setup)
                          │
                          ├─── 👤 Account (login, password, settings)
                          │
                          └─── 💬 General (feedback, questions, other)
```

### Why Route Instead of Using One Prompt?

| Without Routing | With Routing |
|----------------|-------------|
| One generic prompt handles everything | Each handler is a domain specialist |
| Same tone for angry + happy customers | Tone adapts to sentiment & urgency |
| Can't prioritize critical issues | Urgency-based prioritization |

## Project Structure

```
routing/
├── router.js              ← Core router module (classifier + handlers)
├── index.js               ← CLI entry point
├── tickets/               ← Sample customer tickets
│   ├── billing-dispute.txt       → should route to 💳 Billing
│   ├── technical-outage.txt      → should route to 🔧 Technical
│   ├── account-locked.txt        → should route to 👤 Account
│   ├── feature-request.txt       → should route to 💬 General
│   └── angry-cancellation.txt    → edge case (billing + account)
├── package.json
└── README.md
```

## Prerequisites

```bash
ollama pull llama3.2
ollama serve
```

## Run

```bash
npm install
```

### Route sample tickets

```bash
npm run route:billing      # duplicate charge dispute
npm run route:technical    # entire team blocked, dashboard down
npm run route:account      # locked out, possible compromise
npm run route:general      # positive feedback + feature request
npm run route:angry        # angry cancellation (edge case!)
```

### Route your own message

```bash
node index.js --message "I can't export my reports to PDF anymore"
node index.js --message "What's the difference between Pro and Enterprise?"
node index.js --message "Your app deleted all my data!!!"
```

### Route from a file

```bash
node index.js path/to/ticket.txt
```

### Use as a module

```js
import { routeTicket } from "./router.js";

const { classification, response } = await routeTicket("I was charged twice");
console.log(classification.route);    // "billing"
console.log(classification.urgency);  // "high"
```

## How the Router Works

### Step 1: Classify

The classifier LLM analyzes the message and outputs structured JSON:

```json
{
  "route": "billing",
  "confidence": 0.95,
  "sentiment": "frustrated",
  "urgency": "high",
  "reasoning": "Customer reports duplicate charge and requests refund"
}
```

### Step 2: Route to Handler

The classified `route`, `sentiment`, and `urgency` are passed to the specialized handler, which has its own:
- **Personality** (billing specialist vs. technical engineer vs. friendly rep)
- **Guidelines** (security-conscious for accounts, empathetic for billing)
- **Response style** (systematic troubleshooting for tech, warm for general)

## Customizing

- **Add routes**: Add new entries to the `ROUTES` object in `router.js`
- **Modify handler prompts**: Edit the `handler` function in each route
- **Add tickets**: Drop `.txt` files into `tickets/`
- **Change model**: Update the `MODEL` constant in `router.js`
