/**
 * Tool Use Pattern — Node.js & Ollama Assistant
 * ===============================================
 * 
 * Demonstrates the TOOL USE / FUNCTION CALLING agentic design pattern:
 * 
 *   1. Send a user query + schemas of JS tools to a local Llama 3.2 model.
 *   2. Llama decides to call a tool, returning a structured tool_calls array.
 *   3. The JS runtime executes the matching local function and catches results.
 *   4. Results are appended to the conversation history as role: 'tool'.
 *   5. Llama is queried again with the tool responses and outputs the final summary.
 * 
 *                                 [JS Function execution]
 *                              ┌───────────────────────────┐
 *                              │                           ▼
 *   User Query ──▶ 🧠 Llama ───┼──[tool_calls block]──▶ ⚙️ execute_tool()
 *                  ▲           │                           │
 *                  │           └───────────────────────────┘
 *                  │                                       │
 *                  └───────────[role: 'tool' message]◄─────┘
 * 
 */

import ollama from "ollama";
import { tools, toolImpls } from "./tools.js";

const MODEL = "llama3.2";

// ─── Core Runner ─────────────────────────────────────────────────────────────

/**
 * Runs the tool use agent loop.
 * 
 * @param {string} userQuery - The question or task to execute
 */
export async function runAgent(userQuery) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🛠️  TOOL USE PATTERN — Ollama + Llama 3.2 Agent");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("━━━ Step 1: 💬 Sending Query to Llama ━━━━━━━━━━━━━━━━━━━");
  console.log(`   Query: "${userQuery}"\n`);

  const messages = [{ role: "user", content: userQuery }];

  // Call Ollama with the tool definitions
  let response = await ollama.chat({
    model: MODEL,
    messages: messages,
    tools: tools
  });

  // Loop to handle tool call rounds (if Llama requests tools)
  while (response.message.tool_calls && response.message.tool_calls.length > 0) {
    // Append the assistant's request to the messages history
    messages.push(response.message);

    // Process each requested tool call
    for (const toolCall of response.message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;

      console.log(`   🧠  Llama requests tool: ${toolName}(${JSON.stringify(toolArgs)})`);

      let result;
      if (toolImpls[toolName]) {
        try {
          result = toolImpls[toolName](toolArgs);
        } catch (err) {
          result = JSON.stringify({ status: "error", message: err.message });
        }
      } else {
        result = JSON.stringify({ status: "error", message: `Tool "${toolName}" not found.` });
      }

      console.log(`   📥  Tool output captured: ${result}\n`);

      // Push the tool result to history
      messages.push({
        role: "tool",
        content: result
      });
    }

    console.log("━━━ Step 2: 🔄 Returning Tool Outputs ━━━━━━━━━━━━━━━━━━");
    response = await ollama.chat({
      model: MODEL,
      messages: messages,
      tools: tools
    });
  }

  console.log("━━━ Step 3: 📊 Synthesized Final Response ━━━━━━━━━━━━━━━");
  console.log(response.message.content);
  console.log("\n═══════════════════════════════════════════════════════════\n");

  return response.message.content;
}
