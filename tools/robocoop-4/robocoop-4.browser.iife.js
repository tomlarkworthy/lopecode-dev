var __rc4core = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // entry.browser.mjs
  var entry_browser_exports = {};
  __export(entry_browser_exports, {
    composeFooter: () => composeFooter,
    createAgentLoop: () => createAgentLoop,
    createAgentSession: () => createAgentSession,
    createBashTool: () => createBashTool,
    createHostBridge: () => createHostBridge,
    createNotebookRunner: () => createNotebookRunner,
    createOpenRouterClient: () => createOpenRouterClient,
    createScriptedClient: () => createScriptedClient,
    defineTool: () => defineTool,
    formatResult: () => formatResult,
    idToPath: () => idToPath,
    listModuleFiles: () => listModuleFiles,
    pathToId: () => pathToId,
    recordClient: () => recordClient,
    systemPrompt: () => systemPrompt,
    truncate: () => truncate,
    validateParameters: () => validateParameters
  });

  // openrouter.mjs
  var DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
  var DEFAULT_MODEL = "anthropic/claude-sonnet-4";
  var envApiKey = () => typeof process !== "undefined" && process.env ? process.env.OPENROUTER_API_KEY : void 0;
  function createOpenRouterClient({
    apiKey = envApiKey(),
    fetch = globalThis.fetch,
    baseUrl = DEFAULT_BASE_URL,
    referer,
    title,
    defaultModel = DEFAULT_MODEL
  } = {}) {
    if (typeof fetch !== "function") {
      throw new Error("createOpenRouterClient: no fetch available (pass {fetch})");
    }
    const headers = () => {
      const h = { "Content-Type": "application/json" };
      const key = String(apiKey ?? "").trim();
      if (key) h.Authorization = `Bearer ${key}`;
      if (referer) h["HTTP-Referer"] = referer;
      if (title) h["X-Title"] = title;
      return h;
    };
    async function chat({
      model = defaultModel,
      messages,
      tools,
      tool_choice = "auto",
      temperature,
      max_tokens,
      signal
    } = {}) {
      const body = {
        model,
        messages,
        stream: false,
        // deterministic; no SSE parser in the hot path (streaming seam: lift this + parse response.body)
        ...tools && tools.length ? { tools, tool_choice } : {},
        ...temperature != null ? { temperature } : {},
        ...max_tokens != null ? { max_tokens } : {}
      };
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error("OpenRouter " + res.status + ": " + text);
      }
      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error("OpenRouter: no choices in response: " + JSON.stringify(data));
      }
      return { message: choice.message, finish_reason: choice.finish_reason, raw: data };
    }
    return { chat };
  }
  function recordClient(realClient, sink) {
    if (!Array.isArray(sink)) throw new Error("recordClient: sink must be an array");
    return {
      async chat(request) {
        const response = await realClient.chat(request);
        sink.push({ request, response });
        return response;
      }
    };
  }

  // scriptedClient.mjs
  function createScriptedClient(steps = []) {
    let i = 0;
    async function chat() {
      if (i >= steps.length) {
        return { message: { role: "assistant", content: "[scripted client exhausted]" }, finish_reason: "stop" };
      }
      const step = steps[i++];
      const message = { role: "assistant", content: step.content ?? null };
      if (step.tool_calls) {
        message.tool_calls = step.tool_calls.map((tc, idx) => ({
          id: tc.id ?? "call_" + (i - 1) + "_" + idx,
          type: "function",
          function: {
            name: tc.name,
            // arguments is ALWAYS a JSON STRING, matching OpenRouter wire shape.
            arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments ?? {})
          }
        }));
      }
      return {
        message,
        finish_reason: step.finish_reason ?? (step.tool_calls ? "tool_calls" : "stop"),
        raw: { scripted: true, index: i - 1 }
      };
    }
    return { chat };
  }

  // render.mjs
  function formatResult(r) {
    if (!r) return "(no output)";
    const parts = [];
    const stdout = r.stdout ?? "";
    const stderr = r.stderr ?? "";
    if (stdout) parts.push(stdout.replace(/\n$/, ""));
    if (stderr) parts.push(stderr.replace(/\n$/, ""));
    const exit = r.exitCode ?? 0;
    if (exit !== 0) parts.push("[exit " + exit + "]");
    if (parts.length === 0) return "(no output)";
    return parts.join("\n");
  }
  function truncate(text, limit) {
    const s = String(text ?? "");
    if (!limit || s.length <= limit) return s;
    const head = Math.ceil(limit / 2);
    const tail = Math.floor(limit / 2);
    const cut = s.length - head - tail;
    return s.slice(0, head) + "\n...[" + cut + " bytes truncated \u2014 use grep/sed to narrow]...\n" + s.slice(s.length - tail);
  }

  // agentSession.mjs
  function toWireTool(t) {
    return {
      type: "function",
      function: {
        name: t.id,
        description: String(t.description ?? ""),
        parameters: t.parameters ?? { type: "object", properties: {}, required: [] }
      }
    };
  }
  function createAgentSession({
    client,
    tools,
    // static array (convenience) ...
    toolsProvider,
    // ... OR a getter re-read each step: () => tool[]
    systemPrompt: systemPrompt2,
    // static string ...
    systemPromptProvider,
    // ... OR a getter re-read each turn: () => string
    model,
    // static model id ...
    modelProvider,
    // ... OR a getter re-read each step: () => string (lets the picker change live)
    maxStepsPerTurn = 12,
    toolChoice = "auto",
    toolOutputLimit = 8e3,
    runCommand
  } = {}) {
    if (!client || typeof client.chat !== "function")
      throw new Error("createAgentSession requires a client with a chat() method");
    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt2 ?? null);
    const getModel = modelProvider ?? (() => model);
    const messages = [];
    let currentAbort = null;
    function abort() {
      currentAbort?.abort();
    }
    function reset() {
      messages.length = 0;
    }
    async function send(userText, callbacks = {}) {
      const abortController = new AbortController();
      currentAbort = abortController;
      let metadata = {};
      const ctx = {
        callId: null,
        abort: abortController.signal,
        runCommand,
        metadata: (u) => {
          metadata = { ...metadata, ...u };
        },
        getMetadata: () => metadata
      };
      const sp = getSystemPrompt();
      if (sp != null) {
        const m = { role: "system", content: String(sp) };
        if (messages[0]?.role === "system") messages[0] = m;
        else messages.unshift(m);
      }
      if (userText != null) messages.push({ role: "user", content: String(userText) });
      let finishReason = null;
      let step = 0;
      const startLen = messages.length;
      for (step = 0; step < maxStepsPerTurn; step++) {
        if (abortController.signal.aborted) {
          finishReason = "aborted";
          break;
        }
        callbacks.onStep?.(step, messages);
        const live = getTools() ?? [];
        const wire = live.map(toWireTool);
        const byId = new Map(live.map((t) => [t.id, t]));
        const res = await client.chat({ model: getModel(), messages, tools: wire, tool_choice: toolChoice, signal: abortController.signal });
        const msg = res?.message;
        if (!msg) throw new Error("client.chat returned no message");
        messages.push(msg);
        if (msg.content) callbacks.onText?.(msg.content);
        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (calls.length === 0) {
          finishReason = res.finish_reason ?? "stop";
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }
        for (const call of calls) {
          const callId = call.id;
          const name = call?.function?.name;
          let args;
          try {
            const raw = call?.function?.arguments;
            args = raw == null || raw === "" ? {} : JSON.parse(raw);
          } catch {
            const content = "ERROR: could not parse tool arguments as JSON: " + String(call?.function?.arguments);
            messages.push({ role: "tool", tool_call_id: callId, content });
            callbacks.onToolResult?.(callId, content);
            continue;
          }
          const tool = byId.get(name);
          if (!tool) {
            const content = "ERROR: unknown tool " + String(name);
            messages.push({ role: "tool", tool_call_id: callId, content });
            callbacks.onToolResult?.(callId, content);
            continue;
          }
          callbacks.onToolCall?.(callId, name, args);
          let output;
          try {
            const r = await tool.execute(args, { ...ctx, callId });
            output = String(r?.output ?? "");
          } catch (e) {
            output = "ERROR: " + (e?.message ?? String(e));
          }
          output = truncate(output, toolOutputLimit);
          callbacks.onToolResult?.(callId, output);
          messages.push({ role: "tool", tool_call_id: callId, content: output });
        }
        if (step === maxStepsPerTurn - 1) finishReason = "max_steps";
      }
      return {
        messages,
        finishReason: finishReason ?? "max_steps",
        steps: step + 1,
        turnMessages: messages.slice(startLen)
      };
    }
    return { messages, send, abort, reset };
  }

  // agentLoop.mjs
  function createAgentLoop({
    client,
    tools = [],
    systemPrompt: systemPrompt2,
    model,
    maxSteps = 12,
    toolChoice = "auto",
    toolOutputLimit = 8e3,
    runCommand
  } = {}) {
    if (!client || typeof client.chat !== "function")
      throw new Error("createAgentLoop requires a client with a chat() method");
    async function run(userPrompt, callbacks = {}) {
      const session = createAgentSession({
        client,
        tools,
        systemPrompt: systemPrompt2,
        model,
        maxStepsPerTurn: maxSteps,
        toolChoice,
        toolOutputLimit,
        runCommand
      });
      const { messages, finishReason, steps } = await session.send(userPrompt, callbacks);
      return { messages, finishReason, steps };
    }
    return { run };
  }

  // defineTool.mjs
  function defineTool({ id, description, parameters, execute }) {
    if (!id || typeof id !== "string") throw new Error("Tool must have a string id");
    if (!description || typeof description !== "string")
      throw new Error("Tool must have a string description");
    if (!parameters || typeof parameters !== "object")
      throw new Error("Tool must have a parameters object");
    if (!execute || typeof execute !== "function")
      throw new Error("Tool must have an execute function");
    return {
      id,
      description,
      parameters,
      execute: async (args, ctx) => {
        try {
          if (ctx?.abort?.aborted)
            return { title: id + " aborted", output: "Execution was aborted", metadata: { aborted: true } };
          const result = await execute(args, ctx);
          return {
            title: result.title || id + " completed",
            output: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
            metadata: { ...ctx?.getMetadata?.() || {}, ...result.metadata }
          };
        } catch (error) {
          return {
            title: id + " failed",
            output: "Error: " + error.message,
            metadata: { error: true, errorMessage: error.message }
          };
        }
      }
    };
  }
  function validateParameters(schema, value) {
    const validate = (schema2, value2) => {
      const errors = [];
      if (!schema2 || typeof schema2 !== "object") return { valid: true, errors };
      const type = schema2.type;
      if (type === "object") {
        if (typeof value2 !== "object" || value2 === null || Array.isArray(value2)) {
          errors.push("Expected object");
          return { valid: false, errors };
        }
        const props = schema2.properties || {};
        const required = Array.isArray(schema2.required) ? schema2.required : [];
        for (const field of required) if (!(field in value2)) errors.push("Missing required field: " + field);
        if (schema2.additionalProperties === false) {
          for (const k of Object.keys(value2)) if (!(k in props)) errors.push("Unexpected field: " + k);
        }
        for (const [key, propSchema] of Object.entries(props)) {
          if (key in value2) {
            const r = validate(propSchema, value2[key]);
            if (!r.valid) errors.push(...r.errors.map((e) => key + ": " + e));
          }
        }
      } else if (type === "string") {
        if (typeof value2 !== "string") errors.push("Expected string, got " + typeof value2);
      } else if (type === "number") {
        if (typeof value2 !== "number" || Number.isNaN(value2)) errors.push("Expected number, got " + typeof value2);
      } else if (type === "integer") {
        if (typeof value2 !== "number" || !Number.isInteger(value2)) errors.push("Expected integer, got " + typeof value2);
      } else if (type === "boolean") {
        if (typeof value2 !== "boolean") errors.push("Expected boolean, got " + typeof value2);
      } else if (type === "array") {
        if (!Array.isArray(value2)) errors.push("Expected array, got " + typeof value2);
        else if (schema2.items) {
          value2.forEach((item, i) => {
            const r = validate(schema2.items, item);
            if (!r.valid) errors.push(...r.errors.map((e) => "[" + i + "]: " + e));
          });
        }
      }
      return { valid: errors.length === 0, errors };
    };
    return validate(schema, value);
  }

  // bashTool.mjs
  function createBashTool() {
    return defineTool({
      id: "bash",
      description: "Run a bash command in a sandboxed shell over an in-memory project filesystem (cat, grep, sed, ls, awk, head, tail, etc.). cwd and env persist across calls (they are threaded for you); only filesystem writes persist between commands. exitCode != 0 is normal tool output, not a crash \u2014 the full stdout, stderr and exit code are returned to you.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: `The bash command line to execute, e.g. "sed -n '1,40p' /notebook/@user/mod.js"`
          }
        },
        required: ["command"],
        additionalProperties: false
      },
      execute: async ({ command }, ctx) => {
        const r = await ctx.runCommand(command);
        return {
          title: "$ " + String(command).split("\n")[0],
          output: formatResult(r),
          metadata: { exitCode: r?.exitCode ?? 0 }
        };
      }
    });
  }

  // fsmap.mjs
  var NOTEBOOK_PREFIX = "/notebook/";
  function idToPath(id) {
    return NOTEBOOK_PREFIX + id + ".js";
  }
  function pathToId(path) {
    if (!path.startsWith(NOTEBOOK_PREFIX) || !path.endsWith(".js")) return null;
    return path.slice(NOTEBOOK_PREFIX.length, -".js".length);
  }
  function listModuleFiles(fs) {
    const all = typeof fs.getAllPaths === "function" ? fs.getAllPaths() : [];
    return all.filter((p) => p.startsWith(NOTEBOOK_PREFIX) && p.endsWith(".js"));
  }

  // systemPrompt.mjs
  var systemPrompt = `You are a coding agent that edits Observable notebook modules through a single bash tool.

Each live module is one JavaScript text file at /notebook/<moduleId>.js, e.g. /notebook/@user/mod.js.
A module's cells live inside its single define() body; edit cell bodies textually.

Use the bash tool for everything: ls, cat, grep, sed, awk, head, tail to read; sed -i, cat > file, or
printf piped into a file to write. exitCode != 0 is normal output, not a crash.

Work incrementally: inspect with cat/grep before editing, edit with sed/cat, then verify with cat/grep.
Keep edits minimal and preserve the existing cell format. When the task is done, stop and summarize.`;
  function composeFooter({ workdir = "/notebook", model } = {}) {
    const lines = ["", "Working directory: " + workdir];
    if (model) lines.push("Model: " + model);
    return lines.join("\n");
  }

  // notebookAdapter.mjs
  function createNotebookRunner({
    apiKey,
    model,
    systemPrompt: systemPrompt2,
    workdir = "/notebook",
    maxSteps = 12
  } = {}) {
    const bridge = globalThis.justbash;
    if (!bridge || typeof bridge.exec !== "function")
      throw new Error("createNotebookRunner: window.justbash.exec is unavailable \u2014 publish the justbash bridge first");
    const runCommand = (command) => bridge.exec(command);
    const client = createOpenRouterClient({
      apiKey,
      defaultModel: model,
      fetch: globalThis.fetch.bind(globalThis),
      title: "robocoop-4"
    });
    const loop = createAgentLoop({
      client,
      tools: [createBashTool()],
      systemPrompt: systemPrompt2,
      model,
      maxSteps,
      runCommand
    });
    let ensured = false;
    async function run(prompt, callbacks = {}) {
      if (!ensured) {
        try {
          await runCommand("mkdir -p " + workdir);
        } catch {
        }
        ensured = true;
      }
      return loop.run(prompt, callbacks);
    }
    return { run };
  }

  // hostBridge.mjs
  var VENDOR = /golden-layout|codemirror|acorn|escodegen|jszip|lightning-fs|isomorphic-git|jest-expect|inspector|observable-runtime|observablehq-lezer|spectral-layout|module-map/;
  var CELL = "// \u27E6cell\u27E7 ";
  function defaultGetRuntime() {
    const reg = globalThis.__ojs_runtime;
    if (reg && reg.mains) {
      for (const m of reg.mains.values()) if (m && m._runtime && m._runtime._variables) return m._runtime;
    }
    return null;
  }
  var inputName = (i) => (typeof i === "string" ? i : i && i._name) || "";
  var isStructural = (name, inputs) => !name || name.startsWith("module ") || name === "@variable" || (inputs || []).includes("@variable");
  function createHostBridge({ fs, getRuntime = defaultGetRuntime, prefix = "/notebook/" } = {}) {
    if (!fs || typeof fs.writeFile !== "function") throw new Error("createHostBridge requires a fs with writeFile");
    const rt = () => {
      const r = getRuntime();
      if (!r || !r._variables) throw new Error("createHostBridge: host runtime not found (window.__ojs_runtime)");
      return r;
    };
    const findVal = (n) => {
      for (const v of rt()._variables) if (v._name === n && v._value !== void 0) return v._value;
      return null;
    };
    const currentModules = () => findVal("currentModules");
    function moduleByName() {
      const map = /* @__PURE__ */ new Map();
      const cur = currentModules();
      if (cur) {
        for (const [, info] of cur) if (info && info.module && info.name && !map.has(info.name)) map.set(info.name, info.module);
      }
      return map;
    }
    const isSkippable = (id) => !id || id === "builtin" || id === "bootloader" || id.startsWith("d/") || VENDOR.test(id);
    function varsOf(moduleObj) {
      const out = [];
      for (const v of rt()._variables) if (v._module === moduleObj) out.push(v);
      return out;
    }
    function serializeModule(id, moduleObj) {
      const vars = varsOf(moduleObj);
      const out = [`// ${id} \u2014 ${vars.length} variable(s), projected live from the host runtime. Edit a cell body below; pid= ties it to the live variable.
`];
      for (const v of vars) {
        const name = v._name || "";
        let def;
        try {
          def = v._definition ? v._definition.toString() : "";
        } catch {
          def = "/* (definition unavailable) */";
        }
        const ro = isStructural(name, (v._inputs || []).map(inputName)) ? " readonly=1" : "";
        out.push(`${CELL}pid=${v.pid || ""} name=${name} inputs=${(v._inputs || []).map(inputName).join(",")}${ro}
${def}
`);
      }
      return out.join("\n");
    }
    const snapshot = /* @__PURE__ */ new Map();
    async function syncHost({ include } = {}) {
      const mods = moduleByName();
      const written = [], failed = [];
      for (const [id, moduleObj] of mods) {
        if (include ? !include.includes(id) : isSkippable(id)) continue;
        try {
          const src = serializeModule(id, moduleObj);
          await fs.writeFile(prefix + id + ".js", src);
          snapshot.set(id, src);
          written.push({ id, bytes: src.length });
        } catch (e) {
          failed.push(id + ": " + (e && e.message || e));
        }
      }
      return { written, failed };
    }
    const readText = async (path) => {
      const t = await fs.readFile(path);
      return typeof t === "string" ? t : new TextDecoder().decode(t);
    };
    async function applyChanged() {
      const applied = [], errors = [];
      for (const [id, prev] of snapshot) {
        let text;
        try {
          text = await readText(prefix + id + ".js");
        } catch {
          continue;
        }
        if (text === prev) continue;
        const r = applyModule(id, text);
        if (r.applied && r.changes) applied.push({ id, changes: r.changes, plan: r.plan });
        if (r.plan && r.plan.errors.length) errors.push(...r.plan.errors.map((e) => id + ": " + e));
        snapshot.set(id, serializeModule(id, moduleByName().get(id)));
      }
      return { applied, errors };
    }
    function parseModuleFile(text) {
      const cells = [];
      const chunks = text.split(CELL).slice(1);
      for (const chunk of chunks) {
        const nl = chunk.indexOf("\n");
        const header = chunk.slice(0, nl);
        const body = chunk.slice(nl + 1).replace(/\s+$/, "");
        const get = (k) => {
          const m = header.match(new RegExp(k + "=([^\\s]*)"));
          return m ? m[1] : "";
        };
        const name = get("name");
        const inputs = get("inputs") ? get("inputs").split(",").filter(Boolean) : [];
        cells.push({ pid: get("pid"), name, inputs, src: body.trim(), readonly: /readonly=1/.test(header) });
      }
      return cells;
    }
    function applyModule(id, text, { dryRun = false } = {}) {
      const moduleObj = moduleByName().get(id);
      if (!moduleObj) return { applied: false, reason: "module not loaded: " + id };
      const runtime = rt();
      const byPid = /* @__PURE__ */ new Map(), byName = /* @__PURE__ */ new Map();
      for (const v of varsOf(moduleObj)) {
        if (v.pid) byPid.set(v.pid, v);
        if (v._name) byName.set(v._name, v);
      }
      const cells = parseModuleFile(text);
      const plan = { created: [], updated: [], skipped: [], errors: [] };
      const ops = [];
      const seenPids = /* @__PURE__ */ new Set();
      for (const cell of cells) {
        if (cell.readonly || isStructural(cell.name, cell.inputs)) {
          plan.skipped.push(cell.name || cell.pid);
          continue;
        }
        let fn;
        try {
          fn = (0, eval)("(" + cell.src + ")");
          if (typeof fn !== "function") throw new Error("not a function");
        } catch (e) {
          plan.errors.push((cell.name || cell.pid) + ": " + (e && e.message || e));
          continue;
        }
        const existing = cell.pid && byPid.get(cell.pid);
        if (existing) {
          seenPids.add(cell.pid);
          const sameInputs = JSON.stringify((existing._inputs || []).map(inputName)) === JSON.stringify(cell.inputs);
          const sameDef = existing._definition && existing._definition.toString() === cell.src;
          if (sameInputs && sameDef) continue;
          plan.updated.push(cell.name || cell.pid);
          ops.push(() => {
            existing.define(cell.name || null, cell.inputs, fn);
            existing.pid = cell.pid;
          });
        } else {
          plan.created.push(cell.name || "(anon)");
          ops.push(() => {
            const v = moduleObj.variable();
            v.define(cell.name || null, cell.inputs, fn);
            if (cell.pid) v.pid = cell.pid;
          });
        }
      }
      for (const [pid, v] of byPid) {
        if (seenPids.has(pid)) continue;
        if (isStructural(v._name, (v._inputs || []).map(inputName))) continue;
        if (!cells.length) continue;
        plan.skipped.push("(kept " + (v._name || pid) + " \u2014 deletion disabled in v1)");
      }
      if (dryRun) return { applied: false, dryRun: true, id, plan };
      for (const op of ops) {
        try {
          op();
        } catch (e) {
          plan.errors.push("apply: " + (e && e.message || e));
        }
      }
      return { applied: true, id, changes: plan.created.length + plan.updated.length, plan };
    }
    async function applyFromFs(id, opts) {
      const text = await fs.readFile(prefix + id + ".js");
      return applyModule(id, typeof text === "string" ? text : new TextDecoder().decode(text), opts);
    }
    return { syncHost, applyChanged, applyModule, applyFromFs, parseModuleFile, currentModules, listModuleIds: () => [...moduleByName().keys()] };
  }
  return __toCommonJS(entry_browser_exports);
})();
