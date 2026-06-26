/**
 * CLI Entry Point — Route customer support tickets.
 *
 * Usage:
 *   node index.js                               → list sample tickets, run the first
 *   node index.js tickets/billing-dispute.txt    → route a specific ticket
 *   node index.js --message "I can't log in"     → route an inline message
 */

import fs from "fs";
import path from "path";
import { routeTicket, getRoutes } from "./router.js";

const TICKETS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "tickets");

async function main() {
  const args = process.argv.slice(2);

  // ── Inline message mode ───────────────────────────────────────────────
  const msgIndex = args.indexOf("--message");
  if (msgIndex !== -1 && args[msgIndex + 1]) {
    const message = args.slice(msgIndex + 1).join(" ");
    console.log(`📩 Ticket: "${message}"\n`);
    await routeTicket(message);
    return;
  }

  // ── File mode ─────────────────────────────────────────────────────────
  const fileArg = args.find((a) => !a.startsWith("--"));

  let message;
  let fileName;

  if (fileArg) {
    const filePath = path.resolve(fileArg);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    message = fs.readFileSync(filePath, "utf-8").trim();
    fileName = path.basename(filePath);
  } else {
    // ── No argument — list tickets and run the first ──────────────────
    if (!fs.existsSync(TICKETS_DIR)) {
      console.error("❌ No tickets/ folder found.");
      process.exit(1);
    }

    const tickets = fs.readdirSync(TICKETS_DIR).filter((f) => !f.startsWith("."));

    if (tickets.length === 0) {
      console.error("❌ No ticket files found in tickets/.");
      process.exit(1);
    }

    console.log("🎫 Available sample tickets:\n");
    tickets.forEach((file, i) => {
      const content = fs.readFileSync(path.join(TICKETS_DIR, file), "utf-8").trim();
      const preview = content.length > 70 ? content.slice(0, 70) + "..." : content;
      console.log(`   ${i + 1}. ${file}`);
      console.log(`      "${preview}"\n`);
    });

    console.log("📍 Available routes:\n");
    getRoutes().forEach((r) => {
      console.log(`   ${r.emoji}  ${r.name} — ${r.description}`);
    });

    console.log(`\nUsage: node index.js tickets/<filename>`);
    console.log(`       node index.js --message "your message here"\n`);
    console.log(`Running first ticket: ${tickets[0]}\n`);

    const filePath = path.join(TICKETS_DIR, tickets[0]);
    message = fs.readFileSync(filePath, "utf-8").trim();
    fileName = tickets[0];
  }

  // ── Show ticket ───────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  📩 Customer Ticket                                    │");
  console.log("├─────────────────────────────────────────────────────────┤");
  message.split("\n").forEach((line) => {
    console.log(`│  ${line}`);
  });
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // ── Route it ──────────────────────────────────────────────────────────
  await routeTicket(message);
}

main().catch((err) => {
  console.error("❌ Routing failed:", err.message);
  console.error(
    "\n💡 Make sure Ollama is running (ollama serve) and llama3.2 is pulled (ollama pull llama3.2)"
  );
  process.exit(1);
});
