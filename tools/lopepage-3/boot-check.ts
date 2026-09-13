// Boots the lopepage-3 notebook in Chromium over file:// and checks the M3/M4 browser gates:
//   - lopepage-3 mounts, and visualizer-2 renders the demo module's Notebook Kit cells, display()
//     appending and view() feeding a reader
//   - a hotbar drag moves a cell and every cell keeps its editor host beside it
//   - editor-6's compile_and_update edits a js cell in place in the page, called directly and
//     through the hotbar, CodeMirror and Shift-Enter
//   - Observable JS typed over a js cell becomes a classic cell in its place
//   - no page errors, and no network request the donor notebook does not also make
//
// run: bun tools/lopepage-3/boot-check.ts [notebook.html]
//   STACKS=1  page errors with stacks, and each findCell miss with the variable it missed
//   SHOT=path screenshot at the end
import { chromium } from "playwright";
import { resolve } from "node:path";

const NOTEBOOK = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_lopepage-3.html");

const browser = await chromium.launch();
// sized up front: resizing just before a drag measures positions before the layout settles
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
const pageErrors: string[] = [];
const network: string[] = [];
page.on("pageerror", (e) => pageErrors.push(process.env.STACKS ? String(e.stack) : e.message));
if (process.env.STACKS) page.on("console", async (m) => {
  if (!m.text().startsWith("Could not find cell")) return;
  const v = await m.args()[1]?.evaluate((v: any) => ({ name: v?._name, inputs: v?._inputs?.map((i: any) => i._name), def: String(v?._definition).slice(0, 80), t: Math.round(performance.now()) })).catch((e) => String(e));
  console.log("findCell miss", JSON.stringify(v));
});
page.on("request", (r) => { if (!/^(file|data|blob|about):/.test(r.url())) network.push(r.url()); });
await page.addInitScript(() => {
  const original = (window as any).Runtime;
  let captured = false;
  Object.defineProperty(window, "Runtime", {
    get: () => original,
    set(R: any) {
      const Wrapped = function (this: any, ...args: any[]) {
        const rt = new R(...args);
        if (!captured) { (window as any).__ojs_runtime = rt; captured = true; }
        return rt;
      };
      Wrapped.prototype = R.prototype;
      Object.assign(Wrapped, R);
      return Wrapped;
    }
  });
});

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail: unknown = "") => {
  if (ok) pass++; else fail++;
  console.log(`(${ok ? "pass" : "fail"}) ${label}${ok ? "" : `\n  ${JSON.stringify(detail)}`}`);
};

await page.goto(`file://${NOTEBOOK}`, { waitUntil: "load", timeout: 60000 });

const mounted = await page.waitForFunction(() => document.getElementById("lopepage-2"), undefined, { timeout: 30000 }).then(() => true, () => false);
check("lopepage-3 mounts its page", mounted);

const nkNodes = await page.waitForFunction(() => document.querySelectorAll(".lope-viz .lope-viz-nk").length >= 5, undefined, { timeout: 30000 })
  .then(() => true, () => false);
const texts = await page.evaluate(() => [...document.querySelectorAll(".lope-viz .lope-viz-nk")].map((n) => n.textContent ?? ""));
check("visualizer-2 renders the five Notebook Kit cells", nkNodes, texts);
check("display() twice appends both outputs", texts.some((t) => t.includes("n is 3") && t.includes("twice that is 6")), texts);

// Drag, straight after boot: the display() cell dragged by its hotbar to below `k * n` moves there, and
// every cell node in the pane still has its editor host as its next sibling (Tom, 2026-09-13: "display
// cells seem to get orphaned and not move with the cell"). Placed after the slider or an edit, this
// check passed with the fix removed: something in those steps places the editors again.
const drag = await (async () => {
  await page.waitForTimeout(1500);
  const box = await page.evaluate(() => {
    const disp = [...document.querySelectorAll(".lope-viz .lope-viz-nk")].find((n) => (n.textContent ?? "").includes("n is 3")) as HTMLElement | undefined;
    const kn = [...document.querySelectorAll(".lope-viz .lope-viz-nk")].find((n) => (n.textContent ?? "").trim() === "9") as HTMLElement | undefined;
    const hotbar = disp?.nextElementSibling?.querySelector(".hotbar") as HTMLElement | null;
    if (!disp || !kn || !hotbar) return null;
    disp.setAttribute("data-check", "disp");
    kn.setAttribute("data-check", "kn");
    hotbar.scrollIntoView({ block: "center" });
    const h = hotbar.getBoundingClientRect(), k = kn.getBoundingClientRect();
    return { x: h.left + 60, y: h.top + h.height / 2, ty: k.bottom + 4 };
  });
  if (!box) return { error: "no display() cell, k * n cell or hotbar" };
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x, box.y + ((box.ty - box.y) * i) / 12);
  await page.mouse.up();
  const ok = await page.waitForFunction(() => {
    const disp = document.querySelector("[data-check=disp]"), kn = document.querySelector("[data-check=kn]");
    if (!disp || !kn || disp.parentNode !== kn.parentNode) return false;
    const cells = [...(disp.parentNode as Element).children].filter((c) => c.classList.contains("observablehq"));
    return cells.indexOf(disp) === cells.indexOf(kn) + 1 && cells.every((c) => c.nextElementSibling?.querySelector(".hotbar"));
  }, undefined, { timeout: 5000 }).then(() => true, () => false);
  const layout = await page.evaluate(() => [...(document.querySelector("[data-check=kn]")?.parentNode as Element | null)?.children ?? []]
    .map((c) => c.classList.contains("observablehq") ? `cell ${JSON.stringify((c.textContent ?? "").trim().slice(0, 16))}` : c.querySelector(".hotbar") ? "editor" : c.nodeName));
  return { ok, layout };
})().catch((e) => ({ error: String(e) }));
check("dragging a display() cell below k * n moves it, and every cell keeps its editor beside it", (drag as any).ok === true, drag);

const slid = await page.evaluate(async () => {
  const input = document.querySelector(".lope-viz .lope-viz-nk input[type=range]") as HTMLInputElement | null;
  if (!input) return "no range input";
  input.value = "7";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  for (let i = 0; i < 50; i++) {
    const hit = [...document.querySelectorAll(".lope-viz .lope-viz-nk")].some((n) => (n.textContent ?? "").includes("21"));
    if (hit) return "ok";
    await new Promise((r) => setTimeout(r, 50));
  }
  return [...document.querySelectorAll(".lope-viz .lope-viz-nk")].map((n) => n.textContent);
});
check("view() feeds its reader: k = 7 gives k * n = 21", slid === "ok", slid);

const edit = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const find = (name: string) => [...rt._variables].find((v: any) => v._name === name && v._value)?._value;
  const editor = find("module @tomlarkworthy/editor-6");
  const toolchain = find("module @tomlarkworthy/js-toolchain") ?? rt.mains?.get?.("@tomlarkworthy/js-toolchain");
  if (!editor || !toolchain) return { error: `editor-6 ${!!editor}, js-toolchain ${!!toolchain}` };
  const compileAndUpdate = await editor.value("compile_and_update");
  const displayStateOf = await toolchain.value("displayStateOf");
  const head = [...rt._variables].find((v: any) => displayStateOf(v)?.definition?.id === 2);
  if (!head) return { error: "no Notebook Kit cell with id 2" };
  const state = displayStateOf(head);
  const variables = [...state.variables];
  const source = 'display("edited " + n);';
  const out = await compileAndUpdate(source, variables, { module: { module: head._module, cells: [] }, variables, lang: ["ojs", "js"] });
  for (let i = 0; i < 50 && !(state.root.textContent ?? "").includes("edited 3"); i++) await new Promise((r) => setTimeout(r, 50));
  return { out, sameHead: variables[0] === head, text: state.root.textContent, connected: state.root.isConnected };
});
check("editor-6 compile_and_update edits a js cell in place and returns its source",
  (edit as any).out === 'display("edited " + n);' && (edit as any).sameHead && String((edit as any).text).includes("edited 3") && (edit as any).connected, edit);

// Through the UI: the hotbar under the `k * n` cell opens CodeMirror on the decompiled source, and
// Shift-Enter recompiles the typed source into the same node (k = 7 from the slider above).
const ui = await (async () => {
  const marked = await page.evaluate(() => {
    const node = [...document.querySelectorAll(".lope-viz .lope-viz-nk")].find((n) => (n.textContent ?? "").trim() === "21");
    const host = node?.nextElementSibling;
    if (!node || !host?.querySelector(".hotbar")) return false;
    node.setAttribute("data-check", "kn");
    return true;
  });
  if (!marked) return { error: "no editor hotbar after the k * n cell" };
  // the editor host can be rebuilt after it opens, so address it as the node's next sibling each time
  await page.click("[data-check=kn] + * .hotbar");
  const content = page.locator("[data-check=kn] + * .cm-content");
  await content.waitFor({ timeout: 10000 });
  const shown = (await content.textContent())?.trim();
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("k * n + 100");
  await page.keyboard.press("Shift+Enter");
  const result = await page.waitForFunction(() => (document.querySelector("[data-check=kn]")?.textContent ?? "").trim() === "121", undefined, { timeout: 10000 })
    .then(() => "121", async () => (await page.textContent("[data-check=kn]"))?.trim());
  return { shown, result, after: (await content.textContent())?.trim() };
})().catch((e) => ({ error: String(e) }));
check("the editor opens on the decompiled source of a Notebook Kit cell", (ui as any).shown === "k * n", ui);
check("Shift-Enter in the editor recompiles the cell in place", (ui as any).result === "121" && (ui as any).after === "k * n + 100", ui);

// Observable JS in a Notebook Kit module (Tom, 2026-09-13: "So I cannot use Observable 1.0 syntax in cells
// anymore?"): typing `viewof foo = …` over the js cell `cell 5` makes a classic viewof cell in the same
// place, with the same pid and its editor reopened on the classic source.
const ojs = await (async () => {
  const before = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".lope-viz .observablehq")] as any[];
    const node = cells.find((n) => n.variable?._name === "cell 5");
    if (!node?.nextElementSibling?.querySelector(".hotbar")) return null;
    node.setAttribute("data-check", "c5");
    return { pid: node.variable.pid, index: cells.indexOf(node) };
  });
  if (!before) return { error: "no cell 5 node with a hotbar" };
  await page.click("[data-check=c5] + * .hotbar");
  const content = page.locator("[data-check=c5] + * .cm-content");
  await content.waitFor({ timeout: 10000 });
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("viewof foo = Inputs.range([0, 10])");
  await page.keyboard.press("Shift+Enter");
  const after = await page.waitForFunction(() => {
    const cells = [...document.querySelectorAll(".lope-viz .observablehq")] as any[];
    const node = cells.find((n) => n.variable?._name === "viewof foo");
    const editor = node?.nextElementSibling?.querySelector(".cm-content");
    // the reopened editor fills in its decompiled source after it mounts
    if (!node || !(editor?.textContent ?? "").trim()) return null;
    const rt = (window as any).__ojs_runtime;
    const foo = [...rt._variables].find((v: any) => v._name === "foo" && v._module === node.variable._module);
    return {
      index: cells.indexOf(node), nk: node.classList.contains("lope-viz-nk"), range: !!node.querySelector("input[type=range]"),
      pid: node.variable.pid, source: (editor.textContent ?? "").trim(), foo: foo?._value,
      cell5: [...rt._variables].some((v: any) => v._name === "cell 5" || v._name === "total")
    };
  }, undefined, { timeout: 10000 }).then((h) => h.jsonValue(), () => null);
  return { before, after };
})().catch((e) => ({ error: String(e) }));
const o = (ojs as any).after;
check("`viewof foo = …` typed over a js cell becomes a classic viewof cell in its place, same pid, editor reopened",
  !!o && !o.nk && o.range && o.index === (ojs as any).before?.index && o.pid === (ojs as any).before?.pid
    && o.source.includes("viewof foo = Inputs.range([0, 10])") && typeof o.foo === "number" && !o.cell5, ojs);

// Both are requested by the donor, @tomlarkworthy_notebook-kit.html, too (measured 2026-09-13): a video in
// flow-queue's md and the bootloader's lazy highlight.js language import.
const DONOR_REQUESTS = [
  "https://storage.googleapis.com/publicartifacts/blogimages/notebookwebhook.mov",
  "https://cdn.jsdelivr.net/npm/@observablehq/highlight.js@2.0.0/async-languages/index.js"
];
const newRequests = network.filter((u) => !DONOR_REQUESTS.includes(u));
check("no network requests beyond the donor's", newRequests.length === 0, newRequests.slice(0, 10));
check("no page errors", pageErrors.length === 0, [...new Set(pageErrors)].slice(0, 10));

if (process.env.SHOT) {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.screenshot({ path: process.env.SHOT, fullPage: false });
}
console.log(`\n${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
