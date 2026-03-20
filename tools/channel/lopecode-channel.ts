#!/usr/bin/env bun
/**
 * Lopecode Channel Server
 *
 * Bridges Lopecode notebooks (WebSocket) to Claude Code (MCP stdio).
 * Notebooks connect over ws://127.0.0.1:8787, Claude interacts via MCP tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ServerWebSocket } from "bun";
import { join, dirname, basename } from "path";

// --- Configuration ---
const PORT = Number(process.env.LOPECODE_PORT ?? 8787);

// --- Pairing token ---
function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `LOPE-${code}`;
}

const PAIRING_TOKEN = generateToken();

// --- State ---
type ConnectionMeta = { url: string; title: string; modules?: string[] };

const pendingConnections = new Set<ServerWebSocket<unknown>>();
const pairedConnections = new Map<string, ServerWebSocket<unknown>>(); // notebook URL → ws
const connectionMeta = new Map<ServerWebSocket<unknown>, ConnectionMeta>();
const wsBySocket = new Map<ServerWebSocket<unknown>, string>(); // ws → notebook URL (reverse lookup)

// Command correlation for async request-response
type PendingCommand = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
};
const pendingCommands = new Map<string, PendingCommand>();
let commandSeq = 0;

function nextCommandId(): string {
  return `cmd-${Date.now()}-${++commandSeq}`;
}

// --- MCP Server ---
const mcp = new Server(
  { name: "lopecode", version: "1.0.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: `You are connected to Lopecode notebooks via the lopecode channel.

User chat messages arrive as:
  <channel source="lopecode" type="message" notebook="file:///..." sender="user">
  message text here
  </channel>

Cell change events arrive automatically as:
  <channel source="lopecode" type="cell_change" notebook="file:///..." module="@author/mod" cell="cellName" op="upd">
  truncated definition
  </channel>

Notebook lifecycle events:
  <channel source="lopecode" type="connected" notebook="file:///...">notebook title</channel>
  <channel source="lopecode" type="disconnected" notebook="file:///...">notebook title</channel>

Use the reply tool to send messages back to a specific notebook's chat widget.
Use define_variable, get_variable, run_tests, list_variables, eval_code to interact with notebook runtimes.
Use fork_notebook to create a safe copy for experimentation.

When multiple notebooks are connected, always specify which one via notebook_id (the URL).
When only one notebook is connected, notebook_id can be omitted and the sole connection is used.`,
  }
);

// --- Helper: resolve notebook_id ---
function resolveNotebook(notebookId?: string): { ws: ServerWebSocket<unknown>; url: string } | { error: string } {
  if (notebookId) {
    const ws = pairedConnections.get(notebookId);
    if (!ws) return { error: `Notebook not connected: ${notebookId}` };
    return { ws, url: notebookId };
  }
  // If only one notebook connected, use it
  if (pairedConnections.size === 1) {
    const [url, ws] = [...pairedConnections.entries()][0];
    return { ws, url };
  }
  if (pairedConnections.size === 0) {
    return { error: "No notebooks connected" };
  }
  const urls = [...pairedConnections.keys()].map(u => `  - ${u}`).join("\n");
  return { error: `Multiple notebooks connected. Specify notebook_id:\n${urls}` };
}

// --- Helper: send command and await result ---
function sendCommand(
  ws: ServerWebSocket<unknown>,
  action: string,
  params: Record<string, any>,
  timeout = 30000
): Promise<any> {
  const id = nextCommandId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Command ${action} timed out after ${timeout}ms`));
    }, timeout);

    pendingCommands.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ type: "command", id, action, params }));
  });
}

// --- MCP Tools ---
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description: "Send a markdown message to a notebook's chat widget.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string", description: "Notebook URL (optional if only one connected)" },
          markdown: { type: "string", description: "Markdown content to display" },
        },
        required: ["markdown"],
      },
    },
    {
      name: "get_variable",
      description: "Get the current value of a runtime variable.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name" },
          module: { type: "string", description: "Module name (optional, defaults to main)" },
        },
        required: ["name"],
      },
    },
    {
      name: "define_variable",
      description: "Define or redefine a runtime variable. Definition must be a function string like '() => 42' or '(x, y) => x + y'.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name" },
          definition: { type: "string", description: "Function definition string, e.g. '() => 42'" },
          inputs: {
            type: "array",
            items: { type: "string" },
            description: "Array of dependency variable names (default: [])",
          },
          module: { type: "string", description: "Target module name (optional)" },
        },
        required: ["name", "definition"],
      },
    },
    {
      name: "delete_variable",
      description: "Delete a variable from the runtime.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name to delete" },
          module: { type: "string", description: "Module name (optional)" },
        },
        required: ["name"],
      },
    },
    {
      name: "list_variables",
      description: "List all named variables in the runtime (or a specific module).",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          module: { type: "string", description: "Filter to specific module (optional)" },
        },
      },
    },
    {
      name: "run_tests",
      description: "Run test_* variables and return results.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          filter: { type: "string", description: "Filter tests by name substring (optional)" },
          timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
        },
      },
    },
    {
      name: "eval_code",
      description: "Evaluate JavaScript code in the notebook's browser context.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          code: { type: "string", description: "JavaScript code to evaluate" },
        },
        required: ["code"],
      },
    },
    {
      name: "fork_notebook",
      description: "Create a copy of the notebook as a sibling HTML file. Returns the new file path.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          suffix: { type: "string", description: "Suffix for forked file (default: timestamp)" },
        },
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    const notebookId = args.notebook_id as string | undefined;

    // reply is fire-and-forget to the WebSocket
    if (req.params.name === "reply") {
      const target = resolveNotebook(notebookId);
      if ("error" in target) return { content: [{ type: "text", text: target.error }], isError: true };
      target.ws.send(JSON.stringify({ type: "reply", markdown: args.markdown as string }));
      return { content: [{ type: "text", text: "sent" }] };
    }

    // All other tools send a command and await a result
    const target = resolveNotebook(notebookId);
    if ("error" in target) return { content: [{ type: "text", text: target.error }], isError: true };

    let action: string;
    let params: Record<string, any> = {};
    let timeout = 30000;

    switch (req.params.name) {
      case "get_variable":
        action = "get-variable";
        params = { name: args.name, module: args.module || null };
        break;
      case "define_variable":
        action = "define-variable";
        params = {
          name: args.name,
          definition: args.definition,
          inputs: (args.inputs as string[]) || [],
          module: args.module || null,
        };
        break;
      case "delete_variable":
        action = "delete-variable";
        params = { name: args.name, module: args.module || null };
        break;
      case "list_variables":
        action = "list-variables";
        params = { module: args.module || null };
        break;
      case "run_tests":
        action = "run-tests";
        timeout = (args.timeout as number) || 30000;
        params = { filter: args.filter || null, timeout };
        break;
      case "eval_code":
        action = "eval";
        params = { code: args.code };
        break;
      case "fork_notebook":
        action = "fork";
        timeout = 120000;
        params = { suffix: args.suffix || null };
        break;
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }

    const result = await sendCommand(target.ws, action, params, timeout);

    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
    }

    // Fork special handling: write the HTML to disk
    if (action === "fork" && result.result?.html) {
      const originalUrl = target.url;
      let originalPath: string;
      if (originalUrl.startsWith("file://")) {
        originalPath = decodeURIComponent(originalUrl.replace("file://", ""));
      } else {
        originalPath = originalUrl;
      }
      const dir = dirname(originalPath);
      const base = basename(originalPath, ".html");
      const suffix = params.suffix || Date.now().toString();
      const forkPath = join(dir, `${base}--${suffix}.html`);
      await Bun.write(forkPath, result.result.html);
      const forkUrl = `file://${forkPath}`;
      return { content: [{ type: "text", text: `Forked to ${forkUrl}\nFile: ${forkPath}` }] };
    }

    // Return result as formatted text
    const text = typeof result.result === "string"
      ? result.result
      : JSON.stringify(result.result, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
});

// --- WebSocket Server ---
function handleWsMessage(ws: ServerWebSocket<unknown>, raw: string | Buffer) {
  let msg: any;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }

  switch (msg.type) {
    case "pair": {
      if (msg.token !== PAIRING_TOKEN) {
        ws.send(JSON.stringify({ type: "pair-failed", reason: "Invalid pairing token" }));
        ws.close();
        return;
      }
      const url = msg.url as string;
      const title = msg.title as string || "Untitled";
      pendingConnections.delete(ws);
      pairedConnections.set(url, ws);
      connectionMeta.set(ws, { url, title });
      wsBySocket.set(ws, url);
      ws.send(JSON.stringify({ type: "paired", notebook_id: url }));

      // Notify Claude
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `${title} connected`,
          meta: {
            type: "connected",
            notebook: url,
            title,
          },
        },
      });
      process.stderr.write(`lopecode-channel: paired ${url}\n`);
      break;
    }

    case "message": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return; // not paired
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: msg.content as string,
          meta: {
            type: "message",
            notebook: notebookUrl,
            sender: "user",
          },
        },
      });
      break;
    }

    case "cell-change": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return;
      const changes = msg.changes as any[];
      if (!changes) return;
      for (const change of changes) {
        void mcp.notification({
          method: "notifications/claude/channel",
          params: {
            content: change._definition || "",
            meta: {
              type: "cell_change",
              notebook: notebookUrl,
              module: change.module || "",
              cell: change._name || "",
              op: change.op || "",
            },
          },
        });
      }
      break;
    }

    case "notebook-info": {
      const meta = connectionMeta.get(ws);
      if (meta) {
        meta.modules = msg.modules;
        meta.title = msg.title || meta.title;
      }
      break;
    }

    case "command-result": {
      const pending = pendingCommands.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingCommands.delete(msg.id);
        pending.resolve({ ok: msg.ok, result: msg.result, error: msg.error });
      }
      break;
    }
  }
}

function handleWsClose(ws: ServerWebSocket<unknown>) {
  pendingConnections.delete(ws);
  const url = wsBySocket.get(ws);
  if (url) {
    const meta = connectionMeta.get(ws);
    pairedConnections.delete(url);
    connectionMeta.delete(ws);
    wsBySocket.delete(ws);
    void mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: `${meta?.title || "Notebook"} disconnected`,
        meta: {
          type: "disconnected",
          notebook: url,
        },
      },
    });
    process.stderr.write(`lopecode-channel: disconnected ${url}\n`);
  }
}

// Connect MCP stdio transport FIRST (must happen before Bun.serve so Claude Code
// sees the channel capability during the initialization handshake)
await mcp.connect(new StdioServerTransport());

// Start WebSocket + HTTP server
try {
  Bun.serve({
    port: PORT,
    hostname: "127.0.0.1",
    fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        if (server.upgrade(req)) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      // Health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({
          paired: pairedConnections.size,
          pending: pendingConnections.size,
        }), { headers: { "content-type": "application/json" } });
      }
      return new Response("lopecode-channel", { status: 200 });
    },
    websocket: {
      open(ws) {
        pendingConnections.add(ws);
      },
      message: handleWsMessage,
      close: handleWsClose,
    },
  });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("EADDRINUSE") || msg.includes("address already in use") || msg.includes("port") && msg.includes("in use")) {
    process.stderr.write(
      `lopecode-channel: ERROR — port ${PORT} is already in use.\n` +
      `Another lopecode-channel or other service is running on this port.\n` +
      `Kill the existing process or set LOPECODE_PORT=<other port>.\n`
    );
    process.exit(1);
  }
  throw err;
}

process.stderr.write(`lopecode-channel: pairing token: ${PAIRING_TOKEN}\n`);
process.stderr.write(`lopecode-channel: WebSocket server on ws://127.0.0.1:${PORT}/ws\n`);
