/**
 * Resource Optimizer
 * ==================
 * 
 * Intermediary between the Agent logic and the LLM engine.
 * Responsibilities:
 *   1. Initial Model Tier selection based on query complexity.
 *   2. Prompt Trimming: Switches prompt templates from verbose (Reasoning)
 *      to concise (Balanced) or stripped (Budget) based on remaining resources.
 *   3. Configuration Adjustments: Limits Ollama's `num_predict` (Max output tokens)
 *      under constraints to prevent token bleed.
 *   4. Exponential Backoff: Handles 429 Rate Limits with jittered retry delays.
 *   5. Fallback Strategy: If Ollama is offline or budgets are fully blown, 
 *      falls back to pre-cached zero-token responses.
 */

import { Ollama } from "ollama";
import { MODEL_TIERS } from "./resource-monitor.js";
import { MOCK_REPORT_CACHE } from "./mock-registry.js";

// Initialize local Ollama client
const ollama = new Ollama({ host: "http://localhost:11434" });

// Colors for terminal log reporting
const C_OPT = "\x1b[36m";   // Cyan for optimizer logs
const C_WARN = "\x1b[33m";  // Yellow for warnings
const C_ERR = "\x1b[31m";   // Red for errors
const C_RESET = "\x1b[0m";
const C_BOLD = "\x1b[1m";

export class ResourceOptimizer {
  constructor(rateLimiter = null) {
    this.rateLimiter = rateLimiter;
  }

  /**
   * Helper to sleep/wait for a duration (used in backoff)
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Assess a task's complexity and constraints, returning an execution plan.
   */
  assessTask(query, budget, deadline) {
    console.log(`${C_OPT}[Optimizer] Assessing task requirements...${C_RESET}`);
    
    let initialTier = "BALANCED";
    let stepPruning = false;

    // Evaluate token budget
    if (budget <= 0.05) {
      console.log(`${C_OPT}[Optimizer] ⚠️ Low budget ($${budget}) detected. Selecting BUDGET tier and pruning pipeline. ${C_RESET}`);
      initialTier = "BUDGET";
      stepPruning = true;
    } else if (budget >= 0.50) {
      console.log(`${C_OPT}[Optimizer] ✨ Healthy budget ($${budget}) detected. Selecting REASONING tier. ${C_RESET}`);
      initialTier = "REASONING";
    }

    // Evaluate time deadline
    if (deadline < 5) {
      console.log(`${C_OPT}[Optimizer] ⏱️ Tight deadline (${deadline}s) detected. Routing to BUDGET tier to minimize latency. ${C_RESET}`);
      initialTier = "BUDGET";
      stepPruning = true;
    }

    return {
      initialTier,
      stepPruning,
      expectedSteps: stepPruning
        ? ["Assess", "Gather Info", "Synthesize", "Report"] // Skip Peer Review
        : ["Assess", "Gather Info", "Synthesize", "Report", "Peer Review"]
    };
  }

  /**
   * Wrapper for Ollama chat requests incorporating resource limits,
   * prompt trimming, rate limit checking, backoffs, and offloading fallbacks.
   */
  async callLLM(stepName, systemPrompt, userPrompt, monitor, options = {}) {
    const elapsedCheck = monitor.checkDeadline();
    
    // 1. Strict Deadline Check before even invoking LLM
    if (elapsedCheck.isExceeded) {
      console.log(`${C_WARN}[Optimizer] ⚠️ Deadline exceeded (${elapsedCheck.elapsed.toFixed(1)}s elapsed). Force aborting step and falling back to cached report!${C_RESET}`);
      return this.triggerCachedFallback(options.ticker);
    }

    // 2. Determine appropriate Model/Prompt Tier
    let activeTierKey = options.overrideTier || "BALANCED";

    // Enforce Emergency Conservation if cost is near budget limit
    if (monitor.shouldEnterConservation()) {
      console.log(`${C_WARN}[Optimizer] 🚨 EMERGENCY CONSERVATION ACTIVE (Cost near 90%+ budget limit). Downgrading to BUDGET tier. ${C_RESET}`);
      activeTierKey = "BUDGET";
    }

    // 3. Prompt Trimming and Ollama configuration overrides based on Tier
    let finalSystemPrompt = systemPrompt;
    let maxPredictTokens = 300; // Default for BALANCED

    if (activeTierKey === "BUDGET") {
      maxPredictTokens = 80; // Strict output token ceiling
      
      // Trim system prompt down to bare bones
      finalSystemPrompt = `Analyze the data and output a hyper-concise report under 40 words total. Bullet points only. No pleasantries.`;
      
      console.log(`${C_OPT}[Optimizer] ✂️ Prompt Trimmed: Stripped standard system instructions. Token limit (num_predict) set to ${maxPredictTokens}.${C_RESET}`);
    } else if (activeTierKey === "REASONING") {
      maxPredictTokens = 1000; // Allow deep reasoning
      // Append deep reasoning guidelines
      finalSystemPrompt = systemPrompt + "\nInclude detailed justifications, secondary implications, and multiple structured sections.";
    }

    // Log the planned call
    console.log(`${C_OPT}[Optimizer] Routing '${stepName}' to ${MODEL_TIERS[activeTierKey].name}...${C_RESET}`);

    // 4. Execute the call with Rate Limit Monitoring & Exponential Backoff
    let attempt = 0;
    const maxAttempts = 3;
    let initialBackoffMs = 1500;

    while (attempt < maxAttempts) {
      try {
        // Trigger simulated API rate limit check
        if (this.rateLimiter) {
          this.rateLimiter.checkLimit();
        }

        // Call LLM
        const startTime = Date.now();
        
        let response;
        try {
          response = await ollama.chat({
            model: "llama3.2",
            messages: [
              { role: "system", content: finalSystemPrompt },
              { role: "user", content: userPrompt }
            ],
            options: {
              temperature: activeTierKey === "REASONING" ? 0.7 : 0.2,
              num_predict: maxPredictTokens
            }
          });
        } catch (connectionError) {
          // Fallback if local Ollama is offline or uninstalled
          console.log(`${C_WARN}[Optimizer] Ollama connection unavailable. Simulating LLM response programmatically...${C_RESET}`);
          response = this.generateMockLLMResponse(activeTierKey, userPrompt);
        }

        const callLatency = (Date.now() - startTime) / 1000;

        // Extract or estimate tokens
        const promptTokens = response.prompt_eval_count || Math.ceil((finalSystemPrompt.length + userPrompt.length) / 4);
        const completionTokens = response.eval_count || Math.ceil((response.message?.content || "").length / 4);

        // Record usage in resource monitor
        const usage = monitor.recordUsage(
          stepName, 
          activeTierKey, 
          promptTokens, 
          completionTokens
        );

        console.log(
          `${C_OPT}[Optimizer] Call Success: Used ${promptTokens} in / ${completionTokens} out tokens. ` +
          `Cost: $${usage.stepCost.toFixed(5)} | Latency: ${callLatency.toFixed(2)}s${C_RESET}`
        );

        return response.message.content;

      } catch (err) {
        // If it is a rate limit error, perform exponential backoff
        if (err.message && err.message.includes("API_RATE_LIMIT_EXCEEDED")) {
          attempt++;
          if (attempt >= maxAttempts) {
            console.log(`${C_ERR}[Optimizer] ❌ Max rate-limit retries hit. Falling back to Cache!${C_RESET}`);
            return this.triggerCachedFallback(options.ticker);
          }

          const jitter = Math.random() * 500;
          const backoffDelay = initialBackoffMs * Math.pow(2, attempt) + jitter;
          console.log(`${C_WARN}[Optimizer] ⏳ [Attempt ${attempt}/${maxAttempts}] Rate limited (429). Backing off for ${backoffDelay.toFixed(0)}ms...${C_RESET}`);
          await this.sleep(backoffDelay);
        } else {
          // Propagate any other unexpected errors
          throw err;
        }
      }
    }
  }

  /**
   * Fast cache lookup that costs 0 tokens and requires no time.
   */
  triggerCachedFallback(ticker) {
    const symbol = ticker || "AAPL";
    console.log(`${C_WARN}[Optimizer] 🔄 Graceful Degradation: Retrieving static cache for ${symbol} to conserve remaining resources. ${C_RESET}`);
    return MOCK_REPORT_CACHE[symbol] || MOCK_REPORT_CACHE.AAPL;
  }

  /**
   * Generates mock text responses that resemble LLM output
   * in case local Ollama isn't running, allowing user verification.
   */
  generateMockLLMResponse(tier, userPrompt) {
    // Basic text parsing
    const hasAAPL = userPrompt.includes("AAPL") || userPrompt.includes("Apple");
    const hasMSFT = userPrompt.includes("MSFT") || userPrompt.includes("Microsoft");
    const hasTSLA = userPrompt.includes("TSLA") || userPrompt.includes("Tesla");
    const ticker = hasAAPL ? "AAPL" : (hasMSFT ? "MSFT" : (hasTSLA ? "TSLA" : "NVDA"));

    let content = "";
    if (tier === "BUDGET") {
      content = `[Mock Budget] ${ticker}: Strong cloud/services offset by micro headwinds. Outlook stable. Cost Optimized.`;
    } else if (tier === "REASONING") {
      content = `[Mock Reasoning] ${ticker} In-depth Analysis. Under thorough macroeconomic review, sector performance is high. AI demand curves show steep positive trajectory, offset by localized risks. Recommended standard hold/buy position.`;
    } else {
      content = `[Mock Balanced] ${ticker} performance shows stable margins, consistent year-over-year gains in target segments, though offset by near-term regulatory costs.`;
    }

    return {
      message: { content },
      prompt_eval_count: 50,
      eval_count: tier === "BUDGET" ? 15 : (tier === "REASONING" ? 100 : 50)
    };
  }
}
