// Calls a consumer's factory cell for real and reports what came back.
//
// This is the test probe-consumer-ab.mjs cannot be. All three factories poke values INTO their
// instance from the observer callbacks -- parametric-svg's sets `viewof svgTargetName`.value and
// dispatches input, and only resolves its promise once that has flowed all the way to
// `svgEditorController`. A passive observer never exercises that path, and it is the path the
// sandbox is most likely to break.
//
//   bun probe-consumer-factory.mjs <notebook.html> <factoryCell> <argsJSON|-> [--settle 12000]
// A `module: "<cellName>"` entry in the args JSON is resolved to that cell's value in the page,
// since a module reference cannot survive JSON.
import { chromium } from "playwright";

const [, , FILE, FACTORY, ARGS = "-"] = process.argv;
const settleArg = process.argv.indexOf("--settle");
const SETTLE = settleArg > 0 ? Number(process.argv[settleArg + 1]) : 12000;
if (!FILE || !FACTORY) throw new Error("usage: probe-consumer-factory.mjs <html> <factory> [args]");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
await page.goto("file://" + FILE, { waitUntil: "load" });
await page.waitForTimeout(15000);

const report = await page.evaluate(
  async ([factoryName, argsJson, settle]) => {
    const rt = window.__ojs_runtime;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const v = [...rt._variables].find((x) => x._name === factoryName && x._definition);
    if (!v) return { error: `${factoryName} not in runtime` };
    const home = v._module;
    const factory = await home.value(factoryName);
    if (typeof factory !== "function") return { error: `${factoryName} is not a function` };

    const args = argsJson === "-" ? {} : JSON.parse(argsJson);
    if (typeof args.module === "string") args.module = await home.value(args.module);

    const dynCount = () =>
      [...rt._variables].filter((x) => typeof x._name === "string" && x._name.startsWith("dynamic "))
        .length;
    const before = { vars: rt._variables.size, dyn: dynCount() };

    let out, thrown = null;
    try {
      out = factory(args);
    } catch (e) {
      return { error: "factory threw synchronously: " + String(e).slice(0, 200) };
    }

    // A factory returns either a DOM root that fills in later, or a promise of a controller.
    const isPromise = out && typeof out.then === "function";
    let resolved = null,
      rejected = null;
    if (isPromise) {
      const raced = await Promise.race([
        out.then((r) => ({ ok: r }), (e) => ({ err: String(e).slice(0, 200) })),
        wait(settle).then(() => ({ timeout: true }))
      ]);
      if (raced.timeout) rejected = "TIMED OUT — the promise never settled";
      else if (raced.err) rejected = raced.err;
      else resolved = raced.ok;
    } else {
      await wait(settle);
    }

    const describe = (x) =>
      x == null
        ? String(x)
        : x.tagName
          ? `<${x.tagName.toLowerCase()}>`
          : typeof x === "object"
            ? `object{${Object.keys(x).slice(0, 10).join(",")}}`
            : typeof x;

    const root = isPromise ? null : out;
    const after = { vars: rt._variables.size, dyn: dynCount() };
    const result = {
      shape: isPromise ? "promise" : describe(out),
      before,
      after,
      bridges: [...rt._variables].filter(
        (x) => typeof x._name === "string" && x._name.startsWith("dynamic bridge ")
      ).length,
      thrown
    };
    if (isPromise) {
      result.resolved = resolved === null ? null : describe(resolved);
      result.controllerKeys =
        resolved && typeof resolved === "object" ? Object.keys(resolved).slice(0, 20) : null;
      result.rejected = rejected;
    } else if (root) {
      // Mount it so anything gated on layout runs, then look at what it rendered.
      document.body.appendChild(root);
      await wait(4000);
      result.rootChildren = root.children.length;
      result.rootText = (root.textContent || "").trim().slice(0, 80);
      result.rootValue = describe(root.value);
      result.inputsInside = root.querySelectorAll("input,textarea,button").length;
      result.svgsInside = root.querySelectorAll("svg").length;
    }

    // Dispose if the factory offered a way, and check the runtime returns to baseline.
    const disposer = (isPromise ? out : root)?.dispose;
    if (typeof disposer === "function") {
      try {
        disposer();
      } catch (e) {
        result.disposeError = String(e).slice(0, 140);
      }
      await wait(1500);
      result.disposed = { vars: rt._variables.size, dyn: dynCount() };
      result.backToBaseline =
        rt._variables.size === before.vars && dynCount() === before.dyn;
    }
    return result;
  },
  [FACTORY, ARGS, SETTLE]
);

console.log(`${FILE.split("/").pop()}  ${FACTORY}(${ARGS === "-" ? "" : ARGS})`);
console.log(JSON.stringify(report, null, 2));
console.log("page errors:", errs.length ? [...new Set(errs)].slice(0, 6) : "none");
await browser.close();
