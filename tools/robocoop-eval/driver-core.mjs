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
//   collectAttachments(page) — OPTIONAL: return [{module,name,mimeType,size,text}] for snapshot.attachments
// ORACLE MODE (`opts.oracle`, per-eval `evalDef.oracle`): instead of sending the question to a model, the
// driver executes a scripted REFERENCE SOLUTION — a list of {tool, args} steps run against the live tool
// registry — and snapshots the result. Scoring an eval's own reference solution proves the criteria are
// satisfiable (a legal instance) and costs no tokens. It is a gate on the EVAL, never a measurement of
// the agent.
// The api key is NEVER logged.

import { chromium } from "playwright";

export async function createDriver({
  notebookPath,
  apiKey,
  model = "xiaomi/mimo-v2.5-pro",
  layout,
  timeoutMs = 120000,
  headed = false,
  oracle = false,
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
    let question = String(evalDef?.question ?? "");
    // evalDef.resume: array of prior-conversation messages (WITHOUT the leading system prompt —
    // send() re-adds it). They are pushed into session.messages, then the turn continues with
    // send(question) — or send(null) when `question` is empty, which pushes no user message at all.
    // Two callers: attribute.mjs re-runs a trajectory PREFIX with no new question (send(null), the
    // model just carries on), and run-agent.mjs's warm attempt 2 resumes the whole attempt-1
    // conversation and asks a new question on top of it (the aider retry protocol).
    const resume = Array.isArray(evalDef?.resume) && evalDef.resume.length ? evalDef.resume : null;
    const partial = { ok: false, error: null, question, model, durationMs: 0, steps: 0 };
    const consoleEvents = [];

    let page;
    try {
      const context = await browser.newContext();

      // setup.localDisk {root, name?} — a faked File System Access directory (fake-local-disk.mjs)
      // backed by the host directory `root`: window.showDirectoryPicker() resolves to it, so the
      // notebook's ordinary "Mount local folder" path mounts it at /local-disk with no dialog.
      if (evalDef?.setup?.localDisk?.root) {
        const { installFakeLocalDisk } = await import("./fake-local-disk.mjs");
        await installFakeLocalDisk(context, evalDef.setup.localDisk);
      }

      // setup.routes — deterministic network fixtures: fulfill the sentinel URL with a known payload so
      // the OUTCOME (the fetched value living in a cell) is reproducible.
      if (evalDef?.setup?.routes) {
        for (const r of evalDef.setup.routes) {
          // bodyBase64 serves BYTES (a gzipped bundle); body serves text. Playwright's fulfill takes
          // either a string or a Buffer, and a gzip payload must not go through JSON.stringify.
          const body = r.bodyBase64 != null
            ? Buffer.from(r.bodyBase64, "base64")
            : typeof r.body === "string" ? r.body : JSON.stringify(r.body);
          await context.route(r.url, (route) => route.fulfill({
            status: r.status ?? 200,
            contentType: r.contentType ?? "application/json",
            body,
          }));
        }
      }

      // setup.initScript — page JS installed BEFORE the notebook boots (Playwright addInitScript), for
      // anything the notebook's cells capture at compute time: the OpenRouter client keeps the
      // globalThis.fetch it saw when it was created, so a wrapper installed after boot is invisible.
      if (typeof evalDef?.setup?.initScript === "string" && evalDef.setup.initScript.trim()) {
        await context.addInitScript(evalDef.setup.initScript);
      }
      page = await context.newPage();
      let cdpSession = null;
      try { cdpSession = await context.newCDPSession(page); } catch (e) { cdpSession = null; console.warn("  ..no CDP session: " + (e?.message ?? e)); }
      page.on("crash", () => console.warn("  ..page crashed"));
      page.on("close", () => console.warn("  ..page closed"));

      // Capture errors/warnings for the whole lifetime of this page (step 5).
      page.on("console", (msg) => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          consoleEvents.push({ t: Date.now(), type: type === "warning" ? "warning" : "error", text: msg.text() });
        }
      });
      page.on("pageerror", (e) => consoleEvents.push({ t: Date.now(), type: "error", text: e.message }));

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
      // then poll until `client` is a real (non-null) OpenRouter client. Oracle runs never send, so they
      // skip both model-facing gates (no key needed) and wait only for the tool registry + host seam.
      const clientReady = oracle ? true : await page.evaluate(
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
      const sessionReady = oracle ? await page.evaluate(
        async ({ pollMs, maxMs, readyToolId, extraForceVars }) => {
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
          const ready = () => {
            const tv = byName("toolsView");
            const arr = tv && tv._value && Array.isArray(tv._value.value) ? tv._value.value : [];
            if (readyToolId && !arr.some((t) => t && t.id === readyToolId)) return false;
            return extraForceVars.every((n) => byName(n)?._value != null);
          };
          const deadline = Date.now() + maxMs;
          while (Date.now() < deadline) {
            if (ready()) return true;
            for (const n of ["toolsView", "hostSetup", ...extraForceVars]) {
              const v = byName(n);
              try { if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {}); } catch {}
            }
            await new Promise((r) => setTimeout(r, pollMs));
          }
          return ready();
        },
        { pollMs: 250, maxMs: 60000, readyToolId: harness.readyToolId ?? null, extraForceVars: harness.extraForceVars ?? [] },
      ) : await page.evaluate(
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
        partial.error = oracle
          ? "oracle: tool registry / host seam did not become ready"
          : "session did not initialize (no session.send after client ready)";
        partial.console = consoleEvents;
        return partial;
      }

      // Step 4: seed files (if any) before sending — through the harness's seam.
      let seedFailures = [];
      if (evalDef?.setup?.files && Object.keys(evalDef.setup.files).length) {
        const r = await harness.seedFiles(page, evalDef.setup.files);
        if (Array.isArray(r)) seedFailures = r;
        // The agent, not the log, has to know its module did not come back as a module.
        if (seedFailures.length && question)
          question += "\n\nWARNING: these files of yours could not be re-applied as modules and are stored as text only — fix or rewrite them before relying on them: " + seedFailures.join("; ");
      }
      // setup.localDisk — mount the faked directory through the harness's own mount seam (the same
      // code path a user's button click takes), after seeding so tools re-register once.
      if (evalDef?.setup?.localDisk?.root) {
        if (typeof harness.mountLocalDisk !== "function") throw new Error("harness has no mountLocalDisk seam");
        await harness.mountLocalDisk(page);
      }
      // setup.init — page-side JS run once after seeding, before the question (e.g. install a
      // helper the eval's environment note documents). A string, evaluated in the page.
      if (typeof evalDef?.setup?.init === "string" && evalDef.setup.init.trim()) {
        await page.evaluate(evalDef.setup.init);
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
      // evalDef.steers [{atMs, text}] — timed user messages injected into the RUNNING turn through
      // session.steer (what a user watching the clock would type). The turn's wall clock is invisible
      // to the model otherwise; run 2026-09-02d lost three tasks' work to the cut with nothing written.
      const steerTimers = [];
      for (const st of Array.isArray(evalDef?.steers) ? evalDef.steers : []) {
        steerTimers.push(setTimeout(() => {
          page.evaluate((text) => {
            const reg = globalThis.__ojs_runtime;
            for (const m of reg.mains.values()) {
              const rt = m && m._runtime;
              if (!rt) continue;
              for (const v of rt._variables) if (v._name === "session" && v._value && typeof v._value.steer === "function") { v._value.steer(text); return true; }
            }
            return false;
          }, st.text).catch(() => {});
        }, st.atMs));
      }
      // A cell or snippet that never yields wedges the page: the in-page timeout, the steers and
      // every evaluate hang with it, and the conversation is lost (2026-09-03h, mri: 33 min, no
      // result). So the turn evaluate is raced against a node-side clock; on expiry the running
      // script is terminated over CDP and the conversation is read out of the (now responsive) page.
      let snapshot;
      let wedgeTimer;
      const turnT0 = Date.now();
      // The in-page timeout fires late in a headless page (arm y 2026-09-04: every turn "wedged" at
      // timeout + 4..128 s with the session intact), so the node-side clock must trail it by more
      // than that or a healthy turn takes the terminate path. 180 s; the freeze watchdog covers a
      // page that is actually stuck long before this.
      const WEDGE_MARGIN_MS = 180000;
      const wedged = new Promise((r) => { wedgeTimer = setTimeout(() => r("__wedged__"), timeoutMs + WEDGE_MARGIN_MS); });
      // A page frozen by one synchronous tool call (ode 2026-09-04: 19, 28 and 21 min grid searches in
      // eval_js) used to hold the turn until that clock. A heartbeat evaluate every 15 s now detects
      // the freeze; unanswered for freezeMs (default 5 min) it triggers the same recovery early.
      const freezeMs = evalDef.freezeMs ?? 300000;
      let hbStop = false; const hbTimers = [];
      const frozen = new Promise((resolve) => {
        let frozenSince = null;
        const tick = async () => {
          if (hbStop) return;
          const t0 = Date.now();
          let alive = true;
          try {
            await Promise.race([page.evaluate(() => 1), new Promise((_, rej) => hbTimers.push(setTimeout(() => rej(new Error("hb")), 30000)))]);
          } catch { alive = false; }
          if (hbStop) return;
          if (alive) frozenSince = null;
          else {
            frozenSince ??= t0;
            if (Date.now() - frozenSince >= freezeMs) {
              console.warn("  ..page unresponsive for " + Math.round((Date.now() - frozenSince) / 1000) + "s: treating the turn as wedged");
              return resolve("__wedged__");
            }
          }
          hbTimers.push(setTimeout(tick, 15000));
        };
        hbTimers.push(setTimeout(tick, 15000));
      });
      try {
      const evaluated = page.evaluate(
        async ({ question, model, timeoutMs, targetModules, followups, forceModulePrefix, settleMs, resume, oracleSteps }) => {
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

          // --- ORACLE: run the scripted reference solution instead of asking a model ---
          const oracleCalls = [];
          const oracleMessages = [];
          if (oracleSteps) {
            oracleMessages.push({ role: "user", content: question });
            // toolsView recomputes whenever modules change, so a tool can be transiently absent.
            const toolsNow = () => {
              const tv = findValue("toolsView");
              return Array.isArray(tv?.value) ? tv.value : [];
            };
            for (const step of oracleSteps) {
              if (step.assistant != null) {
                oracleMessages.push({ role: "assistant", content: String(step.assistant) });
                continue;
              }
              let tool = null;
              for (let i = 0; i < 40 && !tool; i++) {
                tool = toolsNow().find((t) => t && t.id === step.tool);
                if (!tool) await new Promise((r) => setTimeout(r, 250));
              }
              if (!tool) {
                result.ok = false;
                result.error = "oracle: tool not registered: " + step.tool;
                break;
              }
              const out = await tool.execute(step.args || {}, {});
              oracleCalls.push({ name: step.tool, arguments: step.args || {} });
              oracleMessages.push({ role: "assistant", content: "", tool_calls: [{ function: { name: step.tool, arguments: JSON.stringify(step.args || {}) } }] });
              oracleMessages.push({ role: "tool", content: String(out?.output ?? "") });
              if (step.settleMs) await new Promise((r) => setTimeout(r, step.settleMs));
            }
            result.steps = oracleCalls.length;
            result.finishReason = "oracle";
          }

          // --- send the question, raced against the timeout ---
          const session = oracleSteps ? null : findValue("session");
          if (oracleSteps) {
            // no model turn
          } else if (!session || typeof session.send !== "function") {
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
              // Resume mode: inject the prior conversation, then run ONE turn on top of it — with the
              // new question if there is one, else send(null) (no user message pushed; the loop just
              // proceeds from the injected history).
              if (resume) {
                for (const m of resume) session.messages.push(m);
              }
              const prompts = resume ? [question || null] : [question, ...(followups || [])];
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
          const messages = oracleSteps
            ? oracleMessages
            : (session && Array.isArray(session.messages) ? session.messages : []);
          result.conversation = messages.map((m) => {
            const out = { role: m.role, content: m.content ?? "" };
            if (Array.isArray(m.tool_calls)) out.tool_calls = m.tool_calls;
            if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
            return out;
          });
          // steps fallback = count of assistant messages this conversation.
          if (!result.steps && !oracleSteps) {
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
          if (result.ok && !oracleSteps && result.conversation.length === 0) {
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
          forceModulePrefix: harness.forceModulePrefix, settleMs: harness.settleMs ?? 800, resume,
          oracleSteps: oracle ? (evalDef.oracle || []) : null },
      );
      const raced = await Promise.race([evaluated.then((v) => ({ v })), wedged, frozen]);
      if (raced === "__wedged__") {
        console.warn("  ..turn wedged (" + (Date.now() - turnT0) + "ms in): terminating page execution");
        const withIn = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(l + " hung " + ms + "ms")), ms))]);
        try {
          const cdp = cdpSession || await withIn(context.newCDPSession(page), 20000, "newCDPSession");
          await withIn(cdp.send("Runtime.terminateExecution"), 20000, "terminateExecution");
          console.warn("  ..terminateExecution acknowledged");
        } catch (e) { console.warn("  ..terminateExecution failed: " + (e?.message ?? e)); }
        evaluated.catch(() => {});
        snapshot = await page.evaluate(() => {
          const reg = globalThis.__ojs_runtime;
          let session = null;
          for (const m of reg.mains.values()) { const rt = m && m._runtime; if (!rt) continue;
            for (const v of rt._variables) if (v._name === "session") { session = v._value; break; } if (session) break; }
          const messages = session && Array.isArray(session.messages) ? session.messages : [];
          const conversation = messages.map((m) => { const o = { role: m.role, content: m.content ?? "" }; if (Array.isArray(m.tool_calls)) o.tool_calls = m.tool_calls; if (m.tool_call_id) o.tool_call_id = m.tool_call_id; return o; });
          const toolCalls = []; for (const m of messages) if (Array.isArray(m.tool_calls)) for (const tc of m.tool_calls) { let a = {}; try { a = JSON.parse(tc.function?.arguments || "{}"); } catch {} toolCalls.push({ name: tc.function?.name, arguments: a }); }
          return { ok: false, error: "page wedged: execution terminated after the turn timeout", question: "", model: "", durationMs: 0, steps: messages.filter((m) => m.role === "assistant").length, finishReason: "wedged", conversation, toolCalls, errors: [] };
        }).catch((e) => ({ ok: false, error: "page wedged and unrecoverable: " + (e?.message ?? e), question: "", model: "", durationMs: 0, steps: 0, finishReason: "wedged", conversation: [], toolCalls: [], errors: [] }));
      } else {
        snapshot = raced.v;
      }
      } finally { clearTimeout(wedgeTimer); hbStop = true; for (const t of hbTimers) clearTimeout(t); for (const t of steerTimers) clearTimeout(t); }

      // --- optional page-side tool timings: a setup.init that wraps tool.execute may leave
      // [{name, start, ms}] on globalThis.__rc5ToolTimes; wall time minus this is model time. ---
      const bounded = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + " timed out after " + ms + "ms")), ms))]);
      try { snapshot.toolTimes = await bounded(page.evaluate(() => globalThis.__rc5ToolTimes || null), 30000, "toolTimes"); } catch {}

      // --- files via the harness seam (after settle + force-compute, so file state is final) ---
      snapshot.files = snapshot.files || {};
      try {
        const files = await bounded(harness.collectFiles(page), 60000, "collectFiles");
        if (files && typeof files === "object") {
          for (const [path, contents] of Object.entries(files)) {
            if (typeof contents === "string") snapshot.files[path] = contents;
          }
        }
      } catch (e) {
        // Kept separate: when the turn already ended in an error (a timeout), a masked snapshot
        // failure silently empties the next turn's warm seeds (arm k, 2026-09-03: 4/5 modules lost).
        snapshot.filesError = String(e?.message ?? e);
        snapshot.error = snapshot.error || ("file snapshot failed: " + snapshot.filesError);
      }

      // --- file attachments via the optional harness seam. The vendoring evals grade on this:
      // bytes living in a module's FileAttachment map (what the exporter serializes) is what makes a
      // notebook self-contained, and no source check can distinguish it from a runtime CDN fetch. ---
      if (harness.collectAttachments) {
        try {
          const atts = await bounded(harness.collectAttachments(page), 60000, "collectAttachments");
          snapshot.attachments = Array.isArray(atts) ? atts : [];
        } catch (e) {
          snapshot.attachments = [];
          snapshot.error = snapshot.error || ("attachment snapshot failed: " + (e?.message ?? e));
        }
      } else {
        snapshot.attachments = [];
      }

      snapshot.console = consoleEvents;
      snapshot.seedFailures = seedFailures;
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
