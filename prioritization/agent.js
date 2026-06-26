/**
 * Prioritization Pattern — Project Manager Agent
 * =================================================
 * 
 * Demonstrates the PRIORITIZATION agentic design pattern:
 * 
 *   1. Receives a user request (e.g. "Create a task for X, it's urgent").
 *   2. The PM Agent analyzes the request using local Llama 3.2.
 *   3. It decides which tools to call (creating a task, assigning priority, assigning worker).
 *   4. It maps priority keywords (e.g., "urgent", "ASAP") to standardized priority levels (P0, P1, P2).
 *   5. It uses fallback defaults (P1, Worker A) if details are missing.
 *   6. Displays the updated task board state.
 */

import { Ollama } from "ollama";
import { SuperSimpleTaskManager } from "./task-manager.js";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// Expose a single persistent task manager instance
export const taskManager = new SuperSimpleTaskManager();

// ─── 1. Tool Schemas ─────────────────────────────────────────────────────────

export const tools = [
  {
    type: "function",
    function: {
      name: "create_new_task",
      description: "Creates a new task in the project manager system. Use this first to get a task ID.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "A detailed description of the task to be created."
          }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_priority_to_task",
      description: "Assigns a priority level (P0, P1, P2) to a specific task.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "The ID of the task to update (e.g., 'TASK-001')."
          },
          priority: {
            type: "string",
            description: "The priority to assign. Must be one of: 'P0' (highest), 'P1' (medium), 'P2' (lowest)."
          }
        },
        required: ["task_id", "priority"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_task_to_worker",
      description: "Assigns a task to a specific worker.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "The ID of the task to update (e.g., 'TASK-001')."
          },
          worker_name: {
            type: "string",
            description: "The name of the worker to assign the task to. Must be one of: 'Worker A', 'Worker B', 'Review Team'."
          }
        },
        required: ["task_id", "worker_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_all_tasks",
      description: "Retrieves a text list of all tasks currently managed by the system.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// ─── 2. Tool Implementations ───────────────────────────────────────────────────

// Helper to resolve task_id with a fallback to the most recently created task
const resolveTaskId = (task_id) => {
  if (task_id && taskManager.tasks.has(task_id)) {
    return task_id;
  }
  const lastId = `TASK-${String(taskManager.nextTaskId - 1).padStart(3, '0')}`;
  if (taskManager.tasks.has(lastId)) {
    console.log(`   ⚙️  [Task Manager] Auto-resolved task_id "${task_id || ''}" to last created task ID "${lastId}"`);
    return lastId;
  }
  return task_id;
};

const toolImpls = {
  create_new_task: ({ description }) => {
    const task = taskManager.createTask(description);
    return JSON.stringify({ status: "success", task_id: task.id, message: `Created task ${task.id}: '${task.description}'` });
  },
  assign_priority_to_task: ({ task_id, priority }) => {
    const resolvedTaskId = resolveTaskId(task_id);
    if (!["P0", "P1", "P2"].includes(priority)) {
      return JSON.stringify({ status: "error", message: `Invalid priority level '${priority}'. Must be 'P0', 'P1', or 'P2'.` });
    }
    const task = taskManager.updateTask(resolvedTaskId, { priority });
    if (task) {
      return JSON.stringify({ status: "success", message: `Assigned priority ${priority} to task ${resolvedTaskId}.` });
    }
    return JSON.stringify({ status: "error", message: `Task ${task_id} not found.` });
  },
  assign_task_to_worker: ({ task_id, worker_name, worker }) => {
    const resolvedTaskId = resolveTaskId(task_id);
    const assignedWorker = worker_name || worker;
    const validWorkers = ["Worker A", "Worker B", "Review Team"];
    if (!validWorkers.includes(assignedWorker)) {
      return JSON.stringify({ status: "error", message: `Invalid worker '${assignedWorker}'. Must be one of: ${validWorkers.join(", ")}.` });
    }
    const task = taskManager.updateTask(resolvedTaskId, { assigned_to: assignedWorker });
    if (task) {
      return JSON.stringify({ status: "success", message: `Assigned task ${resolvedTaskId} to ${assignedWorker}.` });
    }
    return JSON.stringify({ status: "error", message: `Task ${task_id} not found.` });
  },
  list_all_tasks: () => {
    const summary = taskManager.listAllTasks();
    return JSON.stringify({ status: "success", tasks: summary });
  }
};

// ─── 3. System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a focused Project Manager LLM agent. Your goal is to manage project tasks efficiently.
When you receive a new task request, follow these steps:
1. First, create the task with the given description using the \`create_new_task\` tool. You must do this first to get a \`task_id\`.
2. Next, analyze the user's request to see if a priority or an assignee is mentioned.
   - If a priority is mentioned (e.g. "urgent", "ASAP", "critical"), map it to 'P0'. Use \`assign_priority_to_task\`.
   - If a worker is mentioned (Worker A, Worker B, or Review Team), use \`assign_task_to_worker\`.
3. If any information (priority, assignee) is missing, you must make a reasonable default assignment:
   - Default priority is 'P1' (medium priority). Use \`assign_priority_to_task\`.
   - Default assignee is 'Worker A'. Use \`assign_task_to_worker\`.
4. Once the task is fully processed, you MUST use \`list_all_tasks\` to show the final state.
5. Provide a summary explaining what tasks were created, what priority they got, who they were assigned to, and why.

Available workers: 'Worker A', 'Worker B', 'Review Team'
Priority levels: P0 (highest), P1 (medium), P2 (lowest)
`.trim();

// ─── 4. Agent Loop Runner ──────────────────────────────────────────────────────

/**
 * Runs the project manager agent loop on the user input.
 * 
 * @param {string} userInput - The user request to process.
 */
export async function runAgent(userInput) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput }
  ];

  console.log(`━━━ 💬 User Request ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   "${userInput}"\n`);

  let response = await ollama.chat({
    model: MODEL,
    messages: messages,
    tools: tools
  });

  let loopCount = 0;
  const maxLoops = 10; // safety boundary to prevent infinite loops

  while (loopCount < maxLoops) {
    loopCount++;

    // --- Text-based tool call extraction fallback ---
    const textContent = response.message.content || "";
    const jsonBlockRegex = /\{[\s\S]*?\}/g;
    const matches = textContent.match(jsonBlockRegex);
    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.name && parsed.parameters) {
            if (!response.message.tool_calls) {
              response.message.tool_calls = [];
            }
            // Avoid adding duplicates
            const exists = response.message.tool_calls.some(
              tc => tc.function.name === parsed.name && JSON.stringify(tc.function.arguments) === JSON.stringify(parsed.parameters)
            );
            if (!exists) {
              response.message.tool_calls.push({
                function: {
                  name: parsed.name,
                  arguments: parsed.parameters
                }
              });
            }
          }
        } catch (e) {
          // Ignore invalid JSON structures
        }
      }
    }

    // Process tool calls if any are requested (natively or extracted from text)
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      messages.push(response.message);

      // Process each requested tool call
      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        console.log(`   🧠  [Agent Decision] Calls tool: ${toolName}(${JSON.stringify(toolArgs)})`);

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

        console.log(`   📥  [Tool Result] Output: ${result}\n`);

        messages.push({
          role: "tool",
          content: result
        });
      }

      // Query model again with tool feedback
      response = await ollama.chat({
        model: MODEL,
        messages: messages,
        tools: tools
      });
    } else {
      // No tool calls requested. Let's verify that all tasks have been prioritized/assigned.
      // We look at all tasks that have null priority or assigned_to, and prompt the agent to assign them.
      const tasks = Array.from(taskManager.tasks.values());
      const unassignedTasks = tasks.filter(t => t.priority === null || t.assigned_to === null);

      if (unassignedTasks.length > 0) {
        const corrections = [];
        for (const t of unassignedTasks) {
          const missing = [];
          if (t.priority === null) missing.push("priority (using assign_priority_to_task)");
          if (t.assigned_to === null) missing.push("assignee (using assign_task_to_worker)");
          corrections.push(`Task ${t.id} is missing: ${missing.join(" and ")}`);
        }

        const correctionMsg = `System: The following issues must be resolved:\n${corrections.map(c => `- ${c}`).join("\n")}\nPlease invoke the appropriate tools to set these values. Do not just print the updates; run the tools.`;

        console.log(`   ⚠️  [Self-Correction] Sending feedback: ${corrections.join("; ")}`);

        messages.push(response.message);
        messages.push({
          role: "user",
          content: correctionMsg
        });

        response = await ollama.chat({
          model: MODEL,
          messages: messages,
          tools: tools
        });
      } else {
        // All tasks are fully set up. We are done!
        break;
      }
    }
  }

  console.log(`━━━ 📊 Agent Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(response.message.content ? response.message.content.trim() : "(No text response summary)");
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  return response.message.content;
}
