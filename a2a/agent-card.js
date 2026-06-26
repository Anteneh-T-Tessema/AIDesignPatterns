/**
 * AgentCard — Agent Identity & Capability Manifest
 * ==================================================
 *
 * Each agent publishes an AgentCard that advertises:
 *   - Who it is (id, name, description)
 *   - What it can do (skills array)
 *   - What message types it can handle (inputTypes/outputTypes)
 *   - Its version for compatibility checks
 *
 * The MessageBus uses AgentCards for capability-based discovery,
 * allowing the coordinator to find the right agent for each sub-task
 * without hard-coding agent references.
 */

export class AgentCard {
  /**
   * @param {object} config
   * @param {string} config.id          - Unique agent identifier
   * @param {string} config.name        - Human-readable agent name
   * @param {string} config.description - What this agent does
   * @param {string[]} config.skills    - List of capability tags
   * @param {string[]} config.inputTypes  - Message types this agent accepts
   * @param {string[]} config.outputTypes - Message types this agent emits
   * @param {string} [config.version]   - Semantic version string
   */
  constructor({ id, name, description, skills, inputTypes, outputTypes, version = "1.0.0" }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.skills = skills;
    this.inputTypes = inputTypes;
    this.outputTypes = outputTypes;
    this.version = version;
    this.registeredAt = new Date().toISOString();
  }

  /**
   * Checks if this agent supports a given skill.
   * @param {string} skill - The skill to check
   * @returns {boolean}
   */
  matchesSkill(skill) {
    return this.skills.some(
      (s) => s.toLowerCase() === skill.toLowerCase()
    );
  }

  /**
   * Checks if this agent supports any of the given skills.
   * @param {string[]} skills - Skills to match against
   * @returns {boolean}
   */
  matchesAnySkill(skills) {
    return skills.some((skill) => this.matchesSkill(skill));
  }

  /**
   * Checks whether this agent can handle a specific message type.
   * @param {string} messageType
   * @returns {boolean}
   */
  canHandle(messageType) {
    return this.inputTypes.includes(messageType);
  }

  /**
   * Serializes the card for discovery responses and logging.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      skills: this.skills,
      inputTypes: this.inputTypes,
      outputTypes: this.outputTypes,
      version: this.version,
      registeredAt: this.registeredAt,
    };
  }

  /**
   * Compact string representation for console output.
   * @returns {string}
   */
  toString() {
    return `[${this.id}] ${this.name} — skills: [${this.skills.join(", ")}]`;
  }
}
