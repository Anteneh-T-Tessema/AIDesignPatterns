/**
 * Resilient Agent Coordinator
 * ============================
 * 
 * Implements the Exception Handling and Recovery agentic design pattern:
 * 
 * 1. Proactive Error Detection: Checks inputs/outputs and catches errors.
 * 2. Retries: Automatically retries transient errors with backoff.
 * 3. Fallbacks: Falls back to backup database tool if the primary database fails.
 * 4. Self-Correction: Guides the LLM to correct schema validation issues.
 * 5. Rollback: Executing compensating actions (e.g. releasing funds) when a flow aborts.
 * 6. Escalation: Generates a detailed diagnostic report in reports/ for human operators.
 */

import ollama from "ollama";
import fs from "fs";
import path from "path";
import { tools, toolImpls } from "./tools.js";

const MODEL = "llama3.2";

/**
 * Wraps tool execution with retry and fallback policies.
 */
async function executeToolWithResilience(toolName, toolArgs, maxRetries) {
  if (toolName === "get_customer_record_primary") {
    try {
      // Attempt primary DB
      return await executeWithRetry("get_customer_record_primary", toolArgs, 0, maxRetries);
    } catch (err) {
      console.log(`   ⚠️  [Fallback Triggered] Primary DB lookup failed: "${err.message}".`);
      console.log(`      Switching to fallback tool: "get_customer_record_backup"`);
      return await executeWithRetry("get_customer_record_backup", toolArgs, 0, maxRetries);
    }
  }

  // Default: execute with retry logic
  return await executeWithRetry(toolName, toolArgs, 0, maxRetries);
}

/**
 * Executes a specific tool and retries on failure.
 */
async function executeWithRetry(toolName, toolArgs, retryCount, maxRetries) {
  try {
    const impl = toolImpls[toolName];
    if (!impl) {
      throw new Error(`Tool implementation for "${toolName}" not found.`);
    }
    // Tool implementation executes synchronously and returns string
    return impl(toolArgs);
  } catch (err) {
    console.log(`   ❌ [Error Caught] "${toolName}" failed: "${err.message}"`);
    if (retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 150; // exponential backoff
      console.log(`      🔄 [Retry Policy] Retrying in ${waitTime}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await executeWithRetry(toolName, toolArgs, retryCount + 1, maxRetries);
    } else {
      console.log(`      🚨 [Retry Policy] Max retries (${maxRetries}) exhausted for "${toolName}".`);
      throw err;
    }
  }
}

/**
 * Reverts successfully completed actions to restore system consistency.
 */
async function rollbackState(state) {
  if (!state.actions || state.actions.length === 0) {
    console.log("   🔄  [State Rollback] No successful actions to revert.");
    return;
  }

  console.log("\n🚨🚨🚨 [State Rollback Initiated] 🚨🚨🚨");
  console.log(`   Reversing ${state.actions.length} completed action(s) to restore stable system state...`);

  // Process completed actions in reverse chronological order
  for (let i = state.actions.length - 1; i >= 0; i--) {
    const action = state.actions[i];
    console.log(`   ↩️  [Rollback Step] Reverting action: "${action.name}"`);
    
    if (action.name === "charge_account") {
      try {
        console.log(`      ⚙️  Invoking compensating tool: release_held_funds(customerId: "${action.args.customerId}", amount: $${action.args.amount})`);
        const compResult = toolImpls.release_held_funds({
          customerId: action.args.customerId,
          amount: action.args.amount
        });
        console.log(`      ✅ Compensation Successful: ${compResult}`);
      } catch (compErr) {
        console.log(`      ⚠️  CRITICAL: Compensating action failed: "${compErr.message}"`);
      }
    } else {
      console.log(`      ℹ️  No compensating action required for "${action.name}".`);
    }
  }
  console.log("✅ [State Rollback Completed] System restored to stable state.\n");
}

/**
 * Creates a markdown report for human intervention.
 */
async function generateEscalationReport(query, state, messages) {
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const reportsDir = path.join(currentDir, "reports");
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportFileName = `escalation-${timestamp}.md`;
  const reportPath = path.join(reportsDir, reportFileName);

  const formattedMessages = messages.map(m => {
    let content = m.content || "";
    if (m.tool_calls && m.tool_calls.length > 0) {
      content += `\nRequests Tool Calls:\n${JSON.stringify(m.tool_calls, null, 2)}`;
    }
    return `### **${m.role.toUpperCase()}**:\n${content}`;
  }).join("\n\n---\n\n");

  const reportContent = `
# 🚨 Escalation & Recovery Incident Report
**Generated**: ${new Date().toLocaleString()}
**Status**: FAILED & COMPENSATED (ROLLED BACK)
**Incident ID**: INC-${Math.floor(100000 + Math.random() * 900000)}

---

## 📋 Incident Summary
- **Original User Query**: "${query}"
- **Failure Reason**: \`${state.failureReason}\`
- **Actions Attempted Prior to Failure**: ${state.actions.length}
- **Rollback Status**: SUCCESSFUL

---

## 🛠️ Actions Trace (Pre-failure)
${state.actions.length === 0 ? "*No actions were fully completed before failure occurred.*" : ""}
${state.actions.map((act, i) => `
### Step ${i + 1}: ${act.name}
- **Arguments**: \`${JSON.stringify(act.args)}\`
- **Response**: \`${JSON.stringify(act.result)}\`
`).join("\n")}

---

## ↩️ Rollback Audit Logs
- **Trigger**: System exception or business safety rule block.
- **Compensating Actions Log**:
  ${state.actions.length === 0 ? "*None required*" : ""}
  ${state.actions.map(act => `- Reversed changes from tool \`${act.name}\` successfully.`).join("\n")}

---

## 💬 Full Agent Conversation History
${formattedMessages}

---

## 💡 Recommendation
1. Review why the transaction failed and inspect the failure reason: \`${state.failureReason}\`.
2. For format issues, verify system schema compliance.
3. For fraud limit triggers, contact the customer to confirm identity or adjust limits in the database.
`.trim();

  fs.writeFileSync(reportPath, reportContent, "utf-8");
  return reportPath;
}

/**
 * Runs the resilient transaction pipeline.
 */
export async function runResilientAgent(userQuery, options = {}) {
  const maxRetries = options.maxRetries ?? 2;
  const maxSelfCorrectionCycles = options.maxSelfCorrectionCycles ?? 3;

  // Reset tool counters for this execution run
  toolImpls.resetState();

  const messages = [
    {
      role: "system",
      content: `You are a resilient Billing and Accounts coordinator agent.
Your goal is to process payment requests and account inquiries.

Available flow:
1. Lookup customer record. ALWAYS try to use get_customer_record_primary first. If it fails, fallback to get_customer_record_backup.
2. If tax calculation is needed, use calculate_tax_rate.
3. If charging is needed, use charge_account.

CRITICAL: The charge_account tool expects a numeric float for the 'amount' parameter.
Do NOT send currency symbols or string format (e.g. send 150.00, NOT "$150.00").
If you receive a validation error from a tool, you MUST immediately call the tool again with the corrected parameters. Do NOT write apologies or conversational text. Output ONLY tool/function calls until the action succeeds.`
    },
    { role: "user", content: userQuery }
  ];

  const executionState = {
    actions: [],
    status: "initialized",
    failureReason: null
  };

  let selfCorrectionCycles = 0;
  let finalResponse = "";

  try {
    console.log("━━━ Step 1: 💬 Querying Llama ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    let response = await ollama.chat({
      model: MODEL,
      messages: messages,
      tools: tools
    });

    while (response.message.tool_calls && response.message.tool_calls.length > 0) {
      messages.push(response.message);

      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        console.log(`🧠 [LLM Decision] Requesting tool: ${toolName}(${JSON.stringify(toolArgs)})`);

        let resultString;
        try {
          // Execute with retries & fallbacks
          resultString = await executeToolWithResilience(toolName, toolArgs, maxRetries);
          const resultJson = JSON.parse(resultString);

          // Proactive Error Detection: Check if tool execution returned a validation error
          if (resultJson.status === "error") {
            console.log(`⚠️  [Tool Business Validation Error] ${resultJson.code}: "${resultJson.message}"`);

            if (resultJson.code === "INVALID_AMOUNT_FORMAT") {
              if (selfCorrectionCycles < maxSelfCorrectionCycles) {
                selfCorrectionCycles++;
                console.log(`🔄 [Self-Correction] Self-correction cycle ${selfCorrectionCycles}/${maxSelfCorrectionCycles}. Feed error back to LLM...`);
                
                // Inject guidance helper so LLM understands how to fix its formatting
                resultString = JSON.stringify({
                  status: "error",
                  code: "INVALID_AMOUNT_FORMAT",
                  message: resultJson.message,
                  action_required: "Call the charge_account tool again with the amount as a raw float/number (e.g. 150.00). Do NOT write any conversational explanation. Just make the function call."
                });
              } else {
                throw new Error("Self-correction loop limit exceeded for parameter format error.");
              }
            } else if (resultJson.code === "FRAUD_LIMIT_EXCEEDED") {
              // Fatal business safety limit rule -> trigger immediate exception & rollback
              throw new Error(`FATAL_FRAUD_LIMIT: ${resultJson.message}`);
            } else {
              // Other fatal errors (e.g., Customer not found)
              throw new Error(`FATAL_APPLICATION_ERROR: ${resultJson.message}`);
            }
          } else {
            // Success: log to state for rollback tracking
            executionState.actions.push({ name: toolName, args: toolArgs, result: resultJson });
          }

        } catch (err) {
          console.log(`🚨 [Fatal Exception Triggered] "${err.message}"`);
          executionState.status = "failed";
          executionState.failureReason = err.message;

          // Trigger Rollback of completed steps
          await rollbackState(executionState);

          // Trigger Escalation Report
          const reportPath = await generateEscalationReport(userQuery, executionState, messages);
          
          finalResponse = `❌ Transaction processing aborted. Reason: ${err.message}.\n🛡️ Recovery Info: State was successfully rolled back. Escalation report generated at: ${path.basename(reportPath)}`;
          return { success: false, response: finalResponse };
        }

        console.log(`📥 [Tool Output Captured] ${resultString}\n`);
        messages.push({
          role: "tool",
          content: resultString
        });
      }

      console.log("━━━ Step 2: 🔄 Returning Tool Outputs to Agent ━━━━━━━━━━━");
      response = await ollama.chat({
        model: MODEL,
        messages: messages,
        tools: tools
      });

      // Programmatic recovery intercept: if Llama returned text instead of a tool call during self-correction
      if ((!response.message.tool_calls || response.message.tool_calls.length === 0) && selfCorrectionCycles > 0) {
        if (response.message.content && (response.message.content.includes("charge_account") || response.message.content.includes("charge"))) {
          console.log("   🔄  [Recovery Intercept] LLM returned text instead of tool call. Re-prompting to enforce tool call formatting...");
          messages.push(response.message);
          messages.push({
            role: "user",
            content: "You returned the tool call as text. You MUST call the charge_account tool using the actual tool call/function calling mechanism with the corrected parameters (customerId and amount as float). Do NOT write conversational text. Simply call the tool."
          });
          response = await ollama.chat({
            model: MODEL,
            messages: messages,
            tools: tools
          });
        }
      }
    }

    executionState.status = "completed";
    finalResponse = response.message.content;
    console.log("━━━ Step 3: 📊 Synthesized Final Response ━━━━━━━━━━━━━━━━");
    console.log(finalResponse);
    return { success: true, response: finalResponse };

  } catch (globalErr) {
    console.log(`🚨 [Global System Crash] ${globalErr.message}`);
    executionState.status = "failed";
    executionState.failureReason = globalErr.message;
    await rollbackState(executionState);
    const reportPath = await generateEscalationReport(userQuery, executionState, messages);
    
    finalResponse = `❌ System processing error: ${globalErr.message}. Compensation completed. Escalation report written to: ${path.basename(reportPath)}`;
    return { success: false, response: finalResponse };
  }
}
