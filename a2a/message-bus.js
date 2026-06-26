/**
 * MessageBus — Central Hub for Inter-Agent Communication
 * =======================================================
 *
 * The MessageBus is the backbone of the A2A pattern:
 *
 *   ┌──────────┐     ┌────────────────┐     ┌──────────┐
 *   │ Agent A  │────▶│  Message Bus   │────▶│ Agent B  │
 *   └──────────┘     │  ┌──────────┐  │     └──────────┘
 *                    │  │ Registry │  │
 *   ┌──────────┐     │  │ Router   │  │     ┌──────────┐
 *   │ Agent C  │◀───│  │ Audit    │  │────▶│ Agent D  │
 *   └──────────┘     │  └──────────┘  │     └──────────┘
 *                    └────────────────┘
 *
 * Responsibilities:
 *   1. Registry   — Agents register their AgentCard + handler function
 *   2. Discovery  — Find agents by skill or capability
 *   3. Routing    — Deliver messages to specific agents or broadcast
 *   4. Audit Log  — Record every message for observability
 */

import { EventEmitter } from "events";

export class MessageBus extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, { card: import('./agent-card.js').AgentCard, handler: Function }>} */
    this._agents = new Map();
    /** @type {Array<object>} */
    this._messageLog = [];
  }

  // ─── Registry ────────────────────────────────────────────────────────────

  /**
   * Registers an agent on the bus.
   * @param {import('./agent-card.js').AgentCard} card - The agent's capability card
   * @param {Function} handler - Async function(message) that processes incoming messages
   */
  register(card, handler) {
    if (this._agents.has(card.id)) {
      throw new Error(`Agent "${card.id}" is already registered on the bus.`);
    }
    this._agents.set(card.id, { card, handler });
    this.emit("agent:registered", card);
  }

  /**
   * Removes an agent from the bus.
   * @param {string} agentId
   */
  unregister(agentId) {
    const entry = this._agents.get(agentId);
    if (entry) {
      this._agents.delete(agentId);
      this.emit("agent:unregistered", entry.card);
    }
  }

  /**
   * Returns all registered agent cards.
   * @returns {import('./agent-card.js').AgentCard[]}
   */
  getRegisteredAgents() {
    return Array.from(this._agents.values()).map((e) => e.card);
  }

  // ─── Discovery ───────────────────────────────────────────────────────────

  /**
   * Discovers agents that match a given skill.
   * @param {string} skill - The skill to search for
   * @returns {import('./agent-card.js').AgentCard[]}
   */
  discover(skill) {
    const matches = [];
    for (const { card } of this._agents.values()) {
      if (card.matchesSkill(skill)) {
        matches.push(card);
      }
    }
    return matches;
  }

  /**
   * Discovers agents matching any of the given skills.
   * @param {string[]} skills
   * @returns {import('./agent-card.js').AgentCard[]}
   */
  discoverAny(skills) {
    const matches = [];
    for (const { card } of this._agents.values()) {
      if (card.matchesAnySkill(skills)) {
        matches.push(card);
      }
    }
    return matches;
  }

  // ─── Message Routing ─────────────────────────────────────────────────────

  /**
   * Sends a message to a specific agent by ID.
   * @param {object} message - A2A protocol message envelope
   * @returns {Promise<object|null>} The handler's response, if any
   */
  async send(message) {
    this._log(message);
    this.emit("message:sent", message);

    const target = this._agents.get(message.to);
    if (!target) {
      const error = `No agent registered with ID "${message.to}"`;
      this.emit("message:undeliverable", { message, error });
      console.error(`   ❌ Bus: ${error}`);
      return null;
    }

    try {
      const response = await target.handler(message);
      if (response) {
        this._log(response);
        this.emit("message:response", response);
      }
      return response;
    } catch (err) {
      console.error(`   ❌ Bus: Handler error for "${message.to}": ${err.message}`);
      this.emit("message:error", { message, error: err });
      return null;
    }
  }

  /**
   * Broadcasts a message to all registered agents.
   * @param {object} message - A2A protocol message envelope
   * @returns {Promise<object[]>} Array of responses from all agents
   */
  async broadcast(message) {
    this._log(message);
    this.emit("message:broadcast", message);

    const responses = [];
    for (const [agentId, { handler }] of this._agents) {
      if (agentId === message.from) continue; // Don't send to self
      try {
        const localMsg = { ...message, to: agentId };
        const response = await handler(localMsg);
        if (response) {
          this._log(response);
          responses.push(response);
        }
      } catch (err) {
        console.error(`   ⚠️  Bus: Broadcast handler error for "${agentId}": ${err.message}`);
      }
    }
    return responses;
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────

  /**
   * Records a message in the audit log.
   * @param {object} message
   */
  _log(message) {
    this._messageLog.push({
      ...message,
      _loggedAt: new Date().toISOString(),
    });
  }

  /**
   * Returns the full audit trail of all messages.
   * @returns {object[]}
   */
  getMessageLog() {
    return [...this._messageLog];
  }

  /**
   * Returns messages filtered by correlation ID (conversation thread).
   * @param {string} correlationId
   * @returns {object[]}
   */
  getThread(correlationId) {
    return this._messageLog.filter(
      (m) => m.id === correlationId || m.correlationId === correlationId
    );
  }

  /**
   * Prints a formatted summary of the message log.
   */
  printAuditTrail() {
    console.log("\n📋 ─── Message Bus Audit Trail ────────────────────────────");
    console.log(`   Total messages: ${this._messageLog.length}\n`);

    for (const msg of this._messageLog) {
      const dir = msg.to === "broadcast" ? "→ ALL" : `→ ${msg.to}`;
      const corr = msg.correlationId ? ` (re: ${msg.correlationId.slice(0, 8)}…)` : "";
      console.log(`   [${msg.type}] ${msg.from} ${dir}${corr}`);
      if (msg.payload?.status) {
        console.log(`      Status: ${msg.payload.status}`);
      }
      if (msg.payload?.reason) {
        console.log(`      Reason: ${msg.payload.reason}`);
      }
    }
    console.log("──────────────────────────────────────────────────────────\n");
  }
}
