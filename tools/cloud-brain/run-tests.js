// Runs every test_ cell of the named modules in the page and posts emitted services to the receiver.
export default async (mods, save = {}) => {
  const rt = window.__ojs_runtime, out = [];
  for (const mn of mods) {
    const m = rt.mains.get("@tomlarkworthy/" + mn);
    if (!m) { out.push("NO MODULE " + mn); continue; }
    const names = [...rt._variables].filter((v) => v._module === m && /^test_/.test(v._name || "")).map((v) => v._name);
    let pass = 0;
    for (const n of names) {
      try { await Promise.race([m.value(n), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 20000))]); pass++; }
      catch (e) { out.push("FAIL " + mn + "." + n + ": " + String(e?.message || e).slice(0, 500)); }
    }
    out.push(mn + ": " + pass + "/" + names.length);
    for (const [cell, file] of Object.entries(save[mn] || {})) {
      try {
        const e = await (await m.value(cell)).emit();
        const r = await fetch("http://127.0.0.1:47814/" + file, { method: "POST", body: JSON.stringify(e) });
        out.push("  saved " + file + " " + e.hash.slice(0, 12) + " " + e.parts.map((p) => p.path + ":" + (p.text ?? p.base64).length).join(" ") + " " + r.status);
      } catch (e) { out.push("  EMIT FAIL " + cell + ": " + String(e?.message || e).slice(0, 300)); }
    }
  }
  return out.join("\n");
};
