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
      // Cache the large static system prefix on Anthropic models (OpenRouter forwards cache_control).
      // Only messages[0] (the stable system prompt) gets a breakpoint — volatile system "notices" stay uncached.
      let outMessages = messages;
      if (/anthropic|claude/i.test(model || '') && messages?.[0]?.role === 'system' && typeof messages[0].content === 'string') {
        outMessages = [{ ...messages[0], content: [{ type: 'text', text: messages[0].content, cache_control: { type: 'ephemeral' } }] }, ...messages.slice(1)];
      }
      const body = {
        model,
        messages: outMessages,
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
        let detail = text;
        try { const j = JSON.parse(text); detail = j?.error?.message || text; } catch {}
        throw new Error('OpenRouter ' + res.status + ': ' + detail);
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
    maxTokens = 8192,
    toolChoice = 'auto',
    toolOutputLimit = 8000,
    runCommand,
    completeToolName = null,
    stallNudgeLimit = 0,
    nudgeMessage,
    noticesProvider,
  } = {}) {
    if (!client || typeof client.chat !== 'function')
      throw new Error('createAgentSession requires a client with a chat() method');

    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
    const getModel = modelProvider ?? (() => model);

    // Explicit-completion protocol (opt-in). When completeToolName is set, the loop stops on that tool call
    // (not on bare text), so the model can no longer end a turn by narrating; a bare-text turn is treated as a
    // STALL and nudged. The nudge is bounded by stallNudgeLimit so a model that refuses to act still terminates.
    const completeSpec = completeToolName ? {
      type: 'function',
      function: {
        name: completeToolName,
        description: 'Call this ONLY when the task is fully complete (or you have finished answering) to end ' +
          'your turn. Put your short summary or final answer in `summary`.',
        parameters: { type: 'object', properties: { summary: { type: 'string', description: 'Short summary / final answer shown to the user.' } }, required: [] },
      },
    } : null;
    const nudge = nudgeMessage ?? ('You ended your turn without calling a tool. If the task is complete, call ' +
      (completeToolName || 'the completion tool') + ' with a short summary. Otherwise keep going — call a tool ' +
      'to take the next concrete step; do not just describe what you will do.');

    const messages = [];
    let currentAbort = null;

    function abort() { currentAbort?.abort(); }
    function reset() { messages.length = 0; }

    // `input` is a string, or { text, images } where images is an array of data/URL strings — the user turn
    // is sent as OpenAI multimodal content parts so a vision model can SEE attached screenshots/images.
    async function send(input, callbacks = {}) {
      let userText = input, images = null;
      if (input && typeof input === 'object' && !Array.isArray(input)) { userText = input.text ?? null; images = input.images || null; }
      const abortController = new AbortController();
      currentAbort = abortController;
      let metadata = {};
      const pendingImages = [];
      const ctx = {
        callId: null,
        abort: abortController.signal,
        runCommand,
        metadata: (u) => { metadata = { ...metadata, ...u }; },
        getMetadata: () => metadata,
        // A tool (e.g. view_image) calls this to feed an image into the conversation; queued here and pushed
        // as a user image-message after the current tool batch, so the model sees it on the next step.
        attachImage: (url) => { if (url) pendingImages.push(url); },
      };

      const sp = getSystemPrompt();
      if (sp != null) {
        const m = { role: 'system', content: String(sp) };
        if (messages[0]?.role === 'system') messages[0] = m;
        else messages.unshift(m);
      }

      if (images && images.length) {
        const parts = [];
        if (userText != null) parts.push({ type: 'text', text: String(userText) });
        for (const url of images) if (url) parts.push({ type: 'image_url', image_url: { url } });
        if (parts.length) messages.push({ role: 'user', content: parts });
      } else if (userText != null) {
        messages.push({ role: 'user', content: String(userText) });
      }

      let finishReason = null;
      let step = 0;
      let stalls = 0;
      const startLen = messages.length;

      for (step = 0; step < maxStepsPerTurn; step++) {
        if (abortController.signal.aborted) { finishReason = 'aborted'; break; }
        callbacks.onStep?.(step, messages);

        // Stream out-of-band notices (e.g. watched-variable changes) into the conversation before the model
        // turn, so live value changes reach the model automatically without it polling.
        if (noticesProvider) {
          let notices; try { notices = noticesProvider(); } catch (e) { notices = null; }
          if (notices && notices.length) {
            messages.push({ role: 'system', content: 'Watch updates (live values changed since your last step):\n' + notices.join('\n') });
            callbacks.onNotice?.(notices);
          }
        }

        const live = getTools() ?? [];
        const wire = completeSpec ? [...live.map(toWireTool), completeSpec] : live.map(toWireTool);
        const byId = new Map(live.map((t) => [t.id, t]));

        const res = await client.chat({ model: getModel(), messages, tools: wire, tool_choice: toolChoice, max_tokens: maxTokens, signal: abortController.signal });
        const msg = res?.message;
        if (!msg) throw new Error('client.chat returned no message');

        messages.push(msg);
        if (msg.content) callbacks.onText?.(msg.content);

        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (calls.length === 0) {
          // No action taken. With the completion protocol, a bare-text turn is a STALL, not "done": nudge the
          // model to either act or call task_complete, up to stallNudgeLimit consecutive times, then fall back
          // to stopping (so a model that refuses to act can't loop forever).
          if (completeSpec && stalls < stallNudgeLimit && (res.finish_reason ?? 'stop') !== 'length' && step < maxStepsPerTurn - 1) {
            stalls++;
            messages.push({ role: 'system', content: nudge });
            callbacks.onNudge?.(stalls, nudge);
            continue;
          }
          finishReason = res.finish_reason ?? 'stop';
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }

        let completed = false;
        let completeSummary = null;
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
          // completion signal — reply to satisfy the tool_call, capture the summary, end after this batch
          if (completeSpec && name === completeToolName) {
            completed = true;
            completeSummary = typeof args.summary === 'string' ? args.summary : null;
            messages.push({ role: 'tool', tool_call_id: callId, content: 'ok' });
            callbacks.onToolResult?.(callId, 'ok');
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

        // A tool fed image(s) in via ctx.attachImage — deliver them as a user image-message so the model
        // sees them next step (tool-role content can't reliably carry images across providers).
        if (pendingImages.length) {
          messages.push({ role: 'user', content: pendingImages.map((url) => ({ type: 'image_url', image_url: { url } })) });
          pendingImages.length = 0;
        }

        if (completed) {
          // ensure a visible final message if the model put its answer only in the summary arg
          if (completeSummary && !msg.content) messages.push({ role: 'assistant', content: completeSummary });
          finishReason = 'completed';
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }

        stalls = 0; // a real tool ran → progress; reset the stall counter
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
The files under /notebook/ are LIVE: read them, and any change you WRITE is applied to the running notebook.
- EDIT a module: change a cell's function body, or ADD a cell by writing both its
  \`const _pid = function name(deps){…}\` declaration AND a matching \`$def(...)\` line inside define().
- CREATE a module: write a full /notebook/@user/<name>.js module file (copy the structure of an existing
  one). It becomes a live module automatically. The file MUST contain \`export default function define\`.
  Do NOT write bare cells or invent a format.
- To find what exists, list /notebook and read a module; an existing module is the best template.

TOOLS & METHOD
To change a module, PREFER edit_file (an exact, literal string replacement — no regex/escaping) over bash
sed. When you write or edit a /notebook module, the tool APPLIES it to the live runtime and tells you in the
SAME turn whether it COMPILED and how many cells changed; if it reports "FAILED TO COMPILE", your edit is
malformed — read the error, fix it, and re-edit (the live runtime is left untouched until it compiles). Use
read_file to read with line numbers, write_file to create a file or a whole new module. Use bash for shell
work — ls, grep, find, running commands — and for raw bytes (od/wc/base64). exitCode != 0 is normal output,
not a crash. Prefer standard-library building blocks over hand-rolled DOM/loops (Inputs.table over a hand-built
<table>, d3/Plot over manual math) when they fit. These tools show a cell's SOURCE; to see what a cell actually
evaluates to at RUNTIME — its live value, or its error if it is failing — use inspect_value / list_values
rather than guessing from the code.

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

Your filesystem mirrors the notebook in two trees:
- /notebook/<id>.js — your EDITABLE live modules (writing one applies to the runtime, as above).
- /content/<id> — the raw, read-only microkernel ingredients that are NOT modules: bootconf.json (the boot
  config — its \`mains\` list), the bootloader, the bundled libraries, and every FILE ATTACHMENT, stored as
  its on-disk bytes (gzip attachments stay COMPRESSED). The file's presence tells you the ingredient exists;
  ls/cat/od/wc/base64 inspect it. The shell has NO working gunzip/zcat in this build — to read a gzipped block,
  decompress it with eval_js + DecompressionStream (recipe below), don't waste turns on zcat/gunzip/file.

You can study every aspect of yourself; INVESTIGATE rather than guess. Your tools, by what they reveal:
- bash — shell over the fs (ls/grep/find/cat, running commands) and raw bytes (od/wc/base64). Read your own
  modules and the libraries they use under /notebook and /content (exporter-3 is the reference for how a
  notebook serializes itself into \`<script>\` blocks; fileattachments and runtime-sdk explain attachment
  resolution and runtime access). It is a VIRTUAL filesystem with NO network: curl/wget/nc reach nothing —
  for any network access use eval_js + fetch (see below), or define a cell that fetches.
- read_file / write_file / edit_file — Claude-Code-style file access. edit_file is the reliable way to change a
  module (exact literal replacement); writing/editing a live /notebook module applies it and reports whether
  it compiled.
- view_image — load an image file (a screenshot, or an image FileAttachment under /content/<module>/<file>)
  so you can SEE it; the image becomes visible to you on your NEXT step. The user can also attach images
  directly in chat — when they do, look before you act.
- inspect_value / list_values — the live runtime VALUE (or error) of any cell.
- watch_variable / unwatch_variable — keep watching a cell: after you watch it, any change to its live value is
  STREAMED to you automatically (as "Watch updates") without re-inspecting. Watch a downstream cell, make an
  edit, and you will see the new value on your next step.
- eval_js — run native JavaScript scoped to a module, for transforms bash can't do. The module's builtins
  (FileAttachment, md, html, Inputs, Plot, d3, Generators) and cells are in scope, and so are browser globals
  (DecompressionStream, window, document). This is how you DECODE an attachment: a gzipped attachment at
  /content/@user/mod/file.gz belongs to module "@user/mod" with FileAttachment name "file.gz", so run
  \`new Response((await FileAttachment("file.gz").stream()).pipeThrough(new DecompressionStream("gzip"))).text()\`
  scoped to "@user/mod". Compose multi-step: locate the raw ingredient, then transform it in userspace.
  This is also how you do NETWORK access — the shell has no network, so fetch from here:
  \`await (await fetch(url)).json()\` (or \`.text()\`). The notebook's networking layer handles the request; the
  result comes back as the eval_js output. To make a fetched value reactive/reusable, write_file a cell instead.

Work incrementally: inspect before editing, make the change, then RE-READ (and where possible reason about
the value) to confirm it is correct. To read the LIVE value of a cell you just created or edited — including a
\`viewof\` element you added — call inspect_value with that module id and the cell name (e.g.
inspect_value module="@user/mod" name="viewof game"), or list_values to survey the new module; its cells are
addressable by name the instant it compiles. Do NOT hunt for your own new cell with eval_js / Object.keys(this).
Preserve the module format exactly. If a request is impossible or
ambiguous, say so and ask rather than guessing. Take a concrete action — a tool call — on EVERY turn; never
just describe what you are about to do and stop. When the task is fully done (or you have finished answering),
call the \`task_complete\` tool with a short summary; that is how you end your turn.`
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
