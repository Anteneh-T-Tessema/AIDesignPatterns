/**
 * Resource-Aware Optimization — CLI Orchestrator
 * =================================================
 * 
 * Demonstrates adaptive agent behaviors based on resource constraints:
 *   - Runs an interactive financial analysis agent pipeline.
 *   - Dynamically adapts pipeline steps, model tiers, prompt sizes,
 *     and falls back to cache/retry under budget, time, or rate constraints.
 */

import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { ResourceMonitor } from "./resource-monitor.js";
import { ResourceOptimizer } from "./resource-optimizer.js";
import { MOCK_DATABASE, MockRateLimiter } from "./mock-registry.js";

// Console colors for structured, high-aesthetic outputs
const C_TITLE = "\x1b[95m";   // Bright Magenta
const C_PHASE = "\x1b[94m";   // Bright Blue
const C_ALERT = "\x1b[91m";   // Bright Red
const C_ERR = "\x1b[91m";     // Bright Red
const C_WARN = "\x1b[33m";    // Yellow
const C_SUCCESS = "\x1b[92m"; // Bright Green
const C_INFO = "\x1b[90m";    // Gray
const C_RESET = "\x1b[0m";
const C_BOLD = "\x1b[1m";

const rl = readline.createInterface({ input, output });
const rateLimiter = new MockRateLimiter(2, 30000); // Max 2 requests per 30s
const optimizer = new ResourceOptimizer(rateLimiter);

// Programmatic sleep helper
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function printBanner() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  💰  ${C_BOLD}RESOURCE-AWARE OPTIMIZATION PATTERN${C_RESET}`);
  console.log("  Dynamic Model Tiers • Budget Enforcement • Deadline Tracking");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

/**
 * Main Pipeline Coordinator
 */
async function runOrchestratedAgent(ticker, budget, deadline, options = {}) {
  console.log(`\n🚀 Starting Financial Analysis Pipeline for ${C_BOLD}${ticker}${C_RESET}...`);
  console.log(`   - Budget Limit: $${budget.toFixed(4)}`);
  console.log(`   - Time Deadline: ${deadline}s`);
  if (options.rateLimiterDemo) {
    console.log("   - Rate Limiter: ACTIVE (Simulating HTTP 429 after 2 queries)");
    rateLimiter.enable();
  } else {
    rateLimiter.disable();
  }

  // 1. Initialize Monitor
  const monitor = new ResourceMonitor(budget, deadline);
  monitor.start();

  // 2. Assess and Plan
  console.log(`\n${C_PHASE}━━━ Step 1: Assess & Plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}`);
  const plan = optimizer.assessTask(ticker, budget, deadline);
  console.log(`   - Suggested Baseline Model Tier: ${C_BOLD}${plan.initialTier}${C_RESET}`);
  console.log(`   - Pipeline Path: ${plan.expectedSteps.join(" ➔ ")}`);

  // Log initial status
  console.log(monitor.getStatusSummary());

  let finalReport = "";
  let currentTier = plan.initialTier;
  let collectedData = null;
  let summaryNotes = "";

  // 3. Step 2: Information Gathering
  try {
    console.log(`\n${C_PHASE}━━━ Step 2: Information Gathering ━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}`);
    
    // Simulate network delays in Urgent Mode to trigger deadline fallback
    if (options.simulateNetworkDelay) {
      console.log(`${C_INFO}[Simulation] Simulating slow external API network fetch (1.5s)...${C_RESET}`);
      await sleep(1500);
    }

    const rawData = MOCK_DATABASE[ticker];
    if (!rawData) {
      throw new Error(`Ticker ${ticker} not found in database.`);
    }

    console.log(`   - Retried data from local mock DB for ${ticker} successfully.`);
    const systemPrompt = `You are a data compiler. Summarize the raw metrics and highlights of the company into concise bullet points.`;
    const userPrompt = `Raw data record: ${JSON.stringify(rawData)}`;

    collectedData = await optimizer.callLLM(
      "Gather Info",
      systemPrompt,
      userPrompt,
      monitor,
      { overrideTier: currentTier, ticker }
    );

    console.log(`\n--- GATHERED DATA NOTES ---\n${collectedData}\n---------------------------`);
    console.log(monitor.getStatusSummary());

  } catch (err) {
    return handlePipelineFailure(err, ticker, monitor);
  }

  // 4. Step 3: Synthesis & Analysis
  try {
    console.log(`\n${C_PHASE}━━━ Step 3: Synthesis & Analysis ━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}`);

    // Check deadlines first
    const deadlineCheck = monitor.checkDeadline();
    if (deadlineCheck.isNearDeadline) {
      console.log(`${C_ALERT}⚠️  DEADLINE WARNING: Only ${deadlineCheck.remaining.toFixed(1)}s remaining. Entering Degradation Fallback!${C_RESET}`);
      return triggerEarlyTermination(collectedData, ticker, monitor);
    }

    if (options.simulateNetworkDelay) {
      console.log(`${C_INFO}[Simulation] Simulating slow analysis computation (1.5s)...${C_RESET}`);
      await sleep(1500);
    }

    const swotSystemPrompt = `You are a financial strategist. Perform a SWOT or key risk vector synthesis based on gathered metrics.`;
    const swotUserPrompt = `Summarized Company Metrics: \n${collectedData}`;

    summaryNotes = await optimizer.callLLM(
      "Synthesize & Analyze",
      swotSystemPrompt,
      swotUserPrompt,
      monitor,
      { overrideTier: currentTier, ticker }
    );

    console.log(`\n--- SWOT & RISK SYNTHESIS ---\n${summaryNotes}\n----------------------------`);
    console.log(monitor.getStatusSummary());

  } catch (err) {
    return handlePipelineFailure(err, ticker, monitor);
  }

  // 5. Step 4: Report Generation
  try {
    console.log(`\n${C_PHASE}━━━ Step 4: Report Generation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}`);

    // Check deadlines before generating final report
    const deadlineCheck = monitor.checkDeadline();
    if (deadlineCheck.isNearDeadline) {
      console.log(`${C_ALERT}⚠️  DEADLINE WARNING: Only ${deadlineCheck.remaining.toFixed(1)}s remaining. Entering Degradation Fallback!${C_RESET}`);
      return triggerEarlyTermination(collectedData + "\n" + summaryNotes, ticker, monitor);
    }

    const reportSystemPrompt = `You are a financial writer. Structure a final markdown investment report including summary metrics, key highlights, risk analysis, and final recommendation.`;
    const reportUserPrompt = `Metrics: \n${collectedData}\n\nSynthesis:\n${summaryNotes}`;

    finalReport = await optimizer.callLLM(
      "Report Generation",
      reportSystemPrompt,
      reportUserPrompt,
      monitor,
      { overrideTier: currentTier, ticker }
    );

    console.log(`\n--- GENERATED REPORT DRAFT ---\n${finalReport}\n------------------------------`);
    console.log(monitor.getStatusSummary());

  } catch (err) {
    return handlePipelineFailure(err, ticker, monitor);
  }

  // 6. Step 5: Peer Review & Reflection (Conditional Step)
  if (plan.stepPruning) {
    console.log(`\n${C_INFO}━━━ Step 5: Peer Review skipped (Optimized Path: Budget/Time Saver) ━━━${C_RESET}`);
  } else {
    try {
      console.log(`\n${C_PHASE}━━━ Step 5: Peer Review & Refine ━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}`);
      
      const deadlineCheck = monitor.checkDeadline();
      const nearBudgetLimit = monitor.shouldEnterConservation();

      if (deadlineCheck.isNearDeadline || nearBudgetLimit) {
        console.log(`${C_WARN}⚠️ Skipping Peer Review step: Resources are too constrained (Time limit or Budget warnings triggered).${C_RESET}`);
      } else {
        const reviewSystemPrompt = `You are a critical Peer Reviewer. Critique the drafted report and output a refined, polished final report focusing on conciseness and clarity.`;
        const reviewUserPrompt = `Draft investment report: \n${finalReport}`;

        finalReport = await optimizer.callLLM(
          "Peer Review & Refine",
          reviewSystemPrompt,
          reviewUserPrompt,
          monitor,
          { overrideTier: "BALANCED", ticker } // Revert to balanced for review step to avoid cost bloom
        );

        console.log(`\n--- POLISHED PEER REVIEWED REPORT ---\n${finalReport}\n------------------------------------`);
        console.log(monitor.getStatusSummary());
      }
    } catch (err) {
      return handlePipelineFailure(err, ticker, monitor);
    }
  }

  // Final success wrap up
  console.log(`\n${C_SUCCESS}🎉 Pipeline Successfully Completed!${C_RESET}`);
  console.log(`================================================================`);
  console.log(`${C_BOLD}FINAL REPORT OUTCOME:${C_RESET}\n\n${finalReport}`);
  console.log(`================================================================`);
  console.log(`\n${monitor.getStatusSummary()}`);
  console.log(`🟢 Resource efficiency optimization achieved.\n`);
}

/**
 * Handle early termination when deadlines are violated.
 * Jumps straight to generating a draft using whatever exists.
 */
async function triggerEarlyTermination(currentCollectedData, ticker, monitor) {
  console.log(`\n${C_ALERT}🚨 DEADLINE BYPASS INITIATED. Generating Fast Draft Fallback...${C_RESET}`);
  
  const fastSystemPrompt = `Write a 2-sentence immediate emergency investment summary report. Zero formatting, direct facts only.`;
  const fastUserPrompt = `Raw collected data so far: ${currentCollectedData}`;

  const fallbackReport = await optimizer.callLLM(
    "Fast Draft Emergency",
    fastSystemPrompt,
    fastUserPrompt,
    monitor,
    { overrideTier: "BUDGET", ticker } // Enforce cheap/fast budget tier
  );

  console.log(`\n================================================================`);
  console.log(`${C_BOLD}EMERGENCY DRAFT OUTCOME (DEADLINE MET):${C_RESET}\n\n${fallbackReport}`);
  console.log(`================================================================`);
  console.log(`\n${monitor.getStatusSummary()}`);
  console.log(`🟡 Degradation pathway succeeded. System met deadline.\n`);
}

/**
 * Global failure routing (caching fallback)
 */
function handlePipelineFailure(error, ticker, monitor) {
  console.log(`\n${C_ERR}❌ Pipeline encountered error: ${error.message}${C_RESET}`);
  console.log(`${C_WARN}🔄 Fallback: Retrieving static pre-cached report (Zero-Tokens / Zero-Latency)...${C_RESET}`);
  
  const cacheReport = optimizer.triggerCachedFallback(ticker);
  
  console.log(`\n================================================================`);
  console.log(`${C_BOLD}STATIC CACHE OUTCOME:${C_RESET}\n\n${cacheReport}`);
  console.log(`================================================================`);
  console.log(`\n${monitor.getStatusSummary()}`);
  console.log(`🟡 Graceful failure recovery completed.\n`);
}

/**
 * Main Interactive Menu
 */
async function main() {
  printBanner();

  const tickers = ["AAPL", "MSFT", "TSLA", "NVDA"];
  console.log("Select a stock for financial analysis:");
  tickers.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  
  const tickerChoiceInput = await rl.question("\nEnter choice (1-4, default 1): ");
  const tickerIndex = parseInt(tickerChoiceInput) - 1;
  const ticker = tickers[tickerIndex] || "AAPL";

  console.log(`\nSelected Ticker: ${C_BOLD}${ticker}${C_RESET}`);

  console.log("\nSelect a Resource Optimization Preset Scenario:");
  console.log(`  ${C_BOLD}1. Standard Run (Generous Limits)${C_RESET}`);
  console.log(`     - Budget: $1.0000 | Time Limit: 30s`);
  console.log(`     - Detail: Runs reasoning/balanced tiers, conducts optional Peer Review.`);
  console.log(`  ${C_BOLD}2. Tight Budget Run (Cost Saver)${C_RESET}`);
  console.log(`     - Budget: $0.0500 | Time Limit: 25s`);
  console.log(`     - Detail: Downgrades to BUDGET tier, trims prompts, skips Peer Review.`);
  console.log(`  ${C_BOLD}3. Fast Urgent Run (Time Constraint)${C_RESET}`);
  console.log(`     - Budget: $1.0000 | Time Limit: 4s`);
  console.log(`     - Detail: Monitors elapsed time, triggers Warning, skips to Fast Draft early.`);
  console.log(`  ${C_BOLD}4. Critically Constrained Run (Extreme Limits)${C_RESET}`);
  console.log(`     - Budget: $0.0300 | Time Limit: 3s`);
  console.log(`     - Detail: Activates prompt conservation, emergency downgrades, and early termination.`);
  console.log(`  ${C_BOLD}5. Rate Limit Recovery Demo (429 Backoff)${C_RESET}`);
  console.log(`     - Budget: $1.0000 | Time Limit: 30s`);
  console.log(`     - Detail: Rapid requests trigger rate-limiter, demonstrates Exponential Backoff retries.`);

  const presetChoice = await rl.question("\nEnter Choice (1-5, default 1): ");

  let budget = 1.00;
  let deadline = 30;
  let options = {};

  switch (presetChoice.trim()) {
    case "2":
      budget = 0.05;
      deadline = 25;
      break;
    case "3":
      budget = 1.00;
      deadline = 4;
      options.simulateNetworkDelay = true;
      break;
    case "4":
      budget = 0.03;
      deadline = 3;
      options.simulateNetworkDelay = true;
      break;
    case "5":
      budget = 1.00;
      deadline = 30;
      options.rateLimiterDemo = true;
      break;
    default:
      budget = 1.00;
      deadline = 30;
      break;
  }

  await runOrchestratedAgent(ticker, budget, deadline, options);
  
  rl.close();
}

main().catch(err => {
  console.error("Critical Orchestrator Error:", err);
  rl.close();
});
