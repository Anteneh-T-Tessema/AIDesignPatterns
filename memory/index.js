/**
 * CLI Entry Point — Stateful Memory Assistant Chat session
 * 
 * Usage:
 *   node index.js
 */

import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { StatefulAssistant } from "./assistant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, "state_store.json");
const SEMANTIC_FILE = path.join(__dirname, "semantic_store.json");
const EPISODIC_FILE = path.join(__dirname, "episodic_store.json");
const PROCEDURAL_FILE = path.join(__dirname, "procedural_store.json");

const assistant = new StatefulAssistant(STATE_FILE, SEMANTIC_FILE, EPISODIC_FILE, PROCEDURAL_FILE);

async function startChat() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧠  MEMORY MANAGEMENT PATTERN — Stateful Chat Assistant");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Instructions:");
  console.log("    • Type standard messages to chat with the assistant.");
  console.log("    • Type /state           to view persistent profile state.");
  console.log("    • Type /rules           to view operational rules.");
  console.log("    • Type /reflect         to force self-reflection/rule refinement.");
  console.log("    • Type /save-episode <k> to save session history as experience.");
  console.log("    • Type /clear           to wipe current short-term context.");
  console.log("    • Type /exit            to end the session.");
  console.log("═══════════════════════════════════════════════════════════\n");

  assistant.initialize();
  console.log("\n🤖 Assistant is ready! Start chatting...\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question("\nYou: ", async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        promptUser();
        return;
      }

      const lowerInput = trimmedInput.toLowerCase();

      if (lowerInput === "/exit") {
        console.log("\n👋 Exiting session. All memory files saved.");
        rl.close();
        process.exit(0);
      }

      if (lowerInput === "/state") {
        console.log("\n┌─── 📋 Persistent Profile State (Working State) ──────────");
        console.log(assistant.stateManager.formatForPrompt());
        console.log("└───────────────────────────────────────────────────────────");
        promptUser();
        return;
      }

      if (lowerInput === "/rules") {
        console.log("\n┌─── 📜 Current Operational Rules (Procedural Memory) ──────");
        console.log(assistant.proceduralMemory.rules);
        console.log("└───────────────────────────────────────────────────────────");
        promptUser();
        return;
      }

      if (lowerInput === "/reflect") {
        process.stdout.write("🔄 Reflecting on conversation history...");
        const updated = await assistant.reflect();
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        if (updated) {
          console.log("\n✨ Rules refined successfully!");
          console.log("┌─── 📜 Updated Rules ──────────────────────────────────────");
          console.log(assistant.proceduralMemory.rules);
          console.log("└───────────────────────────────────────────────────────────");
        } else {
          console.log("\n⚠️ Reflection skipped (history is empty).");
        }
        promptUser();
        return;
      }

      if (lowerInput.startsWith("/save-episode")) {
        const key = trimmedInput.substring("/save-episode".length).trim();
        if (!key) {
          console.log("❌ Please provide a topic key, e.g. `/save-episode Coding Task`.");
          promptUser();
          return;
        }

        process.stdout.write(`💾 Saving episode as experience: "${key}"...`);
        const saved = await assistant.saveEpisode(key);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        if (saved) {
          console.log(`\n✅ Dialogue episode saved to Episodic Memory under "${key}".`);
        } else {
          console.log("\n❌ Failed to save episode (no history).");
        }
        promptUser();
        return;
      }

      if (lowerInput === "/clear") {
        assistant.shortTerm.clear();
        console.log("\n🧹 Short-term conversation history cleared!");
        promptUser();
        return;
      }

      // Process message
      process.stdout.write("🤖 Thinking...");
      try {
        const result = await assistant.chat(trimmedInput);
        
        // Clear "Thinking..." text
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log(`Assistant: ${result.reply}\n`);

        // ── Show Debug Memory Diagnostics ─────────────────────────────────
        console.log("┌─── 🔍 Memory Diagnostics ─────────────────────────────────");
        
        // Short term recap notification
        if (result.summarized) {
          console.log("  • 🧹 [Short-Term]: Context buffer compacted. Older segments summarized!");
        } else {
          console.log(`  • 🧠 [Short-Term]: Active message buffer: ${assistant.shortTerm.getMessages().length} messages.`);
        }

        // Semantic retrieval recall
        if (result.retrievedFacts.length > 0) {
          console.log("  • 📂 [Semantic Memory (Facts Recall)]:");
          result.retrievedFacts.forEach(m => {
            console.log(`     - "${m.text}" (similarity: ${(m.similarity * 100).toFixed(0)}%)`);
          });
        } else {
          console.log("  • 📂 [Semantic Memory]: No matching semantic facts recalled.");
        }

        // Episodic retrieval recall
        if (result.retrievedEpisodes.length > 0) {
          console.log("  • 🎬 [Episodic Memory (Experience Recall)]:");
          result.retrievedEpisodes.forEach(e => {
            console.log(`     - Topic: "${e.topicKey}" (similarity: ${(e.similarity * 100).toFixed(0)}%)`);
          });
        } else {
          console.log("  • 🎬 [Episodic Memory]: No matching past experiences recalled.");
        }

        // Profile updates
        if (Object.keys(result.stateDelta).length > 0) {
          console.log("  • 📝 [State Profile Delta Extracted]:");
          for (const [k, v] of Object.entries(result.stateDelta)) {
            console.log(`     + ${k}: ${JSON.stringify(v)}`);
          }
        }

        // Long-term facts saved
        if (result.extractedFact) {
          console.log(`  • 💾 [Semantic Memory Fact Stored]: "${result.extractedFact}"`);
        }

        console.log("└───────────────────────────────────────────────────────────");
      } catch (err) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.error("\n❌ Error during conversation:", err.message);
        console.log("💡 Ensure Ollama is running and both llama3.2 and nomic-embed-text are pulled.");
      }

      promptUser();
    });
  };

  promptUser();
}

startChat().catch(err => {
  console.error("❌ Failed to start assistant:", err.message);
  process.exit(1);
});
