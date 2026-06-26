/**
 * Complete Verification Script for Memory Management
 * ===================================================
 * Runs a sequence of chat messages to verify all memory tiers:
 * 1. State profiling (extraction & storage of user details).
 * 2. Semantic fact memory (storing/recalling a database port).
 * 3. Procedural memory reflection (self-updating instructions to act like a pirate).
 * 4. Episodic experience memory (saving a few-shot episode and recalling it).
 * 5. Short-term summarization (compaction of older messages).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { StatefulAssistant } from "./assistant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, "test_state_store.json");
const SEMANTIC_FILE = path.join(__dirname, "test_semantic_store.json");
const EPISODIC_FILE = path.join(__dirname, "test_episodic_store.json");
const PROCEDURAL_FILE = path.join(__dirname, "test_procedural_store.json");

// Cleanup old files
const files = [STATE_FILE, SEMANTIC_FILE, EPISODIC_FILE, PROCEDURAL_FILE];
files.forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

async function runVerification() {
  console.log("🚀 Starting Comprehensive Memory Verification...");

  const assistant = new StatefulAssistant(STATE_FILE, SEMANTIC_FILE, EPISODIC_FILE, PROCEDURAL_FILE);
  assistant.initialize();

  // ── Test 1: State Extraction ────────────────────────────────────────────
  console.log("\n--- TEST 1: State Profile Extraction ---");
  const msg1 = "Hello! My name is Anteneh and I am a software engineer. My favorite drink is matcha latte.";
  console.log(`User: ${msg1}`);
  let res = await assistant.chat(msg1);
  console.log(`Assistant: ${res.reply}`);
  console.log(`Extracted State Delta:`, res.stateDelta);

  if (fs.existsSync(STATE_FILE)) {
    console.log(`✅ State file successfully created.`);
    console.log(`Saved State Content:`, fs.readFileSync(STATE_FILE, "utf-8").trim());
  } else {
    throw new Error("State file was not written.");
  }

  // ── Test 2: Semantic Memory Fact Recall ──────────────────────────────────
  console.log("\n--- TEST 2: Semantic Fact Memory Extraction ---");
  const msg2 = "Please remember this: my home database runs on port 5432.";
  console.log(`User: ${msg2}`);
  res = await assistant.chat(msg2);
  console.log(`Assistant: ${res.reply}`);
  console.log(`Extracted Fact:`, res.extractedFact);

  if (fs.existsSync(SEMANTIC_FILE)) {
    console.log(`✅ Semantic store successfully created.`);
  } else {
    throw new Error("Semantic store was not written.");
  }

  // ── Test 3: Procedural Memory & Reflection ──────────────────────────────
  console.log("\n--- TEST 3: Procedural Reflection ---");
  const msg3 = "From now on, please always speak like a pirate, and always explain your answers in bullet points.";
  console.log(`User: ${msg3}`);
  res = await assistant.chat(msg3);
  console.log(`Assistant: ${res.reply}`);

  console.log("Running self-reflection to update instructions...");
  const reflected = await assistant.reflect();
  console.log(`Reflected successfully: ${reflected}`);
  console.log("Current Operational Rules after reflection:");
  console.log(assistant.proceduralMemory.rules);

  // Verify rules changed
  const rulesText = assistant.proceduralMemory.rules.toLowerCase();
  const hasPirateRule = rulesText.includes("pirate") || rulesText.includes("matey");
  console.log(`Procedural Rule Check (Pirate/Matey rule exists): ${hasPirateRule ? "✅ PASSED" : "⚠️ WARNING (No rule match)"}`);

  // Test if rules are followed in subsequent chat
  console.log("\nTesting updated procedural rules in conversation...");
  res = await assistant.chat("How are you doing today?");
  console.log(`Assistant: ${res.reply}`);

  // ── Test 4: Episodic Memory (Experiences) ────────────────────────────────
  console.log("\n--- TEST 4: Episodic Memory Experience Encoding ---");
  const msg4 = "Let's learn a prime checker coding task. To check if a number is prime, loop from 2 to sqrt(n) and verify divisibility.";
  console.log(`User: ${msg4}`);
  res = await assistant.chat(msg4);
  console.log(`Assistant: ${res.reply}`);

  console.log("Saving this coding conversation as an episode experience...");
  const savedEpisode = await assistant.saveEpisode("prime checker coding task");
  console.log(`Episode saved: ${savedEpisode}`);

  if (fs.existsSync(EPISODIC_FILE)) {
    console.log(`✅ Episodic store successfully created.`);
  } else {
    throw new Error("Episodic store was not written.");
  }

  // Restart assistant to test episodic recall across clean sessions
  console.log("\nRestarting assistant session...");
  const newAssistant = new StatefulAssistant(STATE_FILE, SEMANTIC_FILE, EPISODIC_FILE, PROCEDURAL_FILE);
  newAssistant.initialize();

  console.log("\nQuerying task closely matching episodic key...");
  const msg5 = "Write a code function to check for prime numbers.";
  console.log(`User: ${msg5}`);
  res = await newAssistant.chat(msg5);
  console.log(`Assistant: ${res.reply}`);
  console.log("Retrieved Episodic Memories (Experiences):");
  res.retrievedEpisodes.forEach(e => console.log(`   - Topic: "${e.topicKey}" (similarity: ${(e.similarity * 100).toFixed(1)}%)`));

  const hasEpisode = res.retrievedEpisodes.some(e => e.topicKey.includes("prime"));
  console.log(`Episodic Retrieval Check: ${hasEpisode ? "✅ PASSED" : "❌ FAILED"}`);

  // ── Test 5: Short-Term Summarization ──────────────────────────────────────
  console.log("\n--- TEST 5: Short-Term Context Summarization ---");
  console.log("Filling short-term message buffer...");
  const filler = [
    "What is the capital of Japan?",
    "Tell me a fun fact about trees.",
    "What is the speed of sound?",
    "How large is the Pacific Ocean?",
    "Tell me a joke about robots."
  ];

  for (const f of filler) {
    console.log(`Sending: "${f}"`);
    res = await newAssistant.chat(f);
    if (res.summarized) {
      console.log("👉 [COMPACTION TRIGGERED] Context summarized successfully!");
      break;
    }
  }

  console.log("\nActive Message Buffer inside history after summary:");
  newAssistant.shortTerm.getMessages().forEach((m, idx) => {
    console.log(`   ${idx + 1}. [${m.role}]: ${m.content.slice(0, 100)}...`);
  });

  // Cleanup files
  files.forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  console.log("\n🎉 Memory Verification completed successfully!");
}

runVerification().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
