// S3 (plan/robocoop-5-multi-session.md): two sessions through the real chat UI, one saved; export;
// reload the exported bytes; the saved one is listed and resumes with its history; the other is gone.
// Uses the demo gateway (no key), so it makes real model calls.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const out = resolve(here, "out/s3-exported.html"); mkdirSync(dirname(out), { recursive: true });
const t0 = Date.now(); const at = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const log = (...a) => console.log(at(), ...a);

const browser = await chromium.launch();
const errors = [];
const open = async url => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])]
    .some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
  await page.locator('textarea[placeholder^="Message robocoop-5"]').waitFor({ timeout: 60000 });
  return page;
};
const ctl = page => page.evaluate(() => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  return { active: c.entries.indexOf(c.active), entries: c.entries.map(e => ({ title: e.title, saved: e.saved, busy: e.busy, hasLog: !!e.log, messages: e.session?.messages.length ?? null })) };
});
const say = async (page, text) => {
  const before = (await ctl(page)).entries;
  await page.locator('textarea[placeholder^="Message robocoop-5"]').fill(text);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
    return c.active.busy === false && c.active.log && c.active.session.messages.some(m => m.role === "assistant");
  }, null, { timeout: 300000, polling: 1000 });
  return page.evaluate(() => {
    const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
    const ms = c.active.session.messages.filter(m => m.role === "assistant" && m.content);
    return ms.at(-1)?.content;
  });
};

const p1 = await open(pathToFileURL(nb).href);
log("booted", JSON.stringify(await ctl(p1)));
log("A reply:", JSON.stringify(await say(p1, "Remember this codeword: PERSIMMON. Reply only with OK, no tools needed.")));
await p1.locator('label:has-text("save") input[type=checkbox]').check();
await p1.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@rc5-sessions/")), null, { timeout: 10000 });
await p1.locator('button[title^="New session"]').click();
log("B reply:", JSON.stringify(await say(p1, "Remember this codeword: QUINCE. Reply only with OK, no tools needed.")));
log("before export", JSON.stringify(await ctl(p1)));

const html = await p1.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  return typeof r === "string" ? r : r.source;
});
writeFileSync(out, html);
log("exported", html.length, "bytes; PERSIMMON x", html.split("PERSIMMON").length - 1, "QUINCE x", html.split("QUINCE").length - 1);

const p2 = await open(pathToFileURL(out).href);
await p2.waitForFunction(() => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  return c.entries.some(e => e.log && e.saved);
}, null, { timeout: 60000 });
const after = await ctl(p2);
log("after reload", JSON.stringify(after));
const idx = after.entries.findIndex(e => e.saved);
await p2.locator('select[title="Switch session"]').selectOption(String(idx));
await p2.waitForFunction(i => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  return c.active === c.entries[i] && c.active.session;
}, idx, { timeout: 30000 });
// the transcript is in a shadow root (kept out of the prerender), so body.innerText cannot see it
const shown = await p2.evaluate(() => [...document.querySelectorAll("*")].some(el => el.shadowRoot?.textContent.includes("PERSIMMON")));
const prerender = html.slice(0, html.indexOf("<script id="));
log("prerender section: PERSIMMON x", prerender.split("PERSIMMON").length - 1, "QUINCE x", prerender.split("QUINCE").length - 1);
log("transcript shows PERSIMMON after switch:", shown);
log("resumed reply:", JSON.stringify(await say(p2, "What was the codeword I gave you earlier? Reply with just the word.")));
log("final", JSON.stringify(await ctl(p2)));
log("errors", JSON.stringify(errors.slice(0, 10)));
await browser.close();
