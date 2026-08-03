// Worker-safety classifier prototype.
//
// Two-stage, using machinery already inside every lopecode notebook:
//   1. dep list  (v._inputs)                  -> catches DOM-bound BUILTINS (md/html/DOM/width/Inputs/...)
//   2. acorn AST of v._definition.toString()  -> catches browser GLOBALS the Observable parser
//                                                whitelists out of `references` (window/document/...)
// The definition string is exactly what exporter-3's variableToDefinition already serialises.
import { chromium } from "playwright";

const nb = process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_belief-geometry.html";
const verbose = process.argv.includes("--verbose");

const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.goto("file://" + process.cwd() + "/" + nb);
await p.waitForFunction(() => !!window.__ojs_runtime && !!window.importShim, null, { timeout: 60000 });
// let the notebook settle so modules are instantiated
await p.waitForTimeout(4000);

const report = await p.evaluate(async () => {
  const tc = window.__ojs_runtime.module((await window.importShim("@tomlarkworthy/observablejs-toolchain")).default);
  const acorn = await tc.value("acorn");
  const walk = await tc.value("acorn_walk");
  // exporter-3 already knows how to name every live module — reuse it rather than guessing
  const ex3 = window.__ojs_runtime.module((await window.importShim("@tomlarkworthy/exporter-3")).default);
  const buildModuleNames = await ex3.value("buildModuleNames");
  const moduleNames = buildModuleNames(window.__ojs_runtime);

  // builtins that cannot exist in a worker (all DOM/view bound)
  const DOM_BUILTINS = new Set(["md", "html", "htl", "svg", "tex", "dot", "DOM", "width", "Inputs",
    "visibility", "FileAttachment", "Files", "now", "Plot", "d3", "Generators", "view", "viewof"]);
  // browser globals the Observable parser omits from cell.references
  const DOM_GLOBALS = new Set(["window", "document", "navigator", "location", "history", "screen",
    "localStorage", "sessionStorage", "Worker", "Element", "HTMLElement", "Node", "Event", "EventTarget",
    "CustomEvent", "MutationObserver", "IntersectionObserver", "ResizeObserver", "requestAnimationFrame",
    "cancelAnimationFrame", "getComputedStyle", "alert", "matchMedia", "DOMParser", "XMLSerializer",
    "Image", "Audio", "AudioContext", "webkitAudioContext", "customElements", "getSelection"]);
  // globals that DO exist in a worker — explicitly not disqualifying
  const WORKER_OK = new Set(["self", "globalThis", "fetch", "setTimeout", "clearTimeout", "setInterval",
    "clearInterval", "Blob", "URL", "TextEncoder", "TextDecoder", "OffscreenCanvas", "ImageData",
    "crypto", "performance", "structuredClone", "postMessage", "importScripts", "caches", "indexedDB",
    "DecompressionStream", "CompressionStream", "AbortController", "ReadableStream", "WritableStream"]);

  // Collect identifiers in value position (skip member .property and object keys), minus locally bound names.
  function analyse(src) {
    let ast;
    try {
      ast = acorn.Parser.parse("(" + src + ")", { ecmaVersion: "latest", allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true });
    } catch (e) {
      return { parseError: e.message, globals: [], bound: [] };
    }
    const bound = new Set();
    const used = new Set();
    walk.ancestor(ast, {
      Identifier(node, _st, ancestors) {
        const parent = ancestors[ancestors.length - 2];
        if (!parent) return;
        if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) return;
        if (parent.type === "Property" && parent.key === node && !parent.computed) return;
        if (parent.type === "MethodDefinition" && parent.key === node && !parent.computed) return;
        used.add(node.name);
      },
      VariableDeclarator(n) { collectPattern(n.id, bound); },
      FunctionDeclaration(n) { if (n.id) bound.add(n.id.name); n.params.forEach((q) => collectPattern(q, bound)); },
      FunctionExpression(n) { if (n.id) bound.add(n.id.name); n.params.forEach((q) => collectPattern(q, bound)); },
      ArrowFunctionExpression(n) { n.params.forEach((q) => collectPattern(q, bound)); },
      ClassDeclaration(n) { if (n.id) bound.add(n.id.name); },
      CatchClause(n) { if (n.param) collectPattern(n.param, bound); },
      ImportSpecifier(n) { bound.add(n.local.name); },
      ImportDefaultSpecifier(n) { bound.add(n.local.name); }
    });
    function collectPattern(node, out) {
      if (!node) return;
      if (node.type === "Identifier") out.add(node.name);
      else if (node.type === "ObjectPattern") node.properties.forEach((pr) => collectPattern(pr.value ?? pr.argument, out));
      else if (node.type === "ArrayPattern") node.elements.forEach((el) => collectPattern(el, out));
      else if (node.type === "AssignmentPattern") collectPattern(node.left, out);
      else if (node.type === "RestElement") collectPattern(node.argument, out);
    }
    return { globals: [...used].filter((n) => !bound.has(n)), bound: [...bound] };
  }

  const byModule = new Map();
  for (const v of window.__ojs_runtime._variables) {
    if (!v._name || v._type !== 1) continue;
    const modName = moduleNames.get(v._module)?.name ?? "anon";
    if (!byModule.has(v._module)) byModule.set(v._module, { name: modName, cells: [] });
    const deps = (v._inputs || []).map((i) => i._name).filter(Boolean);
    const src = String(v._definition);
    const a = analyse(src);
    const badBuiltins = deps.filter((d) => DOM_BUILTINS.has(d) || DOM_BUILTINS.has(String(d).replace(/^viewof /, "")));
    const badGlobals = a.globals.filter((g) => DOM_GLOBALS.has(g));
    const okGlobals = a.globals.filter((g) => WORKER_OK.has(g));
    const codeSafe = badBuiltins.length === 0 && badGlobals.length === 0 && !a.parseError;

    // stage 3: code-safety is not enough — the VALUES crossing the boundary must be
    // structured-cloneable. Check this cell's inputs (in) and its own value (out).
    const clonable = (x) => { try { structuredClone(x); return true; } catch { return false; } };
    let uncloneableIn = [], uncloneableOut = false;
    if (codeSafe) {
      uncloneableIn = (v._inputs || [])
        .filter((i) => i._name && i._value !== undefined && !clonable(i._value))
        .map((i) => `${i._name}:${typeof i._value === "function" ? "fn" : (i._value?.constructor?.name ?? typeof i._value)}`);
      uncloneableOut = v._value !== undefined && !clonable(v._value);
    }
    byModule.get(v._module).cells.push({
      v, inputVars: v._inputs || [],
      name: v._name, bytes: src.length, deps, badBuiltins, badGlobals, okGlobals,
      parseError: a.parseError, codeSafe, uncloneableIn, uncloneableOut,
      safe: codeSafe && uncloneableIn.length === 0 && !uncloneableOut
    });
  }
  // stage 4: THE CODE-SHIPPING RULE.
  // An input need not be cloneable if it is itself reconstructible in the worker — i.e. its
  // definition is code-safe and all *its* inputs are likewise satisfiable. That is exactly what
  // exporter-3's variableToDefinition/generate_module_source already emit for the whole runtime.
  // Fixpoint over the dependency graph.
  const all = [...byModule.values()].flatMap((m) => m.cells);
  const byVar = new Map(all.map((c) => [c.v, c]));
  const WORKER_PROVIDED = new Set(["self", "globalThis"]);
  let changed = true;
  for (const c of all) c.shippable = c.codeSafe; // optimistic seed
  while (changed) {
    changed = false;
    for (const c of all) {
      if (!c.shippable) continue;
      const ok = (c.inputVars || []).every((iv) => {
        const name = iv._name;
        if (name && WORKER_PROVIDED.has(name)) return true;
        if (iv._value !== undefined) { try { structuredClone(iv._value); return true; } catch { /* fall through */ } }
        const dep = byVar.get(iv);
        return dep ? dep.shippable : false;   // reconstructible via its definition?
      });
      if (!ok) { c.shippable = false; changed = true; }
    }
  }
  for (const c of all) { delete c.v; delete c.inputVars; }
  return [...byModule.values()].map((m) => ({ name: m.name, cells: m.cells }));
});

let tS = 0, tA = 0, tC = 0, tP = 0;
for (const mod of report.sort((x, y) => y.cells.length - x.cells.length)) {
  if (!mod.cells.length) continue;
  const safe = mod.cells.filter((c) => c.safe);
  const codeS = mod.cells.filter((c) => c.codeSafe);
  const ship = mod.cells.filter((c) => c.shippable);
  tS += safe.length; tA += mod.cells.length; tC += codeS.length; tP += ship.length;
  console.log(`${String(mod.name).padEnd(44)} code ${String(codeS.length).padStart(4)}  +clone-values ${String(safe.length).padStart(4)}  +code-shipping ${String(ship.length).padStart(4)}  / ${mod.cells.length}`);
  if (verbose) {
    for (const c of mod.cells) {
      const why = c.parseError ? "parse:" + c.parseError
        : [...c.badBuiltins.map((x) => "builtin:" + x), ...c.badGlobals.map((x) => "global:" + x),
           ...c.uncloneableIn.map((x) => "in!" + x), ...(c.uncloneableOut ? ["out!uncloneable"] : [])].join(" ");
      console.log(`    ${c.shippable ? "SHIP" : (c.safe ? "OK  " : (c.codeSafe ? "val " : "no  "))} ${String(c.name).slice(0, 34).padEnd(36)} ${String(c.bytes).padStart(6)}b  ${why}`);
    }
  }
}
console.log("-".repeat(80));
const pc = (n) => `${n}/${tA} (${((n / tA) * 100).toFixed(1)}%)`;
console.log(`code-safe only ............... ${pc(tC)}`);
console.log(`+ values must clone .......... ${pc(tS)}`);
console.log(`+ code-shipping for fn deps .. ${pc(tP)}   <- exporter-3 mechanism`);
await b.close();
