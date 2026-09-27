// S6: robocoop5(opts) builder. The notebook's own chat plus a second chat built in ANOTHER module that
// imports robocoop5 with a group, a system prompt and a beforeTool hook. Checks: separate transcripts,
// the second chat's session saves as @reviews/<id>, a module write rebuilds neither chat, re-running
// the second chat's cell reattaches to the session it was showing. Real model calls (demo gateway).
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
await page.locator('[data-rc5-group="robocoop5-session"] textarea[placeholder^="Message robocoop-5"]').waitFor({ timeout: 120000 });
log("default chat up");

await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const rc5 = rt.mains.get("@tomlarkworthy/robocoop-5");
  const host = document.createElement("div");
  host.id = "second-chat";
  host.style.cssText = "position:fixed;right:0;bottom:0;width:600px;height:500px;z-index:9999;background:#000";
  document.body.append(host);
  window.__builds = 0;
  const m = rt.module();
  m.import("robocoop5", rc5);
  window.__m2 = m;
  window.__hooked = [];
  window.__def2 = tag => (window.__v2 ??= m.variable({ fulfilled(v) { host.replaceChildren(v); } }))
    .define("reviewer", ["robocoop5", "invalidation"], (robocoop5, invalidation) => {
      window.__builds++;
      return robocoop5({
        group: "reviews", invalidation,
        system: "You are a terse reviewer. " + tag,
        hooks: { beforeTool: (tool) => { window.__hooked.push(tool.id); return null; } }
      });
    });
  window.__def2("v1");
});
const second = '#second-chat textarea[placeholder^="Message robocoop-5"]';
await page.locator(second).waitFor({ timeout: 60000 });
const roots = () => page.evaluate(() => [...document.querySelectorAll("[data-rc5-group]")].map(r => ({
  group: r.dataset.rc5Group, active: r.active?.group, messages: r.active?.session?.messages.length ?? null, id: r.active?.id
})));
log("roots", JSON.stringify(await roots()));

const say = async (sel, group, text) => {
  await page.locator(sel).fill(text);
  await page.locator(sel).press("Enter");
  await page.waitForFunction(g => {
    const r = document.querySelector(`[data-rc5-group="${g}"]`);
    return r?.active && !r.active.busy && r.active.session?.messages.some(m => m.role === "assistant" && m.content);
  }, group, { timeout: 300000, polling: 1000 });
};
await say(second, "reviews", "Reply with only the word ACK. Do not use tools.");
log("after second chat turn", JSON.stringify(await roots()));
log("second chat messages", JSON.stringify(await page.evaluate(() => ({ hooked: window.__hooked,
  msgs: document.querySelector('#second-chat [data-rc5-group]').active.session.messages.map(m => m.role + ":" + String(typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? m.tool_calls?.map(t => t.function.name))).slice(0, 60)) }))));

// the default chat's DOM node, to test it survives a module write
await page.evaluate(() => { window.__root1 = document.querySelector('[data-rc5-group="robocoop5-session"]'); window.__root2 = document.querySelector('#second-chat [data-rc5-group]'); });
await page.evaluate(() => window.__m2.variable({}).define("some_write", [], () => 42));
await page.waitForTimeout(3000);
log("after module write: same nodes?", JSON.stringify(await page.evaluate(() => ({
  root1: window.__root1 === document.querySelector('[data-rc5-group="robocoop5-session"]'),
  root2: window.__root2 === document.querySelector('#second-chat [data-rc5-group]'),
  builds: window.__builds
}))));

// save the second chat's session
await page.locator('#second-chat label:has-text("save") input[type=checkbox]').check();
await page.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@reviews/")), null, { timeout: 15000 });
log("mains", JSON.stringify([...await page.evaluate(() => [...window.__ojs_runtime.mains.keys()].filter(k => k.startsWith("@")))]));

// re-run the cell: a fresh UI must show the same session
const before = await page.evaluate(() => document.querySelector('#second-chat [data-rc5-group]').active.id);
await page.evaluate(() => window.__def2("v2"));
await page.waitForFunction(b => document.querySelector('#second-chat [data-rc5-group]') !== window.__root2 && window.__builds >= 2, null, { timeout: 30000 });
const after = await page.evaluate(() => {
  const r = document.querySelector('#second-chat [data-rc5-group]');
  return { id: r.active.id, messages: r.active.session?.messages.length, transcriptHasAck: [...r.querySelectorAll("*")].some(el => el.shadowRoot?.textContent.includes("ACK")) };
});
log("re-run reattached:", before === after.id, JSON.stringify(after));

// default chat was never touched
log("default chat", JSON.stringify(await page.evaluate(() => { const r = document.querySelector('[data-rc5-group="robocoop5-session"]'); return { messages: r.active.session?.messages.length ?? null, pickerOptions: [...r.querySelectorAll("*")].flatMap(e => e.shadowRoot ? [...e.shadowRoot.querySelectorAll("option")].map(o => o.textContent) : []) }; })));
log("errors", JSON.stringify(errors.slice(0, 10)));
await page.screenshot({ path: resolve(here, "out/s6.png") });
await browser.close();
