/**
 * RAG System Core Logic
 * =====================
 * 
 * Implements:
 * 1. Document Chunking: Splits policy files into paragraphs.
 * 2. Semantic Embedding: Generates vectors using local `nomic-embed-text`.
 * 3. Cosine Similarity: Computes semantic distance natively in JS.
 * 4. Keyword Fallback: Resilient lexical matching if vector APIs are offline.
 * 5. Augmented Generation: Injects retrieved chunks into Llama 3.2 with citation mandates.
 */

import fs from "fs";
import path from "path";
import ollama from "ollama";

const MODEL = "llama3.2";
const EMBED_MODEL = "nomic-embed-text";
const DB_FILE = "vector-store.json";

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const docsDir = path.join(currentDir, "docs");
const dbPath = path.join(currentDir, DB_FILE);

let vectorDb = []; // Array of { text, source, embedding }

// ─── Math Helpers ────────────────────────────────────────────────────────────

function dotProduct(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function magnitude(a) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// ─── Lexical Fallback Helper ──────────────────────────────────────────────────

/**
 * Computes a basic word overlap score between a query and a document chunk.
 * Acts as a fallback if the vector embedding server is unreachable.
 */
function lexicalKeywordScore(queryText, chunkText) {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "what", "how", "why",
    "do", "does", "did", "is", "are", "was", "were", "to", "for", "in", "on", "at",
    "of", "by", "with", "about", "for", "any", "some", "my", "your", "their", "our", "you", "i"
  ]);

  const clean = text => text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  const queryWords = clean(queryText);
  const chunkWords = new Set(clean(chunkText));

  if (queryWords.length === 0) return 0;

  let matches = 0;
  for (const word of queryWords) {
    if (chunkWords.has(word)) {
      matches++;
    }
  }

  // Jaccard-like keyword overlap coefficient
  return matches / queryWords.length;
}

// ─── Ingestion Pipeline ───────────────────────────────────────────────────────

/**
 * Loads documents from docs/, splits them into paragraph chunks,
 * generates vector embeddings, and writes the DB file.
 */
export async function ingestDocuments() {
  console.log("\n📦 Starting Ingestion Pipeline...");
  console.log(`   📂 Document folder: ${docsDir}`);

  if (!fs.existsSync(docsDir)) {
    throw new Error(`Documents folder not found at: ${docsDir}`);
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".txt"));
  if (files.length === 0) {
    throw new Error("No policy text files (.txt) found in docs/ directory.");
  }

  const chunks = [];

  for (const file of files) {
    console.log(`   📄 Reading ${file}...`);
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Chunking: Split by double newline (paragraphs) and filter empty strings
    const fileParagraphs = content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    for (const paragraph of fileParagraphs) {
      chunks.push({
        text: paragraph,
        source: file
      });
    }
  }

  console.log(`   ✂️  Split policies into ${chunks.length} total paragraphs.`);
  console.log(`   🧬 Generating vector embeddings using Ollama: "${EMBED_MODEL}"...`);

  const embeddedChunks = [];
  let count = 0;

  for (const chunk of chunks) {
    count++;
    try {
      const response = await ollama.embeddings({
        model: EMBED_MODEL,
        prompt: chunk.text
      });
      
      embeddedChunks.push({
        text: chunk.text,
        source: chunk.source,
        embedding: response.embedding
      });

      process.stdout.write(`      Embedding progress: ${count}/${chunks.length}\r`);
    } catch (err) {
      console.log(`\n      ⚠️  Failed to embed chunk in ${chunk.source}: "${err.message}"`);
      // Fail fast if the embedding service is totally down during initial setup
      throw new Error(`Embedding generation aborted. Please ensure Ollama is running and "${EMBED_MODEL}" is pulled.`);
    }
  }
  console.log(`\n   ✅ Embedded all chunks successfully.`);

  fs.writeFileSync(dbPath, JSON.stringify(embeddedChunks, null, 2), "utf-8");
  console.log(`   💾 Vector database persisted to: ${dbPath}\n`);

  vectorDb = embeddedChunks;
}

/**
 * Loads the vector store from vector-store.json or triggers ingestion.
 */
export async function initRAGStore() {
  if (fs.existsSync(dbPath)) {
    console.log(`💾 Loading vector store from: ${dbPath}`);
    const data = fs.readFileSync(dbPath, "utf-8");
    vectorDb = JSON.parse(data);
    console.log(`   Loaded ${vectorDb.length} embedded chunks.`);
  } else {
    console.log(`⚠️  No vector store file found.`);
    await ingestDocuments();
  }
}

// ─── Retrieval Pipeline ───────────────────────────────────────────────────────

/**
 * Searches the database using Cosine Similarity or Keyword Fallback.
 * Returns the top 3 matching chunks.
 */
export async function retrieveContext(queryText) {
  if (vectorDb.length === 0) {
    await initRAGStore();
  }

  try {
    // Attempt Semantic Retrieval
    const response = await ollama.embeddings({
      model: EMBED_MODEL,
      prompt: queryText
    });
    const queryVector = response.embedding;

    console.log("🔍 [Retrieval Mode] Semantic Cosine-Similarity Search Active.");

    const results = vectorDb.map(chunk => {
      const sim = cosineSimilarity(queryVector, chunk.embedding);
      return {
        text: chunk.text,
        source: chunk.source,
        score: sim,
        method: "semantic"
      };
    });

    // Sort descending by score and get top 3
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);

  } catch (err) {
    // Resilient Recovery Fallback: Lexical Keyword Matching
    console.log(`⚠️  [Retrieval Warning] Semantic lookup failed: "${err.message}"`);
    console.log(`   🛡️  Recovery Policy Active: Falling back to Lexical Keyword Match (No Embeddings)...`);

    const results = vectorDb.map(chunk => {
      const score = lexicalKeywordScore(queryText, chunk.text);
      return {
        text: chunk.text,
        source: chunk.source,
        score: score,
        method: "lexical"
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);
  }
}

// ─── Generation Pipeline ─────────────────────────────────────────────────────

/**
 * Assembles the context, prints diagnostic information, and answers Q&A.
 */
export async function answerQuery(queryText) {
  console.log(`\n❓ Query: "${queryText}"`);
  console.log("--------------------------------------------------------------------------------");

  const retrieved = await retrieveContext(queryText);

  console.log("\n📥 [Retrieved Context Chunks]:");
  retrieved.forEach((match, i) => {
    const preview = match.text.length > 90 ? match.text.slice(0, 90) + "..." : match.text;
    const scoreFormatted = (match.method === "semantic") 
      ? `Cosine Sim: ${match.score.toFixed(4)}` 
      : `Keyword Score: ${match.score.toFixed(4)}`;
    console.log(`   ${i + 1}. [${match.source}] (${scoreFormatted})`);
    console.log(`      "${preview}"\n`);
  });

  // Build the prompt context
  const contextString = retrieved
    .map(match => `[Source: ${match.source}]\n${match.text}`)
    .join("\n\n---\n\n");

  const augmentedPrompt = `You are a helpful customer support representative.
Answer the user's query using strictly the retrieved document context below.
If the answer cannot be found in the provided context, state politely that you cannot answer the query using the store policies. Do NOT use outside knowledge or hallucinate facts.

For any fact you assert, you MUST append a citation specifying the source document filename (e.g. [refund-policy.txt]) in square brackets at the end of the sentence.

Retrieved Policy Context:
---
${contextString}
---

User Query: "${queryText}"

Support Answer:`;

  console.log("🧠 Querying Llama 3.2 for cited answer...");
  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: augmentedPrompt }]
  });

  const answer = response.message.content.trim();
  console.log("\n================================================================================");
  console.log("📝 CITED RESPONSE");
  console.log("================================================================================");
  console.log(answer);
  console.log("================================================================================\n");

  return { answer, retrieved };
}
