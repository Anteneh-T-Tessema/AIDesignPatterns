/**
 * Routing Pattern — Customer Support Router
 * ============================================
 *
 * Demonstrates the ROUTING agentic design pattern:
 *
 *   1. Classifier LLM reads the customer message
 *   2. Classifies it into a category (billing, technical, account, general)
 *   3. Routes to a specialized handler with an optimized prompt
 *   4. The handler generates a tailored response
 *
 *                          ┌─── 💳 Billing Handler
 *                          │
 *   Customer ──▶ 🧠 Router ├─── 🔧 Technical Handler
 *                          │
 *                          ├─── 👤 Account Handler
 *                          │
 *                          └─── 💬 General Handler
 *
 * Usage:
 *   import { routeTicket } from "./router.js";
 *   const result = await routeTicket("I was charged twice for my subscription");
 */

import { Ollama } from "ollama";

const MODEL = "llama3.2";

const ollama = new Ollama({ host: "http://localhost:11434" });

// ─── Route Definitions ─────────────────────────────────────────────────────────

/**
 * Each route has:
 *   - name:        display name
 *   - description: what this route handles (shown to classifier)
 *   - emoji:       visual identifier
 *   - handler:     specialized prompt template
 */
const ROUTES = {
  billing: {
    name: "Billing & Payments",
    emoji: "💳",
    description: "Charges, refunds, invoices, payment methods, pricing, subscription costs, billing errors",
    handler: (message, sentiment, urgency) => `
You are a **billing specialist** at a customer support center. You are friendly, precise, and empathetic about money-related issues.

**Customer Message:** "${message}"
**Detected Sentiment:** ${sentiment}
**Urgency Level:** ${urgency}

Guidelines:
- Always acknowledge the financial concern empathetically
- Reference specific billing policies when relevant
- If a refund may be warranted, explain the process clearly
- Provide exact next steps with timelines
- If you need account info to proceed, ask for it politely
- Never make promises you can't keep about refund amounts

Respond as the billing specialist. Keep the response concise but thorough.
`.trim(),
  },

  technical: {
    name: "Technical Support",
    emoji: "🔧",
    description: "Bugs, errors, crashes, features not working, performance issues, how-to questions, setup help",
    handler: (message, sentiment, urgency) => `
You are a **senior technical support engineer**. You are patient, knowledgeable, and systematic in your troubleshooting approach.

**Customer Message:** "${message}"
**Detected Sentiment:** ${sentiment}
**Urgency Level:** ${urgency}

Guidelines:
- Start by acknowledging the issue
- Ask targeted diagnostic questions if needed
- Provide step-by-step troubleshooting instructions
- If it sounds like a known bug, mention it and provide a workaround
- Suggest escalation to engineering if the issue is complex
- Use clear, non-technical language unless the customer is clearly technical

Respond as the technical support engineer. Be systematic and helpful.
`.trim(),
  },

  account: {
    name: "Account Management",
    emoji: "👤",
    description: "Login issues, password reset, account settings, profile changes, subscription plan changes, cancellation, account access",
    handler: (message, sentiment, urgency) => `
You are an **account management specialist**. You are security-conscious, helpful, and focused on account integrity.

**Customer Message:** "${message}"
**Detected Sentiment:** ${sentiment}
**Urgency Level:** ${urgency}

Guidelines:
- For security-related issues (login, password), verify identity first
- Explain account changes clearly before making them
- For cancellations, understand the reason and offer alternatives if appropriate (but don't be pushy)
- Provide clear instructions for self-service options
- Always confirm the action the customer wants taken
- Be mindful of data privacy regulations

Respond as the account management specialist. Be secure and supportive.
`.trim(),
  },

  general: {
    name: "General Inquiry",
    emoji: "💬",
    description: "General questions, feedback, feature requests, compliments, partnerships, anything that doesn't fit other categories",
    handler: (message, sentiment, urgency) => `
You are a **friendly customer support representative**. You are warm, helpful, and knowledgeable about the company.

**Customer Message:** "${message}"
**Detected Sentiment:** ${sentiment}
**Urgency Level:** ${urgency}

Guidelines:
- Be warm and conversational
- For feature requests, thank them and explain how feedback is used
- For compliments, express genuine gratitude
- For general questions, provide clear and helpful answers
- If the question would be better handled by a specialist, mention that you're connecting them
- Maintain a positive, helpful tone throughout

Respond as the friendly support representative. Be warm and helpful.
`.trim(),
  },
};

// ─── Classifier Prompt ──────────────────────────────────────────────────────────

function buildClassifierPrompt(message) {
  const routeDescriptions = Object.entries(ROUTES)
    .map(([key, route]) => `  - **${key}**: ${route.description}`)
    .join("\n");

  return `
You are a customer support routing classifier. Your ONLY job is to analyze the customer message and output a JSON classification.

**Available Routes:**
${routeDescriptions}

**Customer Message:** "${message}"

Analyze the message and respond with ONLY this JSON (no markdown, no explanation, just the raw JSON):
{
  "route": "<one of: billing, technical, account, general>",
  "confidence": <number between 0.0 and 1.0>,
  "sentiment": "<one of: positive, neutral, frustrated, angry, confused>",
  "urgency": "<one of: low, medium, high, critical>",
  "reasoning": "<one sentence explaining your classification>"
}
`.trim();
}

// ─── Core Functions ─────────────────────────────────────────────────────────────

/**
 * Calls Ollama and returns the response text.
 */
async function callLLM(prompt, label, format = undefined) {
  const startTime = Date.now();

  const options = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  };

  if (format) {
    options.format = format;
  }

  const response = await ollama.chat(options);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱  ${label} completed in ${elapsed}s\n`);

  return response.message.content;
}

/**
 * Parse the classifier's JSON response, with fallback handling.
 */
function parseClassification(raw) {
  try {
    // Try to extract JSON from the response (handles markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate the route exists
      if (!ROUTES[parsed.route]) {
        parsed.route = "general";
      }
      return parsed;
    } else {
      console.log("   ⚠️  No JSON block found in raw response:", JSON.stringify(raw));
    }
  } catch (e) {
    console.log("   ⚠️  JSON parse error:", e.message);
    console.log("   ⚠️  Raw response was:", JSON.stringify(raw));
  }

  return {
    route: "general",
    confidence: 0.5,
    sentiment: "neutral",
    urgency: "medium",
    reasoning: "Could not parse classification, defaulting to general",
  };
}

/**
 * Routes a customer message through the classification → handler pipeline.
 *
 * @param {string} message - The customer's support message
 * @returns {object} - Classification result + handler response
 */
export async function routeTicket(message) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧭  ROUTING PATTERN — Customer Support Router");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Step 1: Classify ──────────────────────────────────────────────────
  console.log("━━━ Step 1: 🏷️  Classifying Ticket ━━━━━━━━━━━━━━━━━━━━━━━");
  const rawClassification = await callLLM(buildClassifierPrompt(message), "Classification", "json");

  const classification = parseClassification(rawClassification);
  const route = ROUTES[classification.route];

  console.log(`   Route:      ${route.emoji}  ${route.name}`);
  console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
  console.log(`   Sentiment:  ${classification.sentiment}`);
  console.log(`   Urgency:    ${classification.urgency}`);
  console.log(`   Reasoning:  ${classification.reasoning}`);
  console.log("");

  // ── Step 2: Route to Handler ──────────────────────────────────────────
  console.log(
    `━━━ Step 2: ${route.emoji}  Routing to ${route.name} Handler ━━━━━━━━━`
  );
  const handlerPrompt = route.handler(
    message,
    classification.sentiment,
    classification.urgency
  );
  const response = await callLLM(handlerPrompt, `${route.name} Handler`);

  console.log(response);
  console.log("\n");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ✅  Ticket routed and handled!");
  console.log("═══════════════════════════════════════════════════════════\n");

  return { classification, response };
}

/**
 * Returns the available route names for display.
 */
export function getRoutes() {
  return Object.entries(ROUTES).map(([key, route]) => ({
    key,
    name: route.name,
    emoji: route.emoji,
    description: route.description,
  }));
}
