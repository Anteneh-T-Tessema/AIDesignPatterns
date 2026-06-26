/**
 * CLI Entry Point — Human-in-the-Loop Pattern
 * ============================================
 * 
 * Demonstrates the HUMAN-IN-THE-LOOP agentic design pattern.
 * 
 * Usage:
 *   npm start
 */

import { runHITLWorkflow, promptUser } from "./hitl-agent.js";

const TICKETS = {
  1: {
    customerId: "CUST-101",
    customerName: "Sarah Connor",
    text: "Hi, CUST-101 here. I see a charge of $150.00 on my invoice. Could you please send me a detailed breakdown or confirmation email of what this charge covers? Thanks."
  },
  2: {
    customerId: "CUST-999",
    customerName: "John Doe",
    text: "I am extremely angry! You charged me $4,500.00 for my account CUST-999 without my approval! This is fraud! If you don't cancel my subscription and refund my money immediately, I am going to report this to my credit card company and take legal action!"
  }
};

async function main() {
  console.log("================================================================================");
  console.log("  👥  HUMAN-IN-THE-LOOP PATTERN — SUPPORT CO-PILOT AGENT");
  console.log("================================================================================");
  console.log("Demonstrates human oversight validation (Approve/Edit/Feedback loops) and ");
  console.log("escalation policy strategy reviews for high-risk tickets.");
  console.log("================================================================================");

  let running = true;
  while (running) {
    console.log("\nAvailable Support Queue Tickets:");
    console.log("  1. CUST-101 (Sarah Connor) — Simple billing breakdown inquiry [Low Risk]");
    console.log("  2. CUST-999 (John Doe) — Angry charge dispute & legal/cancel threat [High Risk]");
    console.log("  3. Exit Demo");

    const choice = await promptUser("\nSelect ticket to process (1-3): ");

    if (choice === "1" || choice === "2") {
      const ticket = TICKETS[choice];
      await runHITLWorkflow(ticket);
    } else if (choice === "3") {
      console.log("\nExiting Support Co-Pilot Demo. Good bye!");
      running = false;
    } else {
      console.log("❌ Invalid selection. Please enter 1, 2, or 3.");
    }
  }
}

main().catch(err => {
  console.error("❌ Application Error:", err);
  process.exit(1);
});
