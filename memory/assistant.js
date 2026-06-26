/**
 * Stateful Assistant — Integrates Five-Tier Memory Loop
 * =======================================================
 * 
 * Manages the interaction lifecycle:
 * 1. Semantic search for past facts (Semantic Memory).
 * 2. Search for relevant past dialog episodes (Episodic Memory / Few-Shot).
 * 3. Retrieval of operational rules (Procedural Memory).
 * 4. Condensation check of short-term chat context (Short-Term Memory).
 * 5. Prompt construction, LLM chat call.
 * 6. Profile extraction & durable fact encoding.
 */

import { Ollama } from "ollama";
import { 
  ShortTermMemory, 
  StateManager, 
  SemanticMemory, 
  EpisodicMemory, 
  ProceduralMemory 
} from "./memory.js";

const MODEL = "llama3.2";
const ollama = new Ollama({ host: "http://localhost:11434" });

export class StatefulAssistant {
  constructor(stateFilePath, semanticFilePath, episodicFilePath, proceduralFilePath) {
    this.stateFilePath = stateFilePath;
    this.semanticFilePath = semanticFilePath;
    this.episodicFilePath = episodicFilePath;
    this.proceduralFilePath = proceduralFilePath;

    this.shortTerm = new ShortTermMemory();
    this.stateManager = new StateManager();
    this.semanticMemory = new SemanticMemory();
    this.episodicMemory = new EpisodicMemory();
    this.proceduralMemory = new ProceduralMemory();
  }

  initialize() {
    this.stateManager.load(this.stateFilePath);
    this.semanticMemory.load(this.semanticFilePath);
    this.episodicMemory.load(this.episodicFilePath);
    this.proceduralMemory.load(this.proceduralFilePath);
    console.log("   💾 [Memory System] Initialized all memory stores from disk.");
  }

  async chat(userInput) {
    let stateDelta = {};
    let extractedFact = null;
    let summarized = false;

    // ── 1. Long-Term Semantic Retrieval (Facts) ────────────────────────────
    const retrievedFacts = await this.semanticMemory.search(ollama, userInput, 3, 0.55);
    const semanticContext = retrievedFacts.length > 0
      ? retrievedFacts.map(m => `- Fact: "${m.text}" (relevance: ${(m.similarity * 100).toFixed(0)}%)`).join("\n")
      : "No matching past memories retrieved.";

    // ── 2. Long-Term Episodic Retrieval (Experiences / Few-Shot) ───────────
    const retrievedEpisodes = await this.episodicMemory.search(ollama, userInput, 1, 0.55);
    const episodicContext = retrievedEpisodes.length > 0
      ? retrievedEpisodes.map(e => `
[SIMILAR PAST DIALOGUE EXAMPLE (Topic: "${e.topicKey}", similarity: ${(e.similarity * 100).toFixed(0)}%)]
${e.transcript}
`).join("\n")
      : "No matching past experiences/few-shots retrieved.";

    // ── 3. Short-Term Summarization Check ──────────────────────────────────
    summarized = await this.shortTerm.summarizeOlderConversations(ollama, MODEL, 8);

    // ── 4. Retrieve Procedural Rules ───────────────────────────────────────
    const proceduralRules = this.proceduralMemory.rules;
    const stateProfile = this.stateManager.formatForPrompt();

    // ── 5. Assemble Context-Enriched Prompt ────────────────────────────────
    const systemPrompt = `
You are a highly capable stateful conversational assistant.
Your goal is to converse with the user, personalizing your responses based on your current operational rules, profile state, past facts, and dialogue examples.

**Instructions:**
- Review the core operational rules carefully and adhere to them strictly.
- Incorporate current profile state details and retrieved facts naturally if relevant.
- Do not mention that you are retrieving context or rules unless asked.

[CORE OPERATIONAL RULES (Procedural Memory)]
${proceduralRules}

[CURRENT USER PROFILE STATE (State Manager)]
${stateProfile}

[RELEVANT RETRIEVED PAST FACTS (Semantic Memory)]
${semanticContext}

[RELEVANT PAST DIALOGUE EXAMPLE (Episodic Memory / Few-Shot)]
${episodicContext}
`.trim();

    // Append user input
    this.shortTerm.addMessage("user", userInput);

    // Build standard messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...this.shortTerm.getMessages()
    ];

    const chatResponse = await ollama.chat({
      model: MODEL,
      messages
    });

    const reply = chatResponse.message.content;
    this.shortTerm.addMessage("assistant", reply);

    // ── 6. Extract State Profile Deltas ────────────────────────────────────
    const stateExtractionPrompt = `
You are a profile analysis engine.
Analyze the latest exchange and extract any persistent user details (e.g. name, location, favorite things, preferences).
Use the 'user:' prefix for keys representing stable facts (e.g. 'user:name', 'user:coffee_preference').

**Current Profile State:**
${stateProfile}

**Latest Exchange:**
USER: "${userInput}"
ASSISTANT: "${reply}"

Respond with ONLY a JSON object representing the state updates/deltas. Do not format as markdown. If no updates are detected, respond with ONLY {}.
`.trim();

    try {
      const stateUpdateResponse = await ollama.chat({
        model: MODEL,
        messages: [{ role: "user", content: stateExtractionPrompt }],
        format: "json"
      });

      const rawJSON = stateUpdateResponse.message.content;
      const jsonMatch = rawJSON.match(/\{[\s\S]*\}/);
      stateDelta = JSON.parse(jsonMatch ? jsonMatch[0] : rawJSON);

      for (const [k, v] of Object.entries(stateDelta)) {
        this.stateManager.set(k, v);
      }

      if (Object.keys(stateDelta).length > 0) {
        this.stateManager.save(this.stateFilePath);
      }
    } catch (e) {
      console.warn("   [StateManager] Skipping state profile extraction due to parsing error.");
    }

    // ── 7. Extract Durable Long-Term Facts ──────────────────────────────────
    const factExtractionPrompt = `
You are a facts extractor.
Analyze the user statement and determine if they are declaring a long-term fact they want remembered for the future.
Examples: "Remember that my server runs on port 8080", "My dog's name is Rex", "I am studying design engineering".

**User Input:** "${userInput}"

If they stated a durable fact, extract it as a clear, standalone, fact-based statement (e.g. "The user's server port is 8080").
If they did not state any durable facts to remember, respond with ONLY: NONE.
`.trim();

    try {
      const factResponse = await ollama.chat({
        model: MODEL,
        messages: [{ role: "user", content: factExtractionPrompt }]
      });

      const extracted = factResponse.message.content.trim();
      if (extracted.toUpperCase() !== "NONE" && extracted !== "" && !extracted.includes("NONE")) {
        extractedFact = extracted;
        await this.semanticMemory.addMemory(ollama, extractedFact);
        this.semanticMemory.save(this.semanticFilePath);
      }
    } catch (e) {
      console.warn("   [SemanticMemory] Skipping fact extraction due to model error.");
    }

    return {
      reply,
      retrievedFacts,
      retrievedEpisodes,
      stateDelta,
      extractedFact,
      summarized
    };
  }

  /**
   * Refinement Process: Triggers LLM reflection to update procedural operational rules.
   */
  async reflect() {
    const history = this.shortTerm.getMessages();
    const updated = await this.proceduralMemory.reflectAndUpdateRules(ollama, MODEL, history);
    if (updated) {
      this.proceduralMemory.save(this.proceduralFilePath);
    }
    return updated;
  }

  /**
   * Encodes current active context dialogue thread as an episodic memory.
   */
  async saveEpisode(topicKey) {
    const history = this.shortTerm.getMessages();
    if (history.length === 0) return false;

    const transcript = history
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    await this.episodicMemory.addEpisode(ollama, topicKey, transcript);
    this.episodicMemory.save(this.episodicFilePath);
    return true;
  }
}
