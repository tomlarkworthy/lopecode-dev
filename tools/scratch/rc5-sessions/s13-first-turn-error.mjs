// S13: an error on a session's FIRST turn must show in the chat. The commit creates the session-log
// module, which rebuilds the chat UI before the error is rethrown to the old (detached) UI instance.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
// the chat endpoint answers as it did in Tom's session
await page.addInitScript(() => { const f = window.fetch; window.fetch = (u, o) => /chat\/completions/.test(String(u?.url ?? u))
  ? Promise.resolve(new Response(JSON.stringify({ error: { message: "Provider returned error", code: 400 } }), { status: 400, headers: { "content-type": "application/json" } }))
  : f(u, o); });
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active, null, { timeout: 120000 });
const root0 = await page.evaluateHandle(() => document.querySelector("[data-rc5-group]"));
const ta = page.locator('[data-rc5-group] textarea[placeholder^="Message robocoop-5"]');
await ta.fill("hi"); await ta.press("Enter");
await page.waitForFunction(() => { const e = document.querySelector("[data-rc5-group]").active; return e.log && !e.busy; }, null, { timeout: 120000, polling: 500 });
await page.waitForTimeout(1000);
console.log(JSON.stringify(await page.evaluate(r0 => { const r = document.querySelector("[data-rc5-group]");
  const e = r.active; const rt = window.__ojs_runtime; const t = [...rt._variables].find(x => x._module === e.log?.module && x._name === e.head)?._value;
  return { rebuilt: r !== r0, entryError: e.error, turn: t && { status: t.status, error: t.error }, model: [...r.querySelectorAll("div")].map(d => d.textContent).find(x => x.startsWith("model: ")),
    msgs: e.session.messages.filter(m => m.role !== "system").map(m => m.role + ":" + String(m.content).slice(0, 80)),
    shown: [...r.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [...el.shadowRoot.querySelectorAll("div")] : []).concat([...r.querySelectorAll("div")]).map(d => d.textContent).filter(t => t.startsWith("⚠ agent error")).map(t => t.slice(0, 120)) }; }, root0)));
await browser.close();
