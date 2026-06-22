// Playwright headless driver for the robocoop-4 live eval harness.
//
// Boots the REAL @tomlarkworthy_robocoop-4.html notebook in headless Chromium, injects an OpenRouter
// key + model, sends one question through the live `session`, then snapshots the world per CONTRACT.md.
// One fresh page per question (isolation). The api key is NEVER logged.

import { chromium } from "playwright";

const DEFAULT_LAYOUT =
  "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";

export async function createDriver({
  notebookPath,
  apiKey,
  model = "anthropic/claude-sonnet-4",
  layout = DEFAULT_LAYOUT,
  timeoutMs = 120000,
  headed = false,
} = {}) {
  if (!notebookPath) throw new Error("createDriver requires notebookPath");
  if (!apiKey) throw new Error("createDriver requires apiKey");

  const browser = await chromium.launch({
    headless: !headed,
    args: [
      // Headless Chromium reports visibilityState "visible", but these guard against rAF/timer
      // throttling if ever run headed in the background.
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  async function runQuestion(evalDef) {
    const question = String(evalDef?.question ?? "");
    const partial = { ok: false, error: null, question, model, durationMs: 0, steps: 0 };
    const consoleEvents = [];

    let page;
    try {
      const context = await browser.newContext();
      page = await context.newPage();

      // Capture errors/warnings for the whole lifetime of this page (step 5).
      page.on("console", (msg) => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          consoleEvents.push({ type: type === "warning" ? "warning" : "error", text: msg.text() });
        }
      });
      page.on("pageerror", (e) => consoleEvents.push({ type: "error", text: e.message }));

      // (a) Seed localStorage BEFORE any script runs. localStorageView reads PLAIN strings (no JSON).
      await page.addInitScript(
        ([k, m]) => {
          try {
            localStorage.setItem("OPENROUTER_API_KEY", k);
            localStorage.setItem("robocoop4_model", m);
          } catch {}
        },
        [apiKey, model],
      );

      const url = `file://${notebookPath}#view=${layout}`;
      await page.goto(url, { waitUntil: "load", timeout: 30000 });

      // Step 2: runtime booted with at least one main.
      await page.waitForFunction(
        () => globalThis.__ojs_runtime && globalThis.__ojs_runtime.mains && globalThis.__ojs_runtime.mains.size > 0,
        { timeout: 30000 },
      );

      // Step 3 (b): belt-and-suspenders — if `client` is still null, drive the viewof elements directly,
      // then poll until `client` is a real (non-null) OpenRouter client.
      const clientReady = await page.evaluate(
        async ({ key, mdl, pollMs, maxMs }) => {
          const reg = globalThis.__ojs_runtime;

          function allVars() {
            const out = [];
            const seen = new Set();
            for (const m of reg.mains.values()) {
              const rt = m && m._runtime;
              if (!rt || seen.has(rt)) continue;
              seen.add(rt);
              for (const v of rt._variables) out.push(v);
            }
            return out;
          }
          const byName = (name) => allVars().find((v) => v._name === name);

          // Force the key/model views + client/session to compute by observing them.
          for (const n of ["viewof OPENROUTER_API_KEY", "viewof model", "client", "session"]) {
            const v = byName(n);
            try {
              if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {});
            } catch {}
          }

          function setView(name, value) {
            const v = byName(name);
            const el = v && v._value;
            if (!el || typeof el !== "object") return false;
            const input = el.querySelector?.("input,select,textarea");
            if (input) {
              input.value = value;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            }
            try { el.value = value; } catch {}
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }

          const deadline = Date.now() + maxMs;
          let injected = false;
          while (Date.now() < deadline) {
            const client = byName("client");
            if (client && client._value != null && !(client._value instanceof Error)) return true;
            if (!injected) {
              setView("viewof OPENROUTER_API_KEY", key);
              setView("viewof model", mdl);
              injected = true;
              // Re-observe so the dependents recompute on the next tick.
              for (const n of ["client", "session"]) {
                const v = byName(n);
                try {
                  if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {});
                } catch {}
              }
            }
            await new Promise((r) => setTimeout(r, pollMs));
          }
          const client = byName("client");
          return !!(client && client._value != null && !(client._value instanceof Error));
        },
        { key: apiKey, mdl: model, pollMs: 200, maxMs: 15000 },
      );

      if (!clientReady) {
        partial.error = "client did not initialize (no OpenRouter client after key injection)";
        partial.console = consoleEvents;
        return partial;
      }

      // Step 4: seed workspace files (if any) before sending.
      if (evalDef?.setup?.files && Object.keys(evalDef.setup.files).length) {
        await page.evaluate(async (files) => {
          const reg = globalThis.__ojs_runtime;
          let ws = null;
          for (const m of reg.mains.values()) {
            const rt = m && m._runtime;
            if (!rt) continue;
            for (const v of rt._variables) if (v._name === "rc4_workspace") { ws = v._value; break; }
            if (ws) break;
          }
          if (!ws || !ws.fs || typeof ws.fs.writeFile !== "function")
            throw new Error("rc4_workspace.fs.writeFile unavailable");
          for (const [path, content] of Object.entries(files)) {
            const dir = path.slice(0, path.lastIndexOf("/"));
            if (dir && ws.fs.mkdir) { try { await ws.fs.mkdir(dir, { recursive: true }); } catch {} }
            await ws.fs.writeFile(path, String(content));
          }
        }, evalDef.setup.files);
      }

      // Step 6: send the question (raced against timeout) and build the WorldSnapshot — all in-page so
      // we have synchronous access to live runtime values.
      const snapshot = await page.evaluate(
        async ({ question, model, timeoutMs }) => {
          const reg = globalThis.__ojs_runtime;

          function allVariables() {
            const out = []; // [{ moduleObj, v }]
            const seenRt = new Set();
            for (const m of reg.mains.values()) {
              const rt = m && m._runtime;
              if (!rt || seenRt.has(rt)) continue;
              seenRt.add(rt);
              for (const v of rt._variables) out.push({ v, moduleObj: v._module });
            }
            return out;
          }
          const findValue = (name) => {
            for (const { v } of allVariables()) if (v._name === name) return v._value;
            return undefined;
          };

          // Map moduleObj -> id via the currentModules value Map (info.module === moduleObj -> info.name).
          function buildModuleIdMap() {
            const map = new Map(); // moduleObj -> id
            const cm = findValue("currentModules");
            if (cm && typeof cm.forEach === "function") {
              cm.forEach((info) => {
                if (info && info.module && info.name) map.set(info.module, info.name);
              });
            }
            return map;
          }

          function preview(value) {
            try {
              if (value == null) return String(value);
              if (typeof value === "function") return "[fn]";
              if (typeof value !== "object") return String(value).slice(0, 600);
              if (typeof Element !== "undefined" && value instanceof Element) {
                return (value.outerHTML || "").slice(0, 600);
              }
              const json = JSON.stringify(value);
              return (json == null ? Object.prototype.toString.call(value) : json).slice(0, 600);
            } catch {
              try { return Object.prototype.toString.call(value); } catch { return "[unserializable]"; }
            }
          }
          function valueType(value) {
            if (value === null) return "null";
            const t = typeof value;
            if (t !== "object") return t;
            try { return value.constructor?.name || "Object"; } catch { return "Object"; }
          }
          function isSvgValue(value) {
            try {
              return (
                typeof Element !== "undefined" &&
                value instanceof Element &&
                (value.outerHTML || "").includes("<svg")
              );
            } catch { return false; }
          }

          const startedAt = Date.now();
          const result = { ok: true, error: null, question, model, durationMs: 0, steps: 0, finishReason: null };

          // --- send the question, raced against the timeout ---
          const session = findValue("session");
          if (!session || typeof session.send !== "function") {
            result.ok = false;
            result.error = "session unavailable or has no send()";
          } else {
            let timer;
            const timeout = new Promise((_, rej) => {
              timer = setTimeout(() => rej(new Error("session.send timed out after " + timeoutMs + "ms")), timeoutMs);
            });
            try {
              const turn = await Promise.race([session.send(question), timeout]);
              if (turn && typeof turn === "object") {
                if (typeof turn.steps === "number") result.steps = turn.steps;
                if (turn.finishReason != null) result.finishReason = turn.finishReason;
              }
            } catch (e) {
              result.ok = false;
              result.error = e?.message ?? String(e);
            } finally {
              clearTimeout(timer);
            }
          }
          result.durationMs = Date.now() - startedAt;

          // --- conversation + toolCalls (build even on timeout for partial diagnostics) ---
          const messages = session && Array.isArray(session.messages) ? session.messages : [];
          result.conversation = messages.map((m) => {
            const out = { role: m.role, content: m.content ?? "" };
            if (Array.isArray(m.tool_calls)) out.tool_calls = m.tool_calls;
            if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
            return out;
          });
          // steps fallback = count of assistant messages this conversation.
          if (!result.steps) {
            result.steps = messages.filter((m) => m.role === "assistant").length;
          }
          result.toolCalls = [];
          for (const m of messages) {
            if (!Array.isArray(m.tool_calls)) continue;
            for (const call of m.tool_calls) {
              const name = call?.function?.name ?? call?.name ?? "";
              const raw = call?.function?.arguments;
              let args;
              if (raw == null || raw === "") args = {};
              else if (typeof raw === "object") args = raw;
              else { try { args = JSON.parse(raw); } catch { args = { raw: String(raw) }; } }
              result.toolCalls.push({ name, arguments: args });
            }
          }

          // --- files via rc4_workspace.snapshot() ---
          result.files = {};
          const ws = findValue("rc4_workspace");
          if (ws && typeof ws.snapshot === "function") {
            try {
              const snap = await ws.snapshot();
              if (snap && typeof snap === "object") {
                for (const [path, contents] of Object.entries(snap)) {
                  if (typeof contents === "string") result.files[path] = contents;
                }
              }
            } catch (e) {
              result.error = result.error || ("workspace snapshot failed: " + (e?.message ?? e));
            }
          }

          // --- force-compute lazy cells so values are readable. Newly host_applied cells are LAZY:
          // their _value stays undefined until something observes them. Scope to eval-relevant modules
          // (@user/* and robocoop-4*) so we don't trigger heavy compute across the whole library. ---
          {
            const idMapF = buildModuleIdMap();
            const jobs = [];
            for (const { v, moduleObj } of allVariables()) {
              const id = idMapF.get(moduleObj);
              if (!id || !(id.startsWith("@user/") || id.includes("robocoop-4"))) continue;
              const n = v._name;
              if (!n || n.startsWith("module ") || n === "@variable") continue;
              if (v._value !== undefined || (v._error !== undefined && v._error !== null)) continue;
              if (typeof moduleObj.value === "function") {
                jobs.push(Promise.race([
                  Promise.resolve(moduleObj.value(n)).catch(() => {}),
                  new Promise((r) => setTimeout(r, 4000)),
                ]));
              }
            }
            if (jobs.length) { try { await Promise.all(jobs); } catch {} await new Promise((r) => setTimeout(r, 60)); }
          }

          // --- live modules + variables ---
          const idMap = buildModuleIdMap();
          result.modules = {};
          result.errors = [];
          for (const { v, moduleObj } of allVariables()) {
            const id = idMap.get(moduleObj);
            if (!id) continue; // skip modules we cannot name (builtins / imports)
            if (!result.modules[id]) result.modules[id] = { variables: [] };

            const name = v._name || "";
            let source = "";
            try { source = v._definition ? String(v._definition) : ""; } catch { source = ""; }
            const hasError = v._error !== undefined && v._error !== null;
            const value = v._value;
            const isSvg = isSvgValue(value);
            result.modules[id].variables.push({
              name,
              source,
              hasError,
              error: hasError ? String(v._error?.message ?? v._error) : null,
              valueType: valueType(value),
              valuePreview: preview(value),
              isSvg,
            });
            if (hasError) {
              result.errors.push(`${id}:${name}: ${String(v._error?.message ?? v._error)}`);
            }
          }

          return result;
        },
        { question, model, timeoutMs },
      );

      snapshot.console = consoleEvents;
      return snapshot;
    } catch (e) {
      partial.error = e?.message ?? String(e);
      partial.console = consoleEvents;
      return partial;
    } finally {
      if (page) {
        try { await page.context().close(); } catch {}
      }
    }
  }

  async function close() {
    try { await browser.close(); } catch {}
  }

  return { runQuestion, close };
}
