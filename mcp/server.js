/**
 * MCP Server Implementation
 * 
 * Communicates with the client over process.stdin/process.stdout.
 * Implements JSON-RPC 2.0 protocol over newline-delimited stream.
 * Emits logging and debugging information to process.stderr.
 */

import readline from "readline";

// Mock Database of Static Resources
const RESOURCES = {
  "resource://company_policy.md": {
    uri: "resource://company_policy.md",
    name: "Company Discount & Billing Policies",
    description: "Document defining VIP, Preferred, and Retail discount tiers and tax calculation rules.",
    mimeType: "text/markdown",
    text: `# Company Discount Policies

1. **VIP Customer Tier**: 20% discount on all purchases over $100.
2. **Preferred Customer Tier**: 10% discount on all purchases over $50.
3. **Retail Customer Tier**: No discount.
4. **Sales Tax**: All transactions are subject to a standard 8.5% sales tax, calculated after the discount is applied.`
  },
  "resource://instructions.txt": {
    uri: "resource://instructions.txt",
    name: "General Usage Instructions",
    description: "System usage guides and instructions.",
    mimeType: "text/plain",
    text: "When performing client operations, always read the company policies resource first to ensure compliance."
  }
};

// Mock Database of Notes (For Search Notes Tool)
const NOTES = [
  { id: 1, title: "Q3 Strategy", content: "Focus on AI-driven customer support automation and scaling Ollama instances." },
  { id: 2, title: "Product Backlog", content: "Implement Model Context Protocol (MCP) support for the IDE workspace agents." },
  { id: 3, title: "Holiday Schedule", content: "The office will be closed on July 4th and Labor Day." }
];

// Available Tools Manifest
const TOOLS = [
  {
    name: "calculate",
    description: "Safely evaluates simple mathematical expressions (addition, subtraction, multiplication, division, parentheses).",
    inputSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The math expression to evaluate, e.g., '150 * 0.20' or '(100 - 15) * 1.085'"
        }
      },
      required: ["expression"]
    }
  },
  {
    name: "search_notes",
    description: "Searches the internal corporate database of notes by a text query.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search term to look for in notes."
        }
      },
      required: ["query"]
    }
  }
];

// Helper to safely evaluate simple math expressions
function safeEvaluate(expr) {
  if (!/^[0-9\s.+\-*/()]+$/.test(expr)) {
    throw new Error("Security check failed: Invalid characters in expression.");
  }
  try {
    return Function(`"use strict"; return (${expr})`)();
  } catch (err) {
    throw new Error(`Failed to evaluate expression: ${err.message}`);
  }
}

// Logging helper to process.stderr (stdout is reserved for JSON-RPC messages)
function logDebug(message) {
  process.stderr.write(`[MCP Server Debug] ${message}\n`);
}

// Main JSON-RPC request dispatcher
function handleRequest(request) {
  const { jsonrpc, id, method, params } = request;

  if (jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32600, message: "Invalid Request: Expected JSON-RPC 2.0" }
    };
  }

  logDebug(`Received request method: "${method}" (ID: ${id})`);

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "local-mcp-demo-server",
            version: "1.0.0"
          }
        }
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS }
      };

    case "tools/call": {
      const { name, arguments: args } = params || {};
      if (name === "calculate") {
        try {
          const resultVal = safeEvaluate(args.expression);
          logDebug(`Executed calculate tool: "${args.expression}" => ${resultVal}`);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: String(resultVal) }]
            }
          };
        } catch (err) {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [{ type: "text", text: `Error: ${err.message}` }]
            }
          };
        }
      } else if (name === "search_notes") {
        const queryStr = (args.query || "").toLowerCase();
        const matches = NOTES.filter(note => 
          note.title.toLowerCase().includes(queryStr) || 
          note.content.toLowerCase().includes(queryStr)
        );
        logDebug(`Executed search_notes tool: "${queryStr}" => Found ${matches.length} matches`);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(matches, null, 2) }]
          }
        };
      } else {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: Tool "${name}" does not exist` }
        };
      }
    }

    case "resources/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: Object.values(RESOURCES).map(res => ({
            uri: res.uri,
            name: res.name,
            description: res.description,
            mimeType: res.mimeType
          }))
        }
      };

    case "resources/read": {
      const { uri } = params || {};
      const resource = RESOURCES[uri];
      if (resource) {
        logDebug(`Read resource: "${uri}"`);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: resource.text
            }]
          }
        };
      } else {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Resource not found: "${uri}"` }
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: "${method}"` }
      };
  }
}

// Set up readline interface to receive newline-delimited requests
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const request = JSON.parse(line);
    const response = handleRequest(request);
    // Write reply to stdout as a single line, ended by newline
    process.stdout.write(JSON.stringify(response) + "\n");
  } catch (err) {
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` }
    };
    process.stdout.write(JSON.stringify(errorResponse) + "\n");
  }
});

logDebug("MCP Server started successfully and listening on stdin.");
