# Agentic Design Pattern: Goal Setting & Monitoring

This repository demonstrates the **Goal Setting & Monitoring** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

## What is Goal Setting & Monitoring?

In traditional Plan-and-Execute patterns, an agent decomposes a task into a plan and runs it step-by-step. However, once the steps are complete, there is no guarantee the output satisfies the high-level quality goals. Traditional agents lack a mechanism to:
1. Define what "success" actually means for a goal.
2. Monitor and review their own outputs against those rules.
3. Iteratively self-correct and refine until goals are met.

The **Goal Setting and Monitoring** pattern embeds a sense of purpose and evaluation into agentic workflows. It ensures that the agent actively sets concrete, itemized checkpoints for its objectives and runs a continuous loop of creation, self-evaluation, and revision until all checklist items are marked as resolved.

```
                  ┌──────────────────────┐
                  │ 📝 User Code Request │
                  └──────────┬───────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │ 🎯 Goal Breakdown      │
                 │ (Decomposes into SMART │
                 │  success criteria)     │
                 └───────────┬────────────┘
                             │ (Checklist JSON)
                             ▼
                 ┌────────────────────────┐
  ┌─────────────▶│  💻 Code Generator     │◀───────────┐
  │              │ (Drafts/Refines logic) │            │
  │              └───────────┬────────────┘            │
  │                          │                         │
  │                          ▼                         │ (Critique & Revision)
  │              ┌────────────────────────┐            │
  │              │  🔎 Monitor Reviewer   │            │
  │              │ (Critiques vs. Goals)  │            │
  │              └───────────┬────────────┘            │
  │                          │                         │
  │                          ▼                         │
  │              ┌────────────────────────┐            │
  │              │      ⚖️ Goal Judge      ├────────────┘
  │              │ (Returns True / False) │
  │              └───────────┬────────────┘
  │                          │
  └──────────[Approved?]─────┼────(No)
                             │
                           (Yes)
                             ▼
                   ┌───────────────────┐
                   │  🚀 Polished Code  │
                   │    (Saved File)   │
                   └───────────────────┘
```

---

## Key Roles & Pipeline Steps

1. **Goal Breakdown & Criteria Definition (`GoalBreakdown`)**:
   - Takes a high-level coding request and a set of quality goals (e.g. `"simple, tested, handle negative inputs"`).
   - Generates a concrete, itemized JSON checklist of specific requirements.

2. **Code Generator (`CodeGenerator`)**:
   - Drafts or refines code based on the task, goals, and any feedback received from the reviewer.

3. **Monitor Reviewer (`MonitorReviewer`)**:
   - Evaluates the current generated code against the checklist.
   - Mentions specifically which criteria are met and which are unmet, detailing what changes are required.

4. **Goal Judge (`GoalJudge`)**:
   - Reviews the monitor's feedback.
   - Returns a single boolean status (`true` if all goals/criteria are fully met, `false` otherwise).
   - Provides a stopping mechanism for the iteration loop.

---

## File Structure

- [agent.js](file://./agent.js): Contains prompt templates, LLM client connection wrappers, and the iterative agent orchestrator class (`GoalMonitoringAgent`).
- [index.js](file://./index.js): CLI entry point that executes the pipeline on custom tasks and goals, formats trace outputs in the console, and packages the result into a local script file.
- [package.json](file://./package.json): Package specifications.

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
From the `goalmonitoring/` directory, install dependencies:
```bash
npm install
```

### Usage
Run the default orchestrator challenge (checking if a string is a palindrome, ignoring casing, spaces, and punctuation):
```bash
npm start
```
