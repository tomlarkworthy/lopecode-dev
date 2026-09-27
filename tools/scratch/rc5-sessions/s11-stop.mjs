// S11: does Stop end a turn? A: a fresh session. B: a saved session resumed after a reload (Tom 2026-09-27:
// "I had pressed stop on a session that had run after a restart"). Real model calls.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const R = '[data-rc5-group="robocoop5-session"]';
const boot = async () => page.waitForFunction(r => document.querySelector(r)?.active, R, { timeout: 120000 });
await page.goto(pathToFileURL(nb).href); await boot();
const ta = () => page.locator(`${R} textarea[placeholder^="Message robocoop-5"]`);
const LONG = "Call eval_js 8 times, one call per step, each with code `await new Promise(r => setTimeout(r, 4000)); return 1`. Do not stop early.";
const state = () => page.evaluate(r => { const root = document.querySelector(r); const e = root.active;
  return { busy: e.busy, n: e.session?.messages.length, calls: e.session?.messages.filter(m => m.role === "tool").length, sameSession: root.active.session === e.session }; }, R);
const stopTest = async label => {
  await ta().fill(LONG); await ta().press("Enter");
  await page.waitForFunction(r => (document.querySelector(r).active.session?.messages.filter(m => m.role === "tool").length ?? 0) >= 1, R, { timeout: 180000, polling: 500 });
  log(label, "before stop", JSON.stringify(await state()));
  const stop = page.locator(`${R} button:has-text("Stop")`);
  log(label, "stop visible", await stop.isVisible());
  log(label, "probe", JSON.stringify(await page.evaluate(r => {
    const roots = [...document.querySelectorAll('[data-rc5-group]')];
    const root = document.querySelector(r); const s = root.active.session;
    window.__abortCalls = 0; const orig = s.abort; s.abort = (...a) => { window.__abortCalls++; return orig(...a); };
    const stops = [...document.querySelectorAll('button')].filter(b => b.textContent === 'Stop');
    return { roots: roots.length, rootsWithActive: roots.filter(x => x.active).length, stopButtons: stops.length,
      visibleStops: stops.filter(b => b.offsetParent).length, stopInRoot: stops.map(b => b.closest('[data-rc5-group]') === root) };
  }, R)));
  await stop.evaluate(b => b.click());
  await page.waitForTimeout(300);
  log(label, "after click", JSON.stringify(await page.evaluate(r => ({ abortCalls: window.__abortCalls,
    status: [...document.querySelector(r).querySelectorAll('div')].map(d => d.textContent).find(t => /stopping|thinking|step/.test(t) && t.length < 80) }), R)));
  const ts = Date.now();
  const ended = await page.waitForFunction(r => !document.querySelector(r).active.busy, R, { timeout: 60000, polling: 250 }).then(() => true, () => false);
  log(label, ended ? `stopped in ${Date.now() - ts}ms` : "DID NOT STOP in 60s", JSON.stringify(await state()));
  if (!ended) await page.evaluate(r => document.querySelector(r).active.session.abort(), R);
};

await stopTest("A fresh");
// save it, reload, resume it from the picker, stop again
await page.locator(`${R} label:has-text("save") input[type=checkbox]`).evaluate(el => { if (!el.checked) el.click(); });
await page.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@robocoop5-session/")), null, { timeout: 15000 });
// a real restart: export the page with the saved session in it, open the exported file
const html = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  return typeof r === "string" ? r : r.source;
});
const out = resolve(here, "out/s11-exported.html");
(await import("node:fs")).writeFileSync(out, html);
await page.goto(pathToFileURL(out).href); await boot();
await page.waitForFunction(r => [...document.querySelectorAll("*")].some(e => e.shadowRoot && [...e.shadowRoot.querySelectorAll("option")].some(o => /Call eval_js/.test(o.textContent))), R, { timeout: 60000 });
log("reloaded from export");
// pick the saved session in the (shadow-root) picker
const picked = await page.evaluate(r => {
  const root = document.querySelector(r);
  const sel = [...root.querySelectorAll("*")].flatMap(e => e.shadowRoot ? [...e.shadowRoot.querySelectorAll("select")] : []).concat([...root.querySelectorAll("select")])[0];
  if (!sel) return "no picker";
  const opt = [...sel.options].find(o => !/new session/.test(o.textContent));
  sel.value = opt.value; sel.dispatchEvent(new Event("change"));
  return opt.textContent;
}, R);
log("picked", picked);
await page.waitForTimeout(2000);
await stopTest("B resumed");
log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
