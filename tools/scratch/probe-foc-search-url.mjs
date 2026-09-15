// Chat search lives in the URL as q=: a link opens the search, typing writes it, clearing removes it.
import { chromium } from "playwright";
const [url] = process.argv.slice(2);
const VIEW = "S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
const snap = () => p.evaluate(() => ({
  q: new URLSearchParams(location.hash.slice(1)).get("q"),
  box: (document.querySelector(".foc-chat .fc-side input") || {}).value,
  bar: (document.querySelector(".foc-chat .fc-bar b") || {}).textContent,
  head: (document.querySelector(".foc-chat .fc-main .fc-sep") || {}).textContent,
  historyLength: history.length
}));
const log = (k, v) => console.log(k, JSON.stringify(v));

await p.goto(url + "#view=" + VIEW + "&q=" + encodeURIComponent("colibri bridge"), { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".foc-chat .fc-chan").length > 3, null, { timeout: 120000, polling: 300 });
await p.waitForFunction(() => document.querySelectorAll(".foc-chat .fc-main .fc-msg").length > 0, null, { timeout: 120000, polling: 500 }).catch(() => {});
await p.waitForTimeout(1500);
log("openedLink", await snap());

const before = (await snap()).historyLength;
await p.click(".foc-chat .fc-side input");
await p.fill(".foc-chat .fc-side input", "");
await p.keyboard.type("propagator", { delay: 40 });
await p.waitForTimeout(150);
log("midTyping", await snap());
await p.waitForTimeout(900);
const typed = await snap();
log("afterTyping", { ...typed, historyGrew: typed.historyLength - before });

// An archive yield while the query sits in the URL must not undo it.
await p.waitForTimeout(4000);
log("afterArchiveYields", await snap());

await p.evaluate(() => [...document.querySelectorAll(".foc-chat .fc-bar button")].find((x) => x.textContent === "Clear search").click());
await p.waitForTimeout(800);
log("cleared", await snap());

await p.goBack();
await p.waitForTimeout(1200);
log("back", await snap());

await p.evaluate(() => { for (const v of window.__ojs_runtime._variables) if (v._name === "focGoTab" && v._value) return v._value("@tomlarkworthy/foc-projects"); });
await p.waitForFunction(() => [...document.querySelectorAll(".foc-projects .fp-chat")].some((x) => x.textContent === "search chat"), null, { timeout: 60000 });
const name = await p.evaluate(() => {
  const btn = [...document.querySelectorAll(".foc-projects .fp-chat")].find((x) => x.textContent === "search chat");
  const n = btn.closest(".foc-card").querySelector("h4").textContent;
  btn.click();
  return n;
});
await p.waitForTimeout(1500);
log("fromProjects", { name, ...(await snap()), chatPaneVisible: await p.evaluate(() => !!document.querySelector(".foc-chat .fc-side input")?.offsetParent) });

await p.evaluate(() => document.querySelector(".foc-chat .fc-chan").click());
await p.waitForTimeout(1000);
log("channelClick", await snap());
log("pageErrors", errs);
await b.close();
