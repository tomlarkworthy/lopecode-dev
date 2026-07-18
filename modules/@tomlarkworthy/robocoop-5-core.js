// @tomlarkworthy/robocoop-5-core — the DOM-free brain of robocoop-5.
//
// Tight core: exactly what the robocoop-5 modules consume — the tool-use loop (createAgentSession,
// with the completeGuard veto hook), the OpenRouter client factory, defineTool, composeFooter, and the
// pure transcript formatters (summarizeTurn, toolLabel). Descended from @tomlarkworthy/robocoop-4-core;
// robocoop-4 keeps its own copy (with bash tooling and its system prompt) untouched.
//
// Exports: truncate, defineTool, createOpenRouterClient, createAgentSession, composeFooter,
//          summarizeTurn, toolLabel.

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

const _createOpenRouterClient = function _createOpenRouterClient(){
  return function createOpenRouterClient({
    apiKey = (globalThis.process && globalThis.process.env ? globalThis.process.env.OPENROUTER_API_KEY : undefined),
    fetch = globalThis.fetch,
    baseUrl = 'https://openrouter.ai/api/v1',
    referer,
    title,
    defaultModel = 'anthropic/claude-sonnet-4',
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
    async function chat({ model = defaultModel, messages, tools, tool_choice = 'auto', temperature, max_tokens, signal } = {}) {
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
        ...(max_tokens != null ? { max_tokens } : {})
      };
      // Transient failures (network drops, 429 rate limits, 5xx) are retried with exponential backoff —
      // a single throttled request must not kill a whole agent turn. Aborts (steer/interrupt) never retry.
      const retriable = (e) => /Failed to fetch|NetworkError|load failed|OpenRouter (408|429|5\d\d)/i.test(String(e && e.message || e));
      let lastErr;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 1000));
        if (signal && signal.aborted) throw (lastErr || new Error('aborted'));
        try {
          // STREAMING (SSE): long generations over proxied networks die if the connection looks idle —
          // a non-streaming completion is silent for the entire generation. Streamed deltas keep the
          // socket alive; the message (content + tool_calls) is reassembled here so callers see the
          // same shape as the non-streaming API.
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST', headers: headers(), body: JSON.stringify({ ...body, stream: true }), signal
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            let detail = text;
            try { const j = JSON.parse(text); detail = j?.error?.message || text; } catch {}
            throw new Error('OpenRouter ' + res.status + ': ' + detail);
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '', sawChoice = false, finish = null, native = null, usage = null;
          const acc = { content: '', tool_calls: [] };
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') continue;
              let j;
              try { j = JSON.parse(payload); } catch { continue; }
              const c = j.choices && j.choices[0];
              if (c) {
                sawChoice = true;
                const d = c.delta || {};
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
              if (j.error) throw new Error('OpenRouter stream error: ' + (j.error.message || JSON.stringify(j.error)));
            }
          }
          if (!sawChoice) throw new Error('OpenRouter: no choices in stream');
          const message = { role: 'assistant', content: acc.content || null };
          const calls = acc.tool_calls.filter(Boolean);
          if (calls.length) message.tool_calls = calls;
          return { message, finish_reason: finish, native_finish_reason: native, usage, raw: { streamed: true } };
        } catch (e) {
          if ((e && e.name === 'AbortError') || (signal && signal.aborted) || !retriable(e)) throw e;
          lastErr = e;
        }
      }
      throw lastErr;
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

LIVE CONTROL: \`steer(input)\` injects a user message into the RUNNING turn and aborts the in-flight model
call so it is read on the next step (the model is re-read each step, so switching the model picker mid-turn
applies on the next call); \`interrupt()\` aborts the in-flight call without injecting (used to apply a model
switch immediately); \`abort()\` hard-stops the whole turn. Returns \`{messages, send, abort, reset, interrupt, steer}\`.`
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
    // Opt-in veto over the completion signal: completeGuard({step, toolCallsThisTurn, summary}) returns a
    // string to REJECT this task_complete (pushed as the tool result so the model reads why) or null to
    // accept. Applied at most ONCE per turn, so a model that insists can still end the turn on its second
    // call — the guard pushes back on premature/fabricated completion without risking a livelock.
    completeGuard = null,
    stallNudgeLimit = 0,
    malformedRetryLimit = 4,
    nudgeMessage,
    noticesProvider,
  } = {}) {
    if (!client || typeof client.chat !== 'function')
      throw new Error('createAgentSession requires a client with a chat() method');

    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
    // Resolve the model defensively: the picker can momentarily read EMPTY (its <select> options arrive from
    // an async catalog fetch, so a value not yet in the option list reads as ""), and sending an empty model
    // is OpenRouter 400 "No models provided". Remember the last non-empty model and reuse it rather than send
    // blank; the underlying provider is still re-read every step, so switching the model picker still applies.
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
    // Cumulative token/cost usage across this session's calls (OpenRouter returns usage.cost in USD when
    // usage.include is set). Lets the UI / evals report what a conversation actually cost.
    const usage = { calls: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, costUSD: 0 };
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
    function reset() { messages.length = 0; steerQueue.length = 0; }

    // `input` is a string, or { text, images } where images is an array of data/URL strings — the user turn
    // is sent as OpenAI multimodal content parts so a vision model can SEE attached screenshots/images.
    async function send(input, callbacks = {}) {
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
          'passes unnoticed. Skip this for single-part requests.';
        const m = { role: 'system', content: String(sp) + LOOP_PRINCIPLES };
        if (messages[0]?.role === 'system') messages[0] = m;
        else messages.unshift(m);
      }

      if (um) messages.push(um);

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
          res = await client.chat({ model: getModel(), messages, tools: wire, tool_choice: toolChoice, max_tokens: maxTokens, signal: stepController.signal });
        } catch (e) {
          abortController.signal.removeEventListener('abort', linkTurnAbort);
          stepAbort = null;
          if (abortController.signal.aborted) { finishReason = 'aborted'; break; }   // hard stop
          if (stepController.signal.aborted) { callbacks.onInterrupt?.(step); continue; }  // steer / model-switch → redo step
          throw e;   // genuine network / provider error
        }
        abortController.signal.removeEventListener('abort', linkTurnAbort);
        stepAbort = null;
        if (res?.usage) {
          usage.calls += 1;
          usage.promptTokens += res.usage.prompt_tokens || 0;
          usage.completionTokens += res.usage.completion_tokens || 0;
          usage.cachedTokens += res.usage.prompt_tokens_details?.cached_tokens || 0;
          usage.costUSD += res.usage.cost || 0;
        }
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
            if (completeGuard && !completeVetoed) {
              let veto = null;
              try { veto = completeGuard({ step, toolCallsThisTurn: turnToolCalls, summary: typeof args.summary === 'string' ? args.summary : null }); } catch (e) {}
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
        usage: { ...usage },
      };
    }

    return { messages, send, abort, reset, interrupt, steer, usage };
  };
};


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
  $def("rc5c_createOpenRouterClient", "createOpenRouterClient", [], _createOpenRouterClient);
  $def("rc5c_doc_createAgentSession", null, ["md"], _doc_createAgentSession);
  $def("rc5c_createAgentSession", "createAgentSession", ["truncate"], _createAgentSession);
  $def("rc5c_doc_composeFooter", null, ["md"], _doc_composeFooter);
  $def("rc5c_composeFooter", "composeFooter", [], _composeFooter);
  $def("rc5c_doc_summarizeTurn", null, ["md"], _doc_summarizeTurn);
  $def("rc5c_summarizeTurn", "summarizeTurn", [], _summarizeTurn);
  $def("rc5c_doc_toolLabel", null, ["md"], _doc_toolLabel);
  $def("rc5c_toolLabel", "toolLabel", [], _toolLabel);
  return main;
}
