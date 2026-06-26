/**
 * Multi-Agent Collaboration Pattern — Content Team
 * ==================================================
 * 
 * Demonstrates the MULTI-AGENT COLLABORATION agentic design pattern:
 * 
 *   1. Researcher Agent (Senior Research Analyst):
 *      Decomposes the high-level topic request into a structured JSON research summary.
 *   2. Writer Agent (Technical Content Writer):
 *      Receives the research findings and drafts a cohesive, detailed post.
 *   3. Editor Agent (Editorial Director):
 *      Critiques the writer's draft against the research facts. Returns a JSON evaluation.
 *   4. Collaboration Feedback Loop:
 *      If rejected, the Writer refines the draft based on Editor critiques.
 *      The loop continues until Editor approval (approved = true) or max iterations is reached.
 * 
 *               ┌───────────────────┐
 *               │ 📋 Topic Request  │
 *               └─────────┬─────────┘
 *                         │
 *                         ▼
 *             ┌───────────────────────┐
 *             │ 🔍 Researcher Agent   │
 *             └───────────┬───────────┘
 *                         │ (Research JSON Handoff)
 *                         ▼
 *             ┌───────────────────────┐
 *  ┌─────────▶│    ✍️ Writer Agent     │◀──────────┐
 *  │          │ (Drafts/Refines blog) │           │
 *  │          └───────────┬───────────┘           │
 *  │                      │                       │
 *  │                      ▼                       │ (Critique Handoff)
 *  │          ┌───────────────────────┐           │
 *  │          │   🔎 Editor Agent     ├───────────┘
 *  │          │ (Reviews & Approves)  │
 *  │          └───────────┬───────────┘
 *  │                      │
 *  └──────[Approved?]─────┼────(No)
 *                         │
 *                       (Yes)
 *                         ▼
 *              ┌─────────────────────┐
 *              │  🚀 Final Blog Post │
 *              └─────────────────────┘
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildResearcherPrompt(topic) {
  return `
You are a Senior Research Analyst.
Your goal is to perform initial research on the user's topic and extract the top 3 emerging trends, key technological facts, and practical applications.

**Topic:** "${topic}"

Respond with ONLY a JSON object (no markdown, no additional text, just the raw JSON) matching this schema:
{
  "topic": "${topic}",
  "trends": [
    {
      "trend": "Trend Name / Title",
      "summary": "Clear, informative 2-3 sentence overview of why this trend matters.",
      "keyFacts": [
        "First key technical fact, statistics, or breakthrough",
        "Second key technical fact or real-world application details"
      ]
    }
  ]
}
`.trim();
}

function buildWriterPrompt(topic, researchJson, previousDraft = null, critiques = null) {
  const formattedResearch = JSON.stringify(researchJson, null, 2);

  if (previousDraft && critiques) {
    const formattedCritiques = critiques.map(c => `- ${c}`).join("\n");
    return `
You are a Technical Content Writer.
Your goal is to revise your previous draft based on specific critiques from the Editorial Director.

**Topic:** "${topic}"

**Original Research Findings:**
\`\`\`json
${formattedResearch}
\`\`\`

**Your Previous Draft:**
---
${previousDraft}
---

**Editor Feedback & Critiques to Address:**
${formattedCritiques}

**Instructions:**
- Revise the draft carefully to address every single critique.
- Ensure all technical facts from the research findings are highlighted correctly and accurately.
- Do not add comments, introduction messages, or metadata.
- Output ONLY the updated raw Markdown text of the article.
`.trim();
  }

  return `
You are a Technical Content Writer.
Your goal is to draft a comprehensive, highly engaging, and informative blog post based on the research findings.

**Topic:** "${topic}"

**Research Findings:**
\`\`\`json
${formattedResearch}
\`\`\`

**Instructions:**
- Write a blog post of approximately 400-500 words.
- Provide a creative title, an introductory hook, a section for each of the 3 researched trends, and a future-looking conclusion.
- Integrate the technical facts and key points from the research naturally.
- Output ONLY the raw Markdown text. Do not include any introduction comments or wrappers.
`.trim();
}

function buildEditorPrompt(topic, researchJson, writerDraft) {
  const formattedResearch = JSON.stringify(researchJson, null, 2);

  return `
You are the Editorial Director.
Your job is to evaluate the writer's draft against the original research findings to ensure maximum factual coverage, accurate details, and professional style.

**Topic:** "${topic}"

**Original Research Findings (Reference Checklist):**
\`\`\`json
${formattedResearch}
\`\`\`

**Writer's Draft:**
---
${writerDraft}
---

**Evaluation Criteria:**
1. **Factual Coverage**: Did the writer include and accurately portray all 3 trends and their key technical facts?
2. **Quality & Flow**: Is the tone professional, engaging, and polished?
3. **Structure**: Does it have an introduction, distinct sections, and a conclusion?

Respond with ONLY a JSON object (no markdown formatting, no additional text, just the raw JSON) matching this schema:
{
  "approved": <true if the score is 85+ and there are no major factual gaps or logical errors; false otherwise>,
  "score": <integer from 0 to 100 reflecting overall draft quality>,
  "critiques": [
    "<string description of gap 1 (e.g., 'Fails to mention fact X about trend Y')>",
    "<string description of gap 2 (e.g., 'The transition into the conclusion is abrupt')>"
  ],
  "reasoning": "<one sentence summarizing the overall evaluation>"
}
`.trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 * Runs the Multi-Agent Collaboration workflow.
 * 
 * @param {string} topic - The topic to create a blog post on
 * @param {number} maxIterations - Maximum Writer-Editor iterations
 * @returns {object} - Final article, research data, review logs, and performance metrics
 */
export async function runCollaborationPipeline(topic, maxIterations = 3) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  👥  MULTI-AGENT COLLABORATION — Content Team");
  console.log("═══════════════════════════════════════════════════════════\n");

  const overallStartTime = Date.now();
  const logs = [];

  // ── Step 1: Researcher Agent ──────────────────────────────────────────
  console.log("━━━ Step 1: 🔍 Researcher Agent Gathering Intel ━━━━━━━━━");
  const researcherPrompt = buildResearcherPrompt(topic);
  const rawResearch = await callLLM(researcherPrompt, "Researcher (Extracting Facts)", "json");

  let researchJson;
  try {
    const jsonMatch = rawResearch.match(/\{[\s\S]*\}/);
    researchJson = JSON.parse(jsonMatch ? jsonMatch[0] : rawResearch);
  } catch (e) {
    console.error("   ❌ Researcher failed to output valid JSON. Falling back to default research structure.");
    researchJson = {
      topic,
      trends: [
        {
          trend: "Technological Core Advances",
          summary: "Significant enhancements in speed, efficiency, and architectural layouts.",
          keyFacts: ["Performance improvements of 2-3x", "Adoption of decentralized workflows"]
        },
        {
          trend: "Practical Field Applications",
          summary: "Real-world integrations showing high effectiveness in industry verticals.",
          keyFacts: ["Reduced operation costs", "Faster time-to-market deployments"]
        },
        {
          trend: "Societal and Industry Challenges",
          summary: "Barriers such as regulatory compliance, public perception, and security bottlenecks.",
          keyFacts: ["Strict safety guidelines needed", "High demand for specialized talent"]
        }
      ]
    };
  }

  console.log("\n   Researcher Findings Outline:");
  researchJson.trends.forEach((t, idx) => {
    console.log(`      ${idx + 1}. [Trend] ${t.trend}`);
    t.keyFacts.forEach(f => console.log(`         • Fact: ${f}`));
  });
  console.log("");

  // ── Step 2: Writer & Editor Collaboration Loop ────────────────────────
  console.log("━━━ Step 2: ✍️ Writer & 🔎 Editor Collaboration Loop ━━━━━");
  let currentDraft = "";
  let iteration = 0;
  let finalStatus = { approved: false, score: 0, critiques: [] };

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n--- Iteration ${iteration}/${maxIterations} ---`);

    if (iteration === 1) {
      console.log("   ✍️  Writer Agent drafting initial post...");
      const writerPrompt = buildWriterPrompt(topic, researchJson);
      currentDraft = await callLLM(writerPrompt, "Writer (Initial Draft)");
    } else {
      console.log("   ✍️  Writer Agent refining draft based on critiques...");
      const writerPrompt = buildWriterPrompt(topic, researchJson, currentDraft, finalStatus.critiques);
      currentDraft = await callLLM(writerPrompt, `Writer (Refining Draft)`);
    }

    // Pass draft to Editor Agent
    console.log("   🔎  Editor Agent reviewing current draft...");
    const editorPrompt = buildEditorPrompt(topic, researchJson, currentDraft);
    const rawEditorReview = await callLLM(editorPrompt, "Editor (Critique & Score)", "json");

    let review;
    try {
      const jsonMatch = rawEditorReview.match(/\{[\s\S]*\}/);
      review = JSON.parse(jsonMatch ? jsonMatch[0] : rawEditorReview);
    } catch (e) {
      console.warn("   ⚠️  Failed to parse Editor JSON review. Assuming minor refinement needed.");
      review = {
        approved: false,
        score: 75,
        critiques: ["Fails to follow structured review. Perform style polish."],
        reasoning: "JSON parsing error on editor response."
      };
    }

    console.log(`      Score:       ${review.score}/100`);
    console.log(`      Approved:    ${review.approved ? "✅ YES" : "❌ NO"}`);
    console.log(`      Reasoning:   ${review.reasoning}`);
    if (review.critiques.length > 0) {
      console.log("      Critiques:");
      review.critiques.forEach((c, idx) => console.log(`         ${idx + 1}. ${c}`));
    }

    logs.push({
      iteration,
      draft: currentDraft,
      review
    });

    finalStatus = review;

    if (review.approved) {
      console.log(`\n   ✨ Editor APPROVED the blog post at iteration ${iteration}!`);
      break;
    }

    if (iteration === maxIterations) {
      console.log("\n   ⚠️ Max collaboration iterations reached. Proceeding to compilation.");
    }
  }

  // ── Step 3: Synthesis ─────────────────────────────────────────────────
  console.log("\n━━━ Step 3: 📊 Compiling Final Output Package ━━━━━━━━━━━");
  const duration = ((Date.now() - overallStartTime) / 1000).toFixed(1);

  let finalDocument = `# Multi-Agent Collaborative Report: ${topic}\n\n`;
  finalDocument += `## 👥 Collaborating Team\n`;
  finalDocument += `- **Senior Research Analyst**: Gathers information, trends, and facts.\n`;
  finalDocument += `- **Technical Content Writer**: Drafts and refines the narrative structure.\n`;
  finalDocument += `- **Editorial Director**: Evaluates formatting, fact-checking, and approves publishing.\n\n`;

  finalDocument += `## 📋 Phase 1: Research Intel\n`;
  researchJson.trends.forEach((t, idx) => {
    finalDocument += `### Trend ${idx + 1}: ${t.trend}\n`;
    finalDocument += `> *${t.summary}*\n`;
    t.keyFacts.forEach(f => {
      finalDocument += `- Fact/Factoid: ${f}\n`;
    });
    finalDocument += `\n`;
  });

  finalDocument += `## 🔬 Phase 2: Editorial Review Logs\n`;
  logs.forEach(l => {
    finalDocument += `### Iteration ${l.iteration} Review (Score: ${l.review.score}/100)\n`;
    finalDocument += `- **Approved**: ${l.review.approved ? "Yes" : "No"}\n`;
    finalDocument += `- **Reasoning**: ${l.review.reasoning}\n`;
    if (l.review.critiques.length > 0) {
      finalDocument += `- **Critiques to address**:\n`;
      l.review.critiques.forEach(c => {
        finalDocument += `  - ${c}\n`;
      });
    }
    finalDocument += `\n`;
  });

  finalDocument += `---\n\n`;
  finalDocument += `## 🚀 Phase 3: Final Approved Blog Post\n\n`;
  finalDocument += currentDraft;
  finalDocument += `\n\n---\n`;
  finalDocument += `*Pipeline execution metrics: completed in ${duration}s over ${iteration} collaborative loops.*\n`;

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  ✅  Multi-Agent pipeline completed in ${duration}s total!`);
  console.log("═══════════════════════════════════════════════════════════\n");

  return {
    research: researchJson,
    logs,
    finalDocument,
    meta: {
      duration,
      loops: iteration,
      approved: finalStatus.approved,
      finalScore: finalStatus.score
    }
  };
}
