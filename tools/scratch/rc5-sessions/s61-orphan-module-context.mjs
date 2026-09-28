// model-free: seed an unbooted @user/aqi block (as rc5t-reopen-shows-module does) and render the
// notebook + layout context providers; they must name the block and say how a save lays it out.
import { chromium } from "playwright";
const nb = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("file://" + (nb.startsWith("/") ? nb : process.cwd() + "/" + nb) + "#view=R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))");
await p.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 3, null, { timeout: 60000 });
await p.waitForTimeout(10000);
const r = await p.evaluate(async () => {
  const s = document.createElement("script"); s.type = "text/plain"; s.id = "@user/aqi"; s.setAttribute("data-mime", "application/javascript");
  s.textContent = "export default function define(runtime, observer) { const main = runtime.module(); return main; }";
  document.body.appendChild(s);
  const ctx = globalThis.__ojs_runtime.mains.get("@tomlarkworthy/robocoop-5-context") ||
    [...[...globalThis.__ojs_runtime.mains.values()][0]._runtime._variables].find(v => v._name === "ctx_notebook")._module;
  const t0 = performance.now();
  const nbText = (await ctx.value("ctx_notebook")).render({ now: new Date() });
  const ms = performance.now() - t0;
  const lay = (await ctx.value("ctx_layout")).render({ now: new Date() });
  return { nbText, lay, ms };
});
console.log(r.nbText + "\n---\n" + r.lay + "\n--- render ms " + r.ms.toFixed(1));
const ok = /NOT booted[^\n]*@user\/aqi \(source: \/content\/@user\/aqi\)/.test(r.nbText) && !/escodegen/.test(r.nbText) && /FIRST tab/.test(r.lay);
console.log(ok ? "PASS" : "FAIL");
await b.close(); process.exit(ok ? 0 : 1);
