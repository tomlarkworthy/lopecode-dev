// Page-side JS run once per turn after seeding and mounting (driver-core setup.init).
//   - wraps every registered tool's execute with a timer (globalThis.__rc5ToolTimes) so a turn's wall
//     time can be split into model and tool time (2026-09-02b: the per-step rate halved under five
//     parallel runs and nothing in a trajectory said why);
//   - optionally removes tools from the live registry box for the arm (the session reads that box at
//     every step, so a spliced tool is neither advertised nor callable).
// The registry is re-published whenever hostSetup recomputes (a mount, a py cell settling), which
// replaced the spliced/wrapped array in arms g–j: run_python came back (14 real calls in j's vsv
// under --no-python) and the timer saw only the first few calls. So the box's `value` is intercepted:
// every get and set re-applies the filter and the wrapper, in place.
// removeTools also disables the in-page Python object that eval_js has in scope as `py` when
// "run_python" is on the list: arm k's rv found `py.run` live and spent a turn on it while the
// environment note said there was no Python.
export function pageInit({ removeTools = [] } = {}) {
  return `(() => {
  const reg = globalThis.__ojs_runtime; let box = null;
  for (const m of reg.mains.values()) { const rt = m && m._runtime; if (!rt) continue;
    for (const v of rt._variables) if (v._name === "toolsView") { box = v._value; break; } if (box) break; }
  if (!box || !Array.isArray(box.value)) throw new Error("toolsView unavailable for page init");
  const remove = new Set(${JSON.stringify(removeTools)});
  globalThis.__rc5RemovedTools = [...remove];
  const times = (globalThis.__rc5ToolTimes = globalThis.__rc5ToolTimes || []);
  const apply = (tools) => {
    if (!Array.isArray(tools)) return tools;
    for (let i = tools.length - 1; i >= 0; i--) if (tools[i] && remove.has(tools[i].id)) tools.splice(i, 1);
    for (const t of tools) { if (!t || typeof t.execute !== "function" || t.__timed) continue; const ex = t.execute; t.__timed = true;
      t.execute = async function (...a) { const s = performance.now(); try { return await ex.apply(this, a); } finally { times.push({ name: t.id, start: Math.round(s), ms: Math.round(performance.now() - s) }); } }; }
    return tools;
  };
  let desc = null; for (let o = box; o && !desc; o = Object.getPrototypeOf(o)) desc = Object.getOwnPropertyDescriptor(o, "value");
  let cur = apply(box.value);
  const inherited = desc && (desc.get || desc.set) && !Object.prototype.hasOwnProperty.call(box, "value");
  Object.defineProperty(box, "value", { configurable: true, enumerable: true,
    get() { return apply(inherited ? desc.get.call(box) : cur); },
    set(v) { const a = apply(v); if (inherited && desc.set) desc.set.call(box, a); else cur = a; } });
  globalThis.__rc5Intercepted = true;
  if (remove.has("run_python")) {
    for (const m of reg.mains.values()) { const rt = m && m._runtime; if (!rt) continue;
      for (const v of rt._variables) if (v._name === "py" && v._value && typeof v._value === "object") {
        const py = v._value; const gone = async () => { throw new Error("Python is not available in this environment"); };
        py.run = gone; py.ready = gone; py.__disabled = true; } }
  }
})()`;
}

// fetchPatchSource(patch): page JS that merges `patch` into every OpenRouter chat-completion body
// (e.g. { reasoning: { enabled: false } } or { max_tokens: 20000 }) — an arm-level experiment knob that
// leaves robocoop-5-core untouched. It must run BEFORE boot (driver-core setup.initScript): the
// client captures globalThis.fetch when it is created, so a post-boot wrapper sees nothing
// (chat-smoke, 2026-09-03 23:35: 0 requests). The last patched body sits on globalThis.__rc5LastBody.
export function fetchPatchSource(patch) {
  return `{
  const patch = ${JSON.stringify(patch)};
  const orig = globalThis.fetch;
  globalThis.fetch = function (url, init) {
    try {
      const u = typeof url === "string" ? url : (url && url.url) || "";
      if (init && typeof init.body === "string" && /\\/chat\\/completions/.test(u) && (init.method || "GET").toUpperCase() === "POST") {
        const body = Object.assign(JSON.parse(init.body), patch);
        globalThis.__rc5LastBody = body;
        init = Object.assign({}, init, { body: JSON.stringify(body) });
      }
    } catch {}
    return orig.call(this, url, init);
  };
}`;
}
