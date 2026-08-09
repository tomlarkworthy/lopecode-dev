// Boots the editor-5 canonical after the cloneViaSandbox migration and reports what the swap did
// to the primary runtime, plus one functional check (open a heavy panel, see an editor appear).
// The gate run (plan/dataflow-templating-2.md) measured the same numbers with the implementation
// inlined; this re-measures them with it arriving over the dataflow-templating import.
import { chromium } from "playwright";

const FILE = process.argv[2];
if (!FILE) throw new Error("usage: probe-editor5-shipped.mjs <notebook.html>");

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("file://" + FILE, { waitUntil: "load" });
await page.waitForTimeout(15000);

const boot = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const ed = [...rt._variables].find((v) => v._name === "cellEditor" && v._definition)._module;
  const dyn = [...rt._variables].filter(
    (v) => typeof v._name === "string" && v._name.startsWith("dynamic ")
  );
  const inst = ed._scope.get("instantiateDataflow");
  return {
    hotbars: document.querySelectorAll(".hotbar").length,
    primaryVariables: rt._variables.size,
    editorScope: ed._scope.size,
    dynamicTotal: dyn.length,
    dynamicNonBridge: dyn.filter((v) => !v._name.startsWith("dynamic bridge ")).map((v) => v._name),
    bridges: dyn.filter((v) => v._name.startsWith("dynamic bridge ")).length,
    importedName: [...rt._variables].some((v) => v._name === "cloneViaSandbox"),
    sawCloneDataflowInEditor: ed._scope.has("cloneDataflow")
  };
});

// Functional: open one collapsed panel and confirm a CodeMirror editor materialises in it.
const panel = await page.evaluate(async () => {
  const before = document.querySelectorAll(".cm-content").length;
  const bar = document.querySelectorAll(".hotbar")[3];
  if (!bar) return { ran: false };
  const open = [...bar.querySelectorAll("span,button")].find((b) =>
    /✏|edit/i.test(b.textContent || b.title || "")
  );
  (open || bar).click();
  await new Promise((r) => setTimeout(r, 4000));
  const rt = window.__ojs_runtime;
  const dyn = [...rt._variables].filter(
    (v) => typeof v._name === "string" && v._name.startsWith("dynamic ")
  );
  return {
    ran: true,
    cmBefore: before,
    cmAfter: document.querySelectorAll(".cm-content").length,
    primaryVariables: rt._variables.size,
    bridges: dyn.filter((v) => v._name.startsWith("dynamic bridge ")).length,
    dynamicTotal: dyn.length
  };
});

const stats = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const ed = [...rt._variables].find((v) => v._name === "cellEditor" && v._definition)._module;
  const v = ed._scope.get("instantiateDataflow");
  const f = v && v._value;
  if (!f || !f.stats) return null;
  const { bridges, modules } = f.stats();
  return { bridges, modules };
});

console.log(JSON.stringify({ boot, panel, sandbox: stats }, null, 2));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
