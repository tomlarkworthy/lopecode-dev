// Playwright headless driver for the robocoop-4 live eval harness.
//
// Boots the REAL @tomlarkworthy_robocoop-4.html notebook in headless Chromium, injects an OpenRouter
// key + model, sends one question through the live `session`, then snapshots the world per CONTRACT.md.
// One fresh page per question (isolation). The api key is NEVER logged.

import { chromium } from "playwright";

const DEFAULT_LAYOUT =
  "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";

// Off-distribution "structured runtime API" arm: the agent builds/edits notebook modules ONLY through
// a semantic variable API (create_module / define_variable / delete_variable / list_variables / eval_code)
// — no shell, no files, no Read/Write/Edit. This prompt REPLACES the bash/Claude-tools prompt so the agent
// isn't fighting instructions for tools it no longer has. Same Observable conventions, different surface.
const STRUCTURED_SYSTEM_PROMPT = `You are a coding agent that builds and edits Observable-runtime notebook modules.

You have NO shell and NO file access. You change the live notebook ONLY through these tools:
- create_module({name}) — create a module, e.g. "@user/store", BEFORE defining variables into it.
- define_variable({name, definition, inputs, module}) — define (or REDEFINE, to update) one reactive
  variable. \`definition\` is a function-string whose params are the \`inputs\` array, e.g.
  define_variable({name:"subtotal", definition:"(price,qty)=>price*qty", inputs:["price","qty"], module:"@user/store"}).
- delete_variable({name, module}) — remove a variable.
- list_variables({module}) — list variable names in a module (use to inspect current state).
- eval_code({code}) — evaluate JS in the page to read values / verify (e.g. read a cell's computed value).

Observable conventions:
- One variable per define_variable call; variables recompute reactively from their \`inputs\`.
- To update a variable, call define_variable again with the same name (it redefines in place).
- The \`inputs\` array and the function PARAMETERS line up 1:1, in order. The body can ONLY reference its
  parameters — there are NO globals. To use a builtin (html, md, Inputs, Generators, d3) OR another cell you
  MUST list it in \`inputs\` AND accept it as a parameter; a name in the body but missing from \`inputs\` is
  undefined and the cell silently never resolves.
- An interactive input is TWO variables:
  (1) element: define_variable({name:"viewof qty", definition:"(Inputs)=>Inputs.range([1,20],{value:3,step:1})", inputs:["Inputs"]})
  (2) value:   define_variable({name:"qty", definition:"(Generators,$)=>Generators.input($)", inputs:["Generators","viewof qty"]})
- A display cell returns a DOM node, e.g. definition:"(html,total)=>html\`<div>Total: \${total}</div>\`", inputs:["html","total"].
- Builtins (html, md, Inputs, Generators, d3, …) are injected ONLY when named in \`inputs\`.

Work step by step. Verify with list_variables / eval_code. When done, call task_complete with a short summary.`;

export async function createDriver({
  notebookPath,
  apiKey,
  model = "xiaomi/mimo-v2.5-pro",
  layout = DEFAULT_LAYOUT,
  timeoutMs = 120000,
  headed = false,
  legacyNoToolGate = false,
  toolSurface = null,
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

      // setup.routes — deterministic network fixtures. The just-bash shell has NO real network, so a
      // network task can only succeed via eval_js/cell fetch; these routes fulfill the sentinel URL with a
      // known payload so the OUTCOME (the fetched value living in a cell) is reproducible and curl can't pass.
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
        async ({ pollMs, maxMs, wantModel, legacyNoToolGate }) => {
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
            // Default: wait for the Claude-shaped file tools to register (read_file). A legacy/foreign build
            // that predates them (the bash-only A/B arm) never registers read_file, so skip this check there.
            if (!legacyNoToolGate) {
              const tv = byName("toolsView");
              const arr = tv && tv._value && Array.isArray(tv._value.value) ? tv._value.value : [];
              if (!arr.some((t) => t && t.id === "read_file")) return false;
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
            for (const n of ["viewof model", "model", "session", "toolsView", "hostSetup"]) {
              const v = byName(n);
              try { if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {}); } catch {}
            }
            await new Promise((r) => setTimeout(r, pollMs));
          }
          return ready();
        },
        { pollMs: 250, maxMs: 30000, wantModel: model, legacyNoToolGate },
      );

      if (!sessionReady) {
        partial.error = "session did not initialize (no session.send after client ready)";
        partial.console = consoleEvents;
        return partial;
      }

      // Step 3.5 (OFF-DISTRIBUTION ARM): swap the agent's tool surface to the structured runtime API.
      // Removes bash + Read/Write/Edit (the on-distribution shape models are RL'd on) and exposes ONLY the
      // semantic variable tools, reusing the REAL @tomlarkworthy/claude-code-pairing handlers (so define_variable
      // here IS the production define_variable — same realize/observer/module-resolution, not a re-impl). Also
      // swaps the system prompt to match the new surface. The session re-reads tools+prompt live each step.
      if (toolSurface === "structured") {
        const swapped = await page.evaluate(
          async ({ structuredPrompt, model }) => {
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
            const byName = (n) => { const v = allVars().find((x) => x._name === n); return v && v._value; };
            const runtime = byName("runtime") || reg;
            const createModule = byName("createModule");
            const createAgentSession = byName("createAgentSession");
            const client = byName("client");
            const observe = byName("observe"); // runtime-sdk: forces compute + persistent observation
            if (!createModule || !createAgentSession || !client)
              return { ok: false, error: "missing runtime hooks (createModule/createAgentSession/client)" };
            const ojsObs = (typeof window.__ojs_observer === "function") ? window.__ojs_observer : null;
            // Resolve a module by name DIRECTLY from runtime.mains (synchronous + authoritative — avoids the
            // reactive `currentModules` lag that makes a create→define back-to-back race "module not found").
            const findMod = (name) => {
              if (!name) return null;
              if (runtime.mains && runtime.mains.has(name)) return runtime.mains.get(name);
              return null;
            };
            // Tool surface = the structured runtime API (own impl, same semantics as the pairing handlers:
            // realize-by-eval → variable(observer).define; redefine in place when the name already exists).
            const tools = [
              {
                id: "create_module",
                description: "Create a notebook module (e.g. \"@user/store\") so variables can be defined into it.",
                parameters: { type: "object", properties: { name: { type: "string", description: "Module name, e.g. @user/store" } }, required: ["name"] },
                execute: async (a) => {
                  if (!a.name) return { output: "Error: name required" };
                  if (findMod(a.name)) return { output: JSON.stringify({ success: true, name: a.name, note: "already exists" }) };
                  try { createModule(a.name, runtime); return { output: JSON.stringify({ success: true, name: a.name }) }; }
                  catch (e) { return { output: "Error: " + (e && e.message || e) }; }
                },
              },
              {
                id: "define_variable",
                description: "Define or redefine one reactive variable from a function-string + its inputs.",
                parameters: { type: "object", properties: {
                  name: { type: "string" },
                  definition: { type: "string", description: "function string, e.g. (x,y)=>x+y" },
                  inputs: { type: "array", items: { type: "string" }, description: "dependency variable names" },
                  module: { type: "string", description: "target module name" },
                }, required: ["name", "definition"] },
                execute: async (a) => {
                  let inputs = a.inputs;
                  if (typeof inputs === "string") { try { inputs = JSON.parse(inputs); } catch { inputs = []; } }
                  if (!Array.isArray(inputs)) inputs = [];
                  const mod = findMod(a.module);
                  if (!mod) return { output: "Error: Module not found: " + (a.module || "(none)") + " — call create_module first" };
                  let fn;
                  try { fn = (0, eval)("(" + a.definition + ")"); } catch (e) { return { output: "Error: bad definition: " + (e && e.message || e) }; }
                  if (typeof fn !== "function") return { output: "Error: definition must evaluate to a function" };
                  try {
                    const existing = mod._scope && mod._scope.get(a.name);
                    if (existing) existing.define(a.name, inputs, fn);
                    else mod.variable(ojsObs ? ojsObs(a.name) : {}).define(a.name, inputs, fn);
                    // Persistently OBSERVE the cell — same as the hostbridge's probeAndWatch does for file-edited
                    // cells. Without this, `Generators.input(viewof x)` cells never pump in headless (no inspector),
                    // so price/qty/subtotal/total stay undefined and grade wrong — an unfair harness gap, not a
                    // model failure. observe() forces compute + keeps the generator advancing.
                    if (observe) {
                      const nv = mod._scope && mod._scope.get(a.name);
                      if (nv) { try { observe(nv, { fulfilled() {}, rejected() {}, pending() {} }, { invalidation: new Promise(() => {}) }); } catch {} }
                    }
                    return { output: JSON.stringify({ success: true, name: a.name, module: a.module }) };
                  } catch (e) { return { output: "Error: define failed: " + (e && e.message || e) }; }
                },
              },
              {
                id: "delete_variable",
                description: "Delete a variable by name from a module.",
                parameters: { type: "object", properties: { name: { type: "string" }, module: { type: "string" } }, required: ["name"] },
                execute: async (a) => {
                  const mod = findMod(a.module);
                  if (!mod) return { output: "Error: Module not found: " + (a.module || "(none)") };
                  const v = mod._scope && mod._scope.get(a.name);
                  if (!v) return { output: "Error: Variable not found: " + a.name };
                  try { v.delete(); return { output: JSON.stringify({ success: true, name: a.name }) }; }
                  catch (e) { return { output: "Error: " + (e && e.message || e) }; }
                },
              },
              {
                id: "list_variables",
                description: "List variable names in a module.",
                parameters: { type: "object", properties: { module: { type: "string" } }, required: [] },
                execute: async (a) => {
                  const mod = findMod(a.module);
                  if (!mod) return { output: "Error: Module not found: " + (a.module || "(none)") };
                  const names = [];
                  if (mod._scope) for (const [n, v] of mod._scope) names.push({ name: n, hasValue: v._value !== undefined, hasError: v._error !== undefined });
                  names.sort((x, y) => x.name.localeCompare(y.name));
                  return { output: JSON.stringify(names) };
                },
              },
              {
                id: "eval_code",
                description: "Evaluate JavaScript in the page to read values / verify state. Use `return` for a value.",
                parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
                execute: async (a) => {
                  try {
                    const fn = new Function("return (async () => { " + String(a.code || "") + " })()");
                    const v = await fn();
                    return { output: typeof v === "string" ? v : JSON.stringify(v) };
                  } catch (e) { return { output: "Error: " + (e && e.message || e) }; }
                },
              },
            ];
            // Build a DEDICATED agent session whose toolsProvider is the structured set — bypassing the live
            // toolsView registry entirely. Why not just rewrite the registry: tool registration is REACTIVE
            // (the hostbridge's _hostSetup depends on `currentModules`, so the agent's own create_module/
            // define_variable recompute it and RE-REGISTER bash/Read/Write/Edit), and the registry element's
            // `value` is a non-configurable getter/setter, so it can be neither locked nor reliably overwritten.
            // A separate session with a fixed toolsProvider + matching prompt is race-free and exact. The driver
            // sends through window.__rc4_structured_session instead of the engine's `session`.
            const FIXED = tools;
            const customSession = createAgentSession({
              client,
              toolsProvider: () => FIXED,
              modelProvider: () => model,
              systemPromptProvider: () => structuredPrompt,
              // No shell in this arm; bash isn't in FIXED so this is never called, but the session expects it.
              runCommand: () => ({ stdout: "", stderr: "no shell in structured arm", exitCode: 1 }),
              noticesProvider: () => [],
              completeToolName: "task_complete",
              stallNudgeLimit: 2,
              maxStepsPerTurn: 40,
              maxTokens: 32000,
            });
            window.__rc4_structured_session = customSession;
            return { ok: true, toolIds: FIXED.map((t) => t.id) };
          },
          { structuredPrompt: STRUCTURED_SYSTEM_PROMPT, model },
        );
        if (!swapped || !swapped.ok) {
          partial.error = "structured tool-surface swap failed: " + (swapped?.error || "unknown");
          partial.console = consoleEvents;
          return partial;
        }
        console.log(`  [structured] dedicated session tools: ${swapped.toolIds.join(",")}`);
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
        async ({ question, model, timeoutMs, targetModules, followups, useStructuredSession }) => {
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
          // Structured arm: send through the dedicated session (fixed structured toolsProvider), not the
          // engine's `session` (whose registry the hostbridge keeps re-populating with bash/file tools).
          const session = (useStructuredSession && window.__rc4_structured_session) || findValue("session");
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

          // --- files via rc4_workspace.snapshot() ---
          result.files = {};
          const ws = findValue("rc4_workspace");
          if (ws && typeof ws.snapshot === "function") {
            try {
              const snap = await ws.snapshot();
              if (snap && typeof snap === "object") {
                for (const [path, contents] of Object.entries(snap)) {
                  // /content is the raw block mirror (megabytes of attachment/library bytes) — for the agent
                  // to read during the run, never needed for grading. Skip it so snapshots stay small.
                  if (path.startsWith("/content/")) continue;
                  if (typeof contents === "string") result.files[path] = contents;
                }
              }
            } catch (e) {
              result.error = result.error || ("workspace snapshot failed: " + (e?.message ?? e));
            }
          }

          // --- force-compute lazy cells so values are readable. Newly host_applied cells are LAZY:
          // their _value stays undefined until something observes them, and the reactive recompute
          // settles on a MACROTASK — so reading v._value right after value(n) races and reads undefined.
          // Fix (robocoop-2 pattern): fire value(n) for every eval-relevant cell, let the scheduler run
          // (macrotask settle), then AWAIT each variable's _promise so _value reflects the result.
          // Scope to @user/* and robocoop-4* so we don't compute the whole library. ---
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const targetSet = new Set(targetModules || []);
          const isEvalVar = (id, n) =>
            id && (id.startsWith("@user/") || id.includes("robocoop-4") || targetSet.has(id)) &&
            n && !String(n).startsWith("module ") && n !== "@variable";
          // Sync is REALTIME (jbFileSync watch loop, ~600ms poll): a module file the agent wrote during
          // the turn is applied to the live runtime a beat later. Wait a couple of poll cycles so newly
          // created/edited modules are live before we force-compute and snapshot.
          await sleep(2000);
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
        { question, model, timeoutMs, targetModules, followups: evalDef.followups || [], useStructuredSession: toolSurface === "structured" },
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
