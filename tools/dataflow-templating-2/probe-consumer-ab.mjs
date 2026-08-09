// Runs one consumer's template through cloneDataflow and through cloneViaSandbox in the same page
// and diffs the per-variable outcome. Same idea as probe-home-notebook.mjs: the page is its own
// control, so a difference between the arms is the only thing that can be blamed on the sandbox.
//
// Every template variable is observed, which is more aggressive than the real call sites (they
// return null for most names, leaving those cells lazy). That can surface errors production never
// reaches -- but it surfaces them in BOTH arms, and the arms are what is being compared.
//
//   bun probe-consumer-ab.mjs <notebook.html> <templateCellName> [--settle 6000]
import { chromium } from "playwright";

const FILE = process.argv[2];
const TEMPLATE = process.argv[3];
const settleArg = process.argv.indexOf("--settle");
const SETTLE = settleArg > 0 ? Number(process.argv[settleArg + 1]) : 6000;
if (!FILE || !TEMPLATE) throw new Error("usage: probe-consumer-ab.mjs <notebook.html> <templateCell>");

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => m.type() === "error" && pageErrors.push(m.text().slice(0, 160)));
await page.goto("file://" + FILE, { waitUntil: "load" });
await page.waitForTimeout(12000);

const result = await page.evaluate(
  async ([templateName, settle]) => {
    const rt = window.__ojs_runtime;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const find = (name) =>
      [...rt._variables].find((v) => v._name === name && v._definition);
    const tVar = find(templateName);
    if (!tVar) return { error: `template cell ${templateName} not found in runtime` };
    const home = tVar._module;
    const template = await home.value(templateName);
    if (!Array.isArray(template) || !template.length)
      return { error: `${templateName} is not a non-empty Variable[]` };

    const cloneDataflow = await home.value("cloneDataflow").catch(() => null);
    // cloneViaSandbox may not be imported by this module yet -- reach it through any module that
    // does have it, which after the corpus sweep is every copy of dataflow-templating.
    let cloneViaSandbox = await home.value("cloneViaSandbox").catch(() => null);
    if (!cloneViaSandbox) {
      const holder = find("cloneViaSandbox");
      if (holder) cloneViaSandbox = await holder._module.value("cloneViaSandbox");
    }
    if (!cloneDataflow || !cloneViaSandbox)
      return { error: `missing cloneDataflow=${!!cloneDataflow} cloneViaSandbox=${!!cloneViaSandbox}` };

    const names = template.map((v) => v._name);
    const dynCount = () =>
      [...rt._variables].filter((v) => typeof v._name === "string" && v._name.startsWith("dynamic "))
        .length;

    const runArm = async (fn) => {
      const seen = new Map(names.map((n) => [n, { state: "never", error: null, kind: null }]));
      const before = { vars: rt._variables.size, dyn: dynCount() };
      const dispose = fn(template, (name) => ({
        pending() {
          const s = seen.get(name);
          if (s && s.state === "never") s.state = "pending";
        },
        fulfilled(value) {
          const s = seen.get(name);
          if (!s) return;
          s.state = "ok";
          s.kind =
            value && value.tagName
              ? value.tagName
              : Array.isArray(value)
                ? `Array(${value.length})`
                : typeof value;
        },
        rejected(err) {
          const s = seen.get(name);
          if (!s) return;
          s.state = "error";
          s.error = String(err).slice(0, 140);
        }
      }));
      await wait(settle);
      const after = { vars: rt._variables.size, dyn: dynCount() };
      const outcome = Object.fromEntries(seen);
      let disposeError = null;
      try {
        dispose();
      } catch (e) {
        disposeError = String(e).slice(0, 140);
      }
      await wait(1200);
      return {
        before,
        after,
        disposed: { vars: rt._variables.size, dyn: dynCount() },
        disposeError,
        outcome
      };
    };

    const v1 = await runArm(cloneDataflow);
    const v2 = await runArm(cloneViaSandbox);

    const diff = [];
    for (const n of names) {
      const a = v1.outcome[n],
        b = v2.outcome[n];
      if (a.state !== b.state || a.error !== b.error)
        diff.push({ name: n, cloneDataflow: a, cloneViaSandbox: b });
    }
    const tally = (o) =>
      Object.values(o).reduce((acc, s) => ((acc[s.state] = (acc[s.state] || 0) + 1), acc), {});

    return {
      templateSize: names.length,
      names,
      v1: { ...v1, tally: tally(v1.outcome) },
      v2: { ...v2, tally: tally(v2.outcome) },
      diff
    };
  },
  [TEMPLATE, SETTLE]
);

if (result.error) {
  console.log("PROBE FAILED:", result.error);
} else {
  const brief = (a) =>
    `vars ${a.before.vars} -> ${a.after.vars} -> ${a.disposed.vars}   dyn ${a.before.dyn} -> ${a.after.dyn} -> ${a.disposed.dyn}`;
  console.log(`${FILE.split("/").pop()}  ${TEMPLATE}  (${result.templateSize} variables)\n`);
  console.log("cloneDataflow    ", brief(result.v1), JSON.stringify(result.v1.tally));
  console.log("cloneViaSandbox  ", brief(result.v2), JSON.stringify(result.v2.tally));
  if (result.v1.disposeError) console.log("  v1 dispose threw:", result.v1.disposeError);
  if (result.v2.disposeError) console.log("  v2 dispose threw:", result.v2.disposeError);
  console.log(`\ndifferences: ${result.diff.length}`);
  for (const d of result.diff)
    console.log(
      `  ${d.name}\n      cloneDataflow   ${d.cloneDataflow.state} ${d.cloneDataflow.error || d.cloneDataflow.kind || ""}\n      cloneViaSandbox ${d.cloneViaSandbox.state} ${d.cloneViaSandbox.error || d.cloneViaSandbox.kind || ""}`
    );
}
console.log("\npage errors:", pageErrors.length ? [...new Set(pageErrors)].slice(0, 6) : "none");
await browser.close();
