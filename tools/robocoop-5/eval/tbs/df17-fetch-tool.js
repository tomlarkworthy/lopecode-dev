  // ------------------------------------------------------------------------- df17: fetch_text
  // Reading the domain is a page-side fetch. Direct first — the Wikipedia REST summary and the
  // Semantic Scholar graph API both send `access-control-allow-origin: *` (verified with curl -I,
  // 2026-09-06) — then through https://r.jina.ai/, which echoes the Origin header and hands back the
  // page as text, for everything that CORS or the network refuses.
  const RC5_FETCH_TIMEOUT_MS = 45000;
  const rc5FetchLog = () => (globalThis.__rc5Fetches = globalThis.__rc5Fetches || []);
  const fetchOnce = async u => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        ctl && ctl.abort();
      } catch (e) {
      }
    }, RC5_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(u, ctl ? { signal: ctl.signal } : {});
      const body = await res.text();
      if (!res.ok)
        return { error: 'HTTP ' + res.status + (body ? ': ' + String(body).slice(0, 200) : '') };
      const ct = String(res.headers && res.headers.get ? res.headers.get('content-type') || '' : '');
      let text = body;
      if (/json/i.test(ct) || /^\s*[{[]/.test(body))
        try {
          text = JSON.stringify(JSON.parse(body), null, 1);
        } catch (e) {
        }
      return {
        text,
        finalUrl: res.url || u
      };
    } catch (e) {
      return { error: e && e.message || String(e) };
    } finally {
      clearTimeout(timer);
    }
  };
  const fetch_text = defineTool({
    id: 'fetch_text',
    description: 'Read a page from the WEB as text — the way you read the literature before writing an ' + 'algorithm. Fetches the url in the page (no shell, no proxy of your own): directly first, and through ' + 'https://r.jina.ai/ (which strips the HTML) when the site refuses a cross-origin read. JSON is returned ' + 'pretty-printed. Good sources: the Wikipedia REST summary ' + '(https://en.wikipedia.org/api/rest_v1/page/summary/<Title>), a Wikipedia article itself, and the Semantic ' + 'Scholar search API (https://api.semanticscholar.org/graph/v1/paper/search?query=<terms>&fields=title,year,' + 'abstract,externalIds). Write what you learn into a KNOWLEDGE cell (an md cell holding the claims you will ' + 'rely on, each with its URL or DOI) and attest the rules you derive from it with kind "literature".',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Absolute http(s) URL to read.'
        },
        max_chars: {
          type: 'number',
          description: 'Truncate the returned text at this many characters (default 20000).'
        }
      },
      required: ['url'],
      additionalProperties: false
    },
    execute: async ({url, max_chars}) => {
      const u = String(url == null ? '' : url).trim();
      if (!/^https?:\/\//i.test(u))
        return {
          title: 'fetch_text',
          output: 'url must be an absolute http(s) URL (got "' + u.slice(0, 120) + '").',
          metadata: { error: true }
        };
      const cap = Math.max(200, Math.min(200000, Number(max_chars) || 20000));
      let via = 'direct';
      let r = await fetchOnce(u);
      if (r.error) {
        const alt = 'https://r.jina.ai/' + u;
        const r2 = await fetchOnce(alt);
        if (r2.error)
          return {
            title: 'fetch_text',
            output: 'fetch_text failed for ' + u + '\n  direct: ' + r.error + '\n  via https://r.jina.ai/: ' + r2.error,
            metadata: { error: true }
          };
        via = 'r.jina.ai';
        r = r2;
      }
      const full = String(r.text == null ? '' : r.text);
      const text = full.length > cap ? full.slice(0, cap) : full;
      rc5FetchLog().push({
        url: u,
        finalUrl: r.finalUrl || u,
        via,
        at: Date.now(),
        chars: text.length,
        ofChars: full.length
      });
      return {
        title: 'fetch_text ' + u.slice(0, 80),
        output: 'fetch_text ' + (r.finalUrl || u) + ' (' + via + ') — ' + text.length + ' chars' + (full.length > text.length ? ' of ' + full.length + ' (truncated at max_chars=' + cap + ')' : '') + '\n\n' + text
      };
    }
  });
