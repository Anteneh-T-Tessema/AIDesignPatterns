# 🛡️ Exception Handling and Recovery Pattern — Resilient Billing Agent

This project demonstrates the **Exception Handling and Recovery** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

## What is the Exception Handling & Recovery Pattern?

AI agents operating in real-world environments encounter various operational failures. Rather than allowing the agent to crash or stall, this pattern equips it with robust mechanisms to detect issues, perform recovery procedures, or ensure a clean, controlled rollback and human escalation.

```
                   [Failure Detected]
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  🔄 Retries          🔄 Fallbacks       🧠 Self-Correction
(Transient error)    (Service down)     (LLM corrects inputs)
       │                   │                   │
       └─────────┬─────────┘                   │
                 ▼                             │
          [Success / Recovered] ◄──────────────┘
                 │
                 ▼
          [Failure Persists]
                 │
                 ▼
       🚨 Rollback & Escalate
  (Undo actions & alert human)
```

### Core Recovery Mechanisms in this Demo:
1. **Proactive Error Detection**: Intercepting tool errors, parsing response codes, and examining outputs.
2. **Retries (Transient Errors)**: Automatically retries temporary glitches (e.g. state tax API timeout) with exponential backoff.
3. **Fallbacks (Service Outages)**: Switches to a secondary tool (`get_customer_record_backup`) if the primary DB returns a 500 error.
4. **Self-Correction (Format Mismatch)**: Feeds validation errors (e.g., passing a string `$150.00` instead of a float `150.00` to a billing tool) back to the LLM so it can diagnose the issue, adjust arguments, and try again.
5. **State Rollback (Consistency)**: Reverts already executed steps (e.g., releasing reserved customer balances) if a later step fails.
6. **Escalation**: Generates a detailed incident report (`reports/escalation-[timestamp].md`) containing trace history and rollback audits for human review.

---

## Project Structure

```
exceptionhandling/
├── package.json          ← Project configuration & dependencies (ollama)
├── README.md             ← This documentation file
├── tools.js              ← Mock tools simulating primary/backup DB, tax calculator, and payment charges
├── resilient-agent.js    ← Coordinator managing retry, fallback, self-correction, rollback, and escalation logic
├── index.js              ← CLI driver hosting the four scenarios
└── reports/              ← Folder containing generated escalation reports
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
From the `exceptionhandling/` directory, install dependencies:
```bash
npm install
```

### Run All Scenarios
To run all four demonstration scenarios in a single sequence:
```bash
npm start
```

### Run Specific Scenarios
You can run any of the four scenarios individually by passing the `--scenario` flag:

1. **Scenario 1: Transient API Failures (Automatic Retries)**
   - Demonstrates retrying a tax rate query that fails twice due to a mock server timeout but succeeds on the 3rd attempt.
   ```bash
   npm run scenario:retry
   ```

2. **Scenario 2: Primary DB Outage (Fallback to Backup)**
   - Demonstrates switching to a backup user profile database after the primary database throws a 500 server outage exception.
   ```bash
   npm run scenario:fallback
   ```

3. **Scenario 3: Input Validation Mismatch (Self-Correction)**
   - Demonstrates the agent recovering from passing a currency formatted string `"$150.00"` instead of a raw float `150.00`. The agent reads the error, diagnoses the issue, corrections its parameter formatting, and successfully processes the payment.
   ```bash
   npm run scenario:correction
   ```

4. **Scenario 4: Policy Violation (Rollback & Escalation)**
   - Demonstrates an unrecoverable business violation (charging a customer an amount that exceeds their risk threshold). The agent aborts the transaction, rolls back the initial database steps, and generates an escalation log in the `reports/` folder.
   ```bash
   npm run scenario:escalate
   ```
