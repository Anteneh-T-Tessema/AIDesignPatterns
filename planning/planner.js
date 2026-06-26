/**
 * Planning Pattern — Plan & Execute Agent
 * =========================================
 * 
 * Demonstrates the PLANNING agentic design pattern:
 * 
 *   1. Decomposes a high-level topic request into a structured JSON plan (sequence of sub-tasks).
 *   2. Loops through the plan steps sequentially, executing each sub-task.
 *   3. Uses previously written sections as context for subsequent sections to maintain flow.
 *   4. Synthesizes all step outputs into a single, cohesive final Markdown report.
 * 
 *                     ┌──▶ Step 1 Execution (intro) ──┐
 *                     │                               │
 *   User Topic ──▶ Plan ├──▶ Step 2 Execution (core) ──┼──▶ Final Document
 *   (Decompose)       │                               │
 *                     └──▶ Step 3 Execution (outro) ──┘
 * 
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildPlannerPrompt(topic) {
  return `
You are a professional content strategist.
Analyze the user's topic and decompose it into a structured, step-by-step outline of exactly 3 to 4 sequential steps to write a comprehensive article.

**Topic:** "${topic}"

Respond with ONLY a JSON object (no markdown formatting, no text, just the raw JSON) matching this schema:
{
  "plan": [
    "Step 1: Description of first logical section (e.g. historical context, basic definitions)",
    "Step 2: Description of second logical section (e.g. core mechanics, why it matters)",
    "Step 3: Description of third logical section (e.g. main challenges, drawbacks)",
    "Step 4: Description of fourth logical section (e.g. future outlook, summary)"
  ]
}
`.trim();
}

function buildExecutionPrompt(topic, plan, stepIndex, currentStep, previousContent) {
  const stepsString = plan.map((step, idx) => `${idx + 1}. ${step}`).join("\n");
  
  return `
You are a senior technical writer.
We are writing a comprehensive, high-quality article on the topic: "${topic}"

**Full Execution Plan:**
${stepsString}

**Current Task:**
We are currently writing the section for Step ${stepIndex + 1}: "${currentStep}"

${previousContent ? `**Content written so far (for context & transition flow):**\n---\n${previousContent}\n---` : "**This is the first section of the article.**"}

Write a detailed, informative, and engaging section (approximately 150-250 words) for the current step. 
Guidelines:
- Do not repeat information already covered in the previous sections.
- Focus strictly on the instructions for "${currentStep}".
- Maintain a smooth transition from the preceding content.
- Output ONLY the raw Markdown text of this section. Do not include titles, wrappers, or introduction messages.
`.trim();
}

// ─── Core Helper ─────────────────────────────────────────────────────────────

async function callLLM(prompt, label, format = undefined) {
  const startTime = Date.now();
  const options = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  };
  if (format) {
    options.format = format;
  }

  const response = await ollama.chat(options);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  ${label} completed in ${elapsed}s`);
  return response.message.content;
}

// ─── Core Loop ───────────────────────────────────────────────────────────────

/**
 * Runs the Plan-and-Execute pipeline on a topic.
 * 
 * @param {string} topic - High level topic to write on
 * @returns {object} - Final compiled text, the plan, and meta
 */
export async function runPlanningPipeline(topic) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧭  PLANNING PATTERN — Plan & Execute Agent");
  console.log("═══════════════════════════════════════════════════════════\n");

  const overallStartTime = Date.now();

  // ── Step 1: Generate Plan ──────────────────────────────────────────────
  console.log("━━━ Step 1: 📋 Decomposing Topic into Plan ━━━━━━━━━━━━━━");
  const plannerPrompt = buildPlannerPrompt(topic);
  const rawPlanResponse = await callLLM(plannerPrompt, "Planner (Outline Generation)", "json");
  
  let planObj;
  try {
    const jsonMatch = rawPlanResponse.match(/\{[\s\S]*\}/);
    planObj = JSON.parse(jsonMatch ? jsonMatch[0] : rawPlanResponse);
  } catch (e) {
    console.error("   ❌ Failed to parse plan JSON. Falling back to default plan structure.");
    planObj = {
      plan: [
        "Introduction and historical context",
        "Core mechanics and practical applications",
        "Key challenges, constraints, and future outlook"
      ]
    };
  }

  const plan = planObj.plan;
  console.log("\n   Generated Plan Outline:");
  plan.forEach((step, idx) => console.log(`      ${idx + 1}. ${step}`));
  console.log("");

  // ── Step 2: Sequential Execution of Steps ─────────────────────────────
  console.log("━━━ Step 2: ✍️  Executing Plan Steps Sequentially ━━━━━━━");
  const sections = [];
  let cumulativeContent = "";

  for (let i = 0; i < plan.length; i++) {
    const currentStep = plan[i];
    console.log(`\n   [Step ${i + 1}/${plan.length}] Drafting: "${currentStep}"...`);

    const execPrompt = buildExecutionPrompt(topic, plan, i, currentStep, cumulativeContent);
    const sectionContent = await callLLM(execPrompt, `Drafting Section ${i + 1}`);

    const trimmedSection = sectionContent.trim();
    sections.push({
      step: currentStep,
      content: trimmedSection
    });

    // Append to context for the next iteration (Chaining!)
    if (cumulativeContent) {
      cumulativeContent += "\n\n";
    }
    cumulativeContent += `### ${currentStep}\n${trimmedSection}`;
  }

  // ── Step 3: Synthesis ─────────────────────────────────────────────────
  console.log("\n━━━ Step 3: 📊 Compiling Final Document ━━━━━━━━━━━━━━━━━");
  
  let finalDocument = `# ${topic}\n\n`;
  finalDocument += `## 📋 Execution Plan\n`;
  plan.forEach((step, idx) => {
    finalDocument += `- ${step}\n`;
  });
  finalDocument += `\n---\n\n`;

  sections.forEach((sec) => {
    finalDocument += `## ${sec.step}\n\n${sec.content}\n\n`;
  });

  const duration = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  ✅  Planning pipeline completed in ${duration}s total!`);
  console.log("═══════════════════════════════════════════════════════════\n");

  return {
    plan,
    sections,
    finalDocument,
    meta: {
      duration,
      stepsCount: plan.length
    }
  };
}
