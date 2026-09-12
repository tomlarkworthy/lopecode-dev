// What does an archive yield destroy?  focChatView depends on `archive`, so
// every yield during the background crawl rebuilds the whole chat DOM. This
// checks the three things a reader can be in the middle of: a half-typed reply,
// a scroll position away from the bottom, and focus in the search box.
//
//   node tools/foc-viewer/rebuild-state-check.mjs
//
// currentSession is stubbed in the runtime: the composer renders a sign-in
// prompt without one, and this has nothing to do with auth.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NB = "file://" + process.cwd() + "/lopebooks/notebooks/Feeling_of_Computing.html";
const PROFILE = process.env.FOC_PROFILE || mkdtempSync(join(tmpdir(), "foc-composer-"));
const ctx = await chromium.launchPersistentContext(PROFILE, { args: ["--allow-file-access-from-files"] });
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(NB + "#view=S100(@tomlarkworthy/foc-chat)");
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });

// Wait for messages, then open the newest thread that has replies.
const target = await page.evaluate(async () => {
  const mods = [...window.__ojs_runtime._modules.values()];
  const get = async (n) => {
    for (const m of mods) { const v = [...m._scope.values()].find((x) => x._name === n); if (v && v._value !== undefined) return await v._value; }
  };
  for (let i = 0; i < 120; i++) {
    const a = await get("archive");
    if (a && a.messages.length > 500) {
      const rep = await get("repliesByParent");
      for (const [rk, list] of [...rep].reverse()) if (list.length) return rk;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
});
console.log("thread root:", target);

// Stub a session so the composer renders an editor rather than a sign-in line.
await page.evaluate(() => {
  for (const m of window.__ojs_runtime._modules.values()) {
    const v = [...m._scope.values()].find((x) => x._name === "focComposer");
    if (v) { m.redefine("currentSession", [], () => ({ handle: "repro.test", did: "did:plc:repro" })); return true; }
  }
  return false;
});
await page.evaluate((t) => { location.hash = "#view=S100(@tomlarkworthy/foc-chat)&msg=" + t; }, target);
await page.waitForTimeout(4000);

console.log("dom:", JSON.stringify(await page.evaluate(() => ({
  hash: location.hash.slice(0, 80),
  thread: !!document.querySelector(".fc-thread"),
  composer: !!document.querySelector(".fc-composer"),
  signin: (document.querySelector(".fc-composer-signin") || {}).textContent || null,
  session: (() => { for (const m of window.__ojs_runtime._modules.values()) { const v = [...m._scope.values()].find((x) => x._name === "currentSession"); if (v) return String(v._value && v._value.handle); } return "none"; })()
}))));
const pm = page.locator(".fc-composer-editor .ProseMirror").first();
await pm.waitFor({ timeout: 30000 });
await pm.click();
await page.keyboard.type("a half written reply");
const before = await page.evaluate(() => {
  const el = document.querySelector(".fc-composer-editor .ProseMirror");
  return { text: el.textContent, node: (window.__reproNode = el.closest(".fc-composer")) ? 1 : 0, focused: document.activeElement.closest(".ProseMirror") ? 1 : 0 };
});
console.log("typed:", JSON.stringify(before));

// Watch for the rebuild rather than guessing when it lands: the old composer
// node leaves the document the moment focChatView produces a new tree.
await page.evaluate(() => {
  window.__reproLog = [];
  window.__reproRoot = document.querySelector(".foc-root.foc-chat");
  const t = setInterval(() => {
    const root = document.querySelector(".foc-root.foc-chat");
    const el = document.querySelector(".fc-composer-editor .ProseMirror");
    window.__reproLog.push({
      t: Date.now(),
      rootSame: root === window.__reproRoot,
      composerSame: !!el && el.closest(".fc-composer") === window.__reproNode,
      connected: window.__reproNode.isConnected,
      text: el ? el.textContent : null,
      focused: !!(document.activeElement && document.activeElement.closest(".ProseMirror")),
      records: (window.__focProgress || {}).records
    });
    if (window.__reproLog.length > 60) clearInterval(t);
  }, 1000);
});
await page.waitForTimeout(45000);
const log = await page.evaluate(() => window.__reproLog);
const first = log[0];
const broke = log.find((r) => !r.rootSame);
console.log("start:", JSON.stringify(first));
console.log(broke ? "view rebuilt at +" + Math.round((broke.t - first.t) / 1000) + "s: " + JSON.stringify(broke)
                  : "view never rebuilt in 45 s");
console.log("end:  ", JSON.stringify(log[log.length - 1]));

// Scroll away from the bottom and see whether the next rebuild yanks it back.
await page.evaluate(() => {
  const list = document.querySelector(".fc-main .fc-list");
  list.scrollTop = Math.max(0, list.scrollHeight * 0.3);
  window.__reproScroll = { gap: list.scrollHeight - list.scrollTop - list.clientHeight, height: list.scrollHeight };
  list.dispatchEvent(new Event("scroll"));
});
const s0 = await page.evaluate(() => window.__reproScroll);
await page.waitForTimeout(12000);
const s1 = await page.evaluate(() => {
  const list = document.querySelector(".fc-main .fc-list");
  return { gap: list.scrollHeight - list.scrollTop - list.clientHeight, height: list.scrollHeight, atBottom: list.scrollHeight - list.scrollTop - list.clientHeight < 4 };
});
console.log("scroll before:", JSON.stringify(s0), "after 12 s:", JSON.stringify(s1));

// Focus the search box and check it survives too.
await page.click(".fc-side .foc-input");
await page.keyboard.type("logic");
await page.waitForTimeout(8000);
console.log("search:", JSON.stringify(await page.evaluate(() => {
  const box = document.querySelector(".fc-side .foc-input");
  return { value: box.value, focused: document.activeElement === box, caret: box.selectionStart };
})));
await ctx.close();
