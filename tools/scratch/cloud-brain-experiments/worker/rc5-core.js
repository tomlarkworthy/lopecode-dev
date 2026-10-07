// @tomlarkworthy/robocoop-5-core — the DOM-free brain of robocoop-5.
//
// Tight core: exactly what the robocoop-5 modules consume — the tool-use loop (createAgentSession,
// with the completeGuard veto hook), the OpenRouter client factory, defineTool, composeFooter, and the
// pure transcript formatters (summarizeTurn, toolLabel). Descended from @tomlarkworthy/robocoop-4-core;
// robocoop-4 keeps its own copy (with bash tooling and its system prompt) untouched.
//
// Exports: truncate, defineTool, createOpenRouterClient, createAgentSession, composeContext,
//          composeFooter, summarizeTurn, toolLabel.

const _title = function _title(md){return(
md`# robocoop-5-core
The DOM-free brain of robocoop-5: the explicit-completion tool-use loop (\`createAgentSession\`, with
the \`completeGuard\` veto hook), the OpenRouter client factory, \`defineTool\`, \`composeFooter\` and the
pure transcript formatters. No bash, no DOM, no fetch at module scope.`
)};

const _doc_composeFooter = function _doc_composeFooter(md){return(
md`### \`composeFooter({workdir, model})\`
Standard system-prompt footer (working directory + model line) appended by the engine's editable
prompt view.`
)};

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


const _doc_createOpenRouterClient = function _doc_createOpenRouterClient(md){return(
md`### \`createOpenRouterClient({apiKey, fetch, referer, title, defaultModel})\`
OpenRouter chat-completions client (OpenAI wire format). Non-streaming today (\`stream:false\`);
returns \`{message, finish_reason, raw}\` with the assistant message **verbatim** incl. any
\`tool_calls\`. \`fetch\`/key are pluggable; \`fetch\` defaults to \`globalThis.fetch\`.`
)};

const _createOpenRouterClient = function _createOpenRouterClient(globalThis){return(
function createOpenRouterClient({
    apiKey = (globalThis.process && globalThis.process.env ? globalThis.process.env.OPENROUTER_API_KEY : undefined),
    fetch = globalThis.fetch,
    baseUrl = 'https://openrouter.ai/api/v1',
    referer,
    title,
    defaultModel = 'anthropic/claude-sonnet-4',
    // No `data:` line for this long = a dead request: abort and retry. Comment lines do not count — OpenRouter
    // sends ": OPENROUTER PROCESSING" every ~0.4 s while it waits on the provider, however long that is.
    streamIdleMs = 180000,
    // Thinking with no visible output (content or tool call) for this long: abort and re-ask the same step with
    // the next, cheaper reasoning block. mimo-v2.5-pro reasoned 5-14 min on 6 of 98 sampled steps
    // (2026-09-28), across providers; `reasoning.max_tokens` was not honoured, `effort: 'low'` was. null disables.
    reasoningBudgetMs = 180000,
    reasoningFallbacks = [{ effort: 'low' }, { enabled: false }],
    cacheModels   // optional Set<modelId> needing explicit cache_control; auto-detected from /models if omitted
  } = {}) {
    if (typeof fetch !== 'function') {
      throw new Error('createOpenRouterClient: no fetch available (pass {fetch})');
    }
    // Which models need/benefit from explicit cache_control. OpenRouter prices a cache READ
    // (pricing.input_cache_read) only for providers with explicit caching (Anthropic/Qwen/Gemini); OpenAI,
    // DeepSeek, Grok, etc. cache automatically and must NOT be sent breakpoints. Auto-detected once from the
    // public /models catalog (no key needed), non-blocking; a name test covers calls before it lands.
    let cacheableIds = cacheModels instanceof Set ? cacheModels : null;
    if (!cacheableIds) {
      Promise.resolve()
        .then(() => fetch(`${baseUrl}/models`))
        .then((r) => (r && r.ok ? r.json() : null))
        .then((j) => { if (j && Array.isArray(j.data)) cacheableIds = new Set(j.data.filter((m) => m && m.pricing && 'input_cache_read' in m.pricing).map((m) => m.id)); })
        .catch(() => {});
    }
    const supportsCacheControl = (model) => (cacheableIds ? cacheableIds.has(model) : /anthropic|claude|qwen/i.test(model || ''));
    const headers = () => {
      const h = { 'Content-Type': 'application/json' };
      const key = String(apiKey ?? '').trim();
      if (key) h.Authorization = `Bearer ${key}`;
      if (referer) h['HTTP-Referer'] = referer;
      if (title) h['X-Title'] = title;
      return h;
    };
    // Sampling controls (temperature, seed, reasoning) are all opt-in: each is sent ONLY when non-null, so
    // an unset one leaves the provider default in place (sending `temperature: null` is a 400 on some
    // providers, and an explicit `reasoning` block changes what the endpoint reports back).
    async function chat({ model = defaultModel, messages, tools, tool_choice = 'auto', temperature, seed, reasoning, max_tokens, signal, onReasoningToken } = {}) {
      if (!model) throw new Error('no model selected (the model picker is empty — wait for the model catalog to load, then pick a model)');
      // Explicit cache_control for providers that require it. Two breakpoints: the stable system prompt, and
      // a ROLLING one on the last message so the growing tool-use prefix is cached step-to-step (prompt tokens
      // dominate a long agent loop, so this is the main cost lever). Auto-cachers are left untouched. Two
      // breakpoints is well under Anthropic's limit of four.
      let outMessages = messages;
      if (Array.isArray(messages) && messages.length && supportsCacheControl(model)) {
        const mark = (msg) => {
          if (!msg) return msg;
          if (typeof msg.content === 'string') return { ...msg, content: [{ type: 'text', text: msg.content, cache_control: { type: 'ephemeral' } }] };
          if (Array.isArray(msg.content) && msg.content.length) {
            const c = msg.content.slice();
            c[c.length - 1] = { ...c[c.length - 1], cache_control: { type: 'ephemeral' } };
            return { ...msg, content: c };
          }
          return msg; // null content (assistant tool_calls only) can't carry a breakpoint
        };
        outMessages = messages.slice();
        if (outMessages[0] && outMessages[0].role === 'system') outMessages[0] = mark(outMessages[0]);
        const lastIdx = outMessages.length - 1;
        if (lastIdx > 0) outMessages[lastIdx] = mark(outMessages[lastIdx]);
      }
      const body = {
        model,
        messages: outMessages,
        stream: false,
        // ask OpenRouter to return token counts AND the actual USD cost of the call in `usage`.
        usage: { include: true },
        ...(tools && tools.length ? { tools, tool_choice } : {}),
        ...(temperature != null ? { temperature } : {}),
        ...(seed != null ? { seed } : {}),
        ...(reasoning != null ? { reasoning } : {}),
        ...(max_tokens != null ? { max_tokens } : {})
      };
      // Transient failures (network drops, 429 rate limits, 5xx) are retried with exponential backoff —
      // a single throttled request must not kill a whole agent turn. Aborts (steer/interrupt) never retry.
      // A spent daily budget ("Come back tomorrow", the demo gateway's 429) is not transient: retrying it only
      // held the step ~3.5 min before the same error.
      const retriable = (e) => !/come back tomorrow/i.test(String(e && e.message || e)) && /Failed to fetch|NetworkError|network error|load failed|stream error|stream idle|Upstream error|overloaded|ECONNRESET|OpenRouter (408|429|5\d\d)/i.test(String(e && e.message || e));
      let lastErr;
      // 8 attempts, backoff capped at 60 s (~4 min total): a provider outage of a few minutes exhausted
      // the old 5 x <=16 s budget mid-turn (2026-09-03). steer/interrupt still aborts a waiting retry.
      const STREAM_IDLE_MS = streamIdleMs;
      let thinkLevel = 0, overBudget = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        if (attempt && !overBudget) await new Promise((r) => setTimeout(r, Math.min(60000, 1000 * 2 ** attempt) + Math.random() * 1000));
        if (signal && signal.aborted) throw (lastErr || new Error('aborted'));
        let watchdog;
        try {
          // STREAMING (SSE): long generations over proxied networks die if the connection looks idle —
          // a non-streaming completion is silent for the entire generation. Streamed deltas keep the
          // socket alive; the message (content + tool_calls) is reassembled here so callers see the
          // same shape as the non-streaming API.
          // Progress is a `data:` line, not a byte: a request stuck upstream still receives a keep-alive comment
          // every ~0.4 s, so a byte-reset timer never fired and a stuck step held until the turn's wall clock
          // (2026-09-28: 320-821 s steps). No data for STREAM_IDLE_MS → abort and retry.
          const ctrl = new AbortController();
          const onAbort = () => ctrl.abort();
          if (signal) signal.addEventListener('abort', onAbort, { once: true });
          const sentAt = Date.now();
          let lastData = sentAt, rejectIdle, thought = false, visible = false;
          overBudget = false;
          const idleP = new Promise((_, rej) => { rejectIdle = rej; });
          idleP.catch(() => {});
          const canFallBack = reasoningBudgetMs != null && thinkLevel < reasoningFallbacks.length;
          watchdog = setInterval(() => {
            if (canFallBack && thought && !visible && Date.now() - sentAt >= reasoningBudgetMs) {
              clearInterval(watchdog);
              overBudget = true;
              rejectIdle(new Error('OpenRouter reasoning over budget: no visible output after ' + reasoningBudgetMs + 'ms'));
              ctrl.abort();
              return;
            }
            if (Date.now() - lastData < STREAM_IDLE_MS) return;
            clearInterval(watchdog);
            rejectIdle(new Error('OpenRouter stream idle: no data for ' + STREAM_IDLE_MS + 'ms'));
            ctrl.abort();
          }, Math.min(1000, STREAM_IDLE_MS, reasoningBudgetMs ?? Infinity));
          const idle = (p) => Promise.race([p, idleP]);
          const res = await idle(fetch(`${baseUrl}/chat/completions`, {
            method: 'POST', headers: headers(), body: JSON.stringify({ ...body, ...(thinkLevel ? { reasoning: reasoningFallbacks[thinkLevel - 1] } : {}), stream: true }), signal: ctrl.signal
          })).catch((e) => { if (signal) signal.removeEventListener('abort', onAbort); throw e; });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            let detail = text;
            try { const j = JSON.parse(text); detail = j?.error?.message || text; } catch {}
            throw new Error('OpenRouter ' + res.status + ': ' + detail);
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          // `provider` is the endpoint OpenRouter actually routed to. It is a measurement confound (the same
          // model served by two providers differs in latency, cache behaviour and reasoning reporting), so it
          // is surfaced rather than dropped.
          let buf = '', sawChoice = false, finish = null, native = null, usage = null, provider = null;
          const acc = { content: '', tool_calls: [], reasoning: '' };
          // Instrument the stream rather than a clock around the call
          // (feedback_measure_from_component_events_not_a_clock): the gap between `firstDeltaMs` and
          // `firstVisibleMs` IS the blank-screen the reasoning stream exists to fill, so both are recorded.
          const t0 = Date.now();
          const timings = { startedAt: t0, firstDeltaMs: null, firstReasoningMs: null, firstVisibleMs: null, endMs: null, attempt: attempt + 1, reasoningFallback: thinkLevel ? reasoningFallbacks[thinkLevel - 1] : null };
          for (;;) {
            const { done, value } = await idle(reader.read()).catch((e) => { if (signal) signal.removeEventListener('abort', onAbort); throw e; });
            if (done) { clearInterval(watchdog); if (signal) signal.removeEventListener('abort', onAbort); break; }
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith('data: ')) continue;
              lastData = Date.now();
              const payload = line.slice(6);
              if (payload === '[DONE]') continue;
              let j;
              try { j = JSON.parse(payload); } catch { continue; }
              const c = j.choices && j.choices[0];
              if (c) {
                sawChoice = true;
                const d = c.delta || {};
                if (timings.firstDeltaMs == null) timings.firstDeltaMs = Date.now() - t0;
                // Reasoning deltas. OpenRouter normalises to `reasoning`; some providers (DeepSeek lineage)
                // send `reasoning_content`. Take whichever is present, never both — OpenRouter ALSO mirrors
                // the same text into `reasoning_details[]`, so summing every carrier would duplicate it.
                const rd = typeof d.reasoning === 'string' ? d.reasoning
                  : typeof d.reasoning_content === 'string' ? d.reasoning_content : null;
                if (rd) {
                  thought = true;
                  if (timings.firstReasoningMs == null) timings.firstReasoningMs = Date.now() - t0;
                  acc.reasoning += rd;
                  // A throwing UI handler must not kill the turn — the reasoning stream is decoration.
                  if (typeof onReasoningToken === 'function') { try { onReasoningToken(rd); } catch (e) {} }
                }
                if ((typeof d.content === 'string' && d.content) || (Array.isArray(d.tool_calls) && d.tool_calls.length)) {
                  visible = true;
                  if (timings.firstVisibleMs == null) timings.firstVisibleMs = Date.now() - t0;
                }
                if (typeof d.content === 'string') acc.content += d.content;
                if (Array.isArray(d.tool_calls)) {
                  for (const tc of d.tool_calls) {
                    const i = tc.index ?? 0;
                    const slot = acc.tool_calls[i] || (acc.tool_calls[i] = { id: '', type: 'function', function: { name: '', arguments: '' } });
                    if (tc.id) slot.id = tc.id;
                    if (tc.function && tc.function.name) slot.function.name += tc.function.name;
                    if (tc.function && typeof tc.function.arguments === 'string') slot.function.arguments += tc.function.arguments;
                  }
                }
                if (c.finish_reason) finish = c.finish_reason;
                if (c.native_finish_reason) native = c.native_finish_reason;
              }
              if (j.usage) usage = j.usage;
              if (j.provider) provider = j.provider;
              if (j.error) throw new Error('OpenRouter stream error: ' + (j.error.message || JSON.stringify(j.error)));
            }
          }
          if (!sawChoice) throw new Error('OpenRouter: no choices in stream');
          timings.endMs = Date.now() - t0;
          const message = { role: 'assistant', content: acc.content || null };
          const calls = acc.tool_calls.filter(Boolean);
          if (calls.length) message.tool_calls = calls;
          // The message must stay WIRE-CLEAN: it is pushed into `messages` verbatim and re-sent every step,
          // so an enumerable `reasoning` here would silently start echoing thinking back to the provider
          // (a real, separate change with its own cost and quality question). Non-enumerable ⇒ invisible to
          // JSON.stringify and to `{...msg}`, still readable as `res.message.reasoning`.
          if (acc.reasoning) Object.defineProperty(message, 'reasoning', { value: acc.reasoning, enumerable: false, configurable: true, writable: true });
          return { message, finish_reason: finish, native_finish_reason: native, usage, provider, reasoning: acc.reasoning || null, timings, raw: { streamed: true } };
        } catch (e) {
          clearInterval(watchdog);
          if (overBudget && !(signal && signal.aborted)) {
            thinkLevel++;
            if (typeof onReasoningToken === 'function') { try { onReasoningToken('\n[no answer after ' + Math.round(reasoningBudgetMs / 1000) + ' s of thinking: asking again with reasoning ' + JSON.stringify(reasoningFallbacks[thinkLevel - 1]) + ']\n'); } catch (_) {} }
            lastErr = e;
            continue;
          }
          if ((e && e.name === 'AbortError') || (signal && signal.aborted) || !retriable(e)) throw e;
          lastErr = e;
        }
      }
      throw lastErr;
    }
    return { chat };
  }
)};

// ── createAgentSession ──────────────────────────────────────────────────────

const _doc_createAgentSession = function _doc_createAgentSession(md){return(
md`### \`createAgentSession({client, toolsProvider, systemPromptProvider, modelProvider, runCommand, …})\`
The persistent, live-resolved conversation. \`messages\` persists across \`send()\` calls (one long
chat). Tools, model and system prompt are re-read from their PROVIDERS at the top of **every step**,
so a notebook can register a new tool mid-conversation and it is offered on the next model turn with
no restart. Loop invariants: assistant turns appended verbatim, exactly one \`{role:'tool'}\` reply
per \`tool_calls[]\` entry, defensive JSON arg parse, central [\`truncate\`](#) of tool output.

LIVE CONTROL: \`steer(input)\` injects a user message into the RUNNING turn and aborts the in-flight model
call so it is read on the next step (the model is re-read each step, so switching the model picker mid-turn
applies on the next call); \`interrupt()\` aborts the in-flight call without injecting (used to apply a model
switch immediately); \`abort()\` hard-stops the whole turn. Returns \`{messages, send, abort, reset, interrupt, steer}\`.`
)};

const _createAgentSession = function _createAgentSession(AbortController,truncate)
{
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
    // Sampling, all opt-in: each is forwarded to client.chat() ONLY when non-null, so leaving them unset
    // keeps the provider's default (and keeps the request byte-identical to before this option existed).
    // temperature/seed pin sampling for reproducibility and for arm-matched benchmark runs (a baseline that
    // pins T=0 against an arm on the provider default is not a controlled comparison). CAVEAT: mimo-v2.5-pro
    // in thinking mode (its default) IGNORES temperature/top_p, so on mimo these change nothing — they are
    // real for the other models in the picker.
    temperature = null,
    seed = null,
    // Opaque OpenRouter `reasoning` block, forwarded verbatim when non-null (e.g. {enabled:false} to buy
    // ~-43% wall / -48% completion tokens on a thinking model, at an unmeasured quality cost). Opaque on
    // purpose: the provider owns this schema, the loop just carries it.
    reasoning = null,
    // Live-resolved reasoning: reasoningProvider() → the block to send (or null), re-read at the top of
    // every send(). Same idiom as modelProvider — a UI toggle can flip fast mode WITHOUT rebuilding the
    // session (a rebuild would wipe the chat history). Falls back to the static `reasoning` above.
    reasoningProvider = null,
    toolChoice = 'auto',
    toolOutputLimit = 8000,
    runCommand,
    completeToolName = null,
    // Opt-in veto over the completion signal: completeGuard({step, toolCallsThisTurn, summary, text,
    // toolNames}) returns a string to REJECT this task_complete (pushed as the tool result so the model
    // reads why) or null to accept. Applied at most ONCE per turn, so a model that insists can still end
    // the turn on its second call — the guard pushes back on premature/fabricated completion without
    // risking a livelock. `text` is the assistant message's own content on this step and `toolNames` are
    // the ids of the tools ACTUALLY registered right now, so a guard can address the user's real session
    // instead of a hardcoded tool list (see zeroToolCallGate).
    completeGuard = null,
    stallNudgeLimit = 0,
    malformedRetryLimit = 4,
    nudgeMessage,
    // Out-of-band per-STEP channel: noticesProvider({step, turn}) → string[] | null, called SYNCHRONOUSLY at
    // the top of every step (never awaited — whatever it returns must already be computed). Each line is
    // pushed as a system message before the model call. This is the seam ambient monitors ride on.
    noticesProvider,
    // Situational context (opt-in): contextProvider({scope, turn}) → string|null|Promise. Called with
    // scope 'session' once (result spliced right after the system prompt, so it lives in the cached
    // prefix) and scope 'turn' at the start of every send() (result pushed as a system message BEFORE
    // the user message, so the user's words stay last). A throw or null injects nothing.
    contextProvider = null,
  } = {}) {
    if (!client || typeof client.chat !== 'function')
      throw new Error('createAgentSession requires a client with a chat() method');

    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
    // Resolve the model defensively: the picker can momentarily read EMPTY (its <select> options arrive from
    // an async catalog fetch, so a value not yet in the option list reads as ""), and sending an empty model
    // is OpenRouter 400 "No models provided". Remember the last non-empty model and reuse it rather than send
    // blank; the underlying provider is still re-read every step, so switching the model picker still applies.
    const getReasoning = reasoningProvider ?? (() => reasoning);
    const rawGetModel = modelProvider ?? (() => model);
    let lastModel = null;
    const getModel = () => {
      const m = rawGetModel();
      const s = m == null ? "" : String(m).trim();
      if (s) { lastModel = s; return s; }
      return lastModel;   // null only if we have NEVER seen a model; chat() surfaces that with a clear error
    };

    // Explicit-completion protocol (opt-in). When completeToolName is set, the loop stops on that tool call
    // (not on bare text), so the model can no longer end a turn by narrating; a bare-text turn is treated as a
    // STALL and nudged. The nudge is bounded by stallNudgeLimit so a model that refuses to act still terminates.
    const completeSpec = completeToolName ? {
      type: 'function',
      function: {
        name: completeToolName,
        description: 'Call this to END YOUR TURN: when the task is fully complete, when you have finished ' +
          'answering, or when you are BLOCKED on something only the user can provide (missing information, a ' +
          'decision, credentials). Put your summary, final answer, or QUESTION TO THE USER in `summary` — the ' +
          'user cannot see or answer anything until your turn ends, so ending the turn IS how you ask. Never ' +
          'keep taking tool actions while waiting on the user.',
        parameters: { type: 'object', properties: { summary: { type: 'string', description: 'Short summary / final answer shown to the user.' } }, required: [] },
      },
    } : null;
    const nudge = nudgeMessage ?? ('You ended your turn without calling a tool. If the task is complete, call ' +
      (completeToolName || 'the completion tool') + ' with a short summary. If you need information or a ' +
      'decision from the user, call it with your question as the summary — the user only sees it when your ' +
      'turn ends. Otherwise keep going — call a tool to take the next concrete step; do not just describe ' +
      'what you will do.');

    const messages = [];
    let currentAbort = null;
    let turnCount = 0;                 // send() count; passed to contextProvider
    let sessionContextInjected = false; // latched only on success, so a boot-race null retries next turn
    // Cumulative token/cost usage across this session's calls (OpenRouter returns usage.cost in USD when
    // usage.include is set). Lets the UI / evals report what a conversation actually cost.
    // reasoningTokens and providers exist for measurement: a reasoning-off arm can only be compared against
    // a control if the control reports its reasoning volume, and the SERVED provider (same model, different
    // endpoint) is a latency/cache confound that has to be recorded, not assumed.
    const usage = { calls: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, reasoningTokens: 0, reasoningChars: 0, costUSD: 0, providers: {} };
    const usageSnapshot = () => ({ ...usage, providers: { ...usage.providers } });
    let stepAbort = null;          // aborts ONLY the in-flight model call (steer / model-switch), not the turn
    const steerQueue = [];         // user messages enqueued mid-turn via steer(); drained at the top of each step

    function abort() { currentAbort?.abort(); }          // hard stop: end the whole turn
    function interrupt() { stepAbort?.abort(); }         // soft: drop the in-flight call, redo the step (re-reads model)
    // Normalise a send/steer input (string | {text, images}) to one OpenAI user message, or null if empty.
    function buildUserMessage(input) {
      let userText = input, images = null;
      if (input && typeof input === 'object' && !Array.isArray(input)) { userText = input.text ?? null; images = input.images || null; }
      if (images && images.length) {
        const parts = [];
        if (userText != null) parts.push({ type: 'text', text: String(userText) });
        for (const url of images) if (url) parts.push({ type: 'image_url', image_url: { url } });
        return parts.length ? { role: 'user', content: parts } : null;
      }
      return userText != null ? { role: 'user', content: String(userText) } : null;
    }
    // steer(input): queue a user message for the RUNNING turn and interrupt the in-flight call so it is read
    // on the very next step (the discarded call's partial response is dropped, the model is re-read). If idle,
    // the message waits and is consumed at the start of the next send().
    function steer(input) { const m = buildUserMessage(input); if (m) { steerQueue.push(m); interrupt(); } }
    function reset() { messages.length = 0; steerQueue.length = 0; turnCount = 0; sessionContextInjected = false; }

    // `input` is a string, or { text, images } where images is an array of data/URL strings — the user turn
    // is sent as OpenAI multimodal content parts so a vision model can SEE attached screenshots/images.
    // `overrides` (3rd arg, additive — the 2nd is the long-standing callbacks bag) varies sampling for THIS
    // turn only: {temperature, seed, reasoning}. Used by conditional resampling (retry the same turn at a
    // different temperature/seed); an absent key falls back to the session default.
    async function send(input, callbacks = {}, overrides = {}) {
      const turnTemperature = overrides.temperature !== undefined ? overrides.temperature : temperature;
      const turnSeed = overrides.seed !== undefined ? overrides.seed : seed;
      let providedReasoning = null;
      try { providedReasoning = getReasoning(); } catch (e) {}
      const turnReasoning = overrides.reasoning !== undefined ? overrides.reasoning : providedReasoning;
      const um = buildUserMessage(input);
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
        // Loop-owned operating principles: appended to WHATEVER system prompt the provider supplies, so
        // they hold even when a host swaps in a domain prompt. Trigger-conditioned — each names when it
        // applies AND when it does not, to avoid over-application on simple tasks.
        const LOOP_PRINCIPLES = '\n\nOPERATING PRINCIPLES (always active):\n' +
          '- Target check before hard-to-undo actions (external mutations, purchases, cancellations, sends, ' +
          'deletions): name the exact target entity first. If MORE THAN ONE entity could plausibly match the ' +
          'request, or you have not examined all plausible candidates, resolve the ambiguity before acting — ' +
          'inspect the candidates, or ask the user when only they can disambiguate. Records you have NOT ' +
          'opened count as unexamined candidates: a match is only unique once you have surveyed every record ' +
          'that could contain the target. Never resolve ambiguity by taking the first match. When the survey ' +
          'is complete and exactly one candidate matches, proceed without asking.\n' +
          '- Multi-part requests: when a request contains several distinct deliverables or changes, enumerate ' +
          'them explicitly up front, and before finishing check each part off — partial completion otherwise ' +
          'passes unnoticed. Skip this for single-part requests. A part you are NOT permitted to do is ' +
          'checked off by SAYING SO: declining it under a stated policy, or asking the user for what only ' +
          'they can supply, completes that part — never substitute a nearby action you were not asked for.';
        const m = { role: 'system', content: String(sp) + LOOP_PRINCIPLES };
        if (messages[0]?.role === 'system') messages[0] = m;
        else messages.unshift(m);
      }

      // The user message is pushed SYNCHRONOUSLY (before any await) — the UI renders right after
      // kicking off send() and relies on the bubble already being there. Context is spliced in
      // around it afterwards.
      if (um) messages.push(um);

      turnCount++;
      if (contextProvider) {
        // Session-scope context: once, right after the system prompt so it stays in the cached prefix.
        if (!sessionContextInjected) {
          let sc = null;
          try { sc = await contextProvider({ scope: 'session', turn: turnCount }); } catch (e) {}
          if (sc) {
            messages.splice(messages[0]?.role === 'system' ? 1 : 0, 0, { role: 'system', content: String(sc) });
            sessionContextInjected = true;
            callbacks.onContext?.('session', String(sc));
          }
        }
        // Turn-scope context: every send(), spliced BEFORE the user message so their words stay last.
        let tc = null;
        try { tc = await contextProvider({ scope: 'turn', turn: turnCount }); } catch (e) {}
        if (tc) {
          messages.splice(messages.length - (um ? 1 : 0), 0, { role: 'system', content: String(tc) });
          callbacks.onContext?.('turn', String(tc));
        }
      }

      // Exactly one {role:'tool'} reply per tool_calls[] entry — the loop's core invariant. One helper so the
      // four reply sites (truncated args, completion ack, unknown tool, normal output) can't drift apart.
      const pushToolResult = (callId, content) => {
        messages.push({ role: 'tool', tool_call_id: callId, content });
        callbacks.onToolResult?.(callId, content);
      };

      let finishReason = null;
      let step = 0;
      let stalls = 0;
      let malformed = 0;
      let turnToolCalls = 0;     // executed (non-completion) tool calls this turn — feeds completeGuard
      let completeVetoed = false;
      let batchVetoed = false;   // completion sent alongside other tool calls, refused once per turn
      const startLen = messages.length;

      const dropImages = () => {
        let n = 0;
        for (const m of messages) if (Array.isArray(m.content)) m.content = m.content.map((p) => p && p.type === 'image_url' ? (n++, { type: 'text', text: '[image not shown: the model takes text only]' }) : p);
        return n;
      };
      for (step = 0; step < maxStepsPerTurn; step++) {
        if (abortController.signal.aborted) { finishReason = 'aborted'; break; }
        callbacks.onStep?.(step, messages);

        // Stream out-of-band notices (e.g. watched-variable changes) into the conversation before the model
        // turn, so live value changes reach the model automatically without it polling.
        if (noticesProvider) {
          // Called with the step phase (additive — every existing provider is a zero-arg arrow). Ambient
          // monitors need it to know WHICH step they are reporting for; nothing here is awaited, so a
          // provider that schedules work does it inside the model call that follows on the next line.
          let notices; try { notices = noticesProvider({ step, turn: turnCount }); } catch (e) { notices = null; }
          if (notices && notices.length) {
            messages.push({ role: 'system', content: 'Watch updates (live values changed since your last step):\n' + notices.join('\n') });
            callbacks.onNotice?.(notices);
          }
        }

        // Steering: inject any user messages enqueued via steer() during this turn BEFORE the model call, so
        // the running agent reads new instructions (or a redirect) on this step, with the latest model.
        if (steerQueue.length) {
          for (const sm of steerQueue.splice(0)) { messages.push(sm); callbacks.onSteer?.(sm); }
        }

        const live = getTools() ?? [];
        const wire = completeSpec ? [...live.map(toWireTool), completeSpec] : live.map(toWireTool);
        const byId = new Map(live.map((t) => [t.id, t]));

        // Per-step abort: steer()/interrupt() abort ONLY this in-flight model call so we can loop, re-read the
        // (possibly switched) model and drain any steer message; the turn-level abort() still stops for good.
        const stepController = new AbortController();
        stepAbort = stepController;
        if (abortController.signal.aborted) stepController.abort();
        const linkTurnAbort = () => stepController.abort();
        abortController.signal.addEventListener('abort', linkTurnAbort, { once: true });
        let res;
        try {
          res = await client.chat({
            // an assistant turn with no content and no tool call (reasoning cut off at the token limit) stays
            // in the transcript for display; on the wire it is invalid and providers 400 the whole request
            model: getModel(), messages: messages.filter(m => !(m.role === 'assistant' && m.content == null && !m.tool_calls?.length)), tools: wire, tool_choice: toolChoice, max_tokens: maxTokens,
            ...(turnTemperature != null ? { temperature: turnTemperature } : {}),
            ...(turnSeed != null ? { seed: turnSeed } : {}),
            ...(turnReasoning != null ? { reasoning: turnReasoning } : {}),
            // Live reasoning stream (opt-in, additive): forwarded only when the caller actually wants it, so
            // a client stubbed in a test or written against the old signature sees an unchanged argument set.
            ...(typeof callbacks.onReasoningToken === 'function' ? { onReasoningToken: (chunk) => callbacks.onReasoningToken(chunk, step) } : {}),
            signal: stepController.signal,
          });
        } catch (e) {
          abortController.signal.removeEventListener('abort', linkTurnAbort);
          stepAbort = null;
          if (abortController.signal.aborted) { finishReason = 'aborted'; break; }   // hard stop
          if (stepController.signal.aborted) { callbacks.onInterrupt?.(step); continue; }  // steer / model-switch → redo step
          // A text-only model refuses the whole request once any message holds an image, and the image stays in
          // the history, so every later call failed too (rc5-train 20260929-0620-m74: mimo-v2.5-pro, a screenshot
          // tool's ctx.attachImage). Replace the images with a note, tell the model, redo the step.
          if (/support image input/i.test(String(e?.message)) && dropImages()) {
            messages.push({ role: 'system', content: 'The model ' + getModel() + ' takes text only (' + e.message + '). The image(s) sent since your last step were NOT shown to you and are removed. ' +
              'You have not seen them: do not describe what they show. Check what you need another way (the element through eval_js or inspect_value), ' +
              'and tell the user that seeing an image needs a vision model (one not marked "no vision" in the model menu).' });
            continue;
          }
          throw e;   // genuine network / provider error
        }
        abortController.signal.removeEventListener('abort', linkTurnAbort);
        stepAbort = null;
        if (res?.usage) {
          usage.calls += 1;
          usage.promptTokens += res.usage.prompt_tokens || 0;
          usage.completionTokens += res.usage.completion_tokens || 0;
          usage.cachedTokens += res.usage.prompt_tokens_details?.cached_tokens || 0;
          // NOTE: some endpoints report reasoning_tokens as 0 unless `reasoning` was sent explicitly, even
          // while streaming reasoning — a 0 here is "not reported", not "no reasoning happened".
          usage.reasoningTokens += res.usage.completion_tokens_details?.reasoning_tokens || 0;
          usage.costUSD += res.usage.cost || 0;
        }
        // Streamed reasoning bytes — the only measure of reasoning volume that a CONTROL arm can report,
        // since an endpoint that was not sent an explicit `reasoning` block reports reasoning_tokens: 0
        // while streaming thousands of characters. Counted outside the usage guard for that reason.
        if (typeof res?.reasoning === 'string') usage.reasoningChars += res.reasoning.length;
        if (res?.provider) usage.providers[res.provider] = (usage.providers[res.provider] || 0) + 1;
        const msg = res?.message;
        if (!msg) throw new Error('client.chat returned no message');

        // Some providers (notably Gemini) reject the model's OWN tool call upstream and return an EMPTY
        // assistant turn: finish_reason 'error' / native_finish_reason 'MALFORMED_FUNCTION_CALL', content
        // null, no tool_calls, 0 tokens. Pushing that null-content message would poison later turns (like a
        // truncated call) and it conveys nothing. Drop it, give a TARGETED nudge (the generic stall nudge
        // doesn't name the real fault), and retry the step — these are usually transient and cost 0 tokens.
        const noContent = !msg.content && !(Array.isArray(msg.tool_calls) && msg.tool_calls.length);
        const isMalformed = noContent && (res.finish_reason === 'error' || res.native_finish_reason === 'MALFORMED_FUNCTION_CALL');
        if (isMalformed) {
          if (malformed < malformedRetryLimit && step < maxStepsPerTurn - 1) {
            malformed++;
            messages.push({ role: 'system', content: 'Your previous reply was rejected by the provider as a malformed function call — it produced no valid tool call and no text. Emit exactly ONE tool call with strictly valid JSON arguments (every string closed, no trailing commas, no comments), or reply with plain text. Keep the call small.' });
            callbacks.onMalformed?.(malformed);
            continue;
          }
          finishReason = 'error';
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }

        messages.push(msg);
        if (msg.content) callbacks.onText?.(msg.content);

        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (calls.length === 0) {
          // No action taken. With the completion protocol, a bare-text turn is a STALL, not "done": nudge the
          // model to either act or call task_complete, up to stallNudgeLimit consecutive times, then fall back
          // to stopping (so a model that refuses to act can't loop forever). Two flavours: (1) fr 'stop' — it
          // narrated instead of acting; (2) fr 'length' — it burned the WHOLE token budget (typically a
          // reasoning model over-planning) and was cut off BEFORE any tool call, so nothing ran and there is
          // nothing to salvage; left alone it dies silently. Both are nudged (bounded), with a length-specific
          // message that tells the over-thinker to stop planning and take ONE small concrete step. CRITICAL: the
          // length nudge must NOT say "write a minimal skeleton" — a write_file-style model takes that literally
          // and rewrites the WHOLE file, discarding the cells it already built (observed: 17-cell build reset to
          // 3 cells). Steer it to ADVANCE the existing work with a small edit_file, never to restart.
          const fr = res.finish_reason ?? 'stop';
          // A nudged reply that restates the previous bare-text reply is an answer, not a stall: end the turn
          // (mimo-v2.5-pro wrote the same notebook explanation three times across two nudges, rc5-train m8).
          const prevText = stalls > 0 ? messages.slice(0, -1).reverse().find(m => m.role === 'assistant')?.content : null;
          const words = t => new Set(String(t || '').toLowerCase().match(/[a-z0-9_]{3,}/g) || []);
          const restated = (a, b) => {
            if (String(a || '').length < 400 || String(b || '').length < 400) return false;
            const A = words(a), B = words(b); let n = 0;
            for (const w of A) if (B.has(w)) n++;
            return n / (A.size + B.size - n) >= 0.3;
          };
          if (fr === 'stop' && restated(prevText, msg.content)) {
            finishReason = 'stop';
            callbacks.onFinish?.({ messages, finishReason });
            break;
          }
          if (completeSpec && stalls < stallNudgeLimit && step < maxStepsPerTurn - 1) {
            stalls++;
            const stallMsg = fr === 'length'
              ? 'Your reply was cut off at the token limit BEFORE you called a tool — you are over-thinking. ' +
                'Stop planning and act in ONE small tool call now. Do NOT re-plan and do NOT write_file the whole ' +
                'module again — that discards the cells you already built. Make the SINGLE next small change with ' +
                'edit_file (add or fix ONE cell), then stop. Only write_file from scratch if the module is still empty.'
              : nudge;
            messages.push({ role: 'system', content: stallMsg });
            callbacks.onNudge?.(stalls, stallMsg);
            continue;
          }
          finishReason = fr;
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }

        let completed = false;
        let completeSummary = null;
        for (let ci = 0; ci < calls.length; ci++) {
          const call = calls[ci];
          // Some providers omit tool_call ids. A tool result with no/undefined tool_call_id violates the
          // OpenAI wire format (JSON.stringify drops the undefined key) and desyncs history → stricter
          // providers 400 on the next turn. Repair the id ON the call object (same ref we already pushed in
          // the assistant message) so the assistant call AND its tool result share one stable id.
          const callId = call.id || (call.id = 'call_' + step + '_' + ci);
          const name = call?.function?.name;
          let args;
          try {
            const raw = call?.function?.arguments;
            args = raw == null || raw === '' ? {} : JSON.parse(raw);
          } catch {
            // Unparseable arguments are almost always a tool call TRUNCATED by the per-turn token budget
            // (a too-large write_file). Repair the stored call in place so the malformed (unterminated) JSON
            // can't poison later turns — some providers 400 ("Unterminated string") when it is echoed back,
            // killing the whole session — then tell the model how to recover within the budget.
            if (call?.function) call.function.arguments = '{}';
            const content = 'ERROR: your "' + String(name) + '" tool call was cut off — its arguments were ' +
              'truncated mid-string (you hit the per-turn output limit), so nothing ran. Do not resend such a ' +
              'large call. If the module already exists, ADD or fix ONE cell with a small edit_file — do NOT ' +
              'write_file the whole module again (that discards the cells you already built). Only when the ' +
              'module does not exist yet, write_file a small compiling skeleton (define() shell + one or two ' +
              'cells), then grow it one cell at a time with edit_file. Keep each tool call small.';
            pushToolResult(callId, content);
            continue;
          }
          // completion signal — reply to satisfy the tool_call, capture the summary, end after this batch
          if (completeSpec && name === completeToolName) {
            // Its summary was written before the batch's other results existed (20260929-0620-m58-before:
            // request_files + task_complete told the user "I don't see the file" while the file had arrived).
            const others = calls.filter((c) => c?.function?.name !== completeToolName).length;
            if (others && !batchVetoed) {
              batchVetoed = true;
              pushToolResult(callId, 'NOT ended: ' + completeToolName + ' was sent in the same step as ' + others +
                ' other tool call' + (others === 1 ? '' : 's') + ', so your summary was written before ' + (others === 1 ? 'its result' : 'their results') +
                ' existed. ' + (others === 1 ? 'It' : 'They') + ' ran: read the result' + (others === 1 ? '' : 's') + ', act on ' + (others === 1 ? 'it' : 'them') + ', then call ' + completeToolName + ' on its own.');
              continue;
            }
            if (completeGuard && !completeVetoed) {
              let veto = null;
              try {
                veto = completeGuard({
                  step, toolCallsThisTurn: turnToolCalls,
                  summary: typeof args.summary === 'string' ? args.summary : null,
                  // The assistant's own text on this step, and the LIVE registry — a guard that names
                  // tools must name the ones this session actually has (the τ-airline arm unregisters the
                  // file tools, and the old hardcoded "read_file / write_file / …" advertised ghosts).
                  text: typeof msg.content === 'string' ? msg.content : null,
                  toolNames: live.map((t) => t.id),
                });
              } catch (e) {}
              if (veto) { completeVetoed = true; pushToolResult(callId, String(veto)); continue; }
            }
            completed = true;
            completeSummary = typeof args.summary === 'string' ? args.summary : null;
            pushToolResult(callId, 'ok');
            continue;
          }
          const tool = byId.get(name);
          if (!tool) {
            pushToolResult(callId, 'ERROR: unknown tool ' + String(name));
            continue;
          }
          callbacks.onToolCall?.(callId, name, args);
          turnToolCalls++;
          let output;
          try {
            const r = await tool.execute(args, { ...ctx, callId });
            output = String(r?.output ?? '');
          } catch (e) {
            output = 'ERROR: ' + (e?.message ?? String(e));
          }
          pushToolResult(callId, truncate(output, toolOutputLimit));
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
        usage: usageSnapshot(),
      };
    }

    // `sampling` is the resolved session default, exposed so a benchmark/UI can RECORD what was actually
    // configured instead of assuming the flag it passed took effect.
    // `reasoning` is a GETTER: with a provider it is live, so a recorder reads what the next turn will
    // actually send, not the (possibly stale) construction-time default.
    return { messages, send, abort, reset, interrupt, steer, usage, sampling: { temperature, seed, get reasoning() { try { return getReasoning(); } catch (e) { return null; } } } };
  };
};


const _doc_composeContext = function _doc_composeContext(md){return(
md`### \`composeContext(providers, {scope, turn, now, sectionTimeout, totalBudget})\`
Pure renderer for the situational-context block. Filters \`providers\` to the requested \`scope\`
('session' | 'turn'), dedupes by id (a non-weak provider shadows a \`weak\` fallback), orders by
\`priority\` (lower first), then runs every \`render({scope, turn, now})\` concurrently — each in a
try/catch and bounded by \`sectionTimeout\` ms, so one bad provider can only lose its own section.
Sections are truncated to each provider's \`budget\`, assembled as \`## label\` blocks inside one
\`<environment scope turn time>\` wrapper, capped at \`totalBudget\` chars in priority order. Returns
\`null\` when nothing rendered — a quiet turn injects no message at all. DOM-free and node-testable.`
)};

const _composeContext = function _composeContext(truncate){return(
  async function composeContext(providers, {
    scope = 'turn',
    turn = 0,
    now = new Date(),
    sectionTimeout = 250,
    totalBudget = 1500
  } = {}) {
    const list = (Array.isArray(providers) ? providers : [])
      .filter((p) => p && p.id && typeof p.render === 'function' && (p.scope ?? 'turn') === scope);
    if (!list.length) return null;
    // Dedupe by id: a non-weak provider shadows a weak fallback regardless of registration order.
    const byId = new Map();
    for (const p of list) {
      const prev = byId.get(p.id);
      if (!prev || (prev.weak && !p.weak)) byId.set(p.id, p);
    }
    const ordered = [...byId.values()].sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
    const results = await Promise.all(ordered.map((p) =>
      Promise.race([
        Promise.resolve().then(() => p.render({ scope, turn, now })),
        new Promise((res) => setTimeout(res, sectionTimeout))   // resolves undefined → section dropped
      ]).catch(() => null)
    ));
    const sections = [];
    let used = 0, dropped = 0;
    for (let i = 0; i < ordered.length; i++) {
      const r = results[i];
      if (r == null || String(r).trim() === '') continue;
      const text = truncate(String(r).trim(), ordered[i].budget ?? 400);
      const sec = '## ' + (ordered[i].label || ordered[i].id) + '\n' + text;
      if (used + sec.length > totalBudget) { dropped++; continue; }
      used += sec.length + 2;
      sections.push(sec);
    }
    if (!sections.length) return null;
    if (dropped) sections.push('(' + dropped + ' context section(s) dropped: over budget)');
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    return '<environment scope="' + scope + '"' + (turn ? ' turn="' + turn + '"' : '') + ' time="' + stamp + '">\n' +
      sections.join('\n\n') + '\n</environment>';
  }
)};

const _composeFooter = function _composeFooter(){return(
  function composeFooter({ workdir = '/src', model } = {}) {
    const lines = ['', 'Working directory: ' + workdir];
    if (model) lines.push('Model: ' + model);
    return lines.join('\n');
  }
)};

// ── result formatters (pure; consumed by the UI) ─────────────────────────────

const _doc_summarizeTurn = function _doc_summarizeTurn(md){return(
md`### \`summarizeTurn(r)\`
Pure interpreter of a finished turn result. Returns \`null\` for a clean completion; otherwise a one-line
"⏹ Agent …" notice explaining why the turn ended (\`max_steps\` / \`aborted\` / \`error\` / stalled) plus a
tool tally from \`turnMessages\`. DOM-free so the UI imports it and node tests it.`
)};

const _summarizeTurn = function _summarizeTurn(){return(
  function summarizeTurn(r) {
    if (!r || r.finishReason === 'completed') return null;
    const tally = {};
    for (const m of (r.turnMessages || []))
      if (m.role === 'assistant' && Array.isArray(m.tool_calls))
        for (const tc of m.tool_calls) { const n = (tc.function && tc.function.name) || 'tool'; tally[n] = (tally[n] || 0) + 1; }
    const acts = Object.entries(tally).map(([n, c]) => n + '×' + c).join(', ');
    const why = r.finishReason === 'max_steps' ? 'reached the step limit'
      : r.finishReason === 'aborted' ? 'was stopped'
      : r.finishReason === 'error' ? 'hit a provider error'
      : 'ended without calling task_complete';
    return '⏹ Agent ' + why + ' · ' + r.steps + ' step' + (r.steps === 1 ? '' : 's')
      + (acts ? ' · ' + acts : '') + '. No final reply — say “continue” to resume or “finish up”.';
  }
)};

const _doc_toolLabel = function _doc_toolLabel(md){return(
md`### \`toolLabel(name, args)\`
Pure short label for a tool call, used in the live status line. Pulls a target hint
(\`path\`/\`file\`/\`name\`/\`id\`/\`module\`) from \`args\` (string JSON or object), basename-trimmed. Never throws.`
)};



const _toolLabel = function _toolLabel(){return(
  function toolLabel(name, args) {
    let arg = '';
    try {
      let a = args;
      if (typeof a === 'string') a = JSON.parse(a);
      if (a) arg = a.path || a.file || a.name || a.id || a.module || '';
    } catch (e) {}
    return arg ? name + ' ' + String(arg).split('/').pop() : (name || 'tool');
  }
)};

const _rc5addressesUser = function _addressesUser(){return(
function addressesUser(text) {
    const s = String(text ?? '').trim();
    if (!s) return false;
    // (1) a direct QUESTION: the text ENDS on '?', ignoring trailing quotes / brackets / markdown
    //     emphasis ("…can you confirm?**", "…which one?)"). Anchored at the end on purpose — a
    //     rhetorical question inside a work report is not what the turn is FOR.
    if (/\?["'`*_)\]}>\s]*$/.test(s)) return true;
    // (2) an explicit REFUSAL or HAND-OFF, case-insensitive. A real hand-off is normally a tool call
    //     (so the gate never sees it); this is the safety net for the turn that only says no.
    return /\b(?:i|we)\s*['’]?\s*(?:can['’]?t|cannot|can not|(?:a|)m\s+unable|are\s+unable|(?:a|)m\s+not\s+able|are\s+not\s+able)\b/i.test(s)
      || /\bnot\s+(?:permitted|allowed|authori[sz]ed)\b/i.test(s)
      || /\b(?:against|violates?|outside|prohibited\s+by)\s+(?:the\s+|our\s+|company\s+)?polic(?:y|ies)\b/i.test(s)
      || /\btransfer(?:ring)?\s+(?:you|this)\s+to\b/i.test(s);
  }
)};
const _rc5zeroToolCallGate = function _zeroToolCallGate(addressesUser){return(
function zeroToolCallGate(info) {
    if (!info || info.toolCallsThisTurn !== 0) return null;
    const names = Array.isArray(info.toolNames) ? info.toolNames.filter(Boolean).map(String) : [];
    // Nothing registered ⇒ there was no work it could have done; demanding tool calls would be a trap.
    if (!names.length) return null;
    if (addressesUser(info.summary) || addressesUser(info.text)) return null;
    const shown = names.slice(0, 6).join(' / ') + (names.length > 6 ? ' / …' : '');
    return 'REJECTED: you have made NO tool calls this turn, so nothing has been created, changed, or ' +
      'verified — a completion summary now would be fiction. Do the work first with real tool calls (' +
      shown + '), verify it, then call task_complete describing what you DID. If this request truly ' +
      'requires no tool work, END THE TURN BY SPEAKING TO THE USER: put your QUESTION to them, or your ' +
      'refusal and its reason, in the summary and call task_complete again — asking, declining under a ' +
      'stated policy, or handing off is a legitimate tool-free turn.';
  }
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("rc5c_title", null, ["md"], _title);
  $def("rc5c_doc_truncate", null, ["md"], _doc_truncate);
  $def("rc5c_truncate", "truncate", [], _truncate);
  $def("rc5c_doc_defineTool", null, ["md"], _doc_defineTool);
  $def("rc5c_defineTool", "defineTool", [], _defineTool);
  $def("rc5c_doc_createOpenRouterClient", null, ["md"], _doc_createOpenRouterClient);
  $def("rc5c_createOpenRouterClient", "createOpenRouterClient", ["globalThis"], _createOpenRouterClient);
  $def("rc5c_doc_createAgentSession", null, ["md"], _doc_createAgentSession);
  $def("rc5c_createAgentSession", "createAgentSession", ["AbortController","truncate"], _createAgentSession);
  $def("rc5c_doc_composeContext", null, ["md"], _doc_composeContext);
  $def("rc5c_composeContext", "composeContext", ["truncate"], _composeContext);
  $def("rc5c_doc_composeFooter", null, ["md"], _doc_composeFooter);
  $def("rc5c_composeFooter", "composeFooter", [], _composeFooter);
  $def("rc5c_doc_summarizeTurn", null, ["md"], _doc_summarizeTurn);
  $def("rc5c_summarizeTurn", "summarizeTurn", [], _summarizeTurn);
  $def("rc5c_doc_toolLabel", null, ["md"], _doc_toolLabel);
  $def("rc5c_toolLabel", "toolLabel", [], _toolLabel);
  $def("_rc5addressesUser", "addressesUser", [], _rc5addressesUser);
  $def("_rc5zeroToolCallGate", "zeroToolCallGate", ["addressesUser"], _rc5zeroToolCallGate);
  return main;
}
