// Shared Playwright driver core for the robocoop live eval harnesses (robocoop-4 AND robocoop-5).
//
// Everything notebook-agnostic lives here: boot, key/model injection, client/session readiness, the
// send-and-snapshot evaluate, force-compute of lazy cells, console capture, per-question isolation.
// The `harness` object carries the per-notebook seams:
//   defaultLayout      — lopepage hash layout when the caller passes none
//   readyToolId        — tool id that must be registered before send (null = don't gate; legacy builds)
//   extraForceVars     — extra variable names to force while waiting for session readiness
//   forceModulePrefix  — module-id substring whose cells are force-computed for the snapshot
//   settleMs           — post-turn settle before force-compute (sync applies need less than a poll loop)
//   seedFiles(page, files)   — apply evalDef.setup.files to the live notebook
//   collectFiles(page)       — return {path: contents} for snapshot.files
// The api key is NEVER logged.

import { chromium } from "playwright";

export async function createDriver({
  notebookPath,
  apiKey,
  model = "xiaomi/mimo-v2.5-pro",
  layout,
  timeoutMs = 120000,
  headed = false,
  harness,
} = {}) {
  if (!notebookPath) throw new Error("createDriver requires notebookPath");
  if (!apiKey) throw new Error("createDriver requires apiKey");
  if (!harness) throw new Error("createDriver requires a harness config");
  const pageLayout = layout || harness.defaultLayout;

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

      // setup.routes — deterministic network fixtures: fulfill the sentinel URL with a known payload so
      // the OUTCOME (the fetched value living in a cell) is reproducible.
      if (evalDef?.setup?.routes) {
        for (const r of evalDef.setup.routes) {
          await context.route(r.url, (route) => route.fulfill({
            status: r.status ?? 200,
            contentType: r.contentType ?? "application/json",
            body: typeof r.body === "string" ? r.body : JSON.stringify(r.body),
          }));
        }
      }

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

      const url = `file://${notebookPath}#view=${pageLayout}`;
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
              // A <select> silently rejects a value not among its <option>s (the model picker's options come
              // from an async catalog that may omit the requested model — old builds, or a slow/failed fetch).
              // The harness is forcing a config, so inject the option if missing, then select it.
              if (input.tagName === "SELECT" && ![...input.options].some((o) => o.value === value)) {
                const opt = input.ownerDocument.createElement("option");
                opt.value = value; opt.textContent = value;
                input.appendChild(opt);
              }
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

      // Step 3 (c): WAIT for `session` to be ready (exposes send()) before sending. `session` depends on
      // `viewof model`, whose <select> options now come from a LIVE OpenRouter catalog fetch (up to ~8s), so
      // it settles noticeably after `client`. Observe it + poll until send() exists — kills the prior
      // "session unavailable" boot race (which produced misleading steps=0 / 0-score evals).
      const sessionReady = await page.evaluate(
        async ({ pollMs, maxMs, wantModel, readyToolId, extraForceVars }) => {
          const reg = globalThis.__ojs_runtime;
          const allVars = () => {
            const out = []; const seen = new Set();
            for (const m of reg.mains.values()) {
              const rt = m && m._runtime;
              if (!rt || seen.has(rt)) continue;
              seen.add(rt);
              for (const v of rt._variables) out.push(v);
            }
            return out;
          };
          const byName = (n) => allVars().find((v) => v._name === n);
          // Ready = session.send exists AND the hostbridge file tools are registered. Gating only on
          // session.send sends before _hostSetup registers read_file/write_file/edit_file, so the agent's
          // first step calls an unregistered tool ("unknown tool read_file") and wastes a step.
          const ready = () => {
            const s = byName("session");
            if (!(s && s._value && typeof s._value.send === "function")) return false;
            // Wait for the harness's file tools to register — gating only on session.send races the
            // host setup and wastes the agent's first step on "unknown tool <readyToolId>".
            if (readyToolId) {
              const tv = byName("toolsView");
              const arr = tv && tv._value && Array.isArray(tv._value.value) ? tv._value.value : [];
              if (!arr.some((t) => t && t.id === readyToolId)) return false;
            }
            // The model picker must have RESOLVED to the requested model before we send. Its <select> options
            // come from an async catalog fetch, so a value not yet in the option list reads as "" → chat sends
            // an empty model → OpenRouter 400 "No models provided" (the first-turn race). Gate on it explicitly.
            const mv = byName("model");
            const me = byName("viewof model");
            const resolved = (mv && mv._value) || (me && me._value && me._value.value);
            return resolved === wantModel;
          };
          const deadline = Date.now() + maxMs;
          while (Date.now() < deadline) {
            if (ready()) return true;
            for (const n of ["viewof model", "model", "session", "toolsView", "hostSetup", ...extraForceVars]) {
              const v = byName(n);
              try { if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {}); } catch {}
            }
            await new Promise((r) => setTimeout(r, pollMs));
          }
          return ready();
        },
        { pollMs: 250, maxMs: 30000, wantModel: model, readyToolId: harness.readyToolId ?? null, extraForceVars: harness.extraForceVars ?? [] },
      );

      if (!sessionReady) {
        partial.error = "session did not initialize (no session.send after client ready)";
        partial.console = consoleEvents;
        return partial;
      }

      // Step 4: seed files (if any) before sending — through the harness's seam.
      if (evalDef?.setup?.files && Object.keys(evalDef.setup.files).length) {
        await harness.seedFiles(page, evalDef.setup.files);
      }

      // Modules referenced by this eval's criteria — force-compute their (possibly lazy) vars so live
      // checks on EXISTING modules (e.g. editing @tomlarkworthy/exporter-3's title) read real values.
      const targetModules = [];
      for (const c of evalDef?.criteria || []) {
        const a = c?.args || {};
        if (a.module) targetModules.push(a.module);
        if (a.id) targetModules.push(a.id);
      }

      // Step 6: send the question (raced against timeout) and build the WorldSnapshot — all in-page so
      // we have synchronous access to live runtime values.
      const snapshot = await page.evaluate(
        async ({ question, model, timeoutMs, targetModules, followups, forceModulePrefix, settleMs }) => {
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
              // Multi-turn: send the question then each followup as a SEPARATE turn on the same session, so a
              // "build then adjust" eval edits code written by a prior turn (the byte-stability stress point).
              // Snapshot is taken after the final turn; steps/usage accumulate across turns.
              const prompts = [question, ...(followups || [])];
              let acc = 0, lastFinish = null, usage = null;
              for (const p of prompts) {
                const turn = await Promise.race([session.send(p), timeout]);
                if (turn && typeof turn === "object") {
                  if (typeof turn.steps === "number") acc += turn.steps;
                  if (turn.finishReason != null) lastFinish = turn.finishReason;
                  if (turn.usage) usage = turn.usage;
                }
              }
              result.steps = acc;
              if (lastFinish != null) result.finishReason = lastFinish;
              if (usage) result.usage = usage;
            } catch (e) {
              result.ok = false;
              result.error = e?.message ?? String(e);
            } finally {
              clearTimeout(timer);
            }
          }
          result.durationMs = Date.now() - startedAt;
          if (!result.usage && session && session.usage) result.usage = { ...session.usage };  // fallback (e.g. on timeout)

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

          // An empty turn (no assistant messages at all) means the session never ran — a transient
          // boot/key/network race, NOT a legitimate "agent did nothing". Flag it so the run is retried
          // and criteria short-circuit to run-failed rather than scoring a misleading partial.
          if (result.ok && result.conversation.length === 0) {
            result.ok = false;
            result.error = "empty turn: session produced no messages (transient)";
          }

          // --- force-compute lazy cells so values are readable. Newly host_applied cells are LAZY:
          // their _value stays undefined until something observes them, and the reactive recompute
          // settles on a MACROTASK — so reading v._value right after value(n) races and reads undefined.
          // Fix (robocoop-2 pattern): fire value(n) for every eval-relevant cell, let the scheduler run
          // (macrotask settle), then AWAIT each variable's _promise so _value reflects the result.
          // Scope to @user/*, the harness's own modules and criteria targets — not the whole library. ---
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const targetSet = new Set(targetModules || []);
          const isEvalVar = (id, n) =>
            id && (id.startsWith("@user/") || id.includes(forceModulePrefix) || targetSet.has(id)) &&
            n && !String(n).startsWith("module ") && n !== "@variable";
          // Per-harness settle: robocoop-5 applies synchronously in the tool call (short settle);
          // robocoop-4's jbFileSync watch loop applies a beat later (~600ms poll → longer settle).
          await sleep(settleMs);
          {
            const idMapF = buildModuleIdMap();
            for (const { v, moduleObj } of allVariables()) {
              const id = idMapF.get(moduleObj) || moduleObj._name; // _name: newly createModule'd modules
              if (!isEvalVar(id, v._name)) continue;
              if (v._value !== undefined || (v._error != null)) continue;
              if (typeof moduleObj.value === "function") {
                try { Promise.resolve(moduleObj.value(v._name)).catch(() => {}); } catch {}
              }
            }
            // let the reactive chain run (macrotask), then await the settled promises.
            await sleep(400);
            const waits = [];
            for (const { v, moduleObj } of allVariables()) {
              const id = idMapF.get(moduleObj) || moduleObj._name;
              if (!isEvalVar(id, v._name)) continue;
              if (v._promise && typeof v._promise.then === "function") {
                waits.push(Promise.race([v._promise.catch(() => {}), sleep(4000)]));
              }
            }
            if (waits.length) { try { await Promise.all(waits); } catch {} await sleep(150); }
          }

          // --- live modules + variables ---
          const idMap = buildModuleIdMap();
          result.modules = {};
          result.errors = [];
          for (const { v, moduleObj } of allVariables()) {
            const id = idMap.get(moduleObj) || moduleObj._name; // _name: newly createModule'd modules
            if (!id) continue; // skip modules we cannot name (builtins / imports)
            if (!result.modules[id]) result.modules[id] = { variables: [] };

            const name = v._name || "";
            let source = "";
            try { source = v._definition ? String(v._definition) : ""; } catch { source = ""; }
            const hasError = v._error !== undefined && v._error !== null;
            let value = v._value;
            // eval-relevant cell still unsettled? await its promise to get the resolved value.
            if (value === undefined && !hasError && isEvalVar(id, name) && v._promise && typeof v._promise.then === "function") {
              try { value = await Promise.race([v._promise, sleep(2000).then(() => v._value)]); }
              catch { value = v._value; }
            }
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
        { question, model, timeoutMs, targetModules, followups: evalDef.followups || [],
          forceModulePrefix: harness.forceModulePrefix, settleMs: harness.settleMs ?? 800 },
      );

      // --- files via the harness seam (after settle + force-compute, so file state is final) ---
      snapshot.files = snapshot.files || {};
      try {
        const files = await harness.collectFiles(page);
        if (files && typeof files === "object") {
          for (const [path, contents] of Object.entries(files)) {
            if (typeof contents === "string") snapshot.files[path] = contents;
          }
        }
      } catch (e) {
        snapshot.error = snapshot.error || ("file snapshot failed: " + (e?.message ?? e));
      }

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
