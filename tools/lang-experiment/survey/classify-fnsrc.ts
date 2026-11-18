// Static SoundScript verdict for every source cell of every module in survey/src (one copy per module id,
// chosen by collect.ts). Generalises port-editor5/classify.ts: same verdicts (Y, H, N, P prose) and the same
// blocker vocabulary, split finer. Verdicts: P prose (body is one md`` template), I require()/import() loader,
// B blob (a line over 1000 chars), else Y/H/N from the blockers in BLOCKERS (any N-level blocker → N, else any
// H-level → H, else Y). Per cell, over the compiled function with acorn:
//   free names outside lite/intrinsics.ts ALLOWED_GLOBALS → DOM/TIMER/DATE/STORAGE/WEBAPI (fetch, console,
//     performance, Date.now, Math.random, expect, String.replace(fn) are counted as rewrites, not blockers);
//   runtime-sdk dependencies or _variables/_module/... members → RT;
//   DOM method names (appendChild, addEventListener, innerHTML, ...) → DOM;
//   htl/html/svg templates: tags outside the JSX vocabulary or events other than click/input/pointer → JSX;
//   class/this/new on a non-intrinsic → CLASS; writes to a dependency (or a local aliasing one) → MUT; writes to an
//     argument of a nested function → MUTARG; viewof x = Inputs.* → INPUTS (H);
//   a dependency from another language (import, stdlib, or a same-module cell that is itself N) whose value is not
//     data (by its defining cell's shape, or used as callee / method receiver with a non-builtin method name):
//     captured by the returned function or returned directly → FN (N); called at the top of the body → FNH (H);
//     a viewof element used bare or in a template hole → JSX. Verdicts are iterated to a fixpoint per module.
// Hand-checks against the real checker: probe-*.ts / probe-*.out. Agreement with port-editor5 hand labels:
// confusion-editor5.ts.
//
//   bun classify.ts                 # writes cells.jsonl + modules.json, prints corpus totals
//   bun classify.ts --module <id>   # one module, cell by cell
//   bun classify.ts --file <path> <id>
//   bun summary.ts --top            # corpus totals, blockers, ranking (summary.out)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { ALLOWED_GLOBALS, CAPABILITIES, PRELUDE_FNS, INTRINSIC_DECLS } from "../lite/intrinsics.ts";
import { extract, type RawCell } from "./extract.ts";

// Blocker → level. N: the cell cannot be SoundScript. H: SoundScript with an Observable JavaScript helper cell
// at the boundary that turns the foreign value into data (or keeps a widget and hands over its State).
export const BLOCKERS: Record<string, { level: "N" | "H"; what: string }> = {
  RT: { level: "N", what: "reads or writes the Runtime/modules/variables (runtime-sdk, _variables, define/redefine, importShim)" },
  DOM: { level: "N", what: "DOM globals or imperative DOM (document, window, addEventListener, appendChild, innerHTML, style, Generators.observe/input)" },
  TIMER: { level: "N", what: "setTimeout/setInterval/requestAnimationFrame/Promises.delay|tick|when: no timer capability" },
  DATE: { level: "N", what: "new Date / Date methods other than Date.now, Intl: Date is a free name" },
  STORAGE: { level: "N", what: "localStorage/sessionStorage/indexedDB/caches" },
  WEBAPI: { level: "N", what: "other browser/JS globals not in the allowlist (crypto, Blob, Worker, WeakMap, Proxy, Reflect, Function, eval, ...)" },
  CLASS: { level: "N", what: "class, `this`, or `new` on a non-intrinsic constructor" },
  MUTARG: { level: "N", what: "writes into an argument of a nested function (in-place helpers, accumulators, emulator or matrix state); rejected as written, expressible only after restructuring: a first-level Mut<T> parameter (probe G1) or returning new values (L3b, G2b); deep writes stay rejected (mut-deep-write)" },
  MUT: { level: "N", what: "writes or mutating methods on a value it does not own (a dependency, a global), or a cell whose value another cell mutates" },
  JSX: { level: "N", what: "view needs an element/attribute/event the JSX vocabulary lacks, embeds a foreign DOM node, or uses markdown/htl in a non-prose cell" },
  LIB: { level: "N", what: "renders or computes through a JS library object (d3, Plot, THREE, CodeMirror, require()'d module) inside the cell's returned value" },
  FN: { level: "N", what: "a function/class instance from another language is captured in the function this cell returns (boundary passes data only)" },
  FNH: { level: "H", what: "calls a function from another language at the top of its body; an OJS helper can make the call and pass data" },
  FILE: { level: "H", what: "FileAttachment: an OJS helper reads the attachment and passes data" },
  INPUTS: { level: "H", what: "viewof x = Inputs.*: the widget stays an OJS cell, SoundScript takes x or x: State<T>" },
  BUILTIN: { level: "H", what: "reads an Observable stdlib data builtin (width, visibility): an OJS helper cell passes it" },
};
const N_ORDER = ["RT", "DOM", "MUT", "CLASS", "LIB", "JSX", "STORAGE", "WEBAPI", "TIMER", "DATE", "FN", "MUTARG"];
const H_ORDER = ["FNH", "FILE", "INPUTS", "BUILTIN"];

const DOM_GLOBALS = new Set("document window location history navigator alert confirm prompt HTMLElement Element Node NodeFilter Event CustomEvent KeyboardEvent MouseEvent PointerEvent MutationObserver ResizeObserver IntersectionObserver getComputedStyle customElements DOMParser XMLSerializer Image Audio devicePixelRatio innerWidth innerHeight screen getSelection HTMLCanvasElement SVGElement DocumentFragment Range FontFace matchMedia scrollTo open close postMessage parent top frames ShadowRoot HTMLInputElement HTMLTextAreaElement CSS CSSStyleSheet ClipboardItem DragEvent DataTransfer".split(" "));
const TIMER_GLOBALS = new Set("setTimeout setInterval clearTimeout clearInterval requestAnimationFrame cancelAnimationFrame requestIdleCallback queueMicrotask".split(" "));
const STORAGE_GLOBALS = new Set("localStorage sessionStorage indexedDB caches IDBKeyRange".split(" "));
const REWRITE_GLOBALS = new Set(["fetch", "console", "performance"]); // → capabilities fetch / log / now
const WEBAPI_GLOBALS = new Set("globalThis self Response Request Headers FormData Blob File FileReader AbortController AbortSignal WebSocket Worker SharedWorker BroadcastChannel MessageChannel EventSource EventTarget CompressionStream DecompressionStream ReadableStream WritableStream TransformStream XMLHttpRequest crypto Crypto WeakMap WeakSet WeakRef FinalizationRegistry Proxy Reflect Function eval AudioContext OfflineAudioContext OffscreenCanvas ImageData ImageBitmap createImageBitmap WebAssembly Atomics SharedArrayBuffer DataView BigInt64Array BigUint64Array Intl SpeechSynthesisUtterance speechSynthesis ImageCapture MediaRecorder MediaStream Notification TextDecoderStream TextEncoderStream Text Comment".split(" "));
const isKnownGlobal = (g: string) => ALLOWED_GLOBALS.has(g) || DOM_GLOBALS.has(g) || TIMER_GLOBALS.has(g) || STORAGE_GLOBALS.has(g) || REWRITE_GLOBALS.has(g) || WEBAPI_GLOBALS.has(g) || g === "Date" || /^(HTML|SVG)\w*Element$|Event$/.test(g);
const DOM_MEMBERS = new Set("appendChild append prepend removeChild replaceChildren replaceWith insertBefore insertAdjacentHTML insertAdjacentElement addEventListener removeEventListener querySelector querySelectorAll getElementById getElementsByClassName getElementsByTagName createElement createElementNS createTextNode setAttribute removeAttribute getAttribute classList innerHTML outerHTML textContent innerText getContext getBoundingClientRect focus blur click scrollIntoView closest parentElement parentNode firstChild lastChild nextSibling children childNodes cloneNode attachShadow shadowRoot dataset offsetWidth offsetHeight clientWidth clientHeight scrollTop setPointerCapture releasePointerCapture preventDefault stopPropagation".split(" "));
const RT_MEMBERS = new Set("_variables _module _runtime _definition _inputs _outputs _observer _scope _name _value _builtin _modules redefine _resolve _computeNow _compute _precompute _reachable _invalidate".split(" "));
const RT_DEPS = new Set("runtime main thisModule observe onCodeChange realize runtime_variables variables importShim lookupVariable modules moduleMap currentModules unorderedSync keepalive cellMap module_definitions viewof_runtime __ojs_runtime __ojs_observer".split(" "));
const TEMPLATE_LIBS = new Set(["htl", "html", "svg", "md", "tex", "dot", "mermaid", "DOM"]);
const LIBS = new Set(["d3", "Plot", "vl", "THREE", "L", "topojson", "_", "Arrow", "aq", "Inputs", "require", "Files", "SQLite", "DuckDBClient", "katex", "mapboxgl", "echarts", "Chart", "cm", "CodeMirror", "view", "Generators", "Promises", "FileAttachment", "Mutable", "visibility", "width", "now", "invalidation"]);
const JSX_TAGS = new Set("div span p label strong fieldset legend output button input canvas".split(" "));
const JSX_EVENTS = new Set(["onclick", "oninput", "onpointerdown", "onpointermove", "onpointerup", "onpointercancel"]);

// method names the checker's intrinsics declare; a builtin method outside the set is [unsupported]
const INTRINSIC_MEMBERS = new Set([...INTRINSIC_DECLS.matchAll(/(?:^|[\s;{])(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*[(<:]/g)].map((m) => m[1]));
const BUILTIN_METHODS = new Set<string>();
for (const o of [Array, Array.prototype, String, String.prototype, Object, Promise, Promise.prototype, Map.prototype, Set.prototype, Number, Number.prototype, Math, JSON, RegExp.prototype, Uint8Array.prototype])
  for (const k of Object.getOwnPropertyNames(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d && typeof d.value === "function" && k !== "constructor") BUILTIN_METHODS.add(k); }
const UNSUPPORTED = new Set([...BUILTIN_METHODS].filter((m) => !INTRINSIC_MEMBERS.has(m) && !["toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "constructor"].includes(m)).concat(["toLocaleString", "hasOwnProperty"]));

type Kind = "data" | "function" | "dom" | "instance" | "mapset" | "library" | "unknown";
export type Cell = {
  module: string; name: string; pid: number; lines: number; literal?: boolean; verdict: "Y" | "H" | "N" | "P" | "I";
  blockers: string[]; primary: string | null; kind: Kind; unsupported: string[]; deps: string[]; rewrites: string[];
};

const lineCount = (s: string) => s.split("\n").length;
const baseName = (d: string) => d.replace(/^(viewof|mutable|initial) /, "");

// ---------- per-cell static facts ----------
type Facts = {
  free: Set<string>; memberNames: Set<string>; hasThis: boolean; hasClass: boolean;
  newCallees: string[]; returnsFn: boolean; returnsDom: boolean; returnsNew: string | null; isProse: boolean;
  depRefs: Map<string, { top: boolean; nested: boolean; inReturnedFn: boolean; written: boolean; asCallee: boolean; inTemplateHole: boolean; viewWrite: boolean }>;
  mutatedRoots: Set<string>; tags: Set<string>; attrs: Set<string>; methodCalls: Set<string>; dateNonNow: boolean;
  promisesUse: Set<string>; generatorsUse: Set<string>; templates: Set<string>;
};

export function facts(cell: RawCell): Facts {
  const fn = cell.node;
  const params = cell.params;
  const declared = new Set<string>(params);
  const f: Facts = {
    free: new Set(), memberNames: new Set(), hasThis: false, hasClass: false, newCallees: [], returnsFn: false, returnsDom: false,
    returnsNew: null, isProse: false, depRefs: new Map(), mutatedRoots: new Set(), tags: new Set(), attrs: new Set(), methodCalls: new Set(),
    dateNonNow: false, promisesUse: new Set(), generatorsUse: new Set(), templates: new Set(),
  };
  // declarations anywhere in the body (flat scope approximation)
  walk.full(fn.body, (n: any) => {
    if (n.type === "VariableDeclarator") collectPat(n.id, declared);
    else if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression")) { if (n.id) declared.add(n.id.name); n.params.forEach((p: any) => collectPat(p, declared)); }
    else if (n.type === "CatchClause" && n.param) collectPat(n.param, declared);
    else if (n.type === "ClassDeclaration" && n.id) declared.add(n.id.name);
  });
  for (const p of params) f.depRefs.set(p, { top: false, nested: false, inReturnedFn: false, written: false, asCallee: false, inTemplateHole: false, viewWrite: false });
  // returned expressions of the cell (top-level returns only, or concise body)
  const returns: any[] = [];
  if (fn.body.type !== "BlockStatement") returns.push(fn.body);
  else walk.recursive(fn.body, null, {
    Function() { /* do not descend */ },
    ReturnStatement(n: any) { if (n.argument) returns.push(n.argument); },
  } as any);
  const isFnNode = (n: any) => n && /Function/.test(n.type);
  const unparen = (n: any) => n?.type === "ParenthesizedExpression" ? n.expression : n;
  const returnedFns = new Set<any>();
  for (let r of returns) {
    r = unparen(r);
    if (isFnNode(r)) { f.returnsFn = true; returnedFns.add(r); }
    if (r?.type === "ObjectExpression" && r.properties.some((p: any) => isFnNode(p.value) || p.method)) { f.returnsFn = true; r.properties.forEach((p: any) => isFnNode(p.value) && returnedFns.add(p.value)); }
    if (r?.type === "Identifier") { /* returning a local: look it up */
      walk.full(fn.body, (n: any) => { if (n.type === "VariableDeclarator" && n.id?.name === r.name && isFnNode(n.init)) { f.returnsFn = true; returnedFns.add(n.init); } if (n.type === "FunctionDeclaration" && n.id?.name === r.name) { f.returnsFn = true; returnedFns.add(n); } });
    }
    if (r?.type === "NewExpression" && r.callee.type === "Identifier") f.returnsNew = r.callee.name;
    { let x = r; if (x?.type === "AwaitExpression") x = unparen(x.argument); if (x?.type === "CallExpression" || x?.type === "NewExpression") { const root = calleeRoot(x.callee); if (root) (f as any).returnsCallOf = [...((f as any).returnsCallOf ?? []), root]; } }
    if (r?.type === "TaggedTemplateExpression") { const t = tagName(r.tag); if (t && TEMPLATE_LIBS.has(t)) f.returnsDom = true; }
    if (r?.type === "CallExpression") { const c = calleeRoot(r.callee); if (c && (TEMPLATE_LIBS.has(c) || c === "Inputs" || c === "Plot" || c === "DOM")) f.returnsDom = true; }
  }
  // literal data: the cell's only value is a literal (strings, numbers, arrays/objects/Maps of them)
  { const lit = (x: any): boolean => { x = unparen(x); if (!x) return false;
      switch (x.type) {
        case "Literal": return true;
        case "TemplateLiteral": return x.expressions.every(lit);
        case "ArrayExpression": return x.elements.every((e: any) => e && lit(e));
        case "ObjectExpression": return x.properties.every((p: any) => (p.type === "SpreadElement" && lit(p.argument)) || (p.type === "Property" && !p.computed && !p.method && lit(p.value)));
        case "UnaryExpression": return lit(x.argument);
        case "Identifier": return true; // a reference to another cell's data, e.g. SHIPS in MISSIONS
        case "MemberExpression": return !x.computed && lit(x.object);
        case "SpreadElement": return lit(x.argument);
        case "CallExpression": return x.callee.type === "MemberExpression" && !x.callee.computed && x.callee.property.name === "join" && lit(x.callee.object) && x.arguments.every(lit);
        case "NewExpression": return x.callee.type === "Identifier" && ["Map", "Set"].includes(x.callee.name) && x.arguments.every(lit);
        default: return false; } };
    const body = fn.body.type !== "BlockStatement" ? fn.body : (fn.body.body.length === 1 && fn.body.body[0].type === "ReturnStatement" ? fn.body.body[0].argument : null);
    // or a table: at least 90% of its syntax nodes (and 100+ of them) are literals, properties, arrays and objects
    let all = 0, data = 0; walk.full(fn.body, (x: any) => { all++; if (["Literal", "Property", "ArrayExpression", "ObjectExpression", "UnaryExpression", "TemplateElement", "TemplateLiteral"].includes(x.type)) data++; });
    (f as any).literal = (!!body && lit(body)) || (all >= 100 && data / all >= 0.9); }
  // prose: the whole body is one md`` template (any interpolation)
  const only = fn.body.type !== "BlockStatement" ? unparen(fn.body) : (fn.body.body.length === 1 && fn.body.body[0].type === "ReturnStatement" ? unparen(fn.body.body[0].argument) : null);
  if (only?.type === "TaggedTemplateExpression" && ["md", "tex"].includes(tagName(only.tag) ?? "")) f.isProse = true;

  // values a cell does not own: its own parameters (dependencies) and the parameters of nested functions
  // (arguments its returned function is called with), plus locals bound from member chains of them.
  const fromDep = new Set<string>(params), fromArg = new Set<string>();
  walk.full(fn.body, (n: any) => { if (isFnNode(n)) n.params.forEach((p: any) => collectPat(p, fromArg)); });
  for (const p of params) fromArg.delete(p);
  const isAliasInit = (x: any) => { x = unparen(x); if (x?.type === "ChainExpression") x = x.expression; return x?.type === "Identifier" || x?.type === "MemberExpression" || (x?.type === "LogicalExpression"); };
  for (let pass = 0; pass < 3; pass++) walk.full(fn.body, (n: any) => {
    const bind = (id: any, init: any) => { const root = calleeRoot(init?.type === "LogicalExpression" ? init.left : init); if (!root) return; const out = new Set<string>(); collectPat(id, out); for (const o of out) { if (fromDep.has(root)) fromDep.add(o); else if (fromArg.has(root)) fromArg.add(o); } };
    if (n.type === "VariableDeclarator" && n.init && isAliasInit(n.init)) bind(n.id, n.init);
    if ((n.type === "ForOfStatement" || n.type === "ForInStatement") && n.left.type === "VariableDeclaration" && n.type === "ForOfStatement") bind(n.left.declarations[0].id, n.right);
  });
  (f as any).fromDep = fromDep; (f as any).fromArg = fromArg;
  if ([...f.memberNames].length === 0) { /* filled below */ }

  // ancestor walk for references
  walk.fullAncestor(fn.body, (n: any, _st: any, anc: any[]) => {
    const parent = anc[anc.length - 2];
    if (n.type === "ThisExpression") f.hasThis = true;
    if (n.type === "ClassDeclaration" || n.type === "ClassExpression") f.hasClass = true;
    if (n.type === "NewExpression") f.newCallees.push(n.callee.type === "Identifier" ? n.callee.name : n.callee.type === "MemberExpression" ? (calleeRoot(n.callee) ?? "?") + ".x" : "?");
    if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier") {
      f.memberNames.add(n.property.name);
      if (parent?.type === "CallExpression" && parent.callee === n) f.methodCalls.add(n.property.name);
      const root = calleeRoot(n);
      if (root === "Date" && n.property.name !== "now") f.dateNonNow = true;
      if (root === "Math" && n.property.name === "random") (f as any).mathRandom = true;
      if ((n.property.name === "replace" || n.property.name === "replaceAll") && parent?.type === "CallExpression" && parent.callee === n && isFnNode(parent.arguments[1])) (f as any).replaceFn = true;
      if (root === "Promises") f.promisesUse.add(n.property.name);
      if (root === "Generators") f.generatorsUse.add(n.property.name);
    }
    if (n.type === "TaggedTemplateExpression") {
      const t = tagName(n.tag); if (t) f.templates.add(t);
      if (t && ["htl", "html", "svg"].includes(t)) for (const q of n.quasi.quasis) scanHtml(q.value.cooked ?? q.value.raw, f);
    }
    // writes
    if ((n.type === "AssignmentExpression" && n.left.type === "MemberExpression") || (n.type === "UpdateExpression" && n.argument.type === "MemberExpression")) {
      const root = memberRoot(n.type === "AssignmentExpression" ? n.left : n.argument);
      if (root) f.mutatedRoots.add(root);
    }
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && !n.callee.computed) {
      const m = n.callee.property.name;
      if (/^(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|delete|clear|add)$/.test(m)) {
        const root = memberRoot(n.callee.object); if (root) f.mutatedRoots.add(root);
      }
      if (m === "dispatchEvent") { const root = memberRoot(n.callee.object); if (root) f.mutatedRoots.add(root); }
    }
    if (n.type === "UnaryExpression" && n.operator === "delete" && n.argument.type === "MemberExpression") { const root = memberRoot(n.argument); if (root) f.mutatedRoots.add(root); }
    if (n.type !== "Identifier") return;
    // is this a reference?
    if (parent?.type === "MemberExpression" && parent.property === n && !parent.computed) return;
    if ((parent?.type === "Property" || parent?.type === "MethodDefinition" || parent?.type === "PropertyDefinition") && parent.key === n && !parent.computed && !(parent.shorthand)) return;
    if (parent?.type === "LabeledStatement" || parent?.type === "BreakStatement" || parent?.type === "ContinueStatement") return;
    const name = n.name;
    const fnsAbove = anc.slice(0, -1).filter(isFnNode);
    if (f.depRefs.has(name)) {
      const r = f.depRefs.get(name)!;
      if (fnsAbove.length === 0) r.top = true; else r.nested = true;
      if (fnsAbove.some((x) => returnedFns.has(x))) r.inReturnedFn = true;
      if ((parent?.type === "CallExpression" || parent?.type === "NewExpression") && parent.callee === n) r.asCallee = true;
      // dep.a.b(...) where b is not a builtin method: the dep is used as an object with methods
      { let k = anc.length - 2, top: any = n; const path: string[] = [];
        while (k >= 0 && anc[k].type === "MemberExpression" && anc[k].object === top) { path.push(anc[k].computed ? "[]" : anc[k].property.name); top = anc[k]; k--; }
        const call = anc[k];
        if (path.length && call && (call.type === "CallExpression" || call.type === "NewExpression") && call.callee === top) {
          const m = path[path.length - 1];
          if (call.type === "NewExpression" || !(BUILTIN_METHODS.has(m) || INTRINSIC_MEMBERS.has(m))) (r as any).methodUse = [...((r as any).methodUse ?? []), m];
        }
        if (path.length === 1 && path[0] === "value" && anc[k]?.type === "AssignmentExpression" && anc[k].left === top) r.viewWrite = true;
      }
      if (anc.some((a) => a.type === "TemplateLiteral" && a.expressions.includes(n)) ) r.inTemplateHole = true;
      if (!(parent?.type === "MemberExpression" && parent.object === n) && !(parent?.type === "CallExpression" && parent.callee === n)) (r as any).bare = true;
    } else if (!declared.has(name)) f.free.add(name);
  });
  return f;
}

function collectPat(p: any, out: Set<string>) {
  if (!p) return;
  if (p.type === "Identifier") out.add(p.name);
  else if (p.type === "ObjectPattern") p.properties.forEach((q: any) => collectPat(q.type === "RestElement" ? q.argument : q.value, out));
  else if (p.type === "ArrayPattern") p.elements.forEach((q: any) => collectPat(q, out));
  else if (p.type === "RestElement") collectPat(p.argument, out);
  else if (p.type === "AssignmentPattern") collectPat(p.left, out);
}
// root of a pure member chain (a.b[c].d); null when the chain passes through a call, whose result is not the root's
function memberRoot(n: any): string | null {
  while (n && (n.type === "MemberExpression" || n.type === "ChainExpression" || n.type === "ParenthesizedExpression")) n = n.type === "MemberExpression" ? n.object : n.expression;
  return n?.type === "Identifier" ? n.name : null;
}
function calleeRoot(n: any): string | null {
  while (n && (n.type === "MemberExpression" || n.type === "CallExpression" || n.type === "ChainExpression")) n = n.type === "MemberExpression" ? n.object : n.type === "CallExpression" ? n.callee : n.expression;
  return n?.type === "Identifier" ? n.name : null;
}
function tagName(t: any): string | null {
  if (t.type === "Identifier") return t.name;
  if (t.type === "MemberExpression") return calleeRoot(t);
  return null;
}
function scanHtml(s: string, f: Facts) {
  for (const m of s.matchAll(/<([a-zA-Z][\w-]*)/g)) f.tags.add(m[1].toLowerCase());
  for (const m of s.matchAll(/\s(on[a-z]+)\s*=/g)) f.attrs.add(m[1].toLowerCase());
}

// ---------- module classification with a fixpoint over the intra-module graph ----------
type Mod = { id: string; cells: (RawCell & { f?: Facts })[]; imports: RawCell[] };
const KIND_FOR_STDLIB: Record<string, Kind> = { md: "library", htl: "library", html: "library", svg: "library", tex: "library", DOM: "library", Inputs: "library", Plot: "library", d3: "library", require: "library", Files: "library", Generators: "library", Promises: "library", FileAttachment: "library", Mutable: "library", width: "data", now: "data", invalidation: "data", visibility: "function" };

export function cellKind(c: RawCell, f: Facts): Kind {
  if (f.isProse || f.returnsDom) return "dom";
  if (f.returnsFn || f.hasClass) return "function";
  if (f.returnsNew === "Map" || f.returnsNew === "Set") return "mapset";
  if (f.returnsNew && !ALLOWED_GLOBALS.has(f.returnsNew)) return "instance";
  const body = c.src;
  if (/^\s*(async\s+)?function[^{]*\{\s*return\s*\(?\s*(require|import)\(/.test(body) || /\breturn\s*\(\s*\n?\s*(require|import)\(/.test(body)) return "library";
  if (c.name?.startsWith("viewof ")) return "dom";
  return "data";
}

export function classifyModule(id: string, raw: RawCell[], importKind: (from: string, name: string) => Kind): Cell[] {
  const cells = raw.filter((c) => c.kind === "cell").map((c) => ({ ...c, f: facts(c) }));
  const localNames = new Map<string, number>();
  cells.forEach((c, i) => { if (c.name) { localNames.set(c.name, i); localNames.set(baseName(c.name), localNames.get(baseName(c.name)) ?? i); } });
  const imports = new Map<string, RawCell>(); for (const c of raw) if (c.kind === "import" && c.name) imports.set(c.name, c);
  const kinds = cells.map((c) => cellKind(c, c.f));
  // require()/import() loaders are library loads: counted with imports
  const isLoader = cells.map((c) => kinds[cells.indexOf(c)] === "library");
  let verdict: string[] = cells.map(() => "Y");
  let result: Cell[] = [];
  // a mutable value written by some other cell: cache owners are MUT
  const mutatedLocal = new Set<number>();
  cells.forEach((c) => {
    c.deps.forEach((d, i) => {
      const p = c.params[i];
      if (p && c.f.mutatedRoots.has(p) && !d.startsWith("viewof ") && !d.startsWith("mutable ")) { const j = localNames.get(d); if (j !== undefined) mutatedLocal.add(j); }
    });
  });
  for (let iter = 0; iter < 20; iter++) {
    result = cells.map((c, i) => classifyOne(id, c, i));
    const next = result.map((r) => r.verdict);
    if (next.every((v, i) => v === verdict[i])) break;
    verdict = next;
  }
  return result;

  function depKind(d: string): { kind: Kind; ss: boolean; source: string } {
    if (d.startsWith("viewof ")) { const j = localNames.get(d); return { kind: "dom", ss: j !== undefined && verdict[j] !== "N" && verdict[j] !== "P", source: "local" }; }
    if (d.startsWith("mutable ")) return { kind: "data", ss: true, source: "local" };
    const j = cells.findIndex((c) => c.name === d || (c.name === "initial " + d));
    if (j >= 0) return { kind: kinds[j], ss: verdict[j] === "Y" || verdict[j] === "H", source: "local" };
    const vj = cells.findIndex((c) => c.name === "viewof " + d);
    if (vj >= 0) return { kind: "data", ss: true, source: "local" };
    const imp = imports.get(d);
    if (imp) return { kind: importKind(imp.importFrom!, imp.importName!), ss: false, source: "import" };
    if (d in KIND_FOR_STDLIB) return { kind: KIND_FOR_STDLIB[d], ss: false, source: "stdlib" };
    if (d in CAPABILITIES) return { kind: "data", ss: true, source: "cap" };
    if (["_", "vl", "aq", "L", "topojson", "mermaid", "dot", "katex", "Arrow", "THREE"].includes(d)) return { kind: "library", ss: false, source: "stdlib-lib" };
    return { kind: "unknown", ss: false, source: "unresolved" };
  }

  function classifyOne(module: string, c: RawCell & { f: Facts }, idx: number): Cell {
    const f = c.f;
    const lines = lineCount(c.src);
    const name = c.name ?? "(anon)";
    const base: Omit<Cell, "verdict" | "blockers" | "primary"> = { module, name, pid: idx, lines, kind: kinds[idx], unsupported: [], deps: c.deps, rewrites: [], literal: (f as any).literal };
    if (f.isProse) return { ...base, verdict: "P", blockers: [], primary: null };
    // embedded minified code or a data blob: not hand-written cell code, counted apart
    if (c.src.split("\n").some((l) => l.length > 1000)) return { ...base, verdict: "B" as any, blockers: [], primary: null };
    if (isLoader[idx] && (/(require|import)\(/.test(c.src)) && lines <= 6) return { ...base, verdict: "I", blockers: [], primary: null };
    const B = new Set<string>();
    const rw = new Set<string>();
    // runtime
    if (c.deps.some((d) => RT_DEPS.has(d)) || [...f.memberNames].some((m) => RT_MEMBERS.has(m)) || f.free.has("__ojs_runtime")) B.add("RT");
    if ((f.methodCalls.has("define") || f.methodCalls.has("variable") || f.methodCalls.has("module")) && c.deps.some((d) => /runtime|module|main/.test(d))) B.add("RT");
    // free names, and dependencies that name a global rather than a cell (the compiler passes some globals,
    // e.g. location, Event, Response, as cell inputs)
    const globalDeps = c.deps.filter((d, i) => c.params[i] && depKind(d).source === "unresolved" && isKnownGlobal(d) && (f.depRefs.get(c.params[i])?.top || f.depRefs.get(c.params[i])?.nested));
    const globalAs = new Map<string, string>(); c.deps.forEach((d, i) => { if (globalDeps.includes(d)) globalAs.set(c.params[i], d); });
    for (const g of [...f.free, ...globalDeps]) {
      if (ALLOWED_GLOBALS.has(g) || PRELUDE_FNS.has(g)) continue;
      if (REWRITE_GLOBALS.has(g)) { rw.add(g); continue; }
      if (g === "Date") { if (f.dateNonNow || f.newCallees.includes("Date")) B.add("DATE"); else rw.add("Date.now"); continue; }
      if (g === "Intl") { B.add("DATE"); continue; }
      if (DOM_GLOBALS.has(g) || /^(HTML|SVG)\w*Element$|Event$/.test(g)) B.add("DOM");
      else if (TIMER_GLOBALS.has(g)) B.add("TIMER");
      else if (STORAGE_GLOBALS.has(g)) B.add("STORAGE");
      else if (g === "globalThis" || g === "self") B.add("WEBAPI");
      else B.add("WEBAPI");
    }
    if ([...f.methodCalls].some((m) => DOM_MEMBERS.has(m)) || [...f.memberNames].some((m) => ["innerHTML", "classList", "style", "textContent", "dataset"].includes(m) && f.mutatedRoots.size > 0)) {
      // writes to a viewof are the state idiom, not DOM
      const viewOnly = [...f.methodCalls].filter((m) => DOM_MEMBERS.has(m)).every((m) => m === "dispatchEvent");
      if (!viewOnly) B.add("DOM");
    }
    if (f.generatorsUse.size) B.add([...f.generatorsUse].every((g) => g === "queue" || g === "observe" || g === "input" || g === "disposable") ? "DOM" : "TIMER");
    if (f.promisesUse.size) B.add("TIMER");
    if (f.hasClass || f.hasThis) B.add("CLASS");
    for (const n of f.newCallees) { const r = n.replace(/\.x$/, ""); if (!ALLOWED_GLOBALS.has(r) && r !== "Date" && !DOM_GLOBALS.has(r)) { if (c.params.includes(r) || n.endsWith(".x") || !f.free.has(r)) B.add("CLASS"); } }
    // mutation of a dependency
    c.deps.forEach((d, i) => {
      const p = c.params[i]; if (!p || !f.mutatedRoots.has(p)) return;
      if (d.startsWith("mutable ")) return; // mutable x = ... → action
      if (d.startsWith("viewof ")) return; // State<T> writes (S11.7), judged with the dependencies below
      B.add("MUT");
    });
    for (const g of f.mutatedRoots) if (f.free.has(g) && !ALLOWED_GLOBALS.has(g)) B.add(DOM_GLOBALS.has(g) ? "DOM" : "MUT");
    for (const g of f.mutatedRoots) {
      if (c.params.includes(g)) continue; // judged per dependency above
      if ((f as any).fromDep.has(g)) B.add("MUT");
      else if ((f as any).fromArg.has(g)) B.add("MUTARG");
    }
    if (mutatedLocal.has(idx)) B.add("MUT");
    // templates / views
    const usesTpl = [...f.templates].some((t) => ["htl", "html", "svg"].includes(t));
    if ([...f.templates].some((t) => ["md", "tex", "dot", "mermaid"].includes(t))) B.add("JSX");
    if (usesTpl) {
      const badTag = [...f.tags].some((t) => !JSX_TAGS.has(t));
      const badEvt = [...f.attrs].some((a) => !JSX_EVENTS.has(a));
      if (badTag || badEvt || f.templates.has("svg")) B.add("JSX");
    }
    // viewof x = Inputs.*(...) with no hand-built DOM: the widget stays an OJS helper cell
    if (c.name?.startsWith("viewof ") && /\bInputs\.\w+\(/.test(c.src) && !usesTpl) B.add("INPUTS");
    const T: any[] = [];
    // dependencies from another language
    c.deps.forEach((d, i) => {
      const p = c.params[i]; if (!p) return;
      const r = f.depRefs.get(p); if (!r || (!r.top && !r.nested)) return;
      const k = depKind(d); const addF = (x: string) => { B.add(x); if (x === "FN" || x === "FNH") T.push({ dep: d, b: x, kind: k.kind, source: k.source }); };
      if (d === "width" || d === "visibility") { addF("BUILTIN"); return; }
      if (d === "now") { rw.add("now"); return; }
      if (d === "invalidation") return;
      if (d === "expect") { rw.add("expect"); return; } // testing's expect(x).toBe(y): rewritten as a throw (probe E1b)
      if (d === "FileAttachment") { addF(r.inReturnedFn ? "FN" : "FILE"); return; }
      if (d === "Inputs") { if (!c.name?.startsWith("viewof ")) addF("JSX"); return; }
      if (["htl", "html", "svg"].includes(d)) return; // judged by tag vocabulary above
      if (["md", "tex", "DOM"].includes(d)) { addF("JSX"); return; }
      if (["Generators", "Promises", "Mutable"].includes(d)) return; // judged above
      const methodUse: string[] = (r as any).methodUse ?? [];
      if (d.startsWith("viewof ")) {
        // S11.7: an OJS viewof is taken as State<T>; .value reads/writes and dispatchEvent are the state idiom
        if (r.inTemplateHole || (r as any).bare) { addF("JSX"); return; }
        const foreign = methodUse.filter((m) => m !== "dispatchEvent");
        if (foreign.length) { addF(r.inReturnedFn ? "FN" : "FNH"); return; }
        if (r.viewWrite && !r.nested) rw.add("write-in-body");
        return;
      }
      if (k.ss) return; // SoundScript to SoundScript: functions and instances may pass
      if (globalAs.has(p)) return; // a global passed as an input: judged with the free names
      if (k.source === "stdlib-lib") { addF("LIB"); return; }
      if (k.kind === "dom") { addF("JSX"); return; }
      if ((k.kind === "data" || k.kind === "unknown") && !r.asCallee && !methodUse.length) return;
      if (k.kind === "library") { if (d === "d3" || d === "Plot" || r.inReturnedFn || f.returnsDom) addF("LIB"); else addF("FNH"); return; }
      // function / instance / mapset / unknown
      if (r.inReturnedFn) addF("FN");
      else if (((f as any).returnsCallOf ?? []).includes(p)) addF("FN"); // the cell's value is the foreign call's result: a wrapper, nothing to port
      else if (f.returnsDom && r.inTemplateHole) addF("JSX");
      else if (k.kind === "unknown" && k.source === "unresolved") addF("FNH");
      else addF("FNH");
    });
    for (const m of f.methodCalls) if (UNSUPPORTED.has(m)) base.unsupported.push(m);
    if ((f as any).mathRandom) rw.add("Math.random");
    if ((f as any).replaceFn) rw.add("replace-fn");
    base.rewrites = [...rw];
    const blockers = [...B];
    const nB = N_ORDER.filter((b) => B.has(b));
    const hB = H_ORDER.filter((b) => B.has(b));
    const verdict = nB.length ? "N" : hB.length ? "H" : "Y";
    return { ...base, verdict, blockers, primary: nB[0] ?? hB[0] ?? null, triggers: T } as any;
  }
  function verdictOfLocalIsInputs(_j: number) { return false; }
}

// ---------- corpus ----------
const SRC = join(import.meta.dir, "src");
export function loadCorpus() {
  const picks = JSON.parse(readFileSync(join(import.meta.dir, "picks.json"), "utf8"));
  const mods = new Map<string, { raw: RawCell[]; hasDefine: boolean; chars: number; maxLine: number; src: string }>();
  for (const f of readdirSync(SRC)) {
    const id = decodeURIComponent(f.replace(/\.js$/, ""));
    const src = readFileSync(join(SRC, f), "utf8");
    const e = extract(src);
    const lines = src.split("\n");
    mods.set(id, { raw: e.cells, hasDefine: e.hasDefine, chars: src.length, maxLine: Math.max(...lines.map((l) => l.length)), src });
  }
  return { picks, mods };
}

export function vendoredReason(id: string, m: { raw: RawCell[]; hasDefine: boolean; src: string }): string | null {
  if (!m.hasDefine) return "no define(): a JS library block, not a notebook module";
  const cells = m.raw.filter((c) => c.kind === "cell");
  const total = cells.reduce((a, c) => a + c.src.length, 0);
  const blob = cells.filter((c) => c.src.split("\n").some((l) => l.length > 1000)).reduce((a, c) => a + c.src.length, 0);
  if (total && blob / total > 0.6) return `vendored: ${Math.round((100 * blob) / total)}% of its characters are in cells with a line over 1000 characters`;
  return null;
}

if (false) {
  const { picks, mods } = loadCorpus();
  // kinds of every variable in every module, for imports
  const kindCache = new Map<string, Map<string, Kind>>();
  const kindsOf = (id: string) => {
    if (kindCache.has(id)) return kindCache.get(id)!;
    const m = mods.get(id); const out = new Map<string, Kind>();
    if (m) for (const c of m.raw) if (c.kind === "cell" && c.name) {
      const f = facts(c); const k = cellKind(c, f);
      out.set(c.name, k); if (c.name.startsWith("viewof ")) out.set(baseName(c.name), "data"); if (c.name.startsWith("initial ")) out.set(baseName(c.name), k);
    }
    kindCache.set(id, out); return out;
  };
  const importKind = (from: string, name: string): Kind => {
    const k = kindsOf(from).get(name);
    if (k) return k;
    // re-export: follow one level
    const m = mods.get(from);
    const re = m?.raw.find((c) => c.kind === "import" && c.name === name);
    if (re) return kindsOf(re.importFrom!).get(re.importName!) ?? "unknown";
    return "unknown";
  };
  let one = process.argv.indexOf("--module");
  const fileArg = process.argv.indexOf("--file");
  if (fileArg >= 0) { const src = readFileSync(process.argv[fileArg + 1], "utf8"); const id = process.argv[fileArg + 2] ?? "file"; const e = extract(src); mods.set(id, { raw: e.cells, hasDefine: true, chars: src.length, maxLine: 0, src }); process.argv.push("--module", id); one = process.argv.length - 2; }
  const all: Cell[] = []; const modRows: any[] = []; const vendored: any[] = []; const nonModule: string[] = [];
  for (const [id, m] of [...mods].sort()) {
    if (one >= 0 && id !== process.argv[one + 1]) continue;
    const v = vendoredReason(id, m);
    if (v) { (m.hasDefine ? vendored : nonModule).push(m.hasDefine ? { id, reason: v } : id); continue; }
    const cells = classifyModule(id, m.raw, importKind);
    const imports = m.raw.filter((c) => c.kind === "import").length;
    all.push(...cells);
    const sum = (vs: string[]) => cells.filter((c) => vs.includes(c.verdict)).reduce((a, c) => a + c.lines, 0);
    const cnt = (vs: string[]) => cells.filter((c) => vs.includes(c.verdict)).length;
    const code = sum(["Y", "H", "N"]);
    const block = new Map<string, number>(); for (const c of cells) if (c.primary && c.verdict === "N") block.set(c.primary, (block.get(c.primary) ?? 0) + c.lines);
    const hblock = new Map<string, number>(); for (const c of cells) if (c.primary && c.verdict !== "N" && c.primary) hblock.set(c.primary, (hblock.get(c.primary) ?? 0) + c.lines);
    const dom = [...block].sort((a, b) => b[1] - a[1])[0] ?? [...hblock].sort((a, b) => b[1] - a[1])[0];
    modRows.push({
      id, notebook: picks[id]?.notebook, source: picks[id]?.source, copies: picks[id]?.copies,
      cells: cells.length, lines: cells.reduce((a, c) => a + c.lines, 0), proseCells: cnt(["P"]), proseLines: sum(["P"]), blobCells: cnt(["B"]), blobLines: sum(["B"]), importCells: imports, loaderCells: cnt(["I"]),
      codeCells: cnt(["Y", "H", "N"]), codeLines: code,
      Y: cnt(["Y"]), H: cnt(["H"]), N: cnt(["N"]), YL: sum(["Y"]), HL: sum(["H"]), NL: sum(["N"]),
      dominant: dom ? dom[0] : null, soundscript: /soundscript/.test(id),
      unsupportedY: cells.filter((c) => c.verdict === "Y" && c.unsupported.length).length,
      literalLines: cells.filter((c) => c.literal && c.verdict === "Y").reduce((a, c) => a + c.lines, 0),
    });
  }
  if (one >= 0) {
    for (const c of all) console.log([c.verdict, c.lines, c.name, c.kind, c.blockers.join(","), c.unsupported.join(","), c.rewrites.join(",")].join("\t"));
    console.log(modRows[0]);
    process.exit(0);
  }
  writeFileSync(join(import.meta.dir, "cells.jsonl"), all.map((c) => JSON.stringify(c)).join("\n") + "\n");
  writeFileSync(join(import.meta.dir, "modules.json"), JSON.stringify({ modules: modRows, vendored, nonModule }, null, 1));
  console.log(`modules surveyed ${modRows.length}, vendored ${vendored.length}, non-module blocks ${nonModule.length}`);
}
