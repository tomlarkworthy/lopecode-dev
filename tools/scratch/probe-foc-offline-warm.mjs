// Local first, the case a returning reader hits: boot once online in a persistent profile so
// IndexedDB holds the channel list and some messages, then boot the same profile with every
// http(s) request aborted and time how long until the chat shows channels and messages.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
const [url, dir = mkdtempSync("/private/tmp/claude-502/foc-offline-")] = process.argv.slice(2);
const HASH = "#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)";
const opts = { viewport: { width: 1400, height: 900 }, args: ["--no-sandbox", "--disable-setuid-sandbox"] };

// 1. online warm-up
{
  const ctx = await chromium.launchPersistentContext(dir, opts);
  const p = ctx.pages()[0] || await ctx.newPage();
  await p.goto(url + HASH, { waitUntil: "load" });
  await p.waitForFunction(() => document.querySelectorAll(".foc-chat .fc-chan").length > 3, null, { timeout: 120000, polling: 500 });
  await p.waitForFunction(() => window.__focProgress && window.__focProgress.records > 1500, null, { timeout: 180000, polling: 1000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const warm = await p.evaluate(() => ({ channels: document.querySelectorAll(".foc-chat .fc-chan").length, progress: window.__focProgress }));
  console.log("online warm-up", JSON.stringify({ channels: warm.channels, records: warm.progress && warm.progress.records }));
  await ctx.close();
}

// 2. offline boot of the same profile
{
  const ctx = await chromium.launchPersistentContext(dir, opts);
  const blocked = new Map();
  await ctx.route(/^https?:\/\//, (route) => {
    const h = new URL(route.request().url()).host;
    blocked.set(h, (blocked.get(h) || 0) + 1);
    route.abort("internetdisconnected");
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  const t0 = Date.now();
  await p.goto(url + HASH, { waitUntil: "load" });
  const at = {};
  await p.waitForFunction(() => document.querySelectorAll(".foc-chat .fc-chan").length > 3, null, { timeout: 60000, polling: 100 })
    .then(() => { at.channels = Date.now() - t0; }, () => { at.channels = "timeout"; });
  await p.waitForFunction(() => document.querySelectorAll(".foc-chat .fc-main .fc-msg").length > 0, null, { timeout: 60000, polling: 100 })
    .then(() => { at.messages = Date.now() - t0; }, () => { at.messages = "timeout"; });
  await p.waitForTimeout(2000);
  const view = await p.evaluate(() => {
    const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
    const st = get("structure");
    return {
      structureSource: st && st.source,
      channels: document.querySelectorAll(".foc-chat .fc-chan").length,
      messages: document.querySelectorAll(".foc-chat .fc-main .fc-msg").length,
      header: (document.querySelector(".foc-chat .foc-head") || {}).textContent
    };
  });
  // Other tabs render too.
  const tabs = {};
  for (const m of ["foc-projects", "foc-people", "foc-demos"]) {
    await p.evaluate((m) => { for (const v of window.__ojs_runtime._variables) if (v._name === "focGoTab" && v._value) return v._value("@tomlarkworthy/" + m); }, m);
    await p.waitForTimeout(1500);
    tabs[m] = await p.evaluate((m) => {
      const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/' + m + '"]');
      const root = pane && pane.querySelector(".foc-root");
      return root ? root.textContent.replace(/\s+/g, " ").slice(0, 90) : null;
    }, m);
  }
  await p.screenshot({ path: "tools/scratch/foc-offline-warm.png" });
  console.log("offline boot ms", JSON.stringify(at));
  console.log("offline view", JSON.stringify(view));
  console.log("offline tabs", JSON.stringify(tabs));
  console.log("blocked", JSON.stringify([...blocked]));
  console.log("errors", JSON.stringify(errs));
  await ctx.close();
}
