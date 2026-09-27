// Page-side (setup.collect) for rc5t-cities-table: act as the user on the module the agent built.
// 0. every row count the agent stated in chat is the file's 12
// 1. typed: some new-module cell holds the rows, and population is a number (not "3677472")
// 2. sort: click the population header of a <table> in a new module up to 3 times; the top row must be
//    Berlin in one order and Valletta in the other (string-typed numbers put Valletta/Luxembourg on top)
// 3. histogram: a new-module cell renders an <svg> with >= 2 <rect>s
// 4. export (the file a save writes): the attachment's bytes are in it; boot it in a sandboxed blob:
//    iframe and require a new-module cell to render a <table> containing Berlin and Valletta
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const newVars = () => [...rt._variables].filter(v => v._module && v._name && out.newModules.some(n => rt.mains.get(n) === v._module));
  const keepers = [];
  for (const v of newVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    // 0. every "<N> cities/rows/…" the agent said to the user names the file's 12 rows (reasoning excluded)
    const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
    // the session the eval driver sends to (the runtime's `session` cell), else the chat UI's
    const session = [...rt._variables].find(v => v._name === "session" && Array.isArray(v._value?.messages))?._value ||
      document.querySelector("[data-rc5-group]")?.active?.session;
    const said = (session?.messages || [])
      .filter(m => m.role === "assistant" && typeof m.content === "string").map(m => m.content).join("\n");
    out.countClaims = [...said.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:[A-Za-z-]+\s+)?(cities|rows|records|entries)\b/gi)]
      .map(m => ({ n: /^\d+$/.test(m[1]) ? +m[1] : words[m[1].toLowerCase()], text: m[0] }));
    out.countClaimsOk = out.countClaims.every(c => c.n === 12);
    await sleep(1500);
    // 1. typed rows
    const rows = newVars().map(v => v._value).find(x => Array.isArray(x) && x.length >= 10 && x[0] && typeof x[0] === "object" && "population" in x[0]);
    out.populationType = rows ? typeof rows[0].population : "no rows cell";
    out.typedPopulation = out.populationType === "number";
    // 2. sortable table
    const els = () => newVars().map(v => v._value).filter(x => x instanceof Element);
    const table = () => els().flatMap(e => e.matches("table") ? [e] : [...e.querySelectorAll("table")]).find(t => /Berlin/.test(t.textContent));
    const tops = [];
    for (let i = 0; i < 3; i++) {
      const t = table();
      if (!t) break;
      const th = [...t.querySelectorAll("th")].find(h => /population/i.test(h.textContent));
      if (!th) { out.sortStage = "no population header"; break; }
      th.click();
      await sleep(300);
      const first = table()?.querySelector("tbody tr");
      tops.push(first ? (first.textContent.match(/[A-Z][a-z]+/) || [""])[0] : "");
    }
    out.tops = tops;
    out.hasTable = !!table();
    out.sortWorks = tops.includes("Berlin") && tops.includes("Valletta");
    // 3. histogram
    // binned: fewer bars than the 12 cities (one bar per city is a bar chart, run -before3)
    out.rects = els().map(e => { const s = e.matches("svg") ? e : e.querySelector("svg"); return s ? s.querySelectorAll("rect").length : 0; }).filter(n => n);
    out.histogram = out.rects.some(n => n >= 2 && n < 12);
    // 4. export + reopen. Drop the keepers first: the exporter writes them out as duplicate `const _<pid>` (one
    // pid per identical anonymous source), and the saved module then fails to parse.
    for (const k of keepers.splice(0)) { try { k.delete(); } catch {} }
    const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    const blocks = [...html.matchAll(/<script([^>]*\bid="([^"]+\.csv)"[^>]*)>([\s\S]*?)<\/script>/g)].map(m => {
      let body = m[3].trim();
      if (/data-encoding="base64"/.test(m[1])) { try { body = new TextDecoder().decode(Uint8Array.from(atob(body), c => c.charCodeAt(0))); } catch {} }
      return { id: m[2], body };
    });
    out.savedCsvIds = blocks.map(b => b.id);
    out.bootMains = (html.match(/"mains":\s*(\[[^\]]*\])/) || [])[1];
    out.savedHasCsv = blocks.some(b => b.body.includes("Valletta") && b.body.includes("Berlin"));
    const reporter = `<script>(${async function (base) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = Date.now();
      globalThis.__errs = []; addEventListener("error", e => __errs.push(String(e.message))); addEventListener("unhandledrejection", e => __errs.push(String(e.reason)));
      let res = { found: false };
      while (Date.now() - t0 < 18000) {
        await sleep(1000);
        const rt = globalThis.__ojs_runtime;
        if (!rt || !rt.mains || !rt.mains.size) continue;
        const mods = [...rt.mains].filter(([n]) => !base.includes(n));
        for (const [n, m] of mods) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
          let x; try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch (e) { res.err = String(e).slice(0, 200); x = undefined; }
          if (!(x instanceof Element)) continue;
          const t = x.matches("table") ? x : x.querySelector("table");
          if (t && /Berlin/.test(t.textContent) && /Valletta/.test(t.textContent)) { res = { found: true, module: n, cell: v._name }; break; }
        }
        res.seen = mods.map(([n, m]) => n + ":" + [...rt._variables].filter(v => v._module === m && v._name).length);
        res.mains = [...rt.mains.keys()].join(","); res.errs = (globalThis.__errs || []).slice(0, 3); res.t = Date.now() - t0;
        if (res.found || (res.seen.length && Date.now() - t0 > 12000)) break;
      }
      parent.postMessage({ __citiesProbe: res }, "*");
    }})(${JSON.stringify([...base])})<\/script>`;
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    const got = new Promise(res => {
      addEventListener("message", e => { if (e.data && e.data.__citiesProbe) res(e.data.__citiesProbe); });
      setTimeout(() => res({ found: false, timeout: true }), 22000);
    });
    frame.src = url;
    document.body.appendChild(frame);
    out.reopened = await got;
    out.reopenedTable = !!out.reopened.found;
    frame.remove();
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()
