# Agentic Design Pattern: Planning (Plan & Execute)

This repository demonstrates the **Planning** agentic design pattern, built natively in Node.js using ES Modules and a local **Llama 3.2** model via **Ollama**.

In this pattern, the agent decomposes a high-level task into a structured plan (a sequence of sub-goals or outline points), then iterates through the plan to execute each step, using the output of previous steps as context, and finally compiles a cohesive output.

```
                      ┌──▶ Step 1 (Draft Introduction) ──┐
                      │                                  │
User Topic ──▶ 🧠 Plan ├──▶ Step 2 (Draft Core Section) ──┼──▶ Final Synthesized Document
              (List)  │                                  │
                      └──▶ Step 3 (Draft Conclusion) ────┘
```

---

## Key Concepts

1. **Plan Generation (Decomposition)**
   - The agent takes a high-level topic (e.g. *"The importance of Reinforcement Learning in AI"*) and prompts the model to generate a structured JSON array containing exactly 3 to 4 sequential outline points/steps.
   - We utilize Ollama's `format: 'json'` setting to guarantee that the output can be parsed reliably by Node.js.

2. **Sequential Step Execution**
   - The agent loops through each plan step one-by-one.
   - For each step, it prompts the model to write the text for that section, providing the previous sections' content as context.
   - This ensures **Prompt Chaining** with contextual memory, allowing the model to make smooth transitions, avoid repeating facts, and maintain a consistent tone.

3. **Synthesis**
   - The plan structure and drafted section outputs are compiled together into a single, cohesive, publication-quality Markdown report.

---

## File Structure

- [planner.js](file://./planner.js): Contains core functions for generating plans, calling the Ollama API, sequentially executing plan steps, and synthesizing the final Markdown output.
- [index.js](file://./index.js): CLI entry point that runs the pipeline on user-specified topics, saves the final Markdown output to a `reports/` folder, and handles system arguments.

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
From the `planning/` directory, install dependencies:
```bash
npm install
```

### Usage
Run the default topic (*"The importance of Reinforcement Learning in AI"*):
```bash
npm start
```

Run a custom topic and save the synthesized Markdown document to `reports/`:
```bash
node index.js "Your custom topic here" --save
```

Or run the pre-configured script:
```bash
npm run plan:rl
```
