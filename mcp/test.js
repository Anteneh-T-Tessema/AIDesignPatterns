import { test } from "node:test";
import assert from "node:assert";
import path from "path";
import { McpClient } from "./client.js";

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const serverScript = path.join(currentDir, "server.js");

test("MCP Integration Tests", async (t) => {
    const client = new McpClient(serverScript);
    await client.start();

    await t.test("should initialize successfully", async () => {
        const result = await client.initialize();
        assert.strictEqual(result.serverInfo.name, "local-mcp-demo-server");
    });

    await t.test("should list tools", async () => {
        const tools = await client.listTools();
        assert.ok(tools.some(t => t.name === "calculate"));
    });

    await t.test("should calculate correctly", async () => {
        const response = await client.callTool("calculate", { expression: "2 + 2" });
        assert.strictEqual(response.content[0].text, "4");
    });

    client.stop();
});
