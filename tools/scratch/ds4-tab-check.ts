#!/usr/bin/env bun
// bun tools/scratch/ds4-tab-check.ts NOTEBOOK [--shot FILE]
// NOTEBOOK is a build of the Brain's notebook: bun tools/cloud-brain/build.ts --out FILE. --shot: a screenshot after the two choices.
// The checks of ds-4-panels-from-a-template that need the page: a built notebook in a local headless Chrome, first
// with no session, then with the cells `session` and `client` of @tomlarkworthy/cloud-brain stood in (in the tab only).
// The stand-in client answers metric.query with three rows inside the span asked and keeps each call in a list.
// Prints one line of JSON a step. Reads nothing from cb4 and writes nothing but the screenshot.
import { chromeFor } from "../lib/playwright-chrome.js";
import { address, ready } from "../cloud-brain/tab-tests.ts";
const argv = process.argv.slice(2), notebook = argv[0], shot = argv.includes("--shot") ? argv[argv.indexOf("--shot") + 1] : null;
const module = "@tomlarkworthy/cloud-brain";
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
const say = (step: string, got: unknown) => console.log(JSON.stringify({ step, ...(got as object) }));
// In the page: what is read at each step.
const read = () => {
  const w = window as any, rt = w.__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/cloud-brain");
  const value = (name: string) => mod._scope.get(name)?._value;
  const view = value("healthView"), boxes = view ? [...view.querySelectorAll("div[style*=border]")] : [];
  const chosen = (el: Element) => [...el.querySelectorAll("select")].map((s: any) => s.options[s.selectedIndex]?.textContent);
  const stats = value("instantiateDataflow")?.stats?.();
  if (!w.__view) w.__view = view;
  const proto = value("panel");
  return {
    queries: (w.__seen || []).filter((c: any) => c[0] === "metric.query").length,
    calls: (w.__seen || []).length,
    boxes: boxes.length,
    chosen: boxes.map(chosen),
    drawn: boxes.map((b: Element) => (b.querySelector("table") ? "table" : b.textContent!.includes("share of calls that were faults") ? "strip" : b.querySelector("svg") ? "chart" : b.textContent!.trim().slice(0, 40))),
    chartWidth: boxes.map((b: Element) => [...b.querySelectorAll("svg")].map((s) => s.getAttribute("width")).filter(Boolean).pop() || null),
    boxEnds: boxes.map((b: Element) => b.textContent!.replace(/\s+/g, " ").trim().slice(-22)),
    sameView: view === w.__view,
    note: (value("healthNote")?.textContent || "").slice(0, 110),
    variables: rt._variables.size,
    bridges: [...mod._scope.keys()].filter((n: string) => n.startsWith("dynamic bridge ")).length,
    sandbox: stats ? { bridges: stats.bridges, modules: stats.modules } : null,
    prototype: proto ? { chosen: chosen(proto), offered: [...(proto.querySelectorAll("select")[1]?.options || [])].map((o: any) => o.textContent), text: proto.textContent.replace(/\s+/g, " ").trim().slice(-60) } : null,
    errors: document.querySelectorAll(".observablehq--error").length,
    errorTexts: [...document.querySelectorAll(".observablehq--error")].map((e) => (view && view.contains(e) ? "IN healthView: " : "") + e.textContent!.replace(/\s+/g, " ").slice(0, 90)),
    span: value("span")
  };
};
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.goto(address(notebook, module), { waitUntil: "load" });
  await page.waitForFunction(ready, module, { timeout: 120000 });
  const settle = (ms = 2500) => page.waitForTimeout(ms);
  await page.waitForFunction(() => !!(window as any).__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain")._scope.get("panel")?._value, null, { timeout: 60000 });
  await settle();
  say("no session", await page.evaluate(read));
  // Stand in the owner and a client that counts.
  await page.evaluate(() => {
    const w = window as any, mod = w.__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain");
    w.__seen = []; w.__view = null;
    const answer = (p: any) => {
      const since = Math.floor(p.since / 60000) * 60000, until = Math.floor(p.until / 60000) * 60000;
      const row = (minute: number, worker: string, method: string, status: number, n: number) => ({ t: since + minute * 60000, worker, method, status, n, sum: 10 * n, max: 10 });
      return { metric: "core.calls", since, until, step: 60000, groups: 3, sampled: 1, series: [row(1, "brain-x-inbox", "inbox.poll", 200, 2), row(2, "brain-x-inbox", "inbox.poll", 502, 1), row(1, "brain-core", "rule.list", 401, 1)], cost: { ms: 1, queries: 1, cached: false } };
    };
    mod.redefine("client", { query: async (name: string, params: any) => (w.__seen.push([name, params]), name === "metric.query" ? answer(params) : { services: [] }), procedure: async (name: string, body: any) => (w.__seen.push([name, body]), {}) });
    mod.redefine("session", { signedIn: true, owner: true });
  });
  await page.waitForFunction(() => { const v = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain")._scope.get("healthView")?._value; return v && v.querySelectorAll("div[style*=border] select").length >= 4 && v.querySelector("table"); }, null, { timeout: 60000 });
  await settle();
  await page.evaluate(() => { (window as any).__view = null; });
  say("stood in, 2 entries", await page.evaluate(read));
  // In the page: set a select of a box as a person does.
  const pick = ([box, which, text]: [number, number, string]) => {
    const view = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain")._scope.get("healthView")._value;
    const select = view.querySelectorAll("div[style*=border]")[box].querySelectorAll("select")[which] as HTMLSelectElement;
    select.selectedIndex = [...select.options].findIndex((o) => o.textContent === text);
    select.dispatchEvent(new Event("input", { bubbles: true }));
  };
  await page.evaluate(pick, [1, 1, "brain-core"]);
  await page.evaluate(pick, [0, 0, "Faults by Worker"]);
  await settle(1500);
  say("box 2 Worker brain-core, box 1 Show faults", await page.evaluate(read));
  if (shot) await page.screenshot({ path: shot });
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent === "Refresh") as HTMLButtonElement; b.click(); });
  await settle();
  say("Refresh", await page.evaluate(read));
  await page.evaluate(() => { const s = [...document.querySelectorAll("form")].find((f) => f.querySelector("label")?.textContent === "Last")!.querySelector("select") as HTMLSelectElement; s.selectedIndex = 2; s.dispatchEvent(new Event("input", { bubbles: true })); });
  await settle();
  say("Last: 6 hours (the first select labelled Last)", await page.evaluate(read));
  await page.setViewportSize({ width: 900, height: 800 });
  await settle();
  say("viewport 1280 to 900", await page.evaluate(read));
  // A cell of the template redefined in place: what the instances draw then.
  await page.evaluate(() => { const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain"); (window as any).__body = mod._scope.get("panelDrawing"); (window as any).__was = [(window as any).__body._inputs.map((i: any) => i._name), (window as any).__body._definition]; mod.redefine("panelDrawing", ["panelDraw", "panelWorker"], (d: string, k: string) => "edited: " + d + " of " + (k || "all")); });
  await settle(1500);
  say("panelDrawing redefined in place", await page.evaluate(read));
  await page.evaluate(() => { const w = window as any, mod = w.__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain"); mod.redefine("panelDrawing", w.__was[0], w.__was[1]); });
  await settle(1500);
  say("panelDrawing put back", await page.evaluate(read));
  // From here healthView's instances are kept in a list (the ones made with a watch; the test's have none), so that
  // each run's can be asked, after the next run, whether it was ended: dispose() answers false for one that was.
  await page.evaluate(() => {
    const w = window as any, mod = w.__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain"), real = mod._scope.get("instantiateDataflow")._value;
    w.__made = []; w.__view = null;
    const kept = Object.assign((template: any, options: any) => { const made = real(template, options); if (options && options.watch) w.__made.push(made); return made; }, { stats: real.stats, destroy: real.destroy });
    mod.redefine("instantiateDataflow", [], () => kept);
  });
  await settle();
  say("instantiateDataflow wrapped to keep healthView's instances", { ...(await page.evaluate(read)), kept: await page.evaluate(() => (window as any).__made.length) });
  // After each change that runs healthView again: what the page has, how many instances the run made, and what a
  // second dispose() of the run before's instances answers.
  const change = async (step: string, act: string, value: unknown) => {
    await page.evaluate(([act, value]: [string, any]) => {
      const w = window as any, mod = w.__ojs_runtime.mains.get("@tomlarkworthy/cloud-brain");
      w.__before = w.__made.slice(); w.__made = []; w.__view = null;
      if (act === "refresh") { w.__made = w.__before; w.__before = []; ([...document.querySelectorAll("button")].find((x) => x.textContent === "Refresh") as HTMLButtonElement).click(); }
      else mod.redefine(act, value);
    }, [act, value] as [string, unknown]);
    await settle();
    say(step, { ...(await page.evaluate(read)), made: await page.evaluate(() => (window as any).__made.length), secondDisposeOfTheRunBefore: await page.evaluate(() => (window as any).__before.map((made: any) => made.dispose())) });
  };
  const two = [{ draw: "calls", worker: "" }, { draw: "table", worker: "" }];
  const three = [...two, { draw: "faults", worker: "brain-x-inbox" }], four = [...three, { draw: "table", worker: "brain-core" }];
  // R4: a third and a fourth entry, by the list alone.
  await change("healthPanels of 3", "healthPanels", three);
  await change("healthPanels of 4", "healthPanels", four);
  await change("Refresh with 4 panels", "refresh", null);
  await change("healthPanels of 2", "healthPanels", two);
  // The list with nothing in it, and an entry whose draw is no draw and whose Worker has no call.
  await change("healthPanels of 0", "healthPanels", []);
  await change("healthPanels of 1, { draw: \"other\", worker: \"brain-x-none\" }", "healthPanels", [{ draw: "other", worker: "brain-x-none" }]);
  await change("healthPanels of 2 again", "healthPanels", two);
  // The session ends and is the owner's again.
  await change("session { signedIn: false }", "session", { signedIn: false });
  await change("session of the owner again", "session", { signedIn: true, owner: true });
  say("page errors", { pageErrors: pageErrors.slice(0, 5) });
} finally { await browser.close(); }
