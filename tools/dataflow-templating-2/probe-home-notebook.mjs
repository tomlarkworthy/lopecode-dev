// Runs the dataflow-templating notebook's own `template` through cloneViaSandbox and through
// cloneDataflow, in the same page, and reports what each did to the primary runtime. The point is
// the comparison: the notebook already ships a working cloneDataflow example, so it is its own
// control.
import { chromium } from "playwright";

const FILE =
  "file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_dataflow-templating.html";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(FILE, { waitUntil: "load" });
await page.waitForTimeout(8000);

const result = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const main = [...rt._variables].find((v) => v._name === "cloneDataflow" && v._definition)._module;
  const val = (n) => main.value(n);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const count = () => rt._variables.size;
  const dyn = () =>
    [...rt._variables].filter((v) => typeof v._name === "string" && v._name.startsWith("dynamic "));

  const t0 = performance.now();
  const [template, cloneDataflow, cloneViaSandbox, instantiateDataflow] = await Promise.all(
    ["template", "cloneDataflow", "cloneViaSandbox", "instantiateDataflow"].map(val)
  );

  const grab = (fn) =>
    new Promise((resolve) => {
      let widget = null;
      const dispose = fn(template, (name) =>
        name === "widget" ? { fulfilled: (v) => (widget = v) } : undefined
      );
      setTimeout(() => resolve({ widget, dispose }), 2500);
    });

  const bridges = () => dyn().filter((v) => v._name.startsWith("dynamic bridge ")).length;
  const snap = () => ({ vars: count(), dyn: dyn().length, bridges: bridges() });
  const base = snap();

  const v1 = await grab(cloneDataflow);
  const afterV1 = snap();
  v1.dispose();
  await wait(600);
  const disposedV1 = snap();

  const v2 = await grab(cloneViaSandbox);
  const afterV2 = { ...snap(), stats: instantiateDataflow.stats() };

  // The params path has no cloneDataflow equivalent — check it renders a chart for an injected value.
  const choices = await val("pizzaChoices");
  const inst = instantiateDataflow(template, { params: { pizzaChoice: choices[1] } });
  const paramWidget = await inst.value("widget");
  const paramChart = await inst.value("chart");

  v2.dispose();
  inst.dispose();
  await wait(600);
  const disposedV2 = snap();

  const tag = (el) => (el && el.tagName ? el.tagName : String(el));
  return {
    base,
    v1: { widget: tag(v1.widget), after: afterV1, disposed: disposedV1 },
    v2: { widget: tag(v2.widget), after: afterV2, disposed: disposedV2 },
    params: {
      injected: choices[1],
      widget: tag(paramWidget),
      chart: tag(paramChart),
      captures: inst.captures,
      statsWithBoth: (({ bridges, modules }) => ({ bridges, modules }))(instantiateDataflow.stats()),
      diagnostics: inst.diagnostics
    },
    statsAfterDispose: (({ bridges, modules }) => ({ bridges, modules }))(instantiateDataflow.stats()),
    dynNames: dyn().map((v) => v._name).filter((n) => !/^dynamic (editedCell|viewof_editedCell|selectVariable|viewof_edit|edit|hotbar_shell) /.test(n))
  };
});

console.log(JSON.stringify(result, null, 2));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
