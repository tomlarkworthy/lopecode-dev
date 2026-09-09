function _createOpenRouterClient(globalThis){return(
function createOpenRouterClient({
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
      const retriable = (e) => /Failed to fetch|NetworkError|network error|load failed|stream error|stream idle|Upstream error|overloaded|ECONNRESET|OpenRouter (408|429|5\d\d)/i.test(String(e && e.message || e));
      let lastErr;
      // 8 attempts, backoff capped at 60 s (~4 min total): a provider outage of a few minutes exhausted
      // the old 5 x <=16 s budget mid-turn (2026-09-03). steer/interrupt still aborts a waiting retry.
      const STREAM_IDLE_MS = 180000;
      for (let attempt = 0; attempt < 8; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, Math.min(60000, 1000 * 2 ** attempt) + Math.random() * 1000));
        if (signal && signal.aborted) throw (lastErr || new Error('aborted'));
        try {
          // STREAMING (SSE): long generations over proxied networks die if the connection looks idle —
          // a non-streaming completion is silent for the entire generation. Streamed deltas keep the
          // socket alive; the message (content + tool_calls) is reassembled here so callers see the
          // same shape as the non-streaming API.
          // A stream that stops delivering bytes never errors on its own (OpenRouter keeps a live stream
          // fed with comment lines while the model reasons). A silent 3 min is a dead request: abort it
          // and retry instead of holding the step until the turn's wall clock runs out.
          const ctrl = new AbortController();
          const onAbort = () => ctrl.abort();
          if (signal) signal.addEventListener('abort', onAbort, { once: true });
          let idleTimer;
          const idle = (p) => Promise.race([p, new Promise((_, rej) => { idleTimer = setTimeout(() => { rej(new Error('OpenRouter stream idle for ' + STREAM_IDLE_MS + 'ms')); ctrl.abort(); }, STREAM_IDLE_MS); })]).finally(() => clearTimeout(idleTimer));
          const res = await idle(fetch(`${baseUrl}/chat/completions`, {
            method: 'POST', headers: headers(), body: JSON.stringify({ ...body, stream: true }), signal: ctrl.signal
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
          const timings = { startedAt: t0, firstDeltaMs: null, firstReasoningMs: null, firstVisibleMs: null, endMs: null };
          for (;;) {
            const { done, value } = await idle(reader.read()).catch((e) => { if (signal) signal.removeEventListener('abort', onAbort); throw e; });
            if (done) { if (signal) signal.removeEventListener('abort', onAbort); break; }
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
                if (timings.firstDeltaMs == null) timings.firstDeltaMs = Date.now() - t0;
                // Reasoning deltas. OpenRouter normalises to `reasoning`; some providers (DeepSeek lineage)
                // send `reasoning_content`. Take whichever is present, never both — OpenRouter ALSO mirrors
                // the same text into `reasoning_details[]`, so summing every carrier would duplicate it.
                const rd = typeof d.reasoning === 'string' ? d.reasoning
                  : typeof d.reasoning_content === 'string' ? d.reasoning_content : null;
                if (rd) {
                  if (timings.firstReasoningMs == null) timings.firstReasoningMs = Date.now() - t0;
                  acc.reasoning += rd;
                  // A throwing UI handler must not kill the turn — the reasoning stream is decoration.
                  if (typeof onReasoningToken === 'function') { try { onReasoningToken(rd); } catch (e) {} }
                }
                if ((typeof d.content === 'string' && d.content) || (Array.isArray(d.tool_calls) && d.tool_calls.length)) {
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
          if ((e && e.name === 'AbortError') || (signal && signal.aborted) || !retriable(e)) throw e;
          lastErr = e;
        }
      }
      throw lastErr;
    }
    return { chat };
  }
)}
