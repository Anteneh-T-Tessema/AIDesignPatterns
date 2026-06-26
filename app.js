// Javascript for AIDesignPatterns Landing Page

// 21 Patterns Database with Detailed Reference Metadata
const PATTERNS = [
  {
    name: "Prompt Chaining",
    desc: "Splits a task into multiple linear steps, feeding the output of the previous step as context into the next.",
    category: "core",
    command: "npm start",
    path: "promptchaining",
    files: ["chain.js", "data-chain.js", "index.js"],
    mechanics: [
      "Decompose task into Step A, Step B, and Step C.",
      "Execute Step A using input parameters.",
      "Execute Step B, passing output of Step A as context.",
      "Execute Step C, compiling and formatting final results."
    ],
    prompt: "You are a copywriter. Write a headline based on the product description: {input}.\n\nNext Step Prompt:\nYou are an editor. Revise this headline to make it clickworthy: {headline}.",
    architecture: "[Input] ➜ (Agent Step 1) ➜ [Output 1] ➜ (Agent Step 2) ➜ [Output 2]"
  },
  {
    name: "Routing",
    desc: "Classifies user intent and dynamically routes the request to specialized agents or prompts.",
    category: "core",
    command: "npm start",
    path: "routing",
    files: ["router.js", "index.js"],
    mechanics: [
      "Receive user input string.",
      "Classify input category (e.g. support, billing, tech).",
      "Branch execution to the designated system prompt/agent.",
      "Return specific response matching that domain."
    ],
    prompt: "Classify the user query into one of: ['Billing', 'Technical', 'General']. Return ONLY the label.",
    architecture: "[Input] ➜ (Classifier Router) ──┬──► [Billing Agent]\n                                └──► [Technical Agent]"
  },
  {
    name: "Parallelization",
    desc: "Executes multiple agent calls in parallel and merges outputs via voting or consensus aggregation.",
    category: "core",
    command: "npm start",
    path: "parallelization",
    files: ["auditor.js", "index.js"],
    mechanics: [
      "Receive a single evaluation request.",
      "Spawn 3 concurrent LLM instances with different temperatures.",
      "Aggregate outputs and evaluate voting results.",
      "Select consensus majority answer."
    ],
    prompt: "Analyze this code for bugs. Output YES if safe, NO if buggy: {code}.",
    architecture: "[Request] ──┬──► (Agent Instance 1) ──┬──► [Consensus Mixer] ➜ [Final]\n             ├──► (Agent Instance 2) ──┤\n             └──► (Agent Instance 3) ──┘"
  },
  {
    name: "Reasoning (Tree-of-Thoughts)",
    desc: "Searches a tree of reasoning paths, evaluating step goodness, backtracking, and pruning invalid branches.",
    category: "cognitive",
    command: "npm start",
    path: "reasoning",
    files: ["tot-solver.js", "cot-solver.js", "reflector.js", "index.js"],
    mechanics: [
      "Generate multiple potential next-steps from root state.",
      "Evaluate state goodness of each branch using a Reflector agent.",
      "Prune branches with scores below threshold.",
      "Backtrack if no paths remain; execute depth/breadth first search."
    ],
    prompt: "Given state {state}, generate 3 viable next steps to solve the puzzle.",
    architecture: "         ┌──► [Thought Step 1A] (Score: 40 - PRUNED)\n[Root] ──┼──► [Thought Step 1B] ➜ [Thought Step 2A] (Score: 90)\n         └──► [Thought Step 1C] (Score: 20 - BACKTRACK)"
  },
  {
    name: "Planning (Plan-and-Execute)",
    desc: "Decomposes a complex request into a structured step list, executing each step and keeping memory of previous items.",
    category: "cognitive",
    command: "npm start",
    path: "planning",
    files: ["planner.js", "index.js"],
    mechanics: [
      "Generate 3-4 outline steps in structured JSON format.",
      "Initialize empty cumulative document context.",
      "Loop through plan: draft section, append to context, pass to next step.",
      "Synthesize compiled markdown report."
    ],
    prompt: "Respond with a JSON object: { plan: [ 'Step 1: Intro', 'Step 2: Analysis' ] }",
    architecture: "[Topic] ➜ (Planner) ➜ [Plan List] ➜ (Execute Steps with Context) ➜ [Report]"
  },
  {
    name: "Reflection (Self-Correction)",
    desc: "Refines drafts iteratively by running a generator agent and critic reviewer until validation scores pass.",
    category: "cognitive",
    command: "npm start",
    path: "reflection",
    files: ["reflector.js", "index.js"],
    mechanics: [
      "Generator agent drafts initial output.",
      "Reviewer/Reflector agent audits the draft against specifications.",
      "If critiques exist, feed review logs back to generator.",
      "Re-generate and repeat until reviewer approves or max loops reached."
    ],
    prompt: "Critique the draft below. Identify bugs and return score (1-100): {draft}",
    architecture: "[Input] ➜ (Generator) ◄── (Review Feedback) ──┐\n             │                                 │\n             ▼                                 │\n       [Draft Output] ➜ (Reflector Critic) ───[Unsatisfactory?]"
  },
  {
    name: "Tool Use & Verification",
    desc: "Enables agents to call external functions and validates output schemas before incorporating back to context.",
    category: "agency",
    command: "npm start",
    path: "tooluse",
    files: ["tools.js", "agent.js", "index.js"],
    mechanics: [
      "Define tool execution schemas for LLM call.",
      "Model outputs structured tool call JSON.",
      "Execute host code (calculator, database, shell).",
      "Verify returned data schema and push back to conversation history."
    ],
    prompt: "Use the calculator tool to evaluate: (34 * 12) + 400. Respond with tool call format.",
    architecture: "[Agent] ➜ [Tool Call JSON] ➜ (Host Executer) ➜ [Result API] ➜ [Agent]"
  },
  {
    name: "Model Context Protocol (MCP)",
    desc: "Integrates standard Model Context Protocol servers to access remote databases, directories, and search APIs.",
    category: "agency",
    command: "npm start",
    path: "mcp",
    files: ["server.js", "client.js", "index.js"],
    mechanics: [
      "Launch MCP server exposing local resources/tools.",
      "Launch MCP client and establish SSE or Stdio connection.",
      "Client requests available tools and delegates them to LLM.",
      "LLM accesses local filesystem resources dynamically."
    ],
    prompt: "Query the local directory file resources via MCP tools.",
    architecture: "[LLM Client] ◄───(MCP Protocol over Stdio)───► [MCP Server Tools]"
  },
  {
    name: "Human-in-the-Loop (HITL)",
    desc: "Pauses execution loops to prompt human operators for input, alignment, or approval of critical actions.",
    category: "agency",
    command: "npm start",
    path: "humanintheloop",
    files: ["hitl-agent.js", "index.js"],
    mechanics: [
      "Agent executes task loop autonomously.",
      "Detect high-risk action (e.g. file deletion, cash transfer).",
      "Suspend agent loop; prompt user console interface for approval.",
      "Resume execution with user comments appended as feedback."
    ],
    prompt: "You want to deploy this code. Output PENDING_APPROVAL to request human validation.",
    architecture: "[Autonomous Loop] ➜ [Suspension] ➜ (Prompt User Input) ➜ [Resume]"
  },
  {
    name: "Prioritization",
    desc: "Maintains an in-memory backlog, dynamically assigning urgency priorities and handling parameter resolution.",
    category: "state",
    command: "npm start",
    path: "prioritization",
    files: ["task-manager.js", "agent.js", "index.js"],
    mechanics: [
      "Insert task description into backlog list.",
      "Resolve missing parameters (e.g. auto-map blank IDs to latest task).",
      "Run self-correction checks for unset assignees/priorities.",
      "Sort and output the finalized prioritized board."
    ],
    prompt: "Analyze the task list. Assign priority (P0-P3) and worker: {backlog}",
    architecture: "[Input Request] ➜ (PM Agent) ➜ [Task Manager Backlog] ➜ [Auto-Resolved Board]"
  },
  {
    name: "Memory",
    desc: "Manages short-term session context and long-term semantic databases using vectors and embeddings.",
    category: "state",
    command: "npm start",
    path: "memory",
    files: ["memory.js", "assistant.js", "index.js"],
    mechanics: [
      "Initialize short-term conversational message stack.",
      "Convert user input into vector embedding.",
      "Query vector database for semantically similar historical memories.",
      "Inject retrieved memory contexts into active context window."
    ],
    prompt: "Query Vector Store ➜ Retrieve similar memories ➜ Inject into prompt context.",
    architecture: "[User Input] ──┬──► (Embedding Engine) ➜ [Vector Database]\n             │                              │ (Retrieve Memory)\n             ▼                              ▼\n      [Prompt Context] ◄────────────────────┘"
  },
  {
    name: "Goal Monitoring",
    desc: "Performs periodic status checks to detect drift and dynamically modifies remaining steps to ensure compliance.",
    category: "state",
    command: "npm start",
    path: "goalmonitoring",
    files: ["agent.js", "index.js"],
    mechanics: [
      "Specify ultimate task goal definition.",
      "Run agent step and log current code/plan status.",
      "Goal Monitor agent checks current status against target goal.",
      "If deviation detected, trigger replanning and update task queue."
    ],
    prompt: "Evaluate if code {code} fulfills criteria {goal}. If not, list modifications.",
    architecture: "[Current Progress] ──► (Goal Monitor Checker) ──┬──► [OK ➜ Continue]\n                                               └──► [Fail ➜ Replanner]"
  },
  {
    name: "Resource-Aware Execution",
    desc: "Tracks and restricts agent loops based on token limits, compute budget thresholds, and cost warnings.",
    category: "state",
    command: "npm start",
    path: "resourceaware",
    files: ["resource-monitor.js", "resource-optimizer.js", "index.js"],
    mechanics: [
      "Register token usage limits and max cost budget.",
      "Track prompt/response token usage after each API call.",
      "If budget warning exceeded: downscale model or optimize context size.",
      "Terminate loop and notify user if hard limit is breached."
    ],
    prompt: "Token Usage: {prompt_tokens} prompt, {completion_tokens} response.",
    architecture: "[API Call] ➜ (Resource Monitor) ──┬──► [Below Budget ➜ Continue]\n                                  └──► [Above Limit ➜ Downscale/Halt]"
  },
  {
    name: "Multi-Agent Collaboration",
    desc: "Orchestrates clusters of specialized agents working together sequentially (Researcher ➜ Writer ➜ Editor).",
    category: "collab",
    command: "npm start",
    path: "multiagent",
    files: ["agent.js", "index.js"],
    mechanics: [
      "Researcher outlines topics and exports structured research JSON.",
      "Writer consumes research JSON and drafts a comprehensive post.",
      "Editor evaluates drafts, returning structured reviews.",
      "Writer refines loop iteratively based on editor comments."
    ],
    prompt: "You are the Editor. Review this draft and output approval JSON status.",
    architecture: "[Topic] ➜ (Researcher) ➜ [Research JSON] ➜ (Writer) ◄──► (Editor) ➜ [Blog]"
  },
  {
    name: "Exploration & Discovery",
    desc: "Fosters open-ended discovery through generation, peer evaluation, tournament Elo debate, and evolution.",
    category: "collab",
    command: "npm start",
    path: "explorationdiscovery",
    files: ["research-lab.js", "agents.js", "index.js"],
    mechanics: [
      "Visionary Generator proposes 3 distinct hypotheses.",
      "3 expert reviewer personas critique and score each idea (9 reviews).",
      "Tournament agent compares ideas, outputting match winners and Elo.",
      "Evolution agent refines top idea, and Professor compiles final report."
    ],
    prompt: "You are the Novelty Reviewer. Critique this hypothesis: {hypothesis}.",
    architecture: "[Topic] ➜ (Generator) ➜ [H1-H3] ➜ (3 Reviewers) ➜ (Elo Tournament) ➜ [Report]"
  },
  {
    name: "Agent-to-Agent (A2A)",
    desc: "Implements decentralized messaging protocols allowing independent agents to register, discover, and hand off tasks.",
    category: "collab",
    command: "npm start",
    path: "a2a",
    files: ["message-bus.js", "a2a-protocol.js", "agent-card.js", "index.js"],
    mechanics: [
      "Register independent agents on a central Message Bus.",
      "Agent publishes Task Request message to the bus.",
      "Matching engine checks capability registries.",
      "Target Agent picks up task, executes it, and publishes Result back."
    ],
    prompt: "Register capability: 'research' or 'analysis'. Handle task requests.",
    architecture: "[Agent A] ──(Publish Request)──► [Message Bus Hub] ◄──(Subscribe)── [Agent B]"
  },
  {
    name: "Guardrails & Policy",
    desc: "Enforces input filters and output evaluations against strict organizational safety and trademark rules.",
    category: "integrity",
    command: "npm start",
    path: "guardrails",
    files: ["input-guardrail.js", "output-guardrail.js", "policies.js", "primary-advisor.js", "index.js"],
    mechanics: [
      "Input screening checks prompt against security policies.",
      "If non-compliant, block request immediately.",
      "Evaluate primary agent output against compliance standards.",
      "If output fails check, redact details or trigger system warning."
    ],
    prompt: "Verify if input violates safety policy: {input}. Respond COMPLIANT or NON-COMPLIANT.",
    architecture: "[Prompt] ➜ (Input Guardrail) ➜ [Primary Agent] ➜ (Output Guardrail) ➜ [Response]"
  },
  {
    name: "Exception Handling",
    desc: "Creates durable agent systems using automatic retry logic, fallback models, and graceful degradation.",
    category: "integrity",
    command: "npm start",
    path: "exceptionhandling",
    files: ["resilient-agent.js", "tools.js", "index.js"],
    mechanics: [
      "Attempt primary agent request (e.g. high-capability model).",
      "Catch API timeouts, connection errors, or JSON parsing failures.",
      "Trigger automatic retry with backoff, or switch to fallback model.",
      "Degrade gracefully by returning simplified responses if limits are reached."
    ],
    prompt: "Tries primary tool handler. On failure, delegates to fallback location retriever.",
    architecture: "[API Call] ──(Fails)──► [Retry with Backoff] ──(Fails)──► [Switch to Fallback LLM]"
  },
  {
    name: "Evaluation & Monitoring",
    desc: "Captures execution traces, measures performance metrics, and logs data flows for system optimization.",
    category: "integrity",
    command: "npm start",
    path: "evaluationmonitoring",
    files: ["evaluator.js", "agent.js", "index.js"],
    mechanics: [
      "Intercept active agent calls and log parameters.",
      "Compile telemetry traces (tokens, latency, prompt tokens).",
      "Evaluate trace results against accuracy test cases.",
      "Calculate aggregated metric reports for performance reviews."
    ],
    prompt: "Trace LLM calls, measure validation accuracy, print performance summary.",
    architecture: "[Agent Call] ──(Hook Trace)──► [Evaluation Logger] ➜ [Telemetry Report]"
  },
  {
    name: "Learning & Optimization",
    desc: "Continuously refines system prompts and configurations based on execution rewards and historical performance data.",
    category: "integrity",
    command: "npm start",
    path: "learning",
    files: ["evolver.js", "evaluator.js", "index.js"],
    mechanics: [
      "Generate initial configuration instructions.",
      "Run test scenarios and capture execution reward metrics.",
      "Evolver agent updates instructions based on failure critique feedback.",
      "Re-evaluate performance to confirm metric improvements."
    ],
    prompt: "Analyze failing test cases. Modify system instructions to avoid these errors: {errors}.",
    architecture: "[Prompt Instructions] ➜ [Run Tests] ➜ [Reward Scores] ➜ (Evolver Agent) ➜ [New Prompt]"
  },
  {
    name: "Knowledge Retrieval (RAG)",
    desc: "Augments prompts with document context pulled from local vector stores using semantic searches.",
    category: "integrity",
    command: "npm start",
    path: "knowledgeretrieval",
    files: ["rag-system.js", "index.js"],
    mechanics: [
      "Chunk local document datasets and compute embeddings.",
      "Store chunks in a local JSON metadata vector store.",
      "Compute cosine similarity against user search query.",
      "Inject top document fragments into context window for factual synthesis."
    ],
    prompt: "Answer query {query} strictly using the provided document extracts: {documents}.",
    architecture: "[Query] ➜ [Similarity Match] ➜ [Relevant Chunks] ➜ [Context Assembly] ➜ [Response]"
  }
];

// Active Sandbox Steps State
let currentPrioritizationStep = 0;
let currentDiscoveryStep = 0;

const PRIORITIZATION_STEPS = [
  {
    title: "1. User Prompt Input",
    body: "The user sends a request: <em>'Create a task to implement a new login system. It is urgent, assign to Worker B.'</em> The system registers this prompt.",
    nodes: ["p-node-1"]
  },
  {
    title: "2. Task Creator Agent",
    body: "The Project Manager agent calls <code>create_new_task</code> tool to append a task to the backlog. It gets assigned <strong>TASK-001</strong>. If the agent forgets properties (like priority or worker), the board highlights these missing items.",
    nodes: ["p-node-2"]
  },
  {
    title: "3. Evaluator Loop (Self-Correction)",
    body: "The self-correction loop scans the database. If it detects unconfigured details (e.g. priority mapping), it feeds warning logs back to the agent: <code>TASK-001 is missing: priority</code>. The agent is forced to call the update tools before proceeding.",
    nodes: ["p-node-3"]
  },
  {
    title: "4. Sorted Task Board",
    body: "Once all fields are validated, the board sorts the tasks. <strong>TASK-001</strong> is set with priority <strong>P0</strong> (mapped from 'urgent') and assigned to <strong>Worker B</strong>.",
    nodes: ["p-node-4"]
  }
];

const DISCOVERY_STEPS = [
  {
    title: "1. Research Topic Input",
    body: "The pipeline triggers with a complex research query. For example: <em>'Next-generation solid-state battery electrolytes that enable rapid charging under 5 minutes.'</em>",
    nodes: ["d-node-1"]
  },
  {
    title: "2. Hypothesis Generation",
    body: "The visionary Generator agent analyzes the topic and produces 3 distinct, creative hypotheses (H1, H2, H3), representing diverse mechanical or material principles.",
    nodes: ["d-node-2"]
  },
  {
    title: "3. Expert Peer Reviews",
    body: "Three specialized reviewer agents (<strong>Experimentation</strong>, <strong>Field Impact</strong>, and <strong>Scientific Novelty</strong>) evaluate each hypothesis in parallel. This yields 9 reviews total, grading suitability, scale, and method constraints.",
    nodes: ["d-node-3-1", "d-node-3-2", "d-node-3-3"]
  },
  {
    title: "4. Elo Tournament Debate",
    body: "The Tournament Ranker Agent compares the reviews and runs pairwise matches (H1 vs H2, H2 vs H3, H1 vs H3). It awards wins and ranks the hypotheses on an Elo-based leaderboard.",
    nodes: ["d-node-4"]
  },
  {
    title: "5. Evolution & Synthesis",
    body: "The Evolution agent refines the top-ranked hypothesis into a full research proposal mitigating critiques. Finally, the Professor Agent synthesizes the entire research history into a publication-quality Markdown report.",
    nodes: ["d-node-5"]
  }
];

// Initialize on Load
window.addEventListener("DOMContentLoaded", () => {
  renderPatterns("all");
  updatePrioritizationUI();
  updateDiscoveryUI();
  lucide.createIcons();
  
  // Create Modal Structure at the bottom of the body
  createModalStructure();
});

// Create Modal Nodes dynamically
function createModalStructure() {
  const modalHTML = `
    <div id="pattern-modal" class="modal-overlay">
      <div class="modal-box">
        <button class="modal-close-btn" onclick="closePatternModal()"><i data-lucide="x"></i></button>
        <div class="modal-content">
          <span class="modal-tag" id="modal-category">Core</span>
          <h2 id="modal-title">Pattern Name</h2>
          <p id="modal-desc" class="modal-desc">Description</p>
          
          <div class="modal-grid">
            <div class="modal-left">
              <h3><i data-lucide="workflow" class="section-icon"></i> Execution Mechanics</h3>
              <ol id="modal-mechanics"></ol>
              
              <h3><i data-lucide="folder-git" class="section-icon"></i> Core Files</h3>
              <div id="modal-files" class="file-links-container"></div>
            </div>
            
            <div class="modal-right">
              <h3><i data-lucide="network" class="section-icon"></i> Logical Architecture</h3>
              <pre id="modal-architecture" class="modal-code"></pre>
              
              <h3><i data-lucide="terminal" class="section-icon"></i> Sample Reference Prompt</h3>
              <pre id="modal-prompt" class="modal-code"></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement("div");
  div.innerHTML = modalHTML;
  document.body.appendChild(div.firstElementChild);
}

// Render Pattern Grid
function renderPatterns(filter) {
  const grid = document.getElementById("patterns-grid");
  grid.innerHTML = "";

  // Filter local array
  const filtered = filter === "all" ? PATTERNS : PATTERNS.filter(p => p.category === filter);

  filtered.forEach(p => {
    // Find index of pattern in the main array
    const originalIndex = PATTERNS.findIndex(orig => orig.name === p.name);
    
    const card = document.createElement("div");
    card.className = "pattern-card";
    
    // Category mapping class
    const tagClass = p.category === "core" ? "core" : p.category === "integrity" ? "integrity" : "";
    const categoryName = p.category.toUpperCase();

    card.innerHTML = `
      <div onclick="openPatternModal(${originalIndex})" style="cursor: pointer; flex-grow: 1;">
        <div class="pattern-header">
          <span class="pattern-tag ${tagClass}">${categoryName}</span>
        </div>
        <h3>${p.name}</h3>
        <p class="pattern-desc">${p.desc}</p>
      </div>
      <div class="pattern-footer">
        <span class="run-command">${p.command}</span>
        <a href="javascript:void(0)" onclick="openPatternModal(${originalIndex})" class="learn-more">
          Reference Spec <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
  
  // Re-render Lucide icons inside cards
  lucide.createIcons();
}

// Category Filter Controller
window.filterPatterns = function(category) {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  
  const activeBtn = Array.from(buttons).find(b => b.textContent.toLowerCase().includes(category) || (category === 'all' && b.textContent.includes('All')));
  if (activeBtn) activeBtn.classList.add("active");

  renderPatterns(category);
}

// Switch Sandbox Tabs
window.switchTab = function(tabName) {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(btn => btn.classList.remove("active"));

  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach(p => p.classList.remove("active"));

  if (tabName === "prioritization") {
    buttons[0].classList.add("active");
    document.getElementById("panel-prioritization").classList.add("active");
  } else if (tabName === "discovery") {
    buttons[1].classList.add("active");
    document.getElementById("panel-discovery").classList.add("active");
  } else {
    buttons[2].classList.add("active");
    document.getElementById("panel-architect").classList.add("active");
  }
}

// Modal open/close controllers
window.openPatternModal = function(index) {
  const p = PATTERNS[index];
  document.getElementById("modal-title").innerText = p.name;
  document.getElementById("modal-desc").innerText = p.desc;
  
  const categoryEl = document.getElementById("modal-category");
  categoryEl.innerText = p.category.toUpperCase();
  categoryEl.className = "modal-tag " + (p.category === "core" ? "core" : p.category === "integrity" ? "integrity" : "");

  // Mechanics
  const mechList = document.getElementById("modal-mechanics");
  mechList.innerHTML = "";
  p.mechanics.forEach(step => {
    const li = document.createElement("li");
    li.innerHTML = step;
    mechList.appendChild(li);
  });

  // Files
  const filesContainer = document.getElementById("modal-files");
  filesContainer.innerHTML = "";
  p.files.forEach(f => {
    const link = document.createElement("a");
    link.href = `./${p.path}/${f}`;
    link.className = "modal-file-link";
    link.innerHTML = `<i data-lucide="file-text" style="width: 14px; height: 14px;"></i> ${f}`;
    filesContainer.appendChild(link);
  });

  // Code Architect & Prompts
  document.getElementById("modal-architecture").innerText = p.architecture;
  document.getElementById("modal-prompt").innerText = p.prompt;

  document.getElementById("pattern-modal").classList.add("active");
  lucide.createIcons();
}

window.closePatternModal = function() {
  document.getElementById("pattern-modal").classList.remove("active");
}

// Task Prioritization Step Navigation
function updatePrioritizationUI() {
  const step = PRIORITIZATION_STEPS[currentPrioritizationStep];
  document.getElementById("p-step-title").innerText = step.title;
  document.getElementById("p-step-body").innerHTML = step.body;

  const allNodes = document.querySelectorAll("#svg-prioritization .node-group");
  allNodes.forEach(n => n.classList.remove("active"));

  step.nodes.forEach(nodeId => {
    const el = document.getElementById(nodeId);
    if (el) el.classList.add("active");
  });
}

window.nextPrioritizationStep = function() {
  currentPrioritizationStep = (currentPrioritizationStep + 1) % PRIORITIZATION_STEPS.length;
  updatePrioritizationUI();
}

window.prevPrioritizationStep = function() {
  currentPrioritizationStep = (currentPrioritizationStep - 1 + PRIORITIZATION_STEPS.length) % PRIORITIZATION_STEPS.length;
  updatePrioritizationUI();
}

window.showPrioritizationStep = function(stepIdx) {
  currentPrioritizationStep = stepIdx;
  updatePrioritizationUI();
}

// Exploration & Discovery Step Navigation
function updateDiscoveryUI() {
  const step = DISCOVERY_STEPS[currentDiscoveryStep];
  document.getElementById("d-step-title").innerText = step.title;
  document.getElementById("d-step-body").innerHTML = step.body;

  const allNodes = document.querySelectorAll("#svg-discovery .node-group");
  allNodes.forEach(n => n.classList.remove("active"));

  step.nodes.forEach(nodeId => {
    const el = document.getElementById(nodeId);
    if (el) el.classList.add("active");
  });
}

window.nextDiscoveryStep = function() {
  currentDiscoveryStep = (currentDiscoveryStep + 1) % DISCOVERY_STEPS.length;
  updateDiscoveryUI();
}

window.prevDiscoveryStep = function() {
  currentDiscoveryStep = (currentDiscoveryStep - 1 + DISCOVERY_STEPS.length) % DISCOVERY_STEPS.length;
  updateDiscoveryUI();
}

window.showDiscoveryStep = function(stepIdx) {
  currentDiscoveryStep = stepIdx;
  updateDiscoveryUI();
}

// --- AI System Architect Designing Agent Integration ---
window.generateSystemDesign = async function() {
  const promptInput = document.getElementById("architect-prompt-input");
  const outputConsole = document.getElementById("architect-output");
  const runBtn = document.getElementById("architect-run-btn");
  
  const promptText = promptInput.value.trim();
  if (!promptText) {
    alert("Please enter some requirements first!");
    return;
  }

  // Set Loading UI
  runBtn.disabled = true;
  runBtn.innerHTML = `<span class="loading-spinner"></span> Synthesizing Design...`;
  outputConsole.innerHTML = `<span class="console-cursor">_</span> Initializing AI Designing Agent...\nMatching design patterns to requirements...`;
  outputConsole.className = "console-area loading";

  const systemInstructions = `
You are a Principal AI System Architect.
Analyze the user's requirements and select the most appropriate Agentic Design Patterns from the catalog:
${PATTERNS.map((p, i) => `${i+1}. ${p.name}`).join(", ")}

Synthesize a comprehensive design blueprint. Output raw, clean Markdown text. Do not return markdown wrappers like \`\`\`markdown.

Provide:
1. EXECUTIVE PATTERN SUMMARY: Selected patterns and clear architectural justification.
2. AGENT SEQUENCE DIAGRAM: A brief text-based ASCII diagram showing coordinate flow.
3. DETAILED DESIGN STEPS: Step-by-step description of agent flow.
  `;

  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: promptText }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Server returned error code: ${response.status}`);
    }

    const data = await response.json();
    const markdownContent = data.message.content;
    
    // Parse Markdown to simple HTML structures for display
    outputConsole.innerHTML = formatMarkdownToHTML(markdownContent);
    outputConsole.className = "console-area success";
  } catch (err) {
    console.warn("Local Ollama connection failed. Falling back to structured local generator mock.", err);
    
    // Fallback Mock Design for immediate user feedback (CORS / Ollama off checks)
    setTimeout(() => {
      const mockResult = generateMockArchitecture(promptText);
      outputConsole.innerHTML = formatMarkdownToHTML(mockResult);
      outputConsole.className = "console-area success";
    }, 1500);
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `<i data-lucide="sparkles"></i> Generate System Design`;
    lucide.createIcons();
  }
}

// Quick markdown formatter for terminal visualization
function formatMarkdownToHTML(md) {
  return md
    .replace(/^# (.*$)/gim, '<h2 class="terminal-h1">$1</h2>')
    .replace(/^## (.*$)/gim, '<h3 class="terminal-h2">$1</h3>')
    .replace(/^### (.*$)/gim, '<h4 class="terminal-h3">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="terminal-inline-code">$1</code>')
    .replace(/\n/g, '<br/>');
}

// Local mock architect to protect UI experience when Ollama is offline or blocks CORS
function generateMockArchitecture(promptText) {
  return `
# System Architecture: Custom Collaborative Agent Network

Generated autonomously by local Designing Agent in offline verification mode.

## 1. Executive Pattern Summary

Based on your prompt: **"${promptText}"**, we recommend a hybrid architecture utilizing the following core Agentic Design Patterns:
- **Routing Pattern**: To categorize and delegate sub-tasks dynamically to specialised agents.
- **Multi-Agent Collaboration**: Orchestrating a sequential feedback chain to build, critique, and finalize outputs.
- **Guardrails & Policy**: Checking safety constraints and validation boundaries on inputs and outputs.
- **Exception Handling**: To recover gracefully from transient tool or API failures during loops.

## 2. Agent Sequence Diagram (ASCII Flow)

\`\`\`
[User Input] ──► (Input Guardrail) ──► (Router Classifier)
                                            │
                           ┌────────────────┴────────────────┐
                           ▼                                 ▼
                    [Workflow Task A]                 [Workflow Task B]
                           │                                 │
                    (Planner Executer)               (Parallel Workers)
                           │                                 │
                           └────────────────┬────────────────┘
                                            ▼
                                     [Aggregator]
                                            │
                                    (Output Guardrail) ──► [Final Response]
\`\`\`

## 3. Recommended Implementation Checklist
1. Initialize the **Routing Agent** inside a root routing wrapper.
2. Structure the **Agent Personas** inside separate scripts (e.g. \`researcher.js\`, \`writer.js\`).
3. Integrate the **Guardrails Policies** before launching the pipeline.
4. Set up backoffs and fallback models to catch API timeouts.
  `;
}
