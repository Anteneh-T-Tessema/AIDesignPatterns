/**
 * Evaluation and Monitoring Pattern — Travel Agent Module
 * =======================================================
 * 
 * Implements a TravelAssistantAgent with two execution engines (Version A & B)
 * to demonstrate how latency, token usage, and tool trajectories can be monitored
 * and compared.
 */

import { Ollama } from "ollama";
import { LatencyTracker, TokenMonitor } from "./evaluator.js";

const ollama = new Ollama({ host: "http://localhost:11434" });

export class TravelAssistantAgent {
  constructor() {
    this.facts = {
      destination: "Paris",
      flightPrice: "$1200",
      weather: "Sunny, 24°C",
      hotel: "Hotel de L'Opera booked",
      discount: "10% coupon applied",
      packageType: "Standard Paris Explorer Package"
    };
  }

  /**
   * Run the travel agent pipeline.
   * @param {string} userInput - The user's travel request.
   * @param {string} version - "A" (optimized) or "B" (inefficient/drifting).
   * @param {boolean} useOllama - Whether to attempt live Ollama inference or run mock offline pipelines.
   */
  async runTask(userInput, version = "A", useOllama = false) {
    const latency = new LatencyTracker();
    const tokenMonitor = new TokenMonitor();
    const trajectory = [];

    latency.start("total_execution");

    let finalResponseText = "";
    
    if (useOllama) {
      try {
        finalResponseText = await this.runLiveOllama(userInput, version, trajectory, latency, tokenMonitor);
      } catch (err) {
        // Fallback to mock behavior if Ollama connection fails
        finalResponseText = await this.runMockPipeline(userInput, version, trajectory, latency, tokenMonitor);
      }
    } else {
      finalResponseText = await this.runMockPipeline(userInput, version, trajectory, latency, tokenMonitor);
    }

    latency.stop("total_execution");

    return {
      text: finalResponseText,
      trajectory,
      totalLatencyMs: latency.getDuration("total_execution"),
      stepLatencies: {
        flights: latency.getDuration("lookupFlights"),
        weather: latency.getDuration("checkWeather"),
        hotel: latency.getDuration("bookHotel"),
        discount: latency.getDuration("applyDiscount")
      },
      tokens: tokenMonitor.getSummary()
    };
  }

  /**
   * Simulates the agent execution using predefined delay offsets and trajectory paths.
   */
  async runMockPipeline(userInput, version, trajectory, latency, tokenMonitor) {
    // We simulate tool execution delays to reflect actual performance metrics.
    
    if (version === "A") {
      // Version A path: Flights -> Weather -> Hotel -> Discount
      
      // Step 1: lookupFlights
      latency.start("lookupFlights");
      trajectory.push("lookupFlights");
      await new Promise(r => setTimeout(r, 120)); // simulated latency
      latency.stop("lookupFlights");
      tokenMonitor.record("System: lookup flights for Paris", "Tool output: Flight Price $1200");

      // Step 2: checkWeather
      latency.start("checkWeather");
      trajectory.push("checkWeather");
      await new Promise(r => setTimeout(r, 90));
      latency.stop("checkWeather");
      tokenMonitor.record("System: check weather for Paris", "Tool output: Sunny, 24°C");

      // Step 3: bookHotel
      latency.start("bookHotel");
      trajectory.push("bookHotel");
      await new Promise(r => setTimeout(r, 180));
      latency.stop("bookHotel");
      tokenMonitor.record("System: book Hotel de L'Opera in Paris", "Tool output: Hotel de L'Opera Booked");

      // Step 4: applyDiscount
      latency.start("applyDiscount");
      trajectory.push("applyDiscount");
      await new Promise(r => setTimeout(r, 60));
      latency.stop("applyDiscount");
      tokenMonitor.record("System: apply discount PARIS10", "Tool output: 10% coupon applied");

      const finalPrompt = `Synthesize travel recommendation for Paris. Flights: $1200, Weather: Sunny, Hotel: Hotel de L'Opera, Discount: 10%.`;
      const finalResponse = `Hello! I have put together your travel itinerary:
• Flights: Paris ticket booked at $1200.
• Weather: Expect beautiful sunny skies (24°C).
• Lodging: Confirmed booking at Hotel de L'Opera.
• Special Offer: Standard package secured, PARIS10 discount applied (10% saved!).
Have a wonderful trip!`;
      
      tokenMonitor.record(finalPrompt, finalResponse);
      return finalResponse;

    } else {
      // Version B path: Repetitive, out-of-order, drifting path
      // Flights -> Flights -> Hotel (failed dependency) -> Weather -> Hotel (success) -> Weather (redundant) -> Discount

      // Step 1: lookupFlights
      latency.start("lookupFlights");
      trajectory.push("lookupFlights");
      await new Promise(r => setTimeout(r, 125));
      latency.stop("lookupFlights");
      tokenMonitor.record("System: lookup flights for Paris", "Tool output: Flight Price $1200");

      // Step 2: lookupFlights (redundant)
      latency.start("lookupFlights");
      trajectory.push("lookupFlights");
      await new Promise(r => setTimeout(r, 130));
      latency.stop("lookupFlights");
      tokenMonitor.record("System: lookup flights for Paris again", "Tool output: Flight Price $1200");

      // Step 3: bookHotel (fails or runs blindly before weather is verified)
      latency.start("bookHotel");
      trajectory.push("bookHotel");
      await new Promise(r => setTimeout(r, 195));
      latency.stop("bookHotel");
      tokenMonitor.record("System: book Hotel de L'Opera", "Tool output: Warning: Weather conditions not checked yet. Confirming anyway.");

      // Step 4: checkWeather
      latency.start("checkWeather");
      trajectory.push("checkWeather");
      await new Promise(r => setTimeout(r, 100));
      latency.stop("checkWeather");
      tokenMonitor.record("System: check weather for Paris", "Tool output: Sunny, 24°C");

      // Step 5: bookHotel (re-booking to verify details)
      latency.start("bookHotel");
      trajectory.push("bookHotel");
      await new Promise(r => setTimeout(r, 190));
      latency.stop("bookHotel");
      tokenMonitor.record("System: re-confirm book Hotel de L'Opera", "Tool output: Hotel de L'Opera Booked");

      // Step 6: checkWeather (redundant query)
      latency.start("checkWeather");
      trajectory.push("checkWeather");
      await new Promise(r => setTimeout(r, 95));
      latency.stop("checkWeather");
      tokenMonitor.record("System: double check weather for Paris", "Tool output: Sunny, 24°C");

      // Step 7: applyDiscount
      latency.start("applyDiscount");
      trajectory.push("applyDiscount");
      await new Promise(r => setTimeout(r, 65));
      latency.stop("applyDiscount");
      tokenMonitor.record("System: apply discount PARIS10", "Tool output: 10% coupon applied");

      const finalPrompt = `Synthesize travel recommendation for Paris after executing redundant steps.`;
      const finalResponse = `Here is your booking details. I had to look up flights twice and check the weather multiple times to be absolutely sure, but flights are $1200, lodging at Hotel de L'Opera is reserved, weather is sunny, and your 10% discount is applied.`;

      tokenMonitor.record(finalPrompt, finalResponse);
      return finalResponse;
    }
  }

  /**
   * Runs the agent tasks against Ollama, logging live token and step latency configurations.
   */
  async runLiveOllama(userInput, version, trajectory, latency, tokenMonitor) {
    // Core prompt instructing the model how to operate in either optimized or repetitive modes.
    const modeInstruction = version === "A"
      ? "You are highly efficient. Execute each tool exactly once in this order: lookupFlights, checkWeather, bookHotel, applyDiscount."
      : "You are overly thorough and tend to repeat steps. Double-check your tool inputs by executing lookupFlights twice, bookHotel, checkWeather, then bookHotel again, checkWeather again, and finally applyDiscount.";

    const systemPrompt = `You are a Travel Assistant Planner agent. 
Available Tools:
1. "lookupFlights" (retrieves flight details for Paris, cost $1200)
2. "checkWeather" (retrieves Paris weather, Sunny 24C)
3. "bookHotel" (books Hotel de L'Opera)
4. "applyDiscount" (applies 10% discount coupon)

Guidelines:
${modeInstruction}

When calling a tool, print the name of the tool in double brackets e.g. [[toolName]]. Only call one tool at a time.
Once all tools have run, synthesize a friendly final travel overview recommendation for Paris.`;

    // Simulate multi-turn agent execution loop using Ollama
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ];

    let loop = true;
    let turnCount = 0;
    const maxTurns = 12;
    let finalSummary = "";

    while (loop && turnCount < maxTurns) {
      turnCount++;
      const currentPromptText = messages.map(m => m.content).join("\n");
      
      const response = await ollama.chat({
        model: "llama3.2",
        messages: messages,
        options: { temperature: 0.1 }
      });

      const responseText = response.message.content;
      tokenMonitor.record(currentPromptText, responseText, response);
      
      // Parse tool calls
      const toolMatch = responseText.match(/\[\[(\w+)\]\]/);
      if (toolMatch) {
        const toolName = toolMatch[1];
        trajectory.push(toolName);

        // Track specific tool latency
        latency.start(toolName);
        
        let toolOutput = "";
        if (toolName === "lookupFlights") {
          await new Promise(r => setTimeout(r, 150));
          toolOutput = "Flight search result: Paris ($1200)";
        } else if (toolName === "checkWeather") {
          await new Promise(r => setTimeout(r, 100));
          toolOutput = "Weather check: Paris is Sunny, 24°C";
        } else if (toolName === "bookHotel") {
          await new Promise(r => setTimeout(r, 200));
          toolOutput = "Hotel booking: Hotel de L'Opera Confirmed";
        } else if (toolName === "applyDiscount") {
          await new Promise(r => setTimeout(r, 80));
          toolOutput = "Coupon: PARIS10 applied (10% saved)";
        } else {
          toolOutput = "Unknown tool error";
        }
        
        latency.stop(toolName);

        messages.push({ role: "assistant", content: responseText });
        messages.push({ role: "user", content: `Tool Output for [[${toolName}]]: ${toolOutput}. Please proceed.` });
      } else {
        // No tool detected, assume final recommendation synthesis is complete
        finalSummary = responseText;
        loop = false;
      }
    }

    return finalSummary || "Paris trip booking finalized successfully.";
  }
}
