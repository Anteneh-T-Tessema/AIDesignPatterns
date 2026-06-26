# 👥 Human-in-the-Loop (HITL) Pattern — Support Co-Pilot Agent

This project demonstrates the **Human-in-the-Loop (HITL)** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

## What is the Human-in-the-Loop Pattern?

The Human-in-the-Loop pattern blends AI speed with human oversight. Rather than granting full autonomy to the agent in sensitive sectors, the agent performs initial heavy-lifting (such as classification and draft writing) but pauses to consult a human operator at key validation checks or high-risk decision points.

```
Incoming Customer Ticket
         │
         ▼
 🔍 Risk Assessment (AI)
         │
         ├───[High Risk / Urgency] ──▶ 🚨 Escalation Policy Triggered
         │                                (Human selects strategy first)
         │                                              │
         └───[Low Risk] ──────────────────┐             ▼
                                          ├──▶ ✍️ Draft Response Email (AI)
                                          │
                                          ▼
                                👥 Human Oversight Loop
                                   - [A]pprove ──▶ Send Email ✅
                                   - [E]dit   ──▶ Manual Override & Send ✅
                                   - [R]eject ──▶ Provide Feedback ──┐
                                        ▲                            │
                                        └───────[Redrafts Email]◄────┘
```

### Core Design Elements in this Demo:
1. **Sentiment & Risk Classification**: Evaluates incoming tickets. If sentiment is angry, urgency is high, or threats of legal/cancellation are detected, the safety risk is marked as `high`.
2. **Escalation Policies**: High-risk tickets immediately halt AI autonomy and prompt the human supervisor to select a response strategy (e.g. refunding vs. director escalation) before generating drafts.
3. **Human Oversight Loop**: Offers the operator three distinct ways to interact with a drafted response:
   - **Approve**: Dispatches the AI draft.
   - **Edit**: Allows the operator to input directly overriding the draft.
   - **Reject & Redraft**: Allows the operator to provide written feedback (e.g. "sound more apologetic"), triggering the AI to revise its draft in a continuous feedback-learning loop.
4. **Interactive CLI Prompts**: Uses Node's native `readline/promises` library to prompt for operator inputs directly in the terminal interface.

---

## Project Structure

```
humanintheloop/
├── package.json          ← Node configuration & dependencies (ollama)
├── README.md             ← This documentation file
├── hitl-agent.js         ← Orchestration workflow, classification, and drafting logic
└── index.js              ← Interactive CLI support queue runner
```

---

## Prerequisites

1. Install [Node.js](https://nodejs.org/) (v18+)
2. Install [Ollama](https://ollama.com/)
3. Pull the local model:
   ```bash
   ollama pull llama3.2
   ```
4. Ensure Ollama is running (`ollama serve`).

---

## Setup & Running

### Installation
From the `humanintheloop/` directory, install dependencies:
```bash
npm install
```

### Run the Interactive Support Co-Pilot Demo
Start the queue runner:
```bash
npm start
```

### Scenarios to Test in CLI:

- **Option 1: Sarah Connor (Low Risk Warning)**
  - Classified as `Low Risk`. 
  - The AI drafts an email and directly offers you the oversight choices: **[A]pprove**, **[R]eject (Feedback)**, or **[E]dit**.
  - Try selecting **R** and typing: `"add that billing details can be viewed under Settings -> Billing."` Observe the AI immediately redraft the response, incorporating your feedback.

- **Option 2: John Doe (Angry Charge Dispute & Legal Threat)**
  - Classified as `High Risk` due to cancellation and legal threats.
  - The agent immediately halts autonomous actions and asks you to select a response strategy (1-4).
  - Select **Option 1** (refund + coupon) or **Option 4** (custom strategy). The agent then drafts the response tailored exactly to your guidance.
