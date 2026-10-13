// feedback-reload-check.ts NOTEBOOK [SCREENSHOT.png]   (with it, the list of point 9 is written to SCREENSHOT-away.png)
//
// Opens a built notebook in a local headless Chrome with brain-feedback in the one pane, places a feedback note,
// types in it, loads the page again and prints what the note, annotate's store and localStorage have at seven
// points. feedbackOn is false on a file, so the cell `feedback` is redefined over the module's rig with the
// browser's own copies (feedbackKept). It reads and prints; it has no verdict. Record: records/feedback-draft-lost-on-reload.md.
// Four more points since pm-1-notes-put-away-are-kept (2026-10-13): the filed note put away with its own x, the page
// loaded again, Show pressed in the cell feedbackAway, and the page loaded once more. From point 8 the rig, which is new at each load, is given the
// issue again from the body point 6 sent. Record: records/pm-1-notes-put-away-are-kept.md.
//
//   bun tools/cloud-brain/feedback-reload-check.ts $W/tools/cloud-brain/.emitted/cloud-brain.html
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromeFor } from "../lib/playwright-chrome.js";
const M = "@tomlarkworthy/brain-feedback", file = resolve(process.argv[2]);
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const ready = (m: string) => { const rt = (window as any).__ojs_runtime, mod = rt && rt.mains && rt.mains.get(m); if (!mod) return false; for (const v of rt._variables) if (v._module === mod && v._name === "feedbackApp") return true; return false; };
// feedbackOn is false on a file: the app is made as the seed's cell makes it, over the rig's tracker.
const on = async () => page.evaluate(async (m) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(m);
  mod.redefine("feedback", ["feedbackApp", "feedbackRig", "a2Store", "feedbackKept", "feedbackNear"], (feedbackApp: any, feedbackRig: any, a2Store: any, feedbackKept: any, near: any) => {
    const rig = ((window as any).__rig = feedbackRig()), sent = JSON.parse(localStorage.getItem("reload-check sent") || "null");
    if (sent) rig.client.procedure("issue.open", sent);
    return ((window as any).__app = feedbackApp({ client: rig.client, store: a2Store, kept: feedbackKept("reload-check"), away: feedbackKept("reload-check", "away"), near }));
  });
  const store = await mod.value("a2Store");
  for (let i = 0; i < 400 && !store.kindOf("feedback"); i++) await new Promise((r) => setTimeout(r, 25));
  return !!store.kindOf("feedback");
}, M);
const state = () => page.evaluate(async (m) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(m), store = await mod.value("a2Store");
  await store.refresh();
  return {
    notes: store.all().filter((a: any) => a.kind === "feedback").map((a: any) => ({ id: a.id, draft: a.draft, issue: a.issue, home: a.home, cell: a.anchor && a.anchor.cell })),
    boxes: [...document.querySelectorAll("[data-feedback-note]")].map((e: any) => ({ id: e.dataset.feedbackNote, is: (e.querySelector("[data-feedback]") || {}).dataset?.feedback, text: e.querySelector("textarea") ? e.querySelector("textarea").value : null, says: e.textContent.slice(0, 80) })),
    kept: localStorage.getItem("brain_feedback_drafts reload-check"),
    away: localStorage.getItem("brain_feedback_away reload-check"),
    list: [...document.querySelectorAll("[data-feedback-away]")].map((e: any) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 120)),
    opened: ((window as any).__rig ? (window as any).__rig.calls : []).filter((c: any) => c[0] === "issue.open").map((c: any) => [c[1].key, c[1].id, c[1].title])
  };
}, M);
const say = async (what: string) => console.log(what + " " + JSON.stringify(await state()));
await page.goto(`${pathToFileURL(file).href}#view=C100(S100(${M}))&r=${Date.now()}`, { waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
await page.evaluate(() => (localStorage.removeItem("reload-check sent"), localStorage.removeItem("brain_feedback_away reload-check")));
console.log("kind registered: " + (await on()));
// A note as the menu's Note makes one: armed, then a real click on the module's heading.
await page.evaluate(async () => { const rt = (window as any).__ojs_runtime; const v = [...rt._variables].find((v: any) => v._name === "a2Layer"); (await v._module.value("a2Layer")).arm("note"); });
const hl = page.locator("h1:visible", { hasText: "brain-feedback" }).first();
await hl.waitFor({ timeout: 30000 });
await page.waitForTimeout(2000);
await hl.click({ position: { x: 20, y: 10 }, timeout: 20000 });
await page.waitForSelector("[data-feedback-note] textarea", { timeout: 20000 });
await say("1 placed, nothing typed:");
await page.locator("[data-feedback-note] textarea").click();
await page.keyboard.type("Typed and not filed.\nSecond line.");
await say("2 typed:");
await page.reload({ waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
await say("3 after a reload, before the app is made:");
console.log("kind registered: " + (await on()));
await page.waitForSelector("[data-feedback-note] textarea", { timeout: 20000 });
await say("4 after a reload, the app made:");
if (process.argv[3]) await page.screenshot({ path: resolve(process.argv[3]) });
await page.locator("[data-feedback-note] textarea").click();
await page.keyboard.press("End");
await page.keyboard.type(" More.");
// The cell ran again on the same page: a new app, the same note.
console.log("kind registered: " + (await on()));
await page.waitForTimeout(1500);
await say("5 typed on, then the app made again on the page:");
await page.locator("[data-feedback-note] button", { hasText: "File" }).click();
await page.waitForSelector("[data-feedback=open]", { timeout: 20000 });
await say("6 filed:");
const sent = await page.evaluate(() => JSON.stringify((window as any).__rig.calls.find((c: any) => c[0] === "issue.open")[1]));
await page.reload({ waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
console.log("kind registered: " + (await on()));
await page.waitForTimeout(3000);
await say("7 after a second reload (the rig's tracker is new and has no issue):");
// The issue of point 6 is given to the rig of this load and of each after it, and the app made again: an ask places its note.
const made = async () => {
  console.log("kind registered: " + (await on()));
  await page.waitForTimeout(3000);
  await page.evaluate(() => (window as any).__app.sync());
  await page.waitForTimeout(500);
};
await page.evaluate((s) => localStorage.setItem("reload-check sent", s), sent);
await made();
await page.waitForSelector("[data-feedback=open]", { timeout: 20000 });
// The note's own x, a real click: annotate's Delete button of the box.
await page.locator('[data-ann-id] button[title="Delete"]').first().click();
await page.waitForTimeout(1500);
await say("8 the filed note of an open issue put away with its x:");
await page.reload({ waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
await made();
await say("9 after a load:");
if (process.argv[3]) await page.locator("[data-feedback-away]:visible").first().screenshot({ path: resolve(process.argv[3]).replace(/(\.png)?$/, "-away.png") });
// Show, a real click in the cell feedbackAway of the pane.
await page.locator("[data-feedback-away-row] button:visible", { hasText: "Show" }).first().click();
await page.waitForSelector("[data-feedback=open]", { timeout: 20000 });
await say("10 Show pressed:");
await page.reload({ waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
await made();
await say("11 after a load, the note shown:");
await page.evaluate(() => (localStorage.removeItem("reload-check sent"), localStorage.removeItem("brain_feedback_away reload-check")));
console.log("page errors: " + JSON.stringify(errors.slice(0, 5)));
await browser.close();
