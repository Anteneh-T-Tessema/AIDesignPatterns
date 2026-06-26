// Javascript for AIDesignPatterns Landing Page

// 21 Patterns Database
const PATTERNS = [
  {
    name: "Prompt Chaining",
    desc: "Splits a task into multiple linear steps, feeding the output of the previous step as context into the next.",
    category: "core",
    command: "npm start",
    path: "promptchaining"
  },
  {
    name: "Routing",
    desc: "Classifies user intent and dynamically routes the request to specialized agents or prompts.",
    category: "core",
    command: "npm start",
    path: "routing"
  },
  {
    name: "Parallelization",
    desc: "Executes multiple agent calls in parallel and merges outputs via voting or consensus aggregation.",
    category: "core",
    command: "npm start",
    path: "parallelization"
  },
  {
    name: "Reasoning (Tree-of-Thoughts)",
    desc: "Searches a tree of reasoning paths, evaluating step goodness, backtracking, and pruning invalid branches.",
    category: "cognitive",
    command: "npm start",
    path: "reasoning"
  },
  {
    name: "Planning (Plan-and-Execute)",
    desc: "Decomposes a complex request into a structured step list, executing each step and keeping memory of previous items.",
    category: "cognitive",
    command: "npm start",
    path: "planning"
  },
  {
    name: "Reflection (Self-Correction)",
    desc: "Refines drafts iteratively by running a generator agent and critic reviewer until validation scores pass.",
    category: "cognitive",
    command: "npm start",
    path: "reflection"
  },
  {
    name: "Tool Use & Verification",
    desc: "Enables agents to call external functions and validates output schemas before incorporating back to context.",
    category: "agency",
    command: "npm start",
    path: "tooluse"
  },
  {
    name: "Model Context Protocol (MCP)",
    desc: "Integrates standard Model Context Protocol servers to access remote databases, directories, and search APIs.",
    category: "agency",
    command: "npm start",
    path: "mcp"
  },
  {
    name: "Human-in-the-Loop (HITL)",
    desc: "Pauses execution loops to prompt human operators for input, alignment, or approval of critical actions.",
    category: "agency",
    command: "npm start",
    path: "humanintheloop"
  },
  {
    name: "Prioritization",
    desc: "Maintains an in-memory backlog, dynamically assigning urgency priorities and handling parameter resolution.",
    category: "state",
    command: "npm start",
    path: "prioritization"
  },
  {
    name: "Memory",
    desc: "Manages short-term session context and long-term semantic databases using vectors and embeddings.",
    category: "state",
    command: "npm start",
    path: "memory"
  },
  {
    name: "Goal Monitoring",
    desc: "Performs periodic status checks to detect drift and dynamically modifies remaining steps to ensure compliance.",
    category: "state",
    command: "npm start",
    path: "goalmonitoring"
  },
  {
    name: "Resource-Aware Execution",
    desc: "Tracks and restricts agent loops based on token limits, compute budget thresholds, and cost warnings.",
    category: "state",
    command: "npm start",
    path: "resourceaware"
  },
  {
    name: "Multi-Agent Collaboration",
    desc: "Orchestrates clusters of specialized agents working together sequentially (Researcher ➜ Writer ➜ Editor).",
    category: "collab",
    command: "npm start",
    path: "multiagent"
  },
  {
    name: "Exploration & Discovery",
    desc: "Fosters open-ended discovery through generation, peer evaluation, tournament Elo debate, and evolution.",
    category: "collab",
    command: "npm start",
    path: "explorationdiscovery"
  },
  {
    name: "Agent-to-Agent (A2A)",
    desc: "Implements decentralized messaging protocols allowing independent agents to register, discover, and hand off tasks.",
    category: "collab",
    command: "npm start",
    path: "a2a"
  },
  {
    name: "Guardrails & Policy",
    desc: "Enforces input filters and output evaluations against strict organizational safety and trademark rules.",
    category: "integrity",
    command: "npm start",
    path: "guardrails"
  },
  {
    name: "Exception Handling",
    desc: "Creates durable agent systems using automatic retry logic, fallback models, and graceful degradation.",
    category: "integrity",
    command: "npm start",
    path: "exceptionhandling"
  },
  {
    name: "Evaluation & Monitoring",
    desc: "Captures execution traces, measures performance metrics, and logs data flows for system optimization.",
    category: "integrity",
    command: "npm start",
    path: "evaluationmonitoring"
  },
  {
    name: "Learning & Optimization",
    desc: "Improves prompt prompts iteratively based on historic trace rewards and execution reviews.",
    category: "integrity",
    command: "npm start",
    path: "learning"
  },
  {
    name: "Knowledge Retrieval (RAG)",
    desc: "Augments prompts with document context pulled from local vector stores using semantic searches.",
    category: "integrity",
    command: "npm start",
    path: "knowledgeretrieval"
  }
];

// Active Steps State
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
});

// Render Pattern Grid
function renderPatterns(filter) {
  const grid = document.getElementById("patterns-grid");
  grid.innerHTML = "";

  const filtered = filter === "all" ? PATTERNS : PATTERNS.filter(p => p.category === filter);

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "pattern-card";
    
    // Category mapping class
    const tagClass = p.category === "core" ? "core" : p.category === "integrity" ? "integrity" : "";
    const categoryName = p.category.toUpperCase();

    card.innerHTML = `
      <div>
        <div class="pattern-header">
          <span class="pattern-tag ${tagClass}">${categoryName}</span>
        </div>
        <h3>${p.name}</h3>
        <p class="pattern-desc">${p.desc}</p>
      </div>
      <div class="pattern-footer">
        <span class="run-command">${p.command}</span>
        <a href="./${p.path}/" class="learn-more">
          Explore <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
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
  // Update buttons
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  
  // Find current button and make active
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
  } else {
    buttons[1].classList.add("active");
    document.getElementById("panel-discovery").classList.add("active");
  }
}

// Task Prioritization Step Navigation
function updatePrioritizationUI() {
  const step = PRIORITIZATION_STEPS[currentPrioritizationStep];
  document.getElementById("p-step-title").innerText = step.title;
  document.getElementById("p-step-body").innerHTML = step.body;

  // Reset all nodes
  const allNodes = document.querySelectorAll("#svg-prioritization .node-group");
  allNodes.forEach(n => n.classList.remove("active"));

  // Highlight current nodes
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

  // Reset all nodes
  const allNodes = document.querySelectorAll("#svg-discovery .node-group");
  allNodes.forEach(n => n.classList.remove("active"));

  // Highlight current nodes
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
