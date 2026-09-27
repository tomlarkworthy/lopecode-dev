// S9: default watches + per-session watch bus. Two chats on one page (the notebook's own, and "b").
//   turn 1 in each: the first step's watch notice carries the module list and erroring cells in full
//   chat b sets watch_variable on a cell; chat a must never hear about it
//   between turns: a new module with an OFF-SCREEN erroring cell and a dependent
//   turn 2 in a: a delta — "+ @s9/probe" and one error line with [+1 downstream]
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector('[data-rc5-group="robocoop5-session"]')?.active?.session, null, { timeout: 120000 });

await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const m = rt.module();
  m.import("robocoop5", rt.mains.get("@tomlarkworthy/robocoop-5"));
  const host = document.createElement("div");
  host.id = "chat-b";
  host.style.cssText = "height:400px;position:relative;z-index:10000;background:#000";
  document.body.prepend(host);
  m.variable({ fulfilled(v) { host.replaceChildren(v); } })
    .define("b", ["robocoop5", "invalidation"], (robocoop5, invalidation) => robocoop5({ group: "s9-b", invalidation }));
  const cm = rt.module();
  rt.mains.set("@s9/counter", cm);
  window.__s9counter = cm.variable(true).define("s9_counter", [], () => 1);
});
await page.locator("#chat-b textarea").waitFor({ timeout: 60000 });

const sel = { a: '[data-rc5-group="robocoop5-session"]', b: '#chat-b [data-rc5-group]' };
const notices = chat => page.evaluate(s => document.querySelector(s).active.session.messages
  .filter(m => m.role === "system" && String(m.content).startsWith("Watch updates")).map(m => m.content), sel[chat]);
const say = async (chat, text) => {
  const ta = page.locator(`${sel[chat]} textarea[placeholder^="Message robocoop-5"]`);
  const before = await page.evaluate(s => document.querySelector(s).active.session?.messages.length ?? 0, sel[chat]);
  await ta.fill(text); await ta.press("Enter");
  await page.waitForFunction(([s, n]) => {
    const e = document.querySelector(s).active;
    return !e.busy && e.session.messages.length > n && e.session.messages.slice(n).some(m => m.role === "assistant" && m.content);
  }, [sel[chat], before], { timeout: 300000, polling: 1000 }).catch(async err => {
    console.log("TIMEOUT", chat, JSON.stringify(await page.evaluate(s => {
      const e = document.querySelector(s).active;
      return { busy: e.busy, msgs: e.session.messages.map(m => m.role + ": " + String(m.content ?? "").slice(0, 200) + (m.tool_calls ? " CALLS " + m.tool_calls.map(t => t.function.name + t.function.arguments.slice(0, 80)).join("|") : "")) };
    }, sel[chat]), null, 1));
    throw err;
  });
};

await say("a", "Reply with only the word ACK. Do not use tools.");
const a1 = await notices("a");
console.log("A turn1 notices:", a1.length, "\n" + a1.join("\n---\n").slice(0, 1500));

await say("b", "Use watch_variable on cell s9_counter in module @s9/counter. Then reply DONE.");
await page.evaluate(() => window.__s9counter.define("s9_counter", [], () => 2));
await page.waitForTimeout(500);
console.log("bus lists:", JSON.stringify(await page.evaluate(sel => ({
  a: document.querySelector(sel.a).active.session.watchBus?.list().map(w => w.label),
  b: document.querySelector(sel.b).active.session.watchBus?.list().map(w => w.label + " = " + String(w.last).slice(0, 60)),
  bCalls: document.querySelector(sel.b).active.session.messages.flatMap(m => (m.tool_calls || []).map(t => t.function.name + " " + t.function.arguments))
}), sel)));

// an off-screen failing cell + its dependent, in a new named module
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.module();
  rt.mains.set("@s9/probe", mod);   // named via mains, like a saved module
  mod.variable(true).define("s9_bad", [], () => { throw new Error("s9 boom"); });
  mod.variable(true).define("s9_dep", ["s9_bad"], x => x + 1);
});
await page.waitForTimeout(1000);
await say("a", "Reply with only the word ACK2. Do not use tools.");
const a2 = await notices("a");
console.log("\nA turn2 new notices:\n" + a2.slice(a1.length).join("\n---\n").slice(0, 1500));
const b = await notices("b");
console.log("\nB notices:\n" + b.join("\n---\n").slice(0, 2000));
console.log("\nA mentions s9_counter?", a2.some(t => t.includes("s9_counter")));
console.log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
