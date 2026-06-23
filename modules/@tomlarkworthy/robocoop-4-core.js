// @tomlarkworthy/robocoop-4-core — the portable agent core, as literate notebook cells.
//
// This module is the SOURCE OF TRUTH for robocoop-4's logic: the tool-use loop, the bash tool, the
// tool-definition helper, and the model clients (OpenRouter + a deterministic scripted client for
// tests). It is DOM-free — every cell is a plain function so the same code runs in the browser
// notebook AND in node CI (via loadNotebook + the in-notebook test_* cells). Nothing here touches
// window; the browser wiring lives in robocoop-4-engine / -tools / -chat.
//
// Each function gets an md doc cell above it (literate style). The compiled $def block at the
// bottom records each cell's pid, name and dependency inputs.

const _title = function _title(md){return(
md`# robocoop-4-core

The portable, DOM-free agent core. A tool-use loop driving an OpenAI-shaped chat client over a set
of tools. Reused verbatim by the browser notebook and by node CI.`
)};

// ── render: truncate ────────────────────────────────────────────────────────
const _doc_truncate = function _doc_truncate(md){return(
md`### \`truncate(text, limit)\`
Head+tail cap: keeps the first and last halves of \`limit\`, replacing the middle with a marker, so a
1MB \`cat\` can't blow the model context. Returns \`text\` unchanged when within \`limit\`.`
)};
const _truncate = function _truncate(){return(
  function truncate(text, limit) {
    const s = String(text ?? '');
    if (!limit || s.length <= limit) return s;
    const head = Math.ceil(limit / 2);
    const tail = Math.floor(limit / 2);
    const cut = s.length - head - tail;
    return (
      s.slice(0, head) +
      '\n...[' + cut + ' bytes truncated — use grep/sed to narrow]...\n' +
      s.slice(s.length - tail)
    );
  }
)};

// ── render: formatResult ────────────────────────────────────────────────────
const _doc_formatResult = function _doc_formatResult(md){return(
md`### \`formatResult(r)\`
Render a just-bash exec result \`{stdout, stderr, exitCode}\` to the model-facing text. Trailing
newlines trimmed; a non-zero exit is appended as \`[exit N]\`. node and browser produce identical text.`
)};
const _formatResult = function _formatResult(){return(
  function formatResult(r) {
    if (!r) return '(no output)';
    const parts = [];
    const stdout = r.stdout ?? '';
    const stderr = r.stderr ?? '';
    if (stdout) parts.push(stdout.replace(/\n$/, ''));
    if (stderr) parts.push(stderr.replace(/\n$/, ''));
    const exit = r.exitCode ?? 0;
    if (exit !== 0) parts.push('[exit ' + exit + ']');
    if (parts.length === 0) return '(no output)';
    return parts.join('\n');
  }
)};

// ── defineTool: validateParameters ──────────────────────────────────────────
const _doc_validateParameters = function _doc_validateParameters(md){return(
md`### \`validateParameters(schema, value)\`
Minimal recursive JSON-Schema validator (object/string/number/integer/boolean/array, \`required\`,
\`additionalProperties:false\`). Returns \`{valid, errors[]}\`. No dependency on ajv.`
)};
const _validateParameters = function _validateParameters(){return(
  function validateParameters(schema, value) {
    const validate = (schema, value) => {
      const errors = [];
      if (!schema || typeof schema !== 'object') return { valid: true, errors };
      const type = schema.type;
      if (type === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push('Expected object');
          return { valid: false, errors };
        }
        const props = schema.properties || {};
        const required = Array.isArray(schema.required) ? schema.required : [];
        for (const field of required) if (!(field in value)) errors.push('Missing required field: ' + field);
        if (schema.additionalProperties === false) {
          for (const k of Object.keys(value)) if (!(k in props)) errors.push('Unexpected field: ' + k);
        }
        for (const [key, propSchema] of Object.entries(props)) {
          if (key in value) {
            const r = validate(propSchema, value[key]);
            if (!r.valid) errors.push(...r.errors.map((e) => key + ': ' + e));
          }
        }
      } else if (type === 'string') {
        if (typeof value !== 'string') errors.push('Expected string, got ' + typeof value);
      } else if (type === 'number') {
        if (typeof value !== 'number' || Number.isNaN(value)) errors.push('Expected number, got ' + typeof value);
      } else if (type === 'integer') {
        if (typeof value !== 'number' || !Number.isInteger(value)) errors.push('Expected integer, got ' + typeof value);
      } else if (type === 'boolean') {
        if (typeof value !== 'boolean') errors.push('Expected boolean, got ' + typeof value);
      } else if (type === 'array') {
        if (!Array.isArray(value)) errors.push('Expected array, got ' + typeof value);
        else if (schema.items) {
          value.forEach((item, i) => {
            const r = validate(schema.items, item);
            if (!r.valid) errors.push(...r.errors.map((e) => '[' + i + ']: ' + e));
          });
        }
      }
      return { valid: errors.length === 0, errors };
    };
    return validate(schema, value);
  }
)};

// ── defineTool ──────────────────────────────────────────────────────────────
const _doc_defineTool = function _doc_defineTool(md){return(
md`### \`defineTool({id, description, parameters, execute})\`
Normalise a tool: validates the four fields, then wraps \`execute\` so it (a) short-circuits on an
aborted signal, (b) always resolves to \`{title, output:string, metadata}\`, and (c) turns thrown
errors into an \`Error: …\` output instead of rejecting. The loop calls \`tool.execute(args, ctx)\`.`
)};
const _defineTool = function _defineTool(){return(
  function defineTool({ id, description, parameters, execute }) {
    if (!id || typeof id !== 'string') throw new Error('Tool must have a string id');
    if (!description || typeof description !== 'string')
      throw new Error('Tool must have a string description');
    if (!parameters || typeof parameters !== 'object')
      throw new Error('Tool must have a parameters object');
    if (!execute || typeof execute !== 'function')
      throw new Error('Tool must have an execute function');
    return {
      id,
      description,
      parameters,
      execute: async (args, ctx) => {
        try {
          if (ctx?.abort?.aborted)
            return { title: id + ' aborted', output: 'Execution was aborted', metadata: { aborted: true } };
          const result = await execute(args, ctx);
          return {
            title: result.title || id + ' completed',
            output: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
            metadata: { ...(ctx?.getMetadata?.() || {}), ...result.metadata },
          };
        } catch (error) {
          return {
            title: id + ' failed',
            output: 'Error: ' + error.message,
            metadata: { error: true, errorMessage: error.message },
          };
        }
      },
    };
  }
)};

// ── createBashTool ──────────────────────────────────────────────────────────
const _doc_createBashTool = function _doc_createBashTool(md){return(
md`### \`createBashTool()\`
The single \`bash\` tool. Its only environment seam is \`ctx.runCommand(command)\` (node binds an
InMemoryFs session; the notebook binds the agent shell's \`rc4_agentShell.run\`). Output is rendered via
[\`formatResult\`](#); a non-zero exit is normal tool output, not a throw.`
)};
const _createBashTool = function _createBashTool(defineTool, formatResult){return(
  function createBashTool() {
    return defineTool({
      id: 'bash',
      description:
        'Run a bash command in a sandboxed shell over an in-memory project filesystem ' +
        '(cat, grep, sed, ls, awk, head, tail, etc.). cwd and env persist across calls ' +
        '(they are threaded for you); only filesystem writes persist between commands. ' +
        'exitCode != 0 is normal tool output, not a crash — the full stdout, stderr and ' +
        'exit code are returned to you.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The bash command line to execute, e.g. "sed -n \'1,40p\' /notebook/@user/mod.js"',
          },
        },
        required: ['command'],
        additionalProperties: false,
      },
      execute: async ({ command }, ctx) => {
        const r = await ctx.runCommand(command);
        return {
          title: '$ ' + String(command).split('\n')[0],
          output: formatResult(r),
          metadata: { exitCode: r?.exitCode ?? 0 },
        };
      },
    });
  }
)};

// ── createScriptedClient ────────────────────────────────────────────────────
const _doc_createScriptedClient = function _doc_createScriptedClient(md){return(
md`### \`createScriptedClient(steps)\`
Deterministic, no-network model client with the exact OpenRouter return shape (incl.
\`tool_calls[].function.arguments\` as a JSON **string**). Replays \`steps\` in order; emits a terminal
stop turn when exhausted. This is what the in-notebook \`test_*\` cells drive the loop with.`
)};
const _createScriptedClient = function _createScriptedClient(){return(
  function createScriptedClient(steps = []) {
    let i = 0;
    async function chat(/* req */) {
      if (i >= steps.length) {
        return { message: { role: 'assistant', content: '[scripted client exhausted]' }, finish_reason: 'stop' };
      }
      const step = steps[i++];
      const message = { role: 'assistant', content: step.content ?? null };
      if (step.tool_calls) {
        message.tool_calls = step.tool_calls.map((tc, idx) => ({
          id: tc.id ?? 'call_' + (i - 1) + '_' + idx,
          type: 'function',
          function: {
            name: tc.name,
            arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments ?? {}),
          },
        }));
      }
      return {
        message,
        finish_reason: step.finish_reason ?? (step.tool_calls ? 'tool_calls' : 'stop'),
        raw: { scripted: true, index: i - 1 },
      };
    }
    return { chat };
  }
)};

// ── createOpenRouterClient ──────────────────────────────────────────────────
const _doc_createOpenRouterClient = function _doc_createOpenRouterClient(md){return(
md`### \`createOpenRouterClient({apiKey, fetch, referer, title, defaultModel})\`
OpenRouter chat-completions client (OpenAI wire format). Non-streaming today (\`stream:false\`);
returns \`{message, finish_reason, raw}\` with the assistant message **verbatim** incl. any
\`tool_calls\`. \`fetch\`/key are pluggable; \`fetch\` defaults to \`globalThis.fetch\`.`
)};
const _createOpenRouterClient = function _createOpenRouterClient(){
  return function createOpenRouterClient({
    apiKey = (typeof process !== 'undefined' && process.env ? process.env.OPENROUTER_API_KEY : undefined),
    fetch = globalThis.fetch,
    baseUrl = 'https://openrouter.ai/api/v1',
    referer,
    title,
    defaultModel = 'anthropic/claude-sonnet-4'
  } = {}) {
    if (typeof fetch !== 'function') {
      throw new Error('createOpenRouterClient: no fetch available (pass {fetch})');
    }
    const headers = () => {
      const h = { 'Content-Type': 'application/json' };
      const key = String(apiKey ?? '').trim();
      if (key) h.Authorization = `Bearer ${key}`;
      if (referer) h['HTTP-Referer'] = referer;
      if (title) h['X-Title'] = title;
      return h;
    };
    async function chat({ model = defaultModel, messages, tools, tool_choice = 'auto', temperature, max_tokens, signal } = {}) {
      const body = {
        model,
        messages,
        stream: false,
        ...(tools && tools.length ? { tools, tool_choice } : {}),
        ...(temperature != null ? { temperature } : {}),
        ...(max_tokens != null ? { max_tokens } : {})
      };
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST', headers: headers(), body: JSON.stringify(body), signal
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error('OpenRouter ' + res.status + ': ' + text);
      }
      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error('OpenRouter: no choices in response: ' + JSON.stringify(data));
      return { message: choice.message, finish_reason: choice.finish_reason, raw: data };
    }
    return { chat };
  };
};

// ── createAgentSession ──────────────────────────────────────────────────────
const _doc_createAgentSession = function _doc_createAgentSession(md){return(
md`### \`createAgentSession({client, toolsProvider, systemPromptProvider, modelProvider, runCommand, …})\`
The persistent, live-resolved conversation. \`messages\` persists across \`send()\` calls (one long
chat). Tools, model and system prompt are re-read from their PROVIDERS at the top of **every step**,
so a notebook can register a new tool mid-conversation and it is offered on the next model turn with
no restart. Loop invariants: assistant turns appended verbatim, exactly one \`{role:'tool'}\` reply
per \`tool_calls[]\` entry, defensive JSON arg parse, central [\`truncate\`](#) of tool output.
Returns \`{messages, send, abort, reset}\`.`
)};
const _createAgentSession = function _createAgentSession(truncate){
  function toWireTool(t) {
    return {
      type: 'function',
      function: {
        name: t.id,
        description: String(t.description ?? ''),
        parameters: t.parameters ?? { type: 'object', properties: {}, required: [] },
      },
    };
  }
  return function createAgentSession({
    client,
    tools,
    toolsProvider,
    systemPrompt,
    systemPromptProvider,
    model,
    modelProvider,
    maxStepsPerTurn = 12,
    toolChoice = 'auto',
    toolOutputLimit = 8000,
    runCommand,
  } = {}) {
    if (!client || typeof client.chat !== 'function')
      throw new Error('createAgentSession requires a client with a chat() method');

    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
    const getModel = modelProvider ?? (() => model);

    const messages = [];
    let currentAbort = null;

    function abort() { currentAbort?.abort(); }
    function reset() { messages.length = 0; }

    async function send(userText, callbacks = {}) {
      const abortController = new AbortController();
      currentAbort = abortController;
      let metadata = {};
      const ctx = {
        callId: null,
        abort: abortController.signal,
        runCommand,
        metadata: (u) => { metadata = { ...metadata, ...u }; },
        getMetadata: () => metadata,
      };

      const sp = getSystemPrompt();
      if (sp != null) {
        const m = { role: 'system', content: String(sp) };
        if (messages[0]?.role === 'system') messages[0] = m;
        else messages.unshift(m);
      }

      if (userText != null) messages.push({ role: 'user', content: String(userText) });

      let finishReason = null;
      let step = 0;
      const startLen = messages.length;

      for (step = 0; step < maxStepsPerTurn; step++) {
        if (abortController.signal.aborted) { finishReason = 'aborted'; break; }
        callbacks.onStep?.(step, messages);

        const live = getTools() ?? [];
        const wire = live.map(toWireTool);
        const byId = new Map(live.map((t) => [t.id, t]));

        const res = await client.chat({ model: getModel(), messages, tools: wire, tool_choice: toolChoice, signal: abortController.signal });
        const msg = res?.message;
        if (!msg) throw new Error('client.chat returned no message');

        messages.push(msg);
        if (msg.content) callbacks.onText?.(msg.content);

        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (calls.length === 0) {
          finishReason = res.finish_reason ?? 'stop';
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }

        for (const call of calls) {
          const callId = call.id;
          const name = call?.function?.name;
          let args;
          try {
            const raw = call?.function?.arguments;
            args = raw == null || raw === '' ? {} : JSON.parse(raw);
          } catch {
            const content = 'ERROR: could not parse tool arguments as JSON: ' + String(call?.function?.arguments);
            messages.push({ role: 'tool', tool_call_id: callId, content });
            callbacks.onToolResult?.(callId, content);
            continue;
          }
          const tool = byId.get(name);
          if (!tool) {
            const content = 'ERROR: unknown tool ' + String(name);
            messages.push({ role: 'tool', tool_call_id: callId, content });
            callbacks.onToolResult?.(callId, content);
            continue;
          }
          callbacks.onToolCall?.(callId, name, args);
          let output;
          try {
            const r = await tool.execute(args, { ...ctx, callId });
            output = String(r?.output ?? '');
          } catch (e) {
            output = 'ERROR: ' + (e?.message ?? String(e));
          }
          output = truncate(output, toolOutputLimit);
          callbacks.onToolResult?.(callId, output);
          messages.push({ role: 'tool', tool_call_id: callId, content: output });
        }

        if (step === maxStepsPerTurn - 1) finishReason = 'max_steps';
      }

      return {
        messages,
        finishReason: finishReason ?? 'max_steps',
        steps: step + 1,
        turnMessages: messages.slice(startLen),
      };
    }

    return { messages, send, abort, reset };
  };
};

// ── createAgentLoop ─────────────────────────────────────────────────────────
const _doc_createAgentLoop = function _doc_createAgentLoop(md){return(
md`### \`createAgentLoop({client, tools, systemPrompt, …})\`
Single-shot convenience over [\`createAgentSession\`](#): a fresh session per \`run(prompt)\` with a
static tool set. Returns \`{run}\`. Handy for one-off scripted runs and assertions.`
)};
const _createAgentLoop = function _createAgentLoop(createAgentSession){return(
  function createAgentLoop({
    client, tools = [], systemPrompt, model,
    maxSteps = 12, toolChoice = 'auto', toolOutputLimit = 8000, runCommand,
  } = {}) {
    if (!client || typeof client.chat !== 'function')
      throw new Error('createAgentLoop requires a client with a chat() method');
    async function run(userPrompt, callbacks = {}) {
      const session = createAgentSession({
        client, tools, systemPrompt, model,
        maxStepsPerTurn: maxSteps, toolChoice, toolOutputLimit, runCommand,
      });
      const { messages, finishReason, steps } = await session.send(userPrompt, callbacks);
      return { messages, finishReason, steps };
    }
    return { run };
  }
)};

// ── systemPrompt + composeFooter ────────────────────────────────────────────
const _doc_systemPrompt = function _doc_systemPrompt(md){return(
md`### \`systemPrompt\` + \`composeFooter({workdir, model})\`
The bash-centric base prompt (string) and a small footer composer appending the working directory
and model. The engine concatenates them; the prompt is user-editable in the facade.`
)};
const _systemPrompt = function _systemPrompt(){return(
  `You are a coding agent that builds and edits Observable notebook modules through a single bash tool.

NOTEBOOK MODEL
Each live module is ONE standard Observable module file at /notebook/<moduleId>.js, kept in sync with the
running notebook AUTOMATICALLY. A module is a set of reactive CELLS. Each cell declares its dependencies
and recomputes when they change (like a spreadsheet). The file shape is: top-level cell declarations
\`const _pid = function name(deps){return( EXPR )};\` (a cell whose body needs statements uses
\`function name(deps){ … return X; }\`), then a single \`export default function define(runtime, observer){ … }\`
that registers each cell with a helper
\`const $def = (pid,name,deps,fn) => main.variable(observer(name)).define(name,deps,fn).pid=pid;\` and one
\`$def("_pid","name",["dep1"],_pid);\` line per cell. This is the SAME format the exporter uses.

REACTIVE DEPENDENCIES
A cell named \`x\` is available to any other cell by listing \`x\` in that cell's deps (the function parameter
AND the $def deps array). To make one cell depend on another, name it as an input — never copy the upstream
value. Built-ins you can use simply by naming them as a cell input (no import needed):
\`md\` (markdown), \`html\` (htl HTML templates), \`Inputs\` (standard form widgets: Inputs.range, .select,
.text, .table, .form, …), \`Plot\` (Observable Plot charts), \`d3\`, \`FileAttachment\`, \`Generators\`. For an
INTERACTIVE input use a \`viewof\` cell: \`$def("_pid","viewof knob",["Inputs"],fn)\` where fn returns an
Inputs widget; other cells then depend on \`knob\` to read its current value.

LIVE EDITS — NO APPLY STEP
The files under /notebook/ are LIVE: read them with cat/grep, and any change you WRITE is applied to the
running notebook within about a second.
- EDIT a module: change a cell's function body, or ADD a cell by writing both its
  \`const _pid = function name(deps){…}\` declaration AND a matching \`$def(...)\` line inside define().
- CREATE a module: write a full /notebook/@user/<name>.js module file (copy the structure of an existing
  one). It becomes a live module automatically. The file MUST contain \`export default function define\`.
  Do NOT write bare cells or invent a format.
- To find what exists, \`ls /notebook\` and \`cat\` a module; an existing module is the best template.

TOOLS & METHOD
Use the bash tool for everything: ls, cat, grep, sed, awk, head, tail to read; sed -i, a quoted heredoc, or
printf piped into a file to write. exitCode != 0 is normal output, not a crash. Prefer standard library
building blocks over hand-rolled DOM/loops (e.g. Inputs.table over a hand-built <table>, d3/Plot over manual
math) when they fit. Bash shows a cell's SOURCE; to see what a cell actually evaluates to at RUNTIME — its
live value, or its error if it is failing — use the value-inspection tools when they are available to you
(e.g. inspect a cell's value, or list a module's live values) rather than guessing from the code.

ABOUT YOURSELF — THE LOPECODE MICROKERNEL
You run INSIDE a lopecode notebook: a single self-contained HTML file, no server, everything bundled. It is a
microkernel — every piece of content is a \`<script type="text/plain">\` block tagged with an id, a data-mime
and an optional data-encoding (text / base64 / base64+gzip), resolved at runtime by the kernel's content
resolver. ONE uniform store holds it all: the bootloader (an executable script that builds the Observable
standard library — md, html, Inputs, Plot, d3 — from BUNDLED library code and then boots the notebook),
\`bootconf.json\` (config: which modules are \`mains\`, the layout, the title), the Observable runtime, every
MODULE (id \`@user/name\`), and every FILE ATTACHMENT (id \`@user/name/file.ext\`, e.g. a gzipped library bundle).
So the libraries you use are not fetched from the network — they are compressed blocks in this same file.

YOU are a set of these modules, all readable under /notebook/:
- robocoop-4-core — your "brain": the tool-use loop, the bash tool, the model clients, and this prompt.
- robocoop-4-bash — your shell: a POSIX-ish bash + virtual filesystem, loaded by decompressing a gzipped
  FileAttachment (the just-bash bundle).
- robocoop-4-engine — wires the model client and your persistent session over the workspace.
- robocoop-4-hostbridge — projects the live notebook into /notebook/ (so your edits apply in ~1s) and
  registers your value- and content-inspection tools.
- robocoop-4 — the app/UI (terminal + chat); robocoop-4-tests — your self-tests.

You can study every aspect of yourself. To answer a question about how you or the notebook work, INVESTIGATE
rather than guess:
- bash under /notebook/ reads the SOURCE of your own modules AND of the libraries they use. exporter-3 is the
  reference implementation of how a notebook serializes itself into those \`<script>\` blocks; fileattachments
  and runtime-sdk explain attachment resolution and runtime access.
- inspect_value / list_values read the live runtime VALUE of any cell.
- read_content reads or enumerates the raw content blocks that are NOT module files — bootconf.json, the
  bootloader, the bundled standard library, and file-attachment bytes (it decompresses gzip), so you can
  decode any part of your own HTML file.

Work incrementally: inspect before editing, make the change, then RE-READ (and where possible reason about
the value) to confirm it is correct. Preserve the module format exactly. If a request is impossible or
ambiguous, say so and ask rather than guessing. When the task is done, stop and summarize.`
)};
const _composeFooter = function _composeFooter(){return(
  function composeFooter({ workdir = '/notebook', model } = {}) {
    const lines = ['', 'Working directory: ' + workdir];
    if (model) lines.push('Model: ' + model);
    return lines.join('\n');
  }
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4c_title", null, ["md"], _title);

  $def("rc4c_doc_truncate", null, ["md"], _doc_truncate);
  $def("rc4c_truncate", "truncate", [], _truncate);
  $def("rc4c_doc_formatResult", null, ["md"], _doc_formatResult);
  $def("rc4c_formatResult", "formatResult", [], _formatResult);

  $def("rc4c_doc_validateParameters", null, ["md"], _doc_validateParameters);
  $def("rc4c_validateParameters", "validateParameters", [], _validateParameters);
  $def("rc4c_doc_defineTool", null, ["md"], _doc_defineTool);
  $def("rc4c_defineTool", "defineTool", [], _defineTool);

  $def("rc4c_doc_createBashTool", null, ["md"], _doc_createBashTool);
  $def("rc4c_createBashTool", "createBashTool", ["defineTool", "formatResult"], _createBashTool);

  $def("rc4c_doc_createScriptedClient", null, ["md"], _doc_createScriptedClient);
  $def("rc4c_createScriptedClient", "createScriptedClient", [], _createScriptedClient);
  $def("rc4c_doc_createOpenRouterClient", null, ["md"], _doc_createOpenRouterClient);
  $def("rc4c_createOpenRouterClient", "createOpenRouterClient", [], _createOpenRouterClient);

  $def("rc4c_doc_createAgentSession", null, ["md"], _doc_createAgentSession);
  $def("rc4c_createAgentSession", "createAgentSession", ["truncate"], _createAgentSession);
  $def("rc4c_doc_createAgentLoop", null, ["md"], _doc_createAgentLoop);
  $def("rc4c_createAgentLoop", "createAgentLoop", ["createAgentSession"], _createAgentLoop);

  $def("rc4c_doc_systemPrompt", null, ["md"], _doc_systemPrompt);
  $def("rc4c_systemPrompt", "systemPrompt", [], _systemPrompt);
  $def("rc4c_composeFooter", "composeFooter", [], _composeFooter);

  return main;
}
