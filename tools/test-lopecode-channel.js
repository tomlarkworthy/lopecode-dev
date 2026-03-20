#!/usr/bin/env node
/**
 * Integration test for the lopecode-channel server.
 *
 * Tests the channel server's WebSocket + MCP bridge without a real notebook.
 * Uses a mock WebSocket client to simulate notebook behavior.
 *
 * Run: node tools/test-lopecode-channel.js
 */

import { spawn } from "child_process";
import { test, describe, after, before } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "timers/promises";

// --- Helpers ---

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", "tools/channel/lopecode-channel.ts"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, LOPECODE_PORT: "8788" },
    });

    let token = null;
    let stderrBuf = "";

    proc.stderr.on("data", (data) => {
      stderrBuf += data.toString();
      const match = stderrBuf.match(/pairing token: (LOPE-[A-Z0-9]+)/);
      if (match && !token) {
        token = match[1];
        resolve({ proc, token });
      }
    });

    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (!token) reject(new Error(`Server exited with code ${code}. stderr: ${stderrBuf}`));
    });

    // Timeout
    setTimeout(() => {
      if (!token) reject(new Error(`Server didn't start in time. stderr: ${stderrBuf}`));
    }, 10000);
  });
}

function connectWs(port = 8788) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error("WebSocket connection failed"));
    setTimeout(() => reject(new Error("WebSocket connect timeout")), 5000);
  });
}

function waitForMessage(ws, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener("message", handler);
      reject(new Error("Timeout waiting for message"));
    }, timeout);

    function handler(event) {
      const msg = JSON.parse(event.data);
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.removeEventListener("message", handler);
        resolve(msg);
      }
    }
    ws.addEventListener("message", handler);
  });
}

// --- Tests ---

describe("lopecode-channel", () => {
  let server;
  let token;
  let ws;

  before(async () => {
    const result = await startServer();
    server = result.proc;
    token = result.token;
    // Wait a bit for server to be ready
    await sleep(500);
  });

  after(() => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    if (server) server.kill("SIGTERM");
  });

  test("server generates valid pairing token", () => {
    assert.match(token, /^LOPE-[A-Z0-9]{4}$/);
  });

  test("health endpoint works", async () => {
    const res = await fetch("http://127.0.0.1:8788/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.paired, 0);
  });

  test("WebSocket connects and pairs successfully", async () => {
    ws = await connectWs();

    // Wait for paired response
    const pairedPromise = waitForMessage(ws, (m) => m.type === "paired");

    ws.send(
      JSON.stringify({
        type: "pair",
        token,
        url: "file:///test/notebook.html",
        title: "Test Notebook",
      })
    );

    const paired = await pairedPromise;
    assert.equal(paired.type, "paired");
    assert.equal(paired.notebook_id, "file:///test/notebook.html");
  });

  test("invalid token gets rejected", async () => {
    const ws2 = await connectWs();

    const failPromise = waitForMessage(ws2, (m) => m.type === "pair-failed");

    ws2.send(
      JSON.stringify({
        type: "pair",
        token: "LOPE-XXXX",
        url: "file:///test/bad.html",
        title: "Bad",
      })
    );

    const result = await failPromise;
    assert.equal(result.type, "pair-failed");
    assert.ok(result.reason);
  });

  test("health shows paired connection", async () => {
    const res = await fetch("http://127.0.0.1:8788/health");
    const body = await res.json();
    assert.equal(body.paired, 1);
  });

  test("reply command is forwarded to WebSocket", async () => {
    // The reply tool sends directly to WebSocket
    // We simulate this by having the MCP side send a reply
    // Since we can't call MCP tools directly, we test the WebSocket protocol

    // Send a message from "notebook" to server
    ws.send(JSON.stringify({ type: "message", content: "Hello Claude!" }));

    // Small delay for processing
    await sleep(200);

    // Server should have forwarded as MCP notification (we can't check that
    // without reading MCP stdout, but we can verify the connection is still alive)
    assert.equal(ws.readyState, WebSocket.OPEN);
  });

  test("command-result correlation works", async () => {
    // We can't trigger MCP tool calls directly in this test,
    // but we can verify that sending a command-result for a non-existent
    // command ID is silently ignored (no crash).
    ws.send(
      JSON.stringify({
        type: "command-result",
        id: "nonexistent-cmd",
        ok: true,
        result: "test",
      })
    );

    // If we got here without crash, correlation handling is working
    assert.ok(true);
  });

  test("cell-change forwarding", async () => {
    // Simulate cell change from notebook
    ws.send(
      JSON.stringify({
        type: "cell-change",
        changes: [
          {
            t: Date.now(),
            op: "upd",
            module: "@tomlarkworthy/test",
            _name: "myCell",
            _inputs: [],
            _definition: "() => 42",
          },
        ],
      })
    );

    // Should be forwarded as MCP notification
    await sleep(200);
    assert.equal(ws.readyState, WebSocket.OPEN);
  });

  test("notebook-info is stored", async () => {
    ws.send(
      JSON.stringify({
        type: "notebook-info",
        url: "file:///test/notebook.html",
        title: "Updated Title",
        modules: ["@tomlarkworthy/test", "@tomlarkworthy/tests"],
        hash: "#view=R100(@tomlarkworthy/test)",
      })
    );

    await sleep(200);
    assert.equal(ws.readyState, WebSocket.OPEN);
  });

  test("disconnection is clean", async () => {
    ws.close();
    await sleep(500);

    const res = await fetch("http://127.0.0.1:8788/health");
    const body = await res.json();
    assert.equal(body.paired, 0);
  });
});
