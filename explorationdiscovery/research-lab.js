/**
 * Research Laboratory Pipeline Coordinator
 * ==========================================
 * 
 * Orchestrates the full Exploration & Discovery pipeline:
 * 
 *   1. 🧬 Generation:  Generator agent produces 3 diverse hypotheses
 *   2. 🔬 Peer Review: 3 specialized reviewers evaluate each hypothesis
 *   3. 🏆 Tournament:  Elo-based ranking agent runs head-to-head matchups
 *   4. 🔭 Evolution:   Evolver refines the top-ranked hypothesis
 *   5. 📄 Synthesis:   Professor agent compiles the final academic report
 *
 *              ┌─────────────────────────────────────────────────────────────┐
 *              │                   🔬 Research Lab                          │
 *              │                                                             │
 *              │  Topic ──▶ 🧬 Generator ──▶ [H1, H2, H3]                 │
 *              │                                    │                        │
 *              │              ┌─────────────────────┤                        │
 *              │              ▼          ▼          ▼                        │
 *              │         👩‍🔬 Rev1  👨‍🔬 Rev2  🧑‍🔬 Rev3  (× 3 hypotheses)     │
 *              │              └─────────────────────┘                        │
 *              │                         │                                   │
 *              │                         ▼                                   │
 *              │              🏆 Tournament Ranker                           │
 *              │                         │                                   │
 *              │                    Top Hypothesis                           │
 *              │                         ▼                                   │
 *              │              🔭 Evolution Agent                             │
 *              │                         │                                   │
 *              │                  Final Proposal                             │
 *              │                         ▼                                   │
 *              │              📄 Professor Synthesis                         │
 *              └─────────────────────────────────────────────────────────────┘
 */

import {
  REVIEWER_PERSONAS,
  buildGeneratorPrompt,
  buildReviewerPrompt,
  buildRankingPrompt,
  buildEvolutionPrompt,
  buildProfessorPrompt,
  callLLM
} from "./agents.js";

// ─── JSON Parser with fallback ────────────────────────────────────────────────

function parseJSON(raw, fallback = null) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    // ignore
  }
  return fallback;
}

// ─── Step 1: Hypothesis Generation ───────────────────────────────────────────

async function runGenerator(topic) {
  console.log("\n━━━ 🧬 Step 1: Hypothesis Generation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Topic: "${topic}"\n`);

  const prompt = buildGeneratorPrompt(topic);
  const raw = await callLLM(prompt, "Generator Agent", true);
  const parsed = parseJSON(raw, { hypotheses: [] });

  if (!parsed.hypotheses || parsed.hypotheses.length === 0) {
    throw new Error("Generator failed to produce any hypotheses.");
  }

  console.log(`   ✅ Generated ${parsed.hypotheses.length} hypotheses:`);
  for (const h of parsed.hypotheses) {
    console.log(`      ${h.id}: ${h.title}`);
  }

  return parsed.hypotheses;
}

// ─── Step 2: Peer Review ──────────────────────────────────────────────────────

async function runPeerReviews(topic, hypotheses) {
  console.log("\n━━━ 🔬 Step 2: Peer Review (3 Reviewers × 3 Hypotheses) ━━━━━━━━━");

  const allReviews = [];
  const personaKeys = Object.keys(REVIEWER_PERSONAS);

  for (const hypothesis of hypotheses) {
    console.log(`\n   📋 Reviewing Hypothesis ${hypothesis.id}: "${hypothesis.title}"`);
    for (const key of personaKeys) {
      const persona = REVIEWER_PERSONAS[key];
      const prompt = buildReviewerPrompt(topic, hypothesis, persona);
      const raw = await callLLM(prompt, `${persona.name} on ${hypothesis.id}`, true);
      const review = parseJSON(raw, {
        reviewer_type: persona.name,
        verdict: "Reject",
        score: 5,
        strengths: [],
        weaknesses: [],
        critique: "(Review parsing failed)"
      });
      review.hypothesisId = hypothesis.id;
      allReviews.push(review);
      console.log(`      ${review.verdict === "Accept" ? "✅" : "❌"} ${persona.name}: ${review.score}/10 (${review.verdict})`);
    }
  }

  return allReviews;
}

// ─── Step 3: Tournament Ranking ───────────────────────────────────────────────

async function runTournament(topic, hypotheses, reviews) {
  console.log("\n━━━ 🏆 Step 3: Elo Tournament Ranking ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const prompt = buildRankingPrompt(topic, hypotheses, reviews);
  const raw = await callLLM(prompt, "Tournament Ranker Agent", true);
  const ranking = parseJSON(raw, { matches: [], leaderboard: [] });

  if (ranking.matches && ranking.matches.length > 0) {
    console.log("\n   🥊 Match Results:");
    for (const match of ranking.matches) {
      console.log(`      ${match.matchUp} → Winner: ${match.winner}`);
    }
  }

  if (ranking.leaderboard && ranking.leaderboard.length > 0) {
    console.log("\n   📊 Final Leaderboard:");
    for (const entry of ranking.leaderboard) {
      const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉";
      console.log(`      ${medal} Rank ${entry.rank}: ${entry.hypothesis_id} (Elo: ${entry.elo_score})`);
    }
  }

  return ranking;
}

// ─── Step 4: Hypothesis Evolution ────────────────────────────────────────────

async function runEvolution(topic, hypotheses, reviews, ranking) {
  console.log("\n━━━ 🔭 Step 4: Hypothesis Evolution ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Determine the top hypothesis
  let topId = "H1";
  if (ranking.leaderboard && ranking.leaderboard.length > 0) {
    topId = ranking.leaderboard[0].hypothesis_id;
  }

  const topHypothesis = hypotheses.find(h => h.id === topId) || hypotheses[0];
  const topReviews = reviews.filter(r => r.hypothesisId === topId);

  console.log(`\n   🔝 Evolving top hypothesis: ${topId} - "${topHypothesis.title}"`);

  const prompt = buildEvolutionPrompt(topic, topHypothesis, topReviews);
  const raw = await callLLM(prompt, "Evolution Agent", true);
  const evolved = parseJSON(raw, {
    title: topHypothesis.title,
    abstract: topHypothesis.description,
    experimental_design: "Standard validation procedure.",
    mitigation_plan: "No specific mitigation plan extracted."
  });

  console.log(`\n   ✅ Evolved Proposal: "${evolved.title}"`);
  return { evolved, topHypothesis, topReviews };
}

// ─── Step 5: Professor Synthesis ─────────────────────────────────────────────

async function runProfessor(topic, hypotheses, reviews, ranking, evolved) {
  console.log("\n━━━ 📄 Step 5: Professor Synthesis (Final Report) ━━━━━━━━━━━━━━━━");
  console.log("   Compiling academic report...\n");

  const prompt = buildProfessorPrompt(topic, hypotheses, reviews, ranking, evolved);
  const report = await callLLM(prompt, "Professor Agent", false);

  return report;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Runs the full Exploration and Discovery pipeline.
 * 
 * @param {string} topic - Research topic or open-ended question.
 * @returns {object} Pipeline results including hypotheses, reviews, ranking, evolved, and report.
 */
export async function runResearchLab(topic) {
  const startTime = Date.now();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  🔬  EXPLORATION & DISCOVERY — Autonomous Research Co-Scientist");
  console.log("═══════════════════════════════════════════════════════════════");

  // Step 1
  const hypotheses = await runGenerator(topic);

  // Step 2
  const reviews = await runPeerReviews(topic, hypotheses);

  // Step 3
  const ranking = await runTournament(topic, hypotheses, reviews);

  // Step 4
  const { evolved, topHypothesis, topReviews } = await runEvolution(topic, hypotheses, reviews, ranking);

  // Step 5
  const report = await runProfessor(topic, hypotheses, reviews, ranking, evolved);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`   ✅ Pipeline complete in ${totalTime} minutes.`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  return { hypotheses, reviews, ranking, evolved, topHypothesis, topReviews, report };
}
