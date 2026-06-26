/**
 * A2A Protocol — Message Envelope & Type Definitions
 * ====================================================
 *
 * Defines the structured message protocol for inter-agent communication.
 * Every message between agents is wrapped in a standardized envelope with:
 *   - Unique ID & timestamp for traceability
 *   - Correlation ID to link responses to their originating requests
 *   - Type-safe message categories (TASK_REQUEST, NEGOTIATE, etc.)
 *   - Typed negotiation statuses (ACCEPT, REJECT, COUNTER)
 */

import { randomUUID } from "crypto";

// ─── Message Types ───────────────────────────────────────────────────────────

export const MessageType = Object.freeze({
  TASK_REQUEST:       "TASK_REQUEST",
  TASK_RESPONSE:      "TASK_RESPONSE",
  NEGOTIATE:          "NEGOTIATE",
  STATUS_UPDATE:      "STATUS_UPDATE",
  DISCOVERY_REQUEST:  "DISCOVERY_REQUEST",
  DISCOVERY_RESPONSE: "DISCOVERY_RESPONSE",
});

// ─── Negotiation Statuses ────────────────────────────────────────────────────

export const NegotiationStatus = Object.freeze({
  ACCEPT:  "ACCEPT",
  REJECT:  "REJECT",
  COUNTER: "COUNTER",
});

// ─── Core Envelope Factory ───────────────────────────────────────────────────

/**
 * Creates a standardized message envelope.
 *
 * @param {string} type         - One of MessageType values
 * @param {string} from         - Sender agent ID
 * @param {string} to           - Recipient agent ID or "broadcast"
 * @param {object} payload      - Type-specific data
 * @param {object} [metadata]   - Optional metadata (priority, ttl, etc.)
 * @param {string} [correlationId] - Links this message to an originating request
 * @returns {object} Complete message envelope
 */
export function createMessage(type, from, to, payload, metadata = {}, correlationId = null) {
  return {
    id: randomUUID(),
    type,
    from,
    to,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
    metadata: {
      priority: "normal",
      ...metadata,
    },
  };
}

// ─── Convenience Factories ───────────────────────────────────────────────────

/**
 * Creates a TASK_REQUEST message.
 * Sent by a coordinator to assign work to a specialist agent.
 */
export function createTaskRequest(from, to, task, context = {}) {
  return createMessage(
    MessageType.TASK_REQUEST,
    from,
    to,
    { task, context },
    { priority: "high" }
  );
}

/**
 * Creates a TASK_RESPONSE message.
 * Sent by a specialist agent after completing assigned work.
 */
export function createTaskResponse(from, to, correlationId, result, status = "completed") {
  return createMessage(
    MessageType.TASK_RESPONSE,
    from,
    to,
    { result, status },
    {},
    correlationId
  );
}

/**
 * Creates a NEGOTIATE message.
 * Sent by an agent to accept, reject, or counter-propose a task.
 */
export function createNegotiation(from, to, correlationId, status, reason = "", counterProposal = null) {
  return createMessage(
    MessageType.NEGOTIATE,
    from,
    to,
    { status, reason, counterProposal },
    {},
    correlationId
  );
}

/**
 * Creates a STATUS_UPDATE message.
 * Sent by an agent to report progress on an in-flight task.
 */
export function createStatusUpdate(from, to, correlationId, progress, details = "") {
  return createMessage(
    MessageType.STATUS_UPDATE,
    from,
    to,
    { progress, details },
    {},
    correlationId
  );
}

/**
 * Creates a DISCOVERY_REQUEST message.
 * Broadcast by a coordinator to find agents with specific skills.
 */
export function createDiscoveryRequest(from, skillQuery) {
  return createMessage(
    MessageType.DISCOVERY_REQUEST,
    from,
    "broadcast",
    { skillQuery }
  );
}

/**
 * Creates a DISCOVERY_RESPONSE message.
 * Sent by agents that match a discovery query.
 */
export function createDiscoveryResponse(from, to, correlationId, agentCard) {
  return createMessage(
    MessageType.DISCOVERY_RESPONSE,
    from,
    to,
    { agentCard },
    {},
    correlationId
  );
}
