/**
 * Evaluation and Monitoring Pattern — CLI Orchestrator
 * ===================================================
 * 
 * Provides an interactive terminal testbed to demonstrate the
 * Evaluation and Monitoring pattern, showcasing accuracy scoring, A/B latency logs,
 * cost tracking, trajectory auditing, and LLM-as-a-Judge evaluations.
 */

import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { TravelAssistantAgent } from "./agent.js";
import { 
  exactMatch, 
  levenshteinSimilarity, 
  jaccardSimilarity, 
  TrajectoryAuditor,
  LLMJudge 
} from "./evaluator.js";

// Terminal colors
const C_TITLE = "\x1b[95m";   // Bright Magenta
const C_PHASE = "\x1b[94m";   // Bright Blue
const C_ALERT = "\x1b[91m";   // Bright Red
const C_SUCCESS = "\x1b[92m"; // Bright Green
const C_INFO = "\x1b[90m";    // Gray
const C_RESET = "\x1b[0m";
const C_BOLD = "\x1b[1m";
const C_CYAN = "\x1b[96m";

const rl = readline.createInterface({ input, output });
const agent = new TravelAssistantAgent();
const judge = new LLMJudge();

// Ground truth data for evaluations
const GROUND_TRUTH_TEXT = "Hello! I have put together your travel itinerary:\n• Flights: Paris ticket booked at $1200.\n• Weather: Expect beautiful sunny skies (24°C).\n• Lodging: Confirmed booking at Hotel de L'Opera.\n• Special Offer: Standard package secured, PARIS10 discount applied (10% saved!).\nHave a wonderful trip!";
const EXPECTED_TRAJECTORY = ["lookupFlights", "checkWeather", "bookHotel", "applyDiscount"];

function printBanner() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  📊  ${C_BOLD}EVALUATION AND MONITORING DESIGN PATTERN${C_RESET}`);
  console.log("  Trajectory Auditing • Performance Metrology • LLM-as-a-Judge");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

function renderProgressBar(percentage, color = C_SUCCESS) {
  const width = 20;
  const filledLength = Math.round(width * percentage);
  const emptyLength = width - filledLength;
  const filledStr = "█".repeat(filledLength);
  const emptyStr = "░".repeat(emptyLength);
  return `${color}[${filledStr}${emptyStr}] ${(percentage * 100).toFixed(0)}%${C_RESET}`;
}

async function runScenario1() {
  console.log(`\n${C_PHASE}--- Scenario 1: Optimized Agent Version A ---${C_RESET}`);
  console.log(`${C_INFO}Running the optimized pipeline (direct sequential execution)...${C_RESET}`);
  
  const result = await agent.runTask("Please plan my trip to Paris and apply coupons.", "A", false);

  console.log(`\n${C_BOLD}Agent Output Draft:${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(result.text);
  console.log(`----------------------------------------------------------------`);

  console.log(`\n${C_BOLD}1. Syntactic & Semantic Accuracy Metrics:${C_RESET}`);
  const em = exactMatch(result.text, GROUND_TRUTH_TEXT);
  const lev = levenshteinSimilarity(result.text, GROUND_TRUTH_TEXT);
  const jac = jaccardSimilarity(result.text, GROUND_TRUTH_TEXT);

  console.log(`   - Exact Match:          ${em === 1.0 ? C_SUCCESS + "PASSED" : C_ALERT + "FAILED (0.00)"}${C_RESET} ${C_INFO}(Strict formatting match)${C_RESET}`);
  console.log(`   - Levenshtein Score:    ${renderProgressBar(lev, C_CYAN)}`);
  console.log(`   - Jaccard (Word Set):   ${renderProgressBar(jac, C_CYAN)} ${C_INFO}(Catches semantic overlap)${C_RESET}`);

  console.log(`\n${C_BOLD}2. Trajectory Audit Details:${C_RESET}`);
  const audit = TrajectoryAuditor.audit(result.trajectory, EXPECTED_TRAJECTORY);
  console.log(`   - Expected:  [${EXPECTED_TRAJECTORY.join(" ➔ ")}]`);
  console.log(`   - Actual:    [${result.trajectory.join(" ➔ ")}]`);
  console.log(`   - Exact Trajectory Match: ${audit.exactMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET}`);
  console.log(`   - In-Order Match:         ${audit.inOrderMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET}`);
  console.log(`   - Any-Order Match:        ${audit.anyOrderMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET}`);
  console.log(`   - Trajectory Precision:   ${(audit.precision * 100).toFixed(0)}%`);
  console.log(`   - Trajectory Recall:      ${(audit.recall * 100).toFixed(0)}%`);

  console.log(`\n${C_BOLD}3. Performance Logs:${C_RESET}`);
  console.log(`   - Latency:   ${C_CYAN}${result.totalLatencyMs} ms${C_RESET}`);
  console.log(`   - Tokens:    ${result.tokens.total} total (${result.tokens.prompt} prompt / ${result.tokens.completion} completion)`);
  console.log(`   - Est. Cost: $${result.tokens.estimatedCostUSD}`);
  console.log("================================================================\n");
}

async function runScenario2() {
  console.log(`\n${C_PHASE}--- Scenario 2: Trajectory Drift Detection (Version B) ---${C_RESET}`);
  console.log(`${C_INFO}Running the redundant pipeline (suboptimal pathing & retry steps)...${C_RESET}`);

  const result = await agent.runTask("Please plan my trip to Paris and apply coupons.", "B", false);

  console.log(`\n${C_BOLD}Agent Output Draft:${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(result.text);
  console.log(`----------------------------------------------------------------`);

  console.log(`\n${C_BOLD}Trajectory Audit Details:${C_RESET}`);
  const audit = TrajectoryAuditor.audit(result.trajectory, EXPECTED_TRAJECTORY);
  console.log(`   - Expected:  [${EXPECTED_TRAJECTORY.join(" ➔ ")}]`);
  console.log(`   - Actual:    [${C_ALERT}${result.trajectory.join(" ➔ ")}${C_RESET}]`);
  console.log(`   - Exact Trajectory Match: ${audit.exactMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET}`);
  console.log(`   - In-Order Match:         ${audit.inOrderMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET} ${C_INFO}(All target tools executed in correct order, despite loops)${C_RESET}`);
  console.log(`   - Any-Order Match:        ${audit.anyOrderMatch ? C_SUCCESS + "YES" : C_ALERT + "NO"}${C_RESET}`);
  console.log(`   - Trajectory Precision:   ${C_ALERT}${(audit.precision * 100).toFixed(0)}%${C_RESET} ${C_INFO}(Low precision due to redundant steps)${C_RESET}`);
  console.log(`   - Trajectory Recall:      ${C_SUCCESS}${(audit.recall * 100).toFixed(0)}%${C_RESET} ${C_INFO}(All required tools were eventually invoked)${C_RESET}`);
  console.log(`   - Redundant Steps Found:  ${C_ALERT}[${audit.redundantSteps.join(", ")}]${C_RESET}`);

  console.log(`\n${C_BOLD}Performance Implications:${C_RESET}`);
  console.log(`   - Latency:   ${C_ALERT}${result.totalLatencyMs} ms${C_RESET} ${C_INFO}(increased due to repeated steps)${C_RESET}`);
  console.log(`   - Tokens:    ${result.tokens.total} total (${result.tokens.prompt} prompt / ${result.tokens.completion} completion)`);
  console.log(`   - Est. Cost: $${result.tokens.estimatedCostUSD}`);
  console.log("================================================================\n");
}

async function runScenario3() {
  console.log(`\n${C_PHASE}--- Scenario 3: Version Comparison (A/B Testing Analysis) ---${C_RESET}`);
  console.log(`${C_INFO}Executing both Version A and Version B side-by-side to assess drift...${C_RESET}`);

  const vA = await agent.runTask("Please plan my trip to Paris and apply coupons.", "A", false);
  const vB = await agent.runTask("Please plan my trip to Paris and apply coupons.", "B", false);

  const deltaLatency = (((vB.totalLatencyMs - vA.totalLatencyMs) / vA.totalLatencyMs) * 100).toFixed(1);
  const deltaCost = (((parseFloat(vB.tokens.estimatedCostUSD) - parseFloat(vA.tokens.estimatedCostUSD)) / parseFloat(vA.tokens.estimatedCostUSD)) * 100).toFixed(1);

  console.log("\n┌─────────────────────────────┬───────────────────────┬───────────────────────┐");
  console.log("│ Metric                      │ Version A (Optimized) │ Version B (Sub-opt)   │");
  console.log("├─────────────────────────────┼───────────────────────┼───────────────────────┤");
  console.log(`│ Total Latency (ms)          │ ${vA.totalLatencyMs.toFixed(0).padEnd(21)} │ ${C_ALERT}${vB.totalLatencyMs.toFixed(0).padEnd(21)}${C_RESET} │`);
  console.log(`│ Latency Difference          │ -                     │ ${C_ALERT}+${deltaLatency}% slower${C_RESET}`.padEnd(30) + "│");
  console.log(`│ Trajectory Steps            │ ${vA.trajectory.length.toString().padEnd(21)} │ ${vB.trajectory.length.toString().padEnd(21)} │`);
  console.log(`│ Cumulative Token Count      │ ${vA.tokens.total.toString().padEnd(21)} │ ${C_ALERT}${vB.tokens.total.toString().padEnd(21)}${C_RESET} │`);
  console.log(`│ Estimated API cost          │ $${vA.tokens.estimatedCostUSD.padEnd(20)} │ $${vB.tokens.estimatedCostUSD.padEnd(20)} │`);
  console.log(`│ Cost Difference             │ -                     │ ${C_ALERT}+${deltaCost}% cost${C_RESET}`.padEnd(30) + "│");
  console.log(`│ Exact Trajectory Match      │ ${C_SUCCESS}PASSED (YES)${C_RESET.padEnd(21)} │ ${C_ALERT}FAILED (NO)${C_RESET.padEnd(21)} │`);
  console.log(`│ Trajectory Precision        │ 100%                  │ ${C_ALERT}${((vB.trajectory.length > 0 ? vA.trajectory.length / vB.trajectory.length : 1)*100).toFixed(0)}%${C_RESET.padEnd(21)} │`);
  console.log("└─────────────────────────────┴───────────────────────┴───────────────────────┘");
  console.log(`\n${C_SUCCESS}Observation:${C_RESET} Monitoring tool invocation steps exposes looping agents immediately, preventing compute ballooning in production.`);
  console.log("================================================================\n");
}

async function runScenario4() {
  console.log(`\n${C_PHASE}--- Scenario 4: Qualitative Grading via LLM-as-a-Judge ---${C_RESET}`);
  
  const query = "Recommend a trip itinerary to Paris and apply PARIS10 discount.";
  const facts = "Paris trip. Flights: $1200. Weather: Sunny 24C. Lodging: Hotel de L'Opera Booked. Discount: PARIS10 coupon applied (10% saved).";
  
  const sampleAnswer = `I've booked your trip to Paris! Here are the details:
- Flight: $1200 ticket secured.
- Weather: Sunny skies, 24°C.
- Hotel: Hotel de L'Opera confirmed.
- Discount: 10% saved with PARIS10 code.
Enjoy your holiday!`;

  console.log(`\n${C_BOLD}Response Draft to Judge:${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(sampleAnswer);
  console.log(`----------------------------------------------------------------`);

  console.log(`\n${C_INFO}Sending draft output to LLM Evaluator...${C_RESET}`);
  
  // Attempt Ollama judgment first. If not online, will use fallback rubric checker
  const judgment = await judge.evaluate(query, sampleAnswer, facts);

  console.log(`\n${C_BOLD}LLM Evaluator Report (${judgment.method}):${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Accuracy Score:      ${renderProgressBar(judgment.scores.accuracy_score / 5.0, C_SUCCESS)}`);
  console.log(`Helpfulness Score:   ${renderProgressBar(judgment.scores.helpfulness_score / 5.0, C_SUCCESS)}`);
  console.log(`Rationale:           ${judgment.scores.rationale}`);
  console.log(`Recommended Action:  ${judgment.scores.recommended_action === "Approve" ? C_SUCCESS : C_ALERT}${judgment.scores.recommended_action}${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log("================================================================\n");
}

async function runLiveOllamaLoop() {
  console.log(`\n${C_PHASE}--- Scenario 5: Live Ollama Agent Loop ---${C_RESET}`);
  console.log(`${C_INFO}Starting agent loop using local Ollama (Llama 3.2)...${C_RESET}`);

  const query = "Plan a trip to Paris for me, check weather, book hotel, and apply discount PARIS10.";
  console.log(`\n${C_BOLD}Live query:${C_RESET} "${query}"`);
  console.log(`Executing step-by-step traces...`);

  // Force live run (attempts Ollama loop, will gracefully catch and run mock pipeline if offline)
  const result = await agent.runTask(query, "A", true);

  console.log(`\n${C_SUCCESS}Final Recommendation Output:${C_RESET}`);
  console.log(`----------------------------------------------------------------`);
  console.log(result.text);
  console.log(`----------------------------------------------------------------`);

  console.log(`\n${C_BOLD}Trace Audits:${C_RESET}`);
  console.log(`   - Trajectory: [${result.trajectory.join(" ➔ ")}]`);
  console.log(`   - Latency:    ${result.totalLatencyMs.toFixed(0)} ms`);
  console.log(`   - Cost:       $${result.tokens.estimatedCostUSD}`);
  console.log("================================================================\n");
}

async function mainMenu() {
  while (true) {
    printBanner();
    console.log("Select an Evaluation & Monitoring scenario to run:");
    console.log(`  ${C_BOLD}1. Run Optimized Agent (Version A) & Syntactic/Trajectory Verification${C_RESET}`);
    console.log(`  ${C_BOLD}2. Run Suboptimal Agent (Version B) & Track Drift/Redundant Invocations${C_RESET}`);
    console.log(`  ${C_BOLD}3. Side-by-Side A/B Performance Testing (Compare Latency, Costs, Paths)${C_RESET}`);
    console.log(`  ${C_BOLD}4. Qualitative Grading using LLM-as-a-Judge (Rubric Assessment)${C_RESET}`);
    console.log(`  ${C_BOLD}5. Run Live Agent Loop (requires Ollama running locally)${C_RESET}`);
    console.log(`  ${C_BOLD}6. Exit${C_RESET}`);
    
    const choice = await rl.question(`\n${C_BOLD}Enter choice (1-6):${C_RESET} `);
    
    switch (choice.trim()) {
      case "1":
        await runScenario1();
        break;
      case "2":
        await runScenario2();
        break;
      case "3":
        await runScenario3();
        break;
      case "4":
        await runScenario4();
        break;
      case "5":
        await runLiveOllamaLoop();
        break;
      case "6":
        console.log("Exiting Evaluation and Monitoring CLI. Goodbye!");
        rl.close();
        return;
      default:
        console.log(`${C_ALERT}Invalid selection. Please enter 1-6.${C_RESET}\n`);
    }

    await rl.question(`${C_INFO}Press Enter to return to the main menu...${C_RESET}`);
    console.clear();
  }
}

mainMenu();
