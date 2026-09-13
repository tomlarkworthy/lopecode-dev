// The display scenarios run in Chromium, inside the notebook that ships js-toolchain, against the
// headless notebook-kit reference arm. happy-dom is not a real DOM (`isDisplayable` tests
// `instanceof Element`), so this is the check that the shipped cells and the embedded runtime
// attachment behave the same in a page: defineCell, attachDisplay and runtime-sdk's observe all come
// from the notebook's own runtime, nkRuntime from its gzipped FileAttachment.
//
// A script, not a bun test: chromium.launch under `bun test` fails with EBADF from posix_spawn.
// run: bun tools/js-toolchain/runtime/display-browser-check.ts [notebook.html]
import { chromium } from "playwright";
import { resolve } from "node:path";
import { SCENARIOS, transpileText, referenceSnaps } from "./display-scenarios.ts";
import type { Scenario } from "./display-scenarios.ts";

const NOTEBOOK = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_notebook-kit.html");

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
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
await page.goto(`file://${NOTEBOOK}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => {
  const rt = (window as any).__ojs_runtime;
  return rt?.mains?.get?.("@tomlarkworthy/js-toolchain") &&
    [...rt._variables].some((v: any) => v._name === "module @tomlarkworthy/runtime-sdk" && v._value);
}, undefined, { timeout: 60000 });

async function pageSnaps(sc: Scenario, mode: "before" | "after") {
  const nodes = sc.nodes.map(transpileText);
  const steps = sc.steps.map((s) => ({ ...s, act: s.act ? s.act.toString() : undefined }));
  return page.evaluate(async ({ nodes, steps, mode }) => {
    const rt = (window as any).__ojs_runtime;
    const jt = rt.mains.get("@tomlarkworthy/js-toolchain");
    const [defineCell, attachDisplay, displayStateOf] = await Promise.all(
      ["defineCell", "attachDisplay", "displayStateOf"].map((n) => jt.value(n)));
    const sdk = [...rt._variables].find((v: any) => v._name === "module @tomlarkworthy/runtime-sdk")._value;
    const observe = await sdk.value("observe");
    const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
    const snap = (root: any) => [...root.childNodes].map((n: any) => (n.nodeType === 1 ? n.outerHTML : `#${n.nodeType}:${n.textContent}`));

    const m = rt.module();
    const pending = new Map<number, () => void>();
    let n = 1;
    const own: any[] = [m.variable().define("n", [], () => n), m.variable().define("gate", [], () => (k: number) => new Promise<void>((r) => pending.set(k, r)))];
    const nVar = own[0];
    const heads = new Map<number, any>();
    for (const d of nodes) {
      const vars = defineCell(m, { ...d, body: new Function(`return (${d.body})`)() });
      own.push(...vars);
      heads.set(d.id, vars[0]);
    }
    const roots = new Map([...heads].map(([id, v]) => [id, displayStateOf(v).root]));
    const detachers: any[] = [];
    const attach = () => { for (const v of heads.values()) detachers.push(attachDisplay(v, observe)); };
    if (mode === "before") attach();
    const out: string[][][] = [];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.n != null) { n = s.n; nVar.define("n", [], () => n); }
      if (s.resolve != null) pending.get(s.resolve)?.();
      if (s.act) new Function(`return (${s.act})`)()(roots);
      await settle();
      if (mode === "after" && i === steps.length - 1) attach();
      await settle();
      out.push(nodes.map((d: any) => snap(roots.get(d.id))));
    }
    for (const d of detachers) d?.();
    for (const v of own.reverse()) v.delete();
    return out;
  }, { nodes, steps, mode });
}

// display.ts:36-44 inspects a DocumentFragment, or a node attached elsewhere, rather than inserting
// it. The inspector then enumerates the host object's own properties, which are the DOM
// implementation's (happy-dom lists Symbol(listeners), Symbol(nodeArray), …; Chromium lists none), so
// an inspected DOM object is compared by its label only.
const DOM_LABEL = /^(\w*Element|DocumentFragment|Text|Comment|Node) \{$/;
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value !== "string" || !value.startsWith("<")) return value;
  const holder = document.createElement("div");
  holder.innerHTML = value;
  for (const a of holder.querySelectorAll("span.observablehq--inspect > a")) {
    // textContent carries the caret svg's whitespace before the label
    if (!DOM_LABEL.test((a.textContent ?? "").trim())) continue;
    while (a.nextSibling) a.nextSibling.remove();
    a.after("}");
  }
  return holder.innerHTML;
}

let pass = 0, fail = 0;
const check = (label: string, ours: unknown, ref: unknown) => {
  ours = normalize(ours);
  ref = normalize(ref);
  if (Bun.deepEquals(ours, ref)) { pass++; console.log(`(pass) ${label}`); return; }
  fail++;
  console.log(`(fail) ${label}\n  ours: ${JSON.stringify(ours)}\n  ref:  ${JSON.stringify(ref)}`);
};

for (const sc of SCENARIOS) {
  try {
    const ref = await referenceSnaps(sc);
    check(`${sc.name} / attach before first run`, await pageSnaps(sc, "before"), ref);
    check(`${sc.name} / attach after last step`, (await pageSnaps(sc, "after")).at(-1), ref.at(-1));
  } catch (e) {
    fail++;
    console.log(`(fail) ${sc.name}: ${e}`);
  }
}

const keys = await page.evaluate(async () => {
  const jt = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/js-toolchain");
  return Object.keys(await jt.value("nkRuntime")).sort();
});
check("nkRuntime from the embedded attachment exposes the vendored helpers", keys, ["Mutator", "clear", "display", "input", "observe"]);

console.log(`\n${pass} pass, ${fail} fail; page errors: ${pageErrors.length}${pageErrors.length ? "\n  " + [...new Set(pageErrors)].slice(0, 5).join("\n  ") : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
