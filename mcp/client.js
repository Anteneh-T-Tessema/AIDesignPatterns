/**
 * MCP Client Implementation
 * 
 * Spawns the MCP Server as a subprocess.
 * Manages standard input/output JSON-RPC stream.
 * Resolves standard responses using Promise callbacks mapped to request IDs.
 */

import { spawn } from "child_process";
import readline from "readline";
import path from "path";

export class McpClient {
  constructor(serverScriptPath) {
    this.serverScriptPath = serverScriptPath;
    this.serverProcess = null;
    this.nextRequestId = 1;
    this.pendingRequests = new Map(); // id -> { resolve, reject }
    this.onPacketTrace = null; // Callback for trace logging (packet, direction)
  }

  /**
   * Start the server subprocess and establish STDIO readline listeners.
   */
  start() {
    return new Promise((resolve, reject) => {
      // Spawn server process
      this.serverProcess = spawn("node", [this.serverScriptPath], {
        env: { ...process.env }
      });

      // Handle server process exit
      this.serverProcess.on("exit", (code) => {
        this.logDebug(`Server exited with code ${code}`);
        // Reject all remaining pending requests
        for (const [id, req] of this.pendingRequests.entries()) {
          req.reject(new Error(`MCP server terminated unexpectedly with code ${code}`));
          this.pendingRequests.delete(id);
        }
      });

      this.serverProcess.on("error", (err) => {
        reject(new Error(`Failed to start MCP server: ${err.message}`));
      });

      // Route server process stderr to client console for transparent debugging
      this.serverProcess.stderr.on("data", (data) => {
        const lines = data.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            console.warn(`\x1b[90m[Server Stderr] ${line}\x1b[0m`);
          }
        }
      });

      // Read responses from server stdout line by line
      const rl = readline.createInterface({
        input: this.serverProcess.stdout,
        terminal: false
      });

      rl.on("line", (line) => {
        if (!line.trim()) return;

        try {
          const response = JSON.parse(line);
          
          // Trigger trace callback if registered
          if (this.onPacketTrace) {
            this.onPacketTrace(response, "incoming");
          }

          const { id, result, error } = response;

          if (id !== undefined && id !== null) {
            const pending = this.pendingRequests.get(id);
            if (pending) {
              this.pendingRequests.delete(id);
              if (error) {
                pending.reject(new Error(`JSON-RPC Error: ${error.message} (code: ${error.code})`));
              } else {
                pending.resolve(result);
              }
            }
          }
        } catch (err) {
          this.logDebug(`Failed to parse incoming line: "${line}". Error: ${err.message}`);
        }
      });

      // Server is running and listening now
      resolve();
    });
  }

  /**
   * Send a JSON-RPC request to the server.
   */
  sendRequest(method, params = {}) {
    if (!this.serverProcess) {
      return Promise.reject(new Error("MCP Client not started. Call start() first."));
    }

    const id = this.nextRequestId++;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Trigger trace callback if registered
      if (this.onPacketTrace) {
        this.onPacketTrace(request, "outgoing");
      }

      // Write to server's stdin, delimited by newline
      this.serverProcess.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  /**
   * Perform the MCP handshake initialization.
   */
  async initialize() {
    return this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: {
        name: "local-mcp-demo-client",
        version: "1.0.0"
      }
    });
  }

  /**
   * Discover tools available on the server.
   */
  async listTools() {
    const result = await this.sendRequest("tools/list");
    return result.tools || [];
  }

  /**
   * Execute a tool on the server.
   */
  async callTool(name, args) {
    const result = await this.sendRequest("tools/call", {
      name,
      arguments: args
    });
    return result;
  }

  /**
   * Discover resources available on the server.
   */
  async listResources() {
    const result = await this.sendRequest("resources/list");
    return result.resources || [];
  }

  /**
   * Read contents of a resource from the server.
   */
  async readResource(uri) {
    const result = await this.sendRequest("resources/read", { uri });
    return result.contents || [];
  }

  /**
   * Register a trace logger callback.
   */
  setTraceLogger(callback) {
    this.onPacketTrace = callback;
  }

  /**
   * Stop the client and terminate the server process.
   */
  stop() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  logDebug(message) {
    console.log(`\x1b[36m[Client Debug]\x1b[0m ${message}`);
  }
}
