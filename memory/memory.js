/**
 * Memory Management Services — Short-Term, State, & Semantic Vector Memory
 * =========================================================================
 * 
 * Implements all memory tiers described in Chapter 8:
 * 
 *   1. ShortTermMemory: Conversation buffer with dynamic summarization.
 *   2. StateManager: Structured key-value profile with prefixes (user:, temp:) saved to file.
 *   3. SemanticMemory: Long-term fact store with nomic-embed-text local embeddings.
 *   4. EpisodicMemory: Long-term experience store saving past episodes as few-shot triggers.
 *   5. ProceduralMemory: Long-term rule store holding instructions, refined via Reflection.
 */

import fs from "fs";

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

export function cosineSimilarity(a, b) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// ─── 1. Short-Term Memory ───────────────────────────────────────────────────

export class ShortTermMemory {
  constructor() {
    this.history = []; // Array of { role, content }
  }

  addMessage(role, content) {
    this.history.push({ role, content });
  }

  getMessages() {
    return this.history;
  }

  clear() {
    this.history = [];
  }

  /**
   * Summarizes older messages if history becomes too long.
   * Compacts the buffer by summarizing messages from the start up to N-2,
   * replacing them with a single system recap message.
   */
  async summarizeOlderConversations(ollama, model, thresholdCount = 8) {
    if (this.history.length <= thresholdCount) {
      return false; // No summarization needed
    }

    console.log(`   🧹 [Short-Term Memory] Compacting buffer (${this.history.length} messages)...`);

    // Keep the last 2 messages intact for immediate conversational context
    const messagesToSummarize = this.history.slice(0, this.history.length - 2);
    const messagesToKeep = this.history.slice(this.history.length - 2);

    // Format conversation history for summary prompt
    const chatTranscript = messagesToSummarize
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const summaryPrompt = `
You are an expert conversational context manager.
Analyze the following conversation segment and produce a highly concise bullet-point summary.
Focus strictly on:
1. User profile facts (e.g. name, preferences, job).
2. Direct decisions made or context established (e.g. specific topics discussed, server ports, file targets).
3. Open tasks or questions remaining.

Do not include greetings or general conversational filler.

**Conversation Segment:**
${chatTranscript}

**Concise Recap:**
`.trim();

    try {
      const response = await ollama.chat({
        model: model,
        messages: [{ role: "user", content: summaryPrompt }]
      });

      const summary = response.message.content.trim();

      // Re-initialize history with the summary system message and kept messages
      this.history = [
        {
          role: "system",
          content: `Recap of earlier conversation:\n${summary}`
        },
        ...messagesToKeep
      ];

      console.log("   ✨ [Short-Term Memory] Context successfully compacted. New history length: " + this.history.length);
      return true;
    } catch (e) {
      console.error("   [Short-Term Memory] Summarization failed:", e.message);
      return false;
    }
  }
}

// ─── 2. State Manager ────────────────────────────────────────────────────────

export class StateManager {
  constructor() {
    this.state = {};
  }

  set(key, value) {
    this.state[key] = value;
  }

  get(key, defaultValue = null) {
    return this.state[key] !== undefined ? this.state[key] : defaultValue;
  }

  load(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        this.state = JSON.parse(raw);
      } catch (e) {
        console.warn(`   ⚠️ StateManager failed to load from ${filePath}, starting fresh.`);
        this.state = {};
      }
    } else {
      this.state = {};
    }
  }

  save(filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error(`   ❌ StateManager failed to save to ${filePath}:`, e.message);
    }
  }

  formatForPrompt() {
    const keys = Object.keys(this.state);
    if (keys.length === 0) {
      return "No profile preferences recorded yet.";
    }

    return keys.map(k => `- ${k}: ${JSON.stringify(this.state[k])}`).join("\n");
  }
}

// ─── 3. Semantic Memory (Vector Store - Facts) ──────────────────────────────

export class SemanticMemory {
  constructor() {
    this.memories = []; // Array of { text, embedding }
  }

  load(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        this.memories = JSON.parse(raw);
      } catch (e) {
        console.warn(`   ⚠️ SemanticMemory failed to load from ${filePath}, starting fresh.`);
        this.memories = [];
      }
    } else {
      this.memories = [];
    }
  }

  save(filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.memories, null, 2), "utf-8");
    } catch (e) {
      console.error(`   ❌ SemanticMemory failed to save to ${filePath}:`, e.message);
    }
  }

  /**
   * Generates embedding for text and inserts it into vector store.
   */
  async addMemory(ollama, text) {
    if (this.memories.some(m => m.text.toLowerCase() === text.toLowerCase())) {
      return;
    }

    try {
      const response = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: text
      });

      this.memories.push({
        text,
        embedding: response.embedding
      });
      console.log(`   💾 [Semantic Memory] Saved fact: "${text}"`);
    } catch (e) {
      console.error(`   [Semantic Memory] Embedding generation failed:`, e.message);
    }
  }

  /**
   * Searches memories using cosine similarity against query embedding.
   */
  async search(ollama, query, limit = 3, threshold = 0.5) {
    if (this.memories.length === 0) {
      return [];
    }

    try {
      const response = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: query
      });

      const queryEmbedding = response.embedding;
      const scored = this.memories.map(m => {
        const similarity = cosineSimilarity(queryEmbedding, m.embedding);
        return {
          text: m.text,
          similarity
        };
      });

      const matches = scored
        .filter(m => m.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return matches;
    } catch (e) {
      console.error("   [Semantic Memory] Search failed:", e.message);
      return [];
    }
  }
}

// ─── 4. Episodic Memory (Experiences / Few-Shot Blocks) ──────────────────────

export class EpisodicMemory {
  constructor() {
    this.episodes = []; // Array of { topicKey, transcript, embedding }
  }

  load(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        this.episodes = JSON.parse(raw);
      } catch (e) {
        console.warn(`   ⚠️ EpisodicMemory failed to load from ${filePath}, starting fresh.`);
        this.episodes = [];
      }
    } else {
      this.episodes = [];
    }
  }

  save(filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.episodes, null, 2), "utf-8");
    } catch (e) {
      console.error(`   ❌ EpisodicMemory failed to save to ${filePath}:`, e.message);
    }
  }

  /**
   * Encodes a dialogue block / episode as searchable experience.
   */
  async addEpisode(ollama, topicKey, transcript) {
    try {
      const response = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: topicKey
      });

      this.episodes.push({
        topicKey,
        transcript,
        embedding: response.embedding
      });
      console.log(`   💾 [Episodic Memory] Encoded past experience for topic: "${topicKey}"`);
    } catch (e) {
      console.error(`   [Episodic Memory] Embedding generation failed:`, e.message);
    }
  }

  /**
   * Retrieves closest experience to act as few-shot prompt context.
   */
  async search(ollama, query, limit = 1, threshold = 0.5) {
    if (this.episodes.length === 0) {
      return [];
    }

    try {
      const response = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: query
      });

      const queryEmbedding = response.embedding;
      const scored = this.episodes.map(e => {
        const similarity = cosineSimilarity(queryEmbedding, e.embedding);
        return {
          topicKey: e.topicKey,
          transcript: e.transcript,
          similarity
        };
      });

      const matches = scored
        .filter(e => e.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return matches;
    } catch (e) {
      console.error("   [Episodic Memory] Search failed:", e.message);
      return [];
    }
  }
}

// ─── 5. Procedural Memory (Rules & Self-Reflection) ─────────────────────────

export class ProceduralMemory {
  constructor() {
    this.rules = "";
  }

  load(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        this.rules = JSON.parse(raw).rules || this.getDefaultRules();
      } catch (e) {
        this.rules = this.getDefaultRules();
      }
    } else {
      this.rules = this.getDefaultRules();
    }
  }

  save(filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify({ rules: this.rules }, null, 2), "utf-8");
    } catch (e) {
      console.error(`   ❌ ProceduralMemory failed to save to ${filePath}:`, e.message);
    }
  }

  getDefaultRules() {
    return `
1. Be a friendly, professional, and helpful conversational assistant.
2. Personalize your tone by referencing the user's name if known.
3. Respond concisely and avoid overly verbose or dry explanations.
`.trim();
  }

  /**
   * Reflection Pattern: Analyzes session logs to critique performance and refine core rules.
   */
  async reflectAndUpdateRules(ollama, model, chatHistory) {
    if (!chatHistory || chatHistory.length === 0) {
      return false;
    }

    console.log("   🔄 [Procedural Memory] Reflecting on conversation log to refine system rules...");

    const chatTranscript = chatHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const reflectionPrompt = `
You are the Agent Self-Reflection and Instruction Engine.
Your job is to analyze the recent chat log between the USER and the ASSISTANT and critique the assistant's performance against its current operational rules.

**Current Operational Rules:**
${this.rules}

**Recent Conversation History:**
${chatTranscript}

**Evaluation & Reflection Task:**
1. Did the assistant violate any current rules (e.g. being too verbose, failing to use user preferences)?
2. Did the user declare any new rules, stylistic guidelines, or system operational constraints (e.g. "Always write code in codeblocks", "Answer in bullet points", "Don't use emojis")?
3. Synthesize an updated, refined list of rules. Keep the list formatted as clear, actionable numbered points. Do not lose existing core instructions unless contradicted by the user.

Output ONLY the updated raw list of rules. Do not include any introduction, formatting backticks, or explanation comments.
`.trim();

    try {
      const response = await ollama.chat({
        model: model,
        messages: [{ role: "user", content: reflectionPrompt }]
      });

      const refinedRules = response.message.content.trim();
      this.rules = refinedRules;
      console.log(`   ✨ [Procedural Memory] Rules successfully updated based on reflection!`);
      return true;
    } catch (e) {
      console.error("   [Procedural Memory] Reflection process failed:", e.message);
      return false;
    }
  }
}
