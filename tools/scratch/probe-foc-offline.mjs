// Boot FoC with every http(s) request aborted and report which cells never settle.
import { chromium } from "playwright";
const [url, waitMs = "25000"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const blocked = new Map();
await ctx.route(/^https?:\/\//, (route) => {
  const u = new URL(route.request().url());
  blocked.set(u.host, (blocked.get(u.host) || 0) + 1);
  route.abort("internetdisconnected");
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text().slice(0, 200)); });
const t0 = Date.now();
await p.goto(url + "#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)", { waitUntil: "load" });
await p.waitForTimeout(+waitMs);
const state = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  if (!rt) return { runtime: false };
  const names = new Map();
  for (const [n, m] of rt.mains || []) names.set(m, n);
  const race = (v) => Promise.race([
    Promise.resolve(v._promise).then(() => "ok", (e) => "error: " + String(e && e.message || e).slice(0, 120)),
    new Promise((r) => setTimeout(() => r("pending"), 50))
  ]);
  const out = [];
  for (const v of rt._variables) {
    const mod = names.get(v._module) || null;
    if (!mod || !/foc-|at-login|at-read/.test(mod)) continue;
    if (!v._name || !v._reachable) continue;
    const s = await race(v);
    if (s !== "ok") out.push({ mod, name: v._name, state: s, inputs: (v._inputs || []).map((i) => i._name).filter(Boolean) });
  }
  const pane = (m) => { const el = document.querySelector('.lp2-pane[data-module="' + m + '"]'); return el ? el.textContent.replace(/\s+/g, " ").slice(0, 160) : null; };
  return { unsettled: out, chatPane: pane("@tomlarkworthy/foc-chat"), bodyText: document.body.innerText.slice(0, 300), lp2: !!document.querySelector(".lp2-host") };
});
await p.screenshot({ path: "tools/scratch/foc-offline.png" });
console.log("elapsed", Date.now() - t0);
console.log(JSON.stringify(state, null, 1));
console.log("blocked hosts", JSON.stringify([...blocked]));
console.log("errors", JSON.stringify(errs.slice(0, 25), null, 1));
await b.close();
