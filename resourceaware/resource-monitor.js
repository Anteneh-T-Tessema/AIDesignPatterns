/**
 * Resource Monitor
 * ================
 * 
 * Tracks real-time resource consumption including:
 *   1. Token usage (inputs & outputs from Ollama responses)
 *   2. Financial cost calculation per model tier
 *   3. Execution time tracking against a strict deadline
 *   4. Alerts for constraint breaches (90% budget warning, 80% timeout warning)
 */

export const MODEL_TIERS = {
  BUDGET: {
    name: "Llama-3-8B-Instruct (Budget Tier)",
    inputCostPerM: 0.15, // $0.15 per million input tokens
    outputCostPerM: 0.60 // $0.60 per million output tokens
  },
  BALANCED: {
    name: "Llama-3.2-3B-Instruct (Balanced Tier)",
    inputCostPerM: 0.60, // $0.60 per million input tokens
    outputCostPerM: 2.40 // $2.40 per million output tokens
  },
  REASONING: {
    name: "Llama-3-70B-Instruct (Reasoning Tier)",
    inputCostPerM: 3.00,  // $3.00 per million input tokens
    outputCostPerM: 12.00 // $12.00 per million output tokens
  }
};

export class ResourceMonitor {
  constructor(budgetLimit = 1.00, timeLimitSeconds = 30) {
    this.budgetLimit = budgetLimit;
    this.timeLimitSeconds = timeLimitSeconds;
    
    this.startTime = null;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCost = 0.0;
    this.stepHistory = [];
  }

  /**
   * Start or restart the stopwatch.
   */
  start() {
    this.startTime = Date.now();
  }

  /**
   * Get wall-clock time elapsed in seconds.
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Record token consumption and calculate pricing.
   * If Ollama doesn't return count, estimate based on word length.
   */
  recordUsage(stepName, modelTierKey, promptTokens, completionTokens) {
    const tier = MODEL_TIERS[modelTierKey] || MODEL_TIERS.BALANCED;
    
    // Fallback estimation (roughly 4 characters per token if counts are empty)
    const inTokens = promptTokens || 0;
    const outTokens = completionTokens || 0;

    const inCost = (inTokens / 1000000) * tier.inputCostPerM;
    const outCost = (outTokens / 1000000) * tier.outputCostPerM;
    const stepCost = inCost + outCost;

    this.totalInputTokens += inTokens;
    this.totalOutputTokens += outTokens;
    this.totalCost += stepCost;

    this.stepHistory.push({
      step: stepName,
      tier: modelTierKey,
      inputTokens: inTokens,
      outputTokens: outTokens,
      cost: stepCost,
      time: this.getElapsedTime()
    });

    return {
      stepCost,
      totalCost: this.totalCost,
      inTokens,
      outTokens
    };
  }

  /**
   * Checks if we are close to the execution time deadline.
   * Threshold: 80% of deadline elapsed.
   */
  checkDeadline() {
    const elapsed = this.getElapsedTime();
    const ratio = elapsed / this.timeLimitSeconds;
    const remaining = Math.max(0, this.timeLimitSeconds - elapsed);
    
    return {
      elapsed,
      remaining,
      ratio,
      isNearDeadline: ratio >= 0.8,
      isExceeded: elapsed >= this.timeLimitSeconds
    };
  }

  /**
   * Checks if we are entering the budget conservation phase.
   * Threshold: 90% of financial budget consumed.
   */
  shouldEnterConservation() {
    if (this.budgetLimit <= 0) return false;
    return this.totalCost >= 0.9 * this.budgetLimit;
  }

  /**
   * Check if the budget has been strictly exceeded.
   */
  isBudgetExceeded() {
    return this.totalCost >= this.budgetLimit;
  }

  /**
   * Generates a colored summary of the current resource state.
   */
  getStatusSummary() {
    const elapsed = this.getElapsedTime();
    const timePct = ((elapsed / this.timeLimitSeconds) * 100).toFixed(1);
    const budgetPct = ((this.totalCost / this.budgetLimit) * 100).toFixed(1);

    // Color definitions
    const C_YELLOW = "\x1b[33m";
    const C_RED = "\x1b[31m";
    const C_GREEN = "\x1b[32m";
    const C_RESET = "\x1b[0m";
    const C_BOLD = "\x1b[1m";

    let timeColor = C_GREEN;
    if (elapsed / this.timeLimitSeconds >= 0.8) timeColor = C_RED;
    else if (elapsed / this.timeLimitSeconds >= 0.5) timeColor = C_YELLOW;

    let budgetColor = C_GREEN;
    if (this.totalCost >= this.budgetLimit) budgetColor = C_RED;
    else if (this.totalCost >= 0.8 * this.budgetLimit) budgetColor = C_YELLOW;

    return (
      `📊 ${C_BOLD}Resource Status Summary:${C_RESET}\n` +
      `  ⏱️  Time Elapsed: ${timeColor}${elapsed.toFixed(2)}s / ${this.timeLimitSeconds}s (${timePct}%)${C_RESET}\n` +
      `  💰  Cost Accrued: ${budgetColor}$${this.totalCost.toFixed(5)} / $${this.budgetLimit.toFixed(4)} (${budgetPct}%)${C_RESET}\n` +
      `  📥  Tokens: Input: ${this.totalInputTokens} | Output: ${this.totalOutputTokens} | Total: ${this.totalInputTokens + this.totalOutputTokens}`
    );
  }
}
