// Turn tree through the real chat UI: two turns, edit the second (a sibling branch), switch branches with
// ‹ ›, save, export, reload: the reload shows the LATEST branch and still offers the other.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const out = resolve(here, "out/s5-exported.html"); mkdirSync(dirname(out), { recursive: true });
const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a);
const browser = await chromium.launch();
const errors = [];
const C = () => [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
const open = async url => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
  await page.locator('textarea[placeholder^="Message robocoop-5"]').waitFor({ timeout: 60000 });
  return page;
};
const state = page => page.evaluate(`(${C})()`).then(() => page.evaluate(() => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  const e = c.active;
  return { head: e.head, turns: e.turns?.size ?? 0, chat: e.session.messages.filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content).map(m => m.role[0] + ": " + m.content.slice(0, 60)) };
}));
const say = async (page, text, fill = true) => {
  const { head } = await state(page);
  if (fill) await page.locator('textarea[placeholder^="Message robocoop-5"]').fill(text);
  await page.keyboard.press("Enter");
  await page.waitForFunction(h => {
    const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
    return !c.active.busy && c.active.head && c.active.head !== h;
  }, head, { timeout: 300000, polling: 1000 });
  return state(page);
};
const p1 = await open(pathToFileURL(nb).href);
log("A", JSON.stringify((await say(p1, "My codeword is FIG. Reply only with OK, no tools.")).chat));
log("B", JSON.stringify((await say(p1, "Reply with the codeword in UPPERCASE, nothing else, no tools.")).chat));
const edits = p1.locator('button[title^="Edit and resend"]');
log("edit buttons", await edits.count());
await edits.nth(1).click();
await p1.waitForFunction(() => document.querySelector('textarea[placeholder^="Message robocoop-5"]')?.value.includes("UPPERCASE"));
log("after edit click", JSON.stringify((await state(p1)).chat), "textarea:", JSON.stringify(await p1.locator('textarea[placeholder^="Message robocoop-5"]').inputValue()));
await p1.locator('textarea[placeholder^="Message robocoop-5"]').fill("Reply with the codeword in lowercase, nothing else, no tools.");
const s3 = await say(p1, null, false);
log("B'", JSON.stringify(s3.chat), "turns", s3.turns);
log("branch position shown:", await p1.locator('button[title="Previous branch"] + span').first().textContent());
await p1.locator('button[title="Previous branch"]').first().click();
await p1.waitForTimeout(500);
log("after ‹", JSON.stringify((await state(p1)).chat));
await p1.locator('button[title="Next branch"]').first().click();
await p1.waitForTimeout(500);
await p1.locator('label:has-text("save") input[type=checkbox]').check();
await p1.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@rc5-sessions/")), null, { timeout: 10000 });
// show the OLDER branch before export: the reload must still open the latest one, not what was on screen
await p1.locator('button[title="Previous branch"]').first().click();
await p1.waitForTimeout(500);
const html = await p1.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  return typeof r === "string" ? r : r.source;
});
writeFileSync(out, html);
log("exported", html.length, "bytes; turn cells:", new Set(html.match(/_turn_[a-z0-9]+_[a-z0-9]+\(/g)).size);
const p2 = await open(pathToFileURL(out).href);
await p2.waitForFunction(() => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  return c.entries.some(e => e.log && e.saved);
}, null, { timeout: 60000 });
const idx = await p2.evaluate(() => { const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value; return c.entries.findIndex(e => e.saved); });
await p2.locator('select[title="Switch session"]').selectOption(String(idx));
await p2.waitForFunction(i => { const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value; return c.active === c.entries[i] && c.active.session; }, idx, { timeout: 30000 });
await p2.waitForTimeout(500);
log("reload opens", JSON.stringify((await state(p2)).chat));
log("reload branch position:", await p2.locator('button[title="Previous branch"] + span').first().textContent());
await p2.screenshot({ path: resolve(here, "out/s5-reload.png"), clip: { x: 0, y: 0, width: 1050, height: 500 } });
log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
