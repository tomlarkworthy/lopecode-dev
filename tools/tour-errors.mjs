import { chromium } from "playwright";
const run = async (url, label, waitPolicy) => {
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.goto(url);
  await p.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
  if (waitPolicy) await p.waitForFunction(() => !!window.__ojs_hooks?.policy, null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(25000); // fixed dwell so both runs get equal opportunity
  const r = await p.evaluate(async () => {
    const rt = window.__ojs_runtime;
    const errored = [];
    let total = 0, ok = 0;
    for (const v of rt._variables) {
      if (!v._name || v._type !== 1) continue;
      total++;
      if (v._value !== undefined) { ok++; continue; }
      try { await Promise.race([v._promise, new Promise((_, rj) => setTimeout(() => rj(new Error("pending")), 50))]); }
      catch (e) { if (!/^pending$/.test(e.message)) errored.push(v._name + " :: " + String(e.message).slice(0, 90)); }
    }
    return { total, ok, errored: errored.sort(),
      inspectorErrors: [...document.querySelectorAll(".observablehq--error")].map((e) => e.textContent.slice(0, 100)) };
  });
  await b.close();
  return { label, ...r };
};
const s = await run("file:///tmp/tour-stock-qa.html", "stock", false);
const h = await run("file:///tmp/tour-hooked-qa.html", "hooked", true);
console.log("stock : total", s.total, "resolved", s.ok, "errored", s.errored.length, "inspectorErr", s.inspectorErrors.length);
console.log("hooked: total", h.total, "resolved", h.ok, "errored", h.errored.length, "inspectorErr", h.inspectorErrors.length);
const S = new Set(s.errored.map((x) => x.split(" :: ")[0]));
const H = new Set(h.errored.map((x) => x.split(" :: ")[0]));
console.log("\nERRORS ONLY IN HOOKED (regressions):");
for (const e of h.errored) if (!S.has(e.split(" :: ")[0])) console.log("  " + e);
console.log("\nERRORS ONLY IN STOCK (pre-existing, fixed/absent):");
for (const e of s.errored) if (!H.has(e.split(" :: ")[0])) console.log("  " + e);
console.log("\nhooked inspector errors:", h.inspectorErrors.join(" | "));
console.log("stock  inspector errors:", s.inspectorErrors.join(" | "));
process.exit(0);
