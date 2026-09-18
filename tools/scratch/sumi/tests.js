(async () => { const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n) return v; };
  const toggle = get("viewof runTests")._value; if (!toggle.value) { toggle.value = true; toggle.dispatchEvent(new Event("input", { bubbles: true })); }
  const names = [...window.__ojs_runtime._variables].filter((v) => v._name && /^test_(film|ink|fluids|pressure|lines|gpu|water)/.test(v._name)).map((v) => v._name);
  const t0 = performance.now(); let out = {};
  while (performance.now() - t0 < 60000) { out = {}; let pending = 0;
    for (const n of names) { const v = get(n); const val = v._value; if (typeof val === "string" && val.startsWith("not run")) pending++; else if (val === undefined && !v._error) pending++; out[n] = val ?? String(v._error ?? "pending"); }
    if (!pending) break; await new Promise((r) => setTimeout(r, 300)); }
  return out; })()
