/**
 * CLI Entry Point — Knowledge Retrieval (RAG)
 * ============================================
 * 
 * Usage:
 *   npm start
 */

import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { initRAGStore, ingestDocuments, answerQuery } from "./rag-system.js";

async function main() {
  console.log("================================================================================");
  console.log("  🔍  KNOWLEDGE RETRIEVAL (RAG) PATTERN — POLICY SUPPORT AGENT");
  console.log("================================================================================");
  console.log("Demonstrates semantic document search, lexical search fallback, and context-");
  console.log("injected generation with file-level citations using Llama 3.2.");
  console.log("================================================================================");

  // Initialize store (or ingest if first time)
  try {
    await initRAGStore();
  } catch (err) {
    console.error("❌ Initialization Failed:", err.message);
    console.log("💡 Make sure Ollama is running and Llama 3.2 + nomic-embed-text are pulled.");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  console.log("\n💡 Sample questions you can try asking:");
  console.log("   - 'How long do refund reviews take?'");
  console.log("   - 'Do you ship to Europe and how much does it cost?'");
  console.log("   - 'What is the response SLA for Tier 1 support?'");
  console.log("   - 'What is the phone hotline for security breach escalations?'");
  console.log("\nSpecial Commands:");
  console.log("   /reingest  - Force re-chunking and embedding of the docs/");
  console.log("   /exit      - Close the chat session\n");

  let running = true;
  while (running) {
    const query = await rl.question("\n🙋 Ask a question: ");
    const trimmed = query.trim();

    if (trimmed === "") continue;

    if (trimmed === "/exit") {
      console.log("\nClosing support session. Good bye!");
      running = false;
      continue;
    }

    if (trimmed === "/reingest") {
      try {
        await ingestDocuments();
      } catch (err) {
        console.error("❌ Re-ingestion failed:", err.message);
      }
      continue;
    }

    try {
      await answerQuery(trimmed);
    } catch (err) {
      console.error("❌ Error processing query:", err.message);
    }
  }

  rl.close();
}

main().catch(err => {
  console.error("❌ Critical Application Error:", err);
  process.exit(1);
});
