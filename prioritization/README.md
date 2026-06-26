# 📋 Prioritization Pattern — Project Manager Agent

Demonstrates the **prioritization** agentic design pattern using [Ollama](https://ollama.com/) with **Llama 3.2**.

## What is the Prioritization Pattern?

In complex, dynamic environments, AI agents frequently face multiple conflicting goals, tasks, or actions with limited time and resources. Without a structured process for selecting the next step, agents risk thrashing, acting suboptimally, or failing key objectives.

The **Prioritization Pattern** solves this by enabling the agent to evaluate tasks against standard criteria (such as urgency, significance, and assignee availability) and dynamically maintain a ranked task queue.

```
                  ┌────────────────────────────────────────┐
                  │          👤 User Task Request          │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         🧠 Project Manager Agent       │
                  │  Analyzes urgency & maps priority level│
                  └───────────────────┬────────────────────┘
                                      │
                         (Executes tool updates)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       ⚙️  SuperSimpleTaskManager        │
                  │  - createTask(desc)                    │
                  │  - updateTask(id, {priority, worker})  │
                  │  - listAllTasks()                      │
                  └────────────────────────────────────────┘
```

### Why Prioritize?

- **Goal Alignment**: Focuses finite computational resources/model calls on high-impact objectives first.
- **Resource Constraints**: Manages tool usage and execution overhead according to task importance.
- **Dynamic Adaptability**: Re-ranks task boards in response to new critical events (e.g., severe bugs vs. routine queries).

---

## Project Structure

```
prioritization/
├── task-manager.js        ← In-memory task board module
├── agent.js               ← PM Agent definition, tool schemas, and ReAct loop
├── index.js               ← CLI entry point running simulations or custom commands
├── package.json           ← Project metadata and dependencies
└── README.md              ← Documentation (this file)
```

---

## Setup & Running

### Prerequisites

1. Install [Ollama](https://ollama.com/)
2. Pull the required Llama 3.2 model:
   ```bash
   ollama pull llama3.2
   ```
3. Make sure Ollama is running locally:
   ```bash
   ollama serve
   ```

### Installation

From the `prioritization/` directory, install the required packages:
```bash
npm install
```

### Run Simulation

Execute the default simulation showcasing two sequential scenarios (an urgent, assigned task and a standard task defaulting to fallback values):
```bash
npm start
```

### Run Custom Queries

You can query the Project Manager Agent directly from the command line:
```bash
node index.js "Add a dark mode toggle to the user dashboard immediately, assign to Worker B"
node index.js "Draft the weekly newsletter"
node index.js "Review the billing database crash ASAP, assign to Review Team"
```
