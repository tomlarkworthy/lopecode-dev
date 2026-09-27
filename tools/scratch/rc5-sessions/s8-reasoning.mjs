// S8: each step's reasoning stays in the transcript after later steps, is stored (capped) in the turn
// cell, survives save -> export -> reload, and is never sent back to the model. Real model calls.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const out = resolve(here, "out/s8-exported.html");
const browser = await chromium.launch();
const errors = [];
const open = async url => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
  return page;
};
const thoughts = page => page.evaluate(() => {
  const r = document.querySelector("[data-rc5-group]");
  const sums = [...r.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [...el.shadowRoot.querySelectorAll("summary")] : [])
    .map(s => s.textContent).filter(t => t.includes("thought"));
  const ms = r.active.session.messages.filter(m => m.role === "assistant");
  return { blocks: sums, assistantWithReasoning: ms.filter(m => m.reasoning).length, assistant: ms.length,
    reasoningOnWire: ms.some(m => Object.keys(m).includes("reasoning") || JSON.stringify(m).includes('"reasoning"')) };
});
const p1 = await open(pathToFileURL(nb).href);
await p1.locator('[data-rc5-group] textarea[placeholder^="Message robocoop-5"]').fill("Use list_values on module @tomlarkworthy/robocoop-5 once, then tell me how many values it has.");
await p1.locator('[data-rc5-group] textarea[placeholder^="Message robocoop-5"]').press("Enter");
await p1.waitForFunction(() => { const e = document.querySelector("[data-rc5-group]").active; return e.log && !e.busy && e.session.messages.some(m => m.role === "assistant" && m.content); }, null, { timeout: 180000, polling: 1000 }).catch(async err => {
  console.log("TIMEOUT state", JSON.stringify(await p1.evaluate(() => { const e = document.querySelector("[data-rc5-group]").active; return { busy: e.busy, log: !!e.log, msgs: e.session.messages.map(m => m.role + ":" + String(m.content ?? JSON.stringify(m.tool_calls?.map(t => t.function.name))).slice(0, 80)) }; })));
  console.log("errors", JSON.stringify(errors.slice(0, 5)));
  process.exit(1);
});
console.log("after turn", JSON.stringify(await thoughts(p1)));
const stored = await p1.evaluate(async () => {
  const e = document.querySelector("[data-rc5-group]").active;
  const v = [...window.__ojs_runtime._variables].filter(v => v._module === e.log.module && String(v._name).startsWith("turn_"));
  return v.map(x => (x._value?.messages ?? []).filter(m => m.reasoning).map(m => m.reasoning.length));
});
console.log("stored reasoning lengths per turn cell", JSON.stringify(stored));
await p1.locator('[data-rc5-group] label:has-text("save") input[type=checkbox]').evaluate(el => el.click());
await p1.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@robocoop5-session/")), null, { timeout: 15000 });
const html = await p1.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  return typeof r === "string" ? r : r.source;
});
writeFileSync(out, html);
const p2 = await open(pathToFileURL(out).href);
await p2.waitForFunction(() => document.querySelector("[data-rc5-group]").controller.entries.some(e => e.saved), null, { timeout: 60000 });
const idx = await p2.evaluate(() => document.querySelector("[data-rc5-group]").controller.entries.findIndex(e => e.saved));
await p2.locator('select[title="Switch session"]').selectOption(String(idx));
await p2.waitForFunction(() => document.querySelector("[data-rc5-group]").active.saved && document.querySelector("[data-rc5-group]").active.session?.messages.length, null, { timeout: 30000 });
await p2.waitForTimeout(500);
console.log("after reload", JSON.stringify(await thoughts(p2)));
console.log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
