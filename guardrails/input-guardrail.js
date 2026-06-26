/**
 * Input Guardrail Pre-Screener
 * ============================
 * 
 * Pre-screens user queries using a fast, deterministic model call with JSON format.
 * If compliant, the request proceeds to the main model.
 * If non-compliant, the input is immediately blocked, saving cost and preventing jailbreaks.
 */

import { Ollama } from "ollama";
import { buildInputGuardrailPrompt } from "./policies.js";

const ollama = new Ollama({ host: "http://localhost:11434" });

// Terminal colors
const C_GUARD = "\x1b[35m"; // Magenta for Guardrail logs
const C_ALERT = "\x1b[31m"; // Red for security violations
const C_RESET = "\x1b[0m";

export class InputGuardrail {
  constructor() {}

  /**
   * Evaluates if user input is compliant with corporate policies.
   * Returns { compliant: boolean, summary: string, triggeredPolicies: string[] }
   */
  async checkInput(userInput) {
    console.log(`\n${C_GUARD}[Input Guardrail] Scanning user prompt...${C_RESET}`);
    
    const systemPrompt = `Output ONLY valid JSON. Your response must match the exact JSON schema provided by the user. Do NOT write preamble, markdown fences, or postamble.`;
    const userPrompt = buildInputGuardrailPrompt(userInput);

    let response;
    let fallbackUsed = false;

    try {
      response = await ollama.chat({
        model: "llama3.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        format: "json",
        options: {
          temperature: 0.0 // Strict deterministic classification
        }
      });
    } catch (err) {
      fallbackUsed = true;
      response = this.getMockClassification(userInput);
    }

    let result;
    try {
      const rawContent = response.message.content.trim();
      const cleanContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch (e) {
      console.log(`${C_ALERT}[Input Guardrail] ❌ JSON Parse error. Safety fail-closed activated! Block query.${C_RESET}`);
      return {
        compliant: false,
        summary: "Internal guardrail parsing error.",
        triggeredPolicies: ["GUARDRAIL_ERROR"]
      };
    }

    const compliant = result.compliance_status === "compliant";
    
    if (compliant) {
      console.log(`   ${C_GUARD}✅ PASS: Input deemed compliant. Proceeding to Primary AI...${C_RESET}`);
    } else {
      console.log(`   ${C_ALERT}❌ BLOCK: Input deemed NON-COMPLIANT!${C_RESET}`);
      console.log(`     ↳ Reason: ${result.evaluation_summary}`);
      console.log(`     ↳ Triggered Policies: ${result.triggered_policies.join(", ")}`);
    }

    return {
      compliant,
      summary: result.evaluation_summary,
      triggeredPolicies: result.triggered_policies || [],
      fallbackUsed
    };
  }

  /**
   * Rule-based local classifier fallback in case Ollama is offline.
   */
  getMockClassification(userInput) {
    const text = userInput.toLowerCase();
    
    let isJailbreak = false;
    let isHazardous = false;
    let isOffDomain = false;
    let isBrandRisk = false;
    const triggered = [];

    // Check jailbreak indicators
    if (text.includes("ignore") || text.includes("instruction") || text.includes("developer mode") || text.includes("system prompt")) {
      isJailbreak = true;
      triggered.push("POLICY_001_JAILBREAK");
    }

    // Check dangerous activities
    if (text.includes("hotwire") || text.includes("car") || text.includes("illegal") || text.includes("drugs") || text.includes("hack")) {
      isHazardous = true;
      triggered.push("POLICY_002_HAZARDOUS");
    }

    // Check domain limits
    if (text.includes("world war") || text.includes("history") || text.includes("battle") || text.includes("france") || text.includes("capital")) {
      isOffDomain = true;
      triggered.push("POLICY_003_OFF_DOMAIN");
    }

    // Check competitive comparison
    if (text.includes("rival") || text.includes("competitor") || text.includes("garbage") || text.includes("leak") || text.includes("product x")) {
      isBrandRisk = true;
      triggered.push("POLICY_004_BRAND_PROTECTION");
    }

    let mockJSON = "";
    if (triggered.length > 0) {
      mockJSON = JSON.stringify({
        compliance_status: "non-compliant",
        evaluation_summary: `Detected violations: ${triggered.join(", ")}.`,
        triggered_policies: triggered
      });
    } else {
      mockJSON = JSON.stringify({
        compliance_status: "compliant",
        evaluation_summary: "No policy triggers identified.",
        triggered_policies: []
      });
    }

    return {
      message: { content: mockJSON }
    };
  }
}
