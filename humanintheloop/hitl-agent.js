/**
 * Human-in-the-Loop Agent Logic
 * ==============================
 * 
 * Implements:
 * 1. Sentiment & Risk Classification (Ollama JSON schema matching).
 * 2. High-Risk Escalation: Halting autonomous flow to request human strategic direction.
 * 3. Human Oversight Loop: Approve, Reject with Feedback (Redraft), or Edit directly.
 * 4. Interactive Command-Line Prompts.
 */

import ollama from "ollama";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const MODEL = "llama3.2";

/**
 * Helper to prompt the user in the CLI.
 */
export async function promptUser(questionText) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(questionText);
    return answer.trim();
  } finally {
    rl.close();
  }
}

/**
 * Classifies the support ticket for sentiment and risk.
 */
export async function classifyRiskAndSentiment(ticketText) {
  const prompt = `Analyze the following customer support ticket and classify it.
Output strictly JSON matching this schema:
{
  "sentiment": "happy" | "neutral" | "angry" | "frustrated",
  "urgency": "low" | "medium" | "high",
  "riskLevel": "low" | "high",
  "reason": "short explanation of classification"
}

Rule: Classify riskLevel as "high" if the user mentions refunding, cancelling, legal actions, sue, or exhibits high frustration/anger. Otherwise, "low".

Customer ticket: "${ticketText}"`;

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    format: "json"
  });

  try {
    return JSON.parse(response.message.content);
  } catch (err) {
    console.error("⚠️ Failed to parse classification JSON:", response.message.content);
    return {
      sentiment: "neutral",
      urgency: "medium",
      riskLevel: "low",
      reason: "Parse error fallback."
    };
  }
}

/**
 * Generates email draft response, incorporating strategy and feedback history.
 */
export async function draftSupportResponse(ticketText, strategy, feedbackHistory = []) {
  let feedbackPrompt = "";
  if (feedbackHistory.length > 0) {
    feedbackPrompt = `\nCRITICAL: The human supervisor has rejected previous drafts with this feedback:\n` +
      feedbackHistory.map((fb, i) => `- Feedback #${i + 1}: "${fb}"`).join("\n") +
      `\nPlease rewrite the draft, correcting all issues mentioned in the feedback.`;
  }

  const prompt = `You are a professional customer support specialist.
Draft a polite response email to the customer support ticket.

Customer Support Ticket: "${ticketText}"
Response Strategy Guide: "${strategy}"
${feedbackPrompt}

Guidelines:
- Start with a polite greeting and end with a professional closing.
- Be concise, clear, and empathetic.
- Directly resolve the customer's issue using the specified strategy.
- Do NOT output placeholder tokens (like [Your Name], [Name], or [Date]). Sign off as "Customer Operations Team".
- Write only the body of the email. Do not include subject lines.

Draft support response:`;

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  });

  return response.message.content.trim();
}

/**
 * Main Workflow Coordinator
 */
export async function runHITLWorkflow(ticket) {
  console.log(`\n===========================================================`);
  console.log(`📬 INCOMING SUPPORT TICKET`);
  console.log(`   Customer: ${ticket.customerName} (${ticket.customerId})`);
  console.log(`===========================================================`);
  console.log(`"${ticket.text}"`);
  console.log(`===========================================================\n`);

  console.log("🔍 Analyzing sentiment, urgency, and safety risk...");
  const classification = await classifyRiskAndSentiment(ticket.text);
  console.log(`   📊 Sentiment: ${classification.sentiment.toUpperCase()}`);
  console.log(`   🚨 Urgency: ${classification.urgency.toUpperCase()}`);
  console.log(`   🛡️  Risk Level: ${classification.riskLevel.toUpperCase()}`);
  console.log(`   💡 Reason: ${classification.reason}\n`);

  let strategy = "Standard polite help support";

  // 1. Escalation Policy Check
  if (classification.riskLevel === "high" || classification.urgency === "high") {
    console.log("🚨 [Escalation Policy Triggered] High-risk scenario detected.");
    console.log("   Full autonomy halted. Human guidance required to select response strategy.");
    console.log("\nSelect strategy to guide response generation:");
    console.log("  1. Offer full refund + 10% coupon");
    console.log("  2. Escalate directly to Billing Operations Manager (manager email follow-up)");
    console.log("  3. Standard polite apology and request 24 hours for audit");
    console.log("  4. Custom strategy (type your own guidance)");
    
    let choice = "";
    while (!["1", "2", "3", "4"].includes(choice)) {
      choice = await promptUser("\nStrategy Choice (1-4): ");
    }

    if (choice === "1") {
      strategy = "Acknowledge the mistake, issue a full refund, and offer a 10% discount code as goodwill.";
    } else if (choice === "2") {
      strategy = "Apologize, state that the issue has been escalated to Billing Manager, and state that we will follow up via email within 4 hours.";
    } else if (choice === "3") {
      strategy = "Apologize for the billing inconvenience, explain that we are auditing their invoice, and ask them to check back in 24 hours.";
    } else if (choice === "4") {
      const customStr = await promptUser("Enter custom strategy details: ");
      strategy = `Custom strategy instructions: ${customStr}`;
    }
    
    console.log(`\n✅ Strategy selected: "${strategy}"`);
  } else {
    console.log("🟢 [Low Risk] Proceeding with autonomous draft. Directing to human validation...");
  }

  // 2. Oversight and Feedback Loop
  const feedbackHistory = [];
  let isApproved = false;
  let finalEmail = "";

  while (!isApproved) {
    console.log("\n✍️  Generating response email draft...");
    const draft = await draftSupportResponse(ticket.text, strategy, feedbackHistory);

    console.log("\n===========================================================");
    console.log("📧 DRAFT RESPONSE FOR VALIDATION");
    console.log("===========================================================");
    console.log(draft);
    console.log("===========================================================\n");

    console.log("Human Oversight - Choose Action:");
    console.log("  [A]pprove and send email");
    console.log("  [R]eject and provide feedback for refinement");
    console.log("  [E]dit draft directly");
    
    let action = "";
    while (!["a", "r", "e"].includes(action)) {
      const ans = await promptUser("Selection [a/r/e]: ");
      action = ans.toLowerCase();
    }

    if (action === "a") {
      isApproved = true;
      finalEmail = draft;
      console.log("\n✅ [Approved] Dispatching email...");
    } else if (action === "r") {
      const feedback = await promptUser("\nEnter revision feedback: ");
      feedbackHistory.push(feedback);
      console.log(`\n📥 Feedback recorded: "${feedback}". Generating new draft...`);
    } else if (action === "e") {
      console.log("\nEnter/paste your edited version below (Press Enter to confirm):");
      finalEmail = await promptUser("> ");
      isApproved = true;
      console.log("\n✅ [Manual Override Approved] Dispatching edited version...");
    }
  }

  console.log("\n===========================================================");
  console.log("📤 RESPONSE EMAIL DISPATCHED SUCCESSFULLY");
  console.log("===========================================================");
  console.log(finalEmail);
  console.log("===========================================================\n");

  return finalEmail;
}
