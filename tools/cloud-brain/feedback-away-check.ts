// feedback-away-check.ts NOTEBOOK
//
// Opens a built notebook in a local headless Chrome with brain-feedback in the one pane, files a feedback note, loads
// the page again, puts the note away with its own x, loads the page twice more and has the work done, and prints what
// annotate's store, the page and localStorage have at each point. feedbackOn is false on a file, so the cell
// `feedback` is redefined over the module's rig, as feedback-reload-check.ts does, with the browser's own copy of the
// notes put away (feedbackKept(…, "away")). The rig's tracker is new at each load: the issue is opened in it again
// from the body the first one was sent, which the tool keeps in localStorage. It reads and prints; it has no verdict.
// Record: records/page-notes-return-after-a-refresh.md.
//
//   bun tools/cloud-brain/feedback-away-check.ts $W/tools/cloud-brain/.emitted/cloud-brain.html
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
// The app as the seed's cell makes it, over the rig's tracker, which is given the issue a load before sent.
const on = async () => page.evaluate(async (m) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(m);
  mod.redefine("feedback", ["feedbackApp", "feedbackRig", "a2Store", "feedbackKept", "feedbackNear"], async (feedbackApp: any, feedbackRig: any, a2Store: any, feedbackKept: any, near: any) => {
    const rig = ((window as any).__rig = feedbackRig()), sent = JSON.parse(localStorage.getItem("away-check sent") || "null");
    if (sent) await rig.client.procedure("issue.open", sent);
    return ((window as any).__app = feedbackApp({ client: rig.client, store: a2Store, kept: feedbackKept("away-check"), away: feedbackKept("away-check", "away"), near }));
  });
  const store = await mod.value("a2Store");
  for (let i = 0; i < 400 && !store.kindOf("feedback"); i++) await new Promise((r) => setTimeout(r, 25));
  return !!store.kindOf("feedback");
}, M);
const state = () => page.evaluate(async (m) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(m), store = await mod.value("a2Store"), rig = (window as any).__rig;
  await store.refresh();
  return {
    notes: store.all().filter((a: any) => a.kind === "feedback").map((a: any) => a.issue || "a draft"),
    boxes: [...document.querySelectorAll("[data-feedback-note]")].map((e: any) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 60)),
    away: localStorage.getItem("brain_feedback_away away-check"),
    labels: rig ? [...rig.issues.values()].map((t: any) => [t.issue.id, t.issue.state, t.issue.labels]) : null,
    labelCalls: rig ? rig.calls.filter((c: any) => c[0] === "issue.label").length : null
  };
}, M);
const say = async (what: string) => console.log(what + " " + JSON.stringify(await state()));
const load = async () => {
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(ready, M, { timeout: 120000 });
  console.log("kind registered: " + (await on()));
  // feedbackSync asks once the cell feedback has a value; one more ask of the tool's own, then what is there is read.
  await page.waitForTimeout(3000);
  await page.evaluate(() => (window as any).__app.sync());
  await page.waitForTimeout(500);
};
await page.goto(`${pathToFileURL(file).href}#view=C100(S100(${M}))&r=${Date.now()}`, { waitUntil: "load" });
await page.waitForFunction(ready, M, { timeout: 120000 });
await page.evaluate(() => (localStorage.removeItem("away-check sent"), localStorage.removeItem("brain_feedback_away away-check")));
console.log("kind registered: " + (await on()));
await page.evaluate(async () => { const rt = (window as any).__ojs_runtime; const v = [...rt._variables].find((v: any) => v._name === "a2Layer"); (await v._module.value("a2Layer")).arm("note"); });
const hl = page.locator("h1:visible", { hasText: "brain-feedback" }).first();
await hl.waitFor({ timeout: 30000 });
await page.waitForTimeout(2000);
await hl.click({ position: { x: 20, y: 10 }, timeout: 20000 });
await page.waitForSelector("[data-feedback-note] textarea", { timeout: 20000 });
await page.locator("[data-feedback-note] textarea").click();
await page.keyboard.type("Put away before it is done.");
await page.locator("[data-feedback-note] button", { hasText: "File" }).click();
await page.waitForSelector("[data-feedback=open]", { timeout: 20000 });
await page.evaluate(() => localStorage.setItem("away-check sent", JSON.stringify((window as any).__rig.calls.find((c: any) => c[0] === "issue.open")[1])));
await say("1 filed:");
await load();
await say("2 after a load, nothing put away:");
// The note's own x, a real click: annotate's Delete button of the box.
await page.locator('[data-ann-id] button[title="Delete"]').first().click();
await page.waitForTimeout(1500);
await say("3 the x pressed on the open note:");
await page.evaluate(() => (window as any).__app.sync());
await say("4 after the next ask:");
await load();
await say("5 after a load:");
await load();
await say("6 after a second load:");
// The work is done between two asks of this page.
await page.evaluate(async () => { const rig = (window as any).__rig, id = [...rig.issues.keys()][0]; rig.say(id, { type: "moved", from: "open", to: "done", reason: "Fixed." }, { state: "done", closed: true }); await (window as any).__app.sync(); });
await page.waitForSelector("[data-feedback=done]", { timeout: 20000 });
await say("7 the issue done, after the next ask:");
await page.locator("[data-feedback-note] button", { hasText: "Remove" }).click();
await page.waitForTimeout(1500);
await say("8 Remove pressed:");
await page.evaluate(() => (localStorage.removeItem("away-check sent"), localStorage.removeItem("brain_feedback_away away-check")));
console.log("page errors: " + JSON.stringify(errors.slice(0, 5)));
await browser.close();
