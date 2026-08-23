#!/usr/bin/env bun
/**
 * lope-preflight.ts — static integrity check over every notebook. No browser, no
 * runtime, ~seconds for the whole corpus.
 *
 * Purpose: guard a module resync sweep. Injecting a newer module block can quietly
 * add a dependency the target notebook does not embed — a newer `save-in-place`
 * wants `@tomlarkworthy/plugin-registry`, a newer module wants a FileAttachment —
 * and the notebook then fails at BOOT, which no amount of source diffing shows.
 * A real boot (bulk-smoke-test.js) only catches it when the notebook has tests
 * exercising that path, and many notebooks report `no-tests`. These checks are
 * deterministic and cover all of them.
 *
 *   syntax       every module block parses as ESM
 *   imports      every `main.define("module @x/y")` has an embedded @x/y block
 *   attachments  every FileAttachment name maps to an embedded <module>/<name> block
 *   mains        every bootconf main is embedded
 *   duplicates   no repeated block id
 *   dep skew     each cell's input list matches what its body references, both ways
 *
 * Two layers, same entry point. The static layer above is instant and total. The
 * `--boot` layer really instantiates each notebook in node (reusing
 * bulk-smoke-test-worker.js, so there is one boot implementation) and runs its
 * in-notebook tests: slower, and only as good as the tests a notebook happens to
 * have, but it catches what static analysis cannot. Neither subsumes the other.
 *
 * Usage:
 *   bun tools/lope-preflight.ts                        # whole corpus, static, ~4s
 *   bun tools/lope-preflight.ts --json out.json        # write a baseline
 *   bun tools/lope-preflight.ts --baseline out.json    # gate: only NEW findings fail
 *   bun tools/lope-preflight.ts --boot                 # also really boot each notebook
 *   bun tools/lope-preflight.ts <notebook.html> ...    # specific files, verbose
 *
 * The corpus already carries pre-existing findings, so a clean sheet is not the
 * bar. Capture a baseline, sweep, then re-run with --baseline: exit is non-zero
 * only for findings that were not there before.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, relative, dirname } from "path";
import { execFile } from "child_process";
import { createHash } from "crypto";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const ROOT = resolve(import.meta.dir, "..");
const REPOS = ["lopecode", "lopebooks"];
const transpiler = new Bun.Transpiler({ loader: "js" });

type Block = { id: string; attrs: string; content: string };
type Problem = { kind: string; detail: string };

function blocks(html: string): Block[] {
  const out: Block[] = [];
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    out.push({ id: m[1], attrs: m[2], content: m[3].replace(/^\n/, "").replace(/\n$/, "") });
  return out;
}

/** A first-party module block: JS source, not a file attachment, not a packed bundle.
 *  `data-encoding` blocks (base64+gzip vendored libs like es-module-shims) carry
 *  encoded bytes, not source, so parsing them is meaningless. */
const isModuleBlock = (b: Block) =>
  /data-mime="application\/javascript"/.test(b.attrs) &&
  !/data-encoding=/.test(b.attrs) &&
  b.id.split("/").length <= 2;

/** bootconf.json, skipping the exporter's own template (which contains `${...}`). */
function bootconf(html: string): any | null {
  for (const m of html.matchAll(/<script\s+id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { return JSON.parse(m[1].trim()); } catch { /* template */ }
  }
  return null;
}

/**
 * Module ids this block imports, from the generated `main.define("module <id>")`.
 * Only `@author/name` ids name a content block. Excluded:
 *   d/<hex>@<n>, plain integers   Observable document-id imports, resolved by the
 *                                 importmap rather than by block id
 *   ids containing ${...}, and @x  the exporter's own code-generation templates,
 *                                 which live inside module source as string literals
 */
function importsOf(src: string): string[] {
  return [...src.matchAll(/main\.define\("module ([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => /^@[^/${]+\/[^/${]+$/.test(id) && id !== "@x");
}

/**
 * Symbols this block imports from other modules, as [sourceModule, exportedName].
 * The exporter emits one of:
 *   main.define("x",  ["module @a/b", "@variable"], (_, v) => v.import("x", _));
 *   main.define("y",  ["module @a/b", "@variable"], (_, v) => v.import("x", "y", _));
 * so the FIRST string argument to v.import is always the name in the source module.
 */
function importedSymbols(src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /main\.define\("[^"]*",\s*\[\s*"module ([^"]+)"[^\]]*\][^)]*\)\s*=>\s*v\.import\("([^"]+)"/g;
  for (const m of src.matchAll(re))
    if (/^@[^/${]+\/[^/${]+$/.test(m[1])) out.push([m[1], m[2]]);
  return out;
}

/**
 * Whether this module block can reach block content itself, rather than having a
 * consumer read it later. Three mechanisms, matched as *calls* rather than words so
 * a module's own prose about attachments does not trip it:
 *   - a generated `fileAttachments` loader Map, which calls contentSync during define()
 *   - a direct `lopecode.contentSync(...)`
 *   - scanning the DOM for script blocks
 * Only such a module is hurt by its blocks arriving after it.
 */
const resolvesContentAtBoot = (src: string) =>
  /\[[^\]]*"FileAttachment"/.test(src) ||
  /lopecode\.contentSync\s*\(/.test(src) ||
  /querySelectorAll\(\s*['"`][^'"`]*script/.test(src);

/**
 * Stdlib names every module gets for free. A module can be imported FROM for one of
 * these even though it never defines it — the name resolves through the source
 * module's builtins — so importing e.g. `md` from runtime-sdk is not a missing export.
 */
const BUILTINS = new Set([
  "FileAttachment", "Files", "Generators", "Mutable", "Promises", "DOM", "Event",
  "html", "md", "svg", "tex", "dot", "mermaid", "now", "width", "invalidation",
  "visibility", "require", "resolve", "Inputs", "d3", "htl", "_", "L", "topojson",
]);

/**
 * Cell names a module block defines. `$def(id, name, inputs, fn)` carries the name
 * (null for anonymous cells); re-exported imports come through as `main.define("n",`.
 *
 * A hand-written module can also define an OBSERVED cell directly, without the helper:
 *
 *   main.variable(observer("viewof galaxyMap")).define("viewof galaxyMap", [...], fn)
 *
 * The regexes here used to miss that, and the miss was not theoretical: `corepox-map`
 * and `corepox-game` define `viewof galaxyMap` / `viewof game` exactly that way, so
 * importing them produced two permanent false `missing-export` findings —
 * "@tomlarkworthy/corepox-app-impl imports viewof game from @tomlarkworthy/corepox-game,
 * which does not define it" — against a notebook that boots and runs.
 *
 * Matching a bare `.define("x"` would be wrong, and the corpus says how wrong. Across
 * 233 notebooks / 12108 module blocks, `.define(` with a literal first argument appears
 * on receivers that are OTHER modules, not the block's own exports: `runtime.define("…")`
 * (466), `__ojs_runtime._builtin.define("…")` (466), `m.variable().define("title", …)`
 * inside `@tomlarkworthy/modules` (696, on `rt.module()` fixtures built in a cell body),
 * `mod.define("svgLens", …)` in `svg-lens` (8, a module made at runtime). Counting those
 * as exports would silence real findings.
 *
 * So the rule is the receiver's ROOT identifier, and `main` is the whole rule: of the 367
 * distinct module ids in both repos, 367 bind `main = runtime.module(` and zero bind
 * nothing. The other bindings that exist (`mod` ×3, `imported` ×2, `importer`, `newMod`)
 * are inner modules built inside cell bodies — the ones that must not count.
 *
 * The regex path stays as the fallback for a block acorn cannot parse, where it is still
 * better than returning nothing.
 */
const namesCache = new Map<string, Set<string>>();
function definedNames(src: string): Set<string> {
  const key = createHash("sha256").update(src).digest("hex");
  const hit = namesCache.get(key);
  if (hit) return hit;
  const out = new Set<string>();
  namesCache.set(key, out);

  for (const m of src.matchAll(/\$def\("[^"]*",\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);

  let ast: any;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: "module" }); }
  catch {
    for (const m of src.matchAll(/main\.define\("((?:[^"\\]|\\.)*)"/g))
      if (!m[1].startsWith("module ")) out.add(m[1]);
    return out;
  }

  walk.simple(ast, {
    CallExpression(n: any) {
      const c = n.callee;
      if (c.type !== "MemberExpression" || c.computed) return;
      if (c.property.type !== "Identifier" || c.property.name !== "define") return;
      const arg = n.arguments[0];
      if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") return;
      if (arg.value.startsWith("module ")) return;   // an import bridge, not an export
      // Walk the receiver back to the identifier it roots at: `main`, `main.variable(…)`,
      // `main.variable(observer(name))` all root at `main`; `rt.module().variable(…)` does not.
      let o: any = c.object;
      while (o && o.type !== "Identifier")
        o = o.type === "CallExpression" ? o.callee : o.type === "MemberExpression" ? o.object : null;
      if (o?.name === "main") out.add(arg.value);
    },
  });
  return out;
}

/**
 * Names a cell body may reference without declaring them as inputs. Two sources, and they
 * are not interchangeable:
 *   - real JS/browser globals, which resolve lexically and are the *safe* way to reach a
 *     browser API from a shared module (see the `window.X` rule for bootloader cells)
 *   - Observable stdlib builtins, which the runtime injects
 * A name outside both, referenced but not declared, resolves to nothing at runtime.
 */
const AMBIENT = new Set([
  ...BUILTINS,
  // ECMAScript
  "globalThis", "Object", "Array", "String", "Number", "Boolean", "Symbol", "BigInt",
  "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
  "ReferenceError", "EvalError", "URIError", "AggregateError", "Function", "Map", "Set",
  "WeakMap", "WeakSet", "WeakRef", "Promise", "Proxy", "Reflect", "ArrayBuffer",
  "SharedArrayBuffer", "DataView", "Atomics", "Int8Array", "Uint8Array", "Uint8ClampedArray",
  "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array",
  "BigInt64Array", "BigUint64Array", "Intl", "parseInt", "parseFloat", "isNaN", "isFinite",
  "encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent", "escape", "unescape",
  "undefined", "NaN", "Infinity", "structuredClone", "queueMicrotask",
  // browser
  "window", "self", "document", "navigator", "location", "history", "screen", "console",
  "fetch", "Request", "Response", "Headers", "Blob", "File", "FileReader", "FormData",
  "URL", "URLSearchParams", "AbortController", "AbortSignal", "TextEncoder", "TextDecoder",
  "CompressionStream", "DecompressionStream", "ReadableStream", "WritableStream",
  "TransformStream", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "getComputedStyle",
  "matchMedia", "localStorage", "sessionStorage", "indexedDB", "crypto", "performance",
  "atob", "btoa", "alert", "confirm", "prompt", "open", "close", "postMessage", "addEventListener",
  "removeEventListener", "dispatchEvent", "Node", "Element", "HTMLElement", "SVGElement",
  "DocumentFragment", "CustomEvent", "MouseEvent", "KeyboardEvent", "PointerEvent", "DragEvent",
  "TouchEvent", "WheelEvent", "InputEvent", "FocusEvent", "MessageEvent", "ErrorEvent",
  "CloseEvent", "ProgressEvent", "MutationObserver", "ResizeObserver", "IntersectionObserver",
  "PerformanceObserver", "WebSocket", "Worker", "SharedWorker", "MessageChannel", "MessagePort",
  "BroadcastChannel", "EventTarget", "EventSource", "XMLHttpRequest", "DOMParser",
  "XMLSerializer", "Image", "Audio", "AudioContext", "OfflineAudioContext", "Path2D",
  "ImageData", "OffscreenCanvas", "createImageBitmap", "ClipboardItem", "DataTransfer",
  "IntersectionObserverEntry", "CSS", "Range", "Selection", "Notification", "caches",
  "importShim", "process", "Buffer", "require", "module", "exports", "__dirname", "__filename",
  "devicePixelRatio", "innerWidth", "innerHeight", "outerWidth", "outerHeight", "scrollX",
  "scrollY", "pageXOffset", "pageYOffset", "parent", "top", "frames", "origin", "visualViewport",
  "isSecureContext", "WebAssembly", "speechSynthesis", "scrollTo", "scrollBy", "getSelection",
]);

/**
 * Does each cell's declared input list match what its body actually references?
 *
 * A compiled cell binds inputs to params POSITIONALLY — `$def(pid, name, ["a","viewof b"], fn)`
 * with `function fn(a, $0)`. So the check is per position, not per name, which is why `viewof`
 * deps (params named `$0`) work here at all.
 *
 * Two directions, both produced by hand- or AI-editing a cell body without updating its input
 * array, and they fail differently:
 *   unused-dep      declared, never referenced. The cell still WAITS on that variable, so it
 *                   inherits its failure and recomputes on its changes, for nothing.
 *   undeclared-ref  referenced, never declared and not ambient. Resolves to nothing at runtime.
 *   dep-mismatch    input i and parameter i have different names. Binding is positional, so
 *                   every later argument is off by a slot -- see the note at the check.
 *
 * Over-approximates what counts as bound (every declaration anywhere in the function, plus every
 * nested param) so the errors it can make are misses, not false alarms. Cells reaching `arguments`
 * or `eval` are skipped: their references are not statically visible.
 *
 * Memoized on block content — the corpus holds 11,719 (notebook, module) pairs but only 424
 * distinct blocks, so this runs 424 times rather than 11,719.
 */
/** Every name a binding position introduces, through destructuring, defaults and rest. */
function patternNames(node: any, out: Set<string>): void {
  if (!node) return;
  switch (node.type) {
    case "Identifier": out.add(node.name); return;
    case "ObjectPattern": for (const p of node.properties) patternNames(p.type === "RestElement" ? p.argument : p.value, out); return;
    case "ArrayPattern": for (const e of node.elements) patternNames(e, out); return;
    case "AssignmentPattern": patternNames(node.left, out); return;
    case "RestElement": patternNames(node.argument, out); return;
  }
}

/**
 * What a declared input resolves to, which is what decides how much an unused one costs:
 *
 *   imported from @x/y   an import bridge. The heaviest: the module depends on @x/y for
 *                        nothing. `importShim` is the common case — it looks ambient because
 *                        the networking script also exposes it as a global, but as a DEP it is
 *                        `v.import("importShim")` from runtime-sdk.
 *   a cell here          a sibling cell, so the cell waits on it and inherits its failures
 *   a stdlib builtin     always resolves, but declared for no reason
 *   nothing defines it   resolves to a placeholder that never settles, so the cell NEVER RUNS
 *                        whether or not the body uses it
 */
function depOrigin(src: string): (dep: string) => string {
  const bridge = new Map<string, string>();
  for (const m of src.matchAll(/main\.define\("((?:[^"\\]|\\.)*)",\s*\[\s*"module ([^"]+)"/g))
    bridge.set(m[1], m[2]);
  const local = definedNames(src);
  return (dep) =>
    bridge.has(dep) ? `imported from ${bridge.get(dep)}`
    : local.has(dep) ? "a cell here"
    : BUILTINS.has(dep) ? "a stdlib builtin"
    : "nothing here defines it";
}

const skewCache = new Map<string, Problem[]>();
function depSkew(src: string): Problem[] {
  const key = createHash("sha256").update(src).digest("hex");
  const hit = skewCache.get(key);
  if (hit) return hit;
  const out: Problem[] = [];
  skewCache.set(key, out);
  let ast: any;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: "module" }); } catch { return out; }

  const fns = new Map<string, { params: string[]; refs: Set<string>; bound: Set<string>; opaque: boolean }>();
  walk.simple(ast, {
    VariableDeclarator(n: any) {
      if (n.id.type !== "Identifier" || !n.init) return;
      if (n.init.type !== "FunctionExpression" && n.init.type !== "ArrowFunctionExpression") return;
      const params = (n.init.params || []).map((p: any) => (p.type === "Identifier" ? p.name : null));
      const refs = new Set<string>(), bound = new Set<string>();
      // the cell's own params bind too; a destructured one binds names but holds no positional dep
      for (const p of n.init.params || []) patternNames(p, bound);
      let opaque = false;
      walk.ancestor(n.init.body ?? n.init, {
        Identifier(id: any, _s: any, anc: any[]) {
          const parent = anc[anc.length - 2];
          if (parent) {
            // a property NAME is not a reference to a variable of that name
            if (parent.type === "MemberExpression" && !parent.computed && parent.property === id) return;
            // `{html}` is ONE node serving as both key and value — skipping it as a key would
            // report the cell as not using a dep it passes straight through.
            if (parent.type === "Property" && !parent.computed && !parent.shorthand && parent.key === id) return;
            if ((parent.type === "MethodDefinition" || parent.type === "PropertyDefinition")
              && !parent.computed && parent.key === id) return;
            if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return;
          }
          if (id.name === "arguments" || id.name === "eval") opaque = true;
          refs.add(id.name);
        },
        VariableDeclarator(d: any) { patternNames(d.id, bound); },
        FunctionDeclaration(f: any) { if (f.id) bound.add(f.id.name); for (const p of f.params || []) patternNames(p, bound); },
        FunctionExpression(f: any) { if (f.id) bound.add(f.id.name); for (const p of f.params || []) patternNames(p, bound); },
        ArrowFunctionExpression(f: any) { for (const p of f.params || []) patternNames(p, bound); },
        ClassDeclaration(c: any) { if (c.id) bound.add(c.id.name); },
        ClassExpression(c: any) { if (c.id) bound.add(c.id.name); },
        CatchClause(c: any) { if (c.param) patternNames(c.param, bound); },
        ImportSpecifier(s: any) { bound.add(s.local.name); },
        ImportDefaultSpecifier(s: any) { bound.add(s.local.name); },
        ImportNamespaceSpecifier(s: any) { bound.add(s.local.name); },
      });
      fns.set(n.id.name, { params, refs, bound, opaque });
    },
  });

  const originOf = depOrigin(src);
  walk.simple(ast, {
    CallExpression(n: any) {
      if (n.callee.type !== "Identifier" || n.callee.name !== "$def") return;
      const [, nameNode, depsNode, fnNode] = n.arguments;
      if (!fnNode || fnNode.type !== "Identifier") return;
      const fn = fns.get(fnNode.name);
      if (!fn || fn.opaque) return;
      const inputs: string[] = depsNode?.type === "ArrayExpression"
        ? depsNode.elements.map((e: any) => (e?.type === "Literal" ? String(e.value) : null)) : [];
      const cell = nameNode?.type === "Literal" && nameNode.value !== null ? String(nameNode.value) : "(anonymous)";
      inputs.forEach((dep, i) => {
        if (dep === null) return;
        const p = fn.params[i];
        // No param at that position at all: editing the input array without touching the
        // signature leaves a dep that CANNOT be referenced, which is the pure form of the bug.
        if (!p) { out.push({ kind: "unused-dep", detail: `${cell} declares ${dep} (${originOf(dep)}) but has no parameter for it` }); return; }
        if (!fn.refs.has(p)) out.push({ kind: "unused-dep", detail: `${cell} declares ${dep} (${originOf(dep)}) but never uses it` });
      });
      // The runtime binds inputs POSITIONALLY, so inserting a parameter without
      // inserting its dep shifts every later one by a slot and the cell runs on
      // neighbours' values. Nothing above catches that: each shifted dep still lands
      // on a parameter the body references, and the inserted name is still in the
      // parameter list, so `unused-dep` and `undeclared-ref` both stay silent.
      // Observed 2026-08-21: encounterView gained a `miningView` parameter, `htl`
      // received `encCss` (a string) and the cell died with "htl.html is not a
      // function" -- 0 preflight findings.
      // A free RENAME is idiomatic and not a bug -- `(G, _) => G.input(_)` names
      // `Generators` G in 204 cells across this corpus. What is always a bug is a
      // parameter that holds ANOTHER of this cell's own input names: the two lists
      // are then a permutation of each other, which is what a shift looks like.
      const ident = (x: unknown) => typeof x === "string" && /^[A-Za-z_$][\w$]*$/.test(x);
      const declared = new Set(inputs.filter(ident) as string[]);
      inputs.forEach((dep, i) => {
        const p = fn.params[i];
        if (!ident(dep) || !ident(p) || dep === p || !declared.has(p)) return;
        out.push({ kind: "dep-mismatch",
                   detail: `${cell} input ${i} is ${dep} but its parameter there is ${p}, ` +
                           `which is input ${inputs.indexOf(p)} -- every argument after ${i} is off by a slot` });
      });

      const params = new Set(fn.params.filter(Boolean) as string[]);
      for (const r of fn.refs)
        if (!params.has(r) && !fn.bound.has(r) && !AMBIENT.has(r) && !/^\$\d+$/.test(r))
          out.push({ kind: "undeclared-ref", detail: `${cell} references ${r}, which is not one of its inputs` });
    },
  });
  return out;
}

/** FileAttachment names this block expects, from the generated loader map. */
function attachmentsOf(src: string): string[] {
  const m = src.match(/const fileAttachments = new Map\(\[([\s\S]*?)\]\.map\(/);
  if (!m) return [];
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
}

function checkNotebook(rel: string): Problem[] {
  return checkHtml(readFileSync(join(ROOT, rel), "utf8"));
}

export function checkHtml(html: string): Problem[] {
  const problems: Problem[] = [];
  const bs = blocks(html);
  const ids = new Set(bs.map((b) => b.id));

  const seen = new Set<string>();
  for (const b of bs) {
    if (seen.has(b.id)) problems.push({ kind: "duplicate", detail: b.id });
    seen.add(b.id);
  }

  const mods = bs.filter(isModuleBlock);
  const deps = new Map<string, string[]>();
  for (const b of mods) {
    try {
      transpiler.transformSync(b.content);
    } catch (e: any) {
      problems.push({ kind: "syntax", detail: `${b.id}: ${String(e.message).split("\n")[0].slice(0, 120)}` });
      continue; // a block that will not parse cannot be scanned for deps
    }
    deps.set(b.id, importsOf(b.content));
  }

  const conf = bootconf(html);
  if (!conf) problems.push({ kind: "bootconf", detail: "no parseable bootconf.json" });
  for (const main of conf?.mains ?? [])
    if (!ids.has(main)) problems.push({ kind: "missing-main", detail: `bootconf main ${main} not embedded` });

  // The Observable runtime is lazy: a module nobody imports is never instantiated,
  // so its unmet dependencies never resolve and never throw. Only the closure
  // reachable from bootconf.mains actually runs at boot, and only breakage inside
  // that closure is a real failure. Outside it, record separately — informative
  // (and worth fixing) but not a boot regression.
  const reached = new Set<string>();
  const queue = [...(conf?.mains ?? [])];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id) || !deps.has(id)) continue;
    reached.add(id);
    queue.push(...deps.get(id)!);
  }

  // Document order matters: a module's file attachments must appear BEFORE the
  // module block itself.
  const orderOf = new Map<string, number>();
  bs.forEach((b, i) => { if (!orderOf.has(b.id)) orderOf.set(b.id, i); });

  const byId = new Map(mods.map((b) => [b.id, b]));
  const namesOf = new Map<string, Set<string>>();
  for (const b of mods) namesOf.set(b.id, definedNames(b.content));

  for (const [id, imports] of deps) {
    const live = reached.has(id);
    for (const dep of imports)
      if (!ids.has(dep))
        problems.push({ kind: live ? "missing-import" : "missing-import-lazy", detail: `${id} imports ${dep}` });

    // A module can be present but too OLD to provide what the importer asks for.
    // Resyncing `observablejs-toolchain` into a notebook whose `acorn-8-11-3` predates
    // `acorn_walk_url` produced exactly this: every block present, nothing missing,
    // 44 cells failing at runtime with "acorn_walk_url is not defined".
    for (const [dep, sym] of importedSymbols(byId.get(id)!.content)) {
      const has = namesOf.get(dep);
      if (!has || has.has(sym) || BUILTINS.has(sym)) continue;
      problems.push({
        kind: live ? "missing-export" : "missing-export-lazy",
        detail: `${id} imports ${sym} from ${dep}, which does not define it`,
      });
    }
    for (const p of depSkew(byId.get(id)!.content))
      problems.push({ kind: live ? p.kind : `${p.kind}-lazy`, detail: `${id}: ${p.detail}` });

    for (const name of attachmentsOf(byId.get(id)!.content)) {
      const attId = ids.has(`${id}/${encodeURIComponent(name)}`)
        ? `${id}/${encodeURIComponent(name)}`
        : ids.has(`${id}/${name}`) ? `${id}/${name}` : null;
      if (!attId) {
        problems.push({ kind: live ? "missing-attachment" : "missing-attachment-lazy", detail: `${id} needs ${name}` });
      } else if (orderOf.get(attId)! > orderOf.get(id)!) {
        problems.push({ kind: "attachment-after-module", detail: `${id}: ${name} is emitted after its module block` });
      }
    }
  }

  // Blocks that belong to a module by id prefix but are not in its loader map are
  // often still content the module reads (markdown-wiki scans the DOM for its own
  // docs), so the same ordering rule applies — but only if the module can actually
  // reach that content while `define()` runs. A module whose blocks are read by a
  // *consumer* after parsing (thetarot.online's deck: `tarot-hoist-deck.mjs` strips
  // the dead loader Map and hoists the 3 KB code block ahead of 1.5 MB of scans, and
  // `@tomlarkworthy/tarot` reads them through `dvfBytes`) cannot lose them, so the
  // ordering is deliberate rather than a defect.
  for (const b of bs) {
    const slash = b.id.lastIndexOf("/");
    if (slash < 0) continue;
    const owner = b.id.slice(0, slash);
    if (!byId.has(owner)) continue;
    if (!resolvesContentAtBoot(byId.get(owner)!.content)) continue;
    if (orderOf.get(b.id)! > orderOf.get(owner)!)
      problems.push({ kind: "attachment-after-module", detail: `${owner}: ${b.id.slice(slash + 1)} is emitted after its module block` });
  }

  // A block can be reached both via a loader map and by id prefix; report it once.
  const uniq = new Map<string, Problem>();
  for (const p of problems) uniq.set(p.kind + "\u0000" + p.detail, p);
  return [...uniq.values()];
}

// ------------------------------------------------------------------------ CLI

if (!import.meta.main) { /* imported for checkHtml; skip the CLI */ } else {

const argv = process.argv.slice(2);
const flagVal = (n: string) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const jsonOut = flagVal("--json");
const baselineIn = flagVal("--baseline");
const doBoot = argv.includes("--boot");
const bootTimeout = Number(flagVal("--timeout") ?? 20000);
const explicit = argv.filter((a) => a.endsWith(".html"));

const targets = explicit.length
  ? explicit.map((p) => relative(ROOT, resolve(p)))
  : REPOS.flatMap((repo) => {
      const dir = join(ROOT, repo, "notebooks");
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".html")).sort()
        .map((f) => relative(ROOT, join(dir, f)));
    });

const report: Record<string, Problem[]> = {};
const byKind = new Map<string, number>();
const add = (rel: string, p: Problem) => {
  (report[rel] ??= []).push(p);
  byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
};
for (const rel of targets) for (const p of checkNotebook(rel)) add(rel, p);

// --- optional second layer: really boot each notebook -----------------------
// Reuses bulk-smoke-test-worker.js verbatim (one boot implementation, not two).
// Bounded concurrency: each worker instantiates a ~2MB notebook in its own node.
if (doBoot) {
  const worker = join(ROOT, "tools", "bulk-smoke-test-worker.js");
  const boot = (rel: string) =>
    new Promise<void>((done) => {
      execFile("node", ["--experimental-vm-modules", worker, join(ROOT, rel), String(bootTimeout)],
        { timeout: bootTimeout * 2 + 10000, killSignal: "SIGKILL", maxBuffer: 10 << 20,
          env: { ...process.env, NODE_NO_WARNINGS: "1" } },
        (err, _out, stderr) => {
          const line = String(stderr || "").split("\n").find((l) => l.startsWith("__RESULT__"));
          let r: any = null;
          if (line) { try { r = JSON.parse(line.slice("__RESULT__".length)); } catch {} }
          if (!r) add(rel, { kind: "boot-crash", detail: err?.killed ? "timeout" : String(err?.message ?? "no result").slice(0, 120) });
          else if (r.status === "load-failed" || r.status === "crash")
            add(rel, { kind: "boot-failed", detail: `${r.status}: ${String(r.error ?? "").slice(0, 120)}` });
          else if (r.status === "tests-failed")
            for (const t of r.failedTests ?? []) add(rel, { kind: "test-failed", detail: `${t.name}: ${String(t.error ?? "").slice(0, 100)}` });
          done();
        });
    });
  const queue = [...targets];
  let bootDone = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let rel = queue.shift(); rel; rel = queue.shift()) {
      await boot(rel);
      if (++bootDone % 20 === 0) console.error(`  booted ${bootDone}/${targets.length}`);
    }
  }));
}

if (jsonOut) {
  // sorted for a stable before/after diff
  const stable: Record<string, Problem[]> = {};
  for (const k of Object.keys(report).sort())
    stable[k] = [...report[k]].sort((a, b) => (a.kind + a.detail).localeCompare(b.kind + b.detail));
  writeFileSync(jsonOut, JSON.stringify(stable, null, 2) + "\n");
  console.log(`wrote ${jsonOut}`);
}

const total = [...byKind.values()].reduce((a, b) => a + b, 0);
// Only breakage in the boot closure gates; `-lazy` findings never run.
const blocking = [...byKind].filter(([k]) => !k.endsWith("-lazy")).reduce((a, [, n]) => a + n, 0);
console.log(`\n${targets.length} notebook(s) checked${doBoot ? " (static + real boot)" : ""}; ` +
  `${Object.keys(report).length} with findings, ${total} finding(s), ${blocking} in the boot closure`);
for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);

// --- gate ------------------------------------------------------------------
// With a baseline, only findings that were NOT there before matter — the corpus
// carries pre-existing ones, and failing on those would make the gate useless.
if (baselineIn) {
  const base: Record<string, Problem[]> = JSON.parse(readFileSync(baselineIn, "utf8"));
  const key = (rel: string, p: Problem) => `${rel}\u0000${p.kind}\u0000${p.detail}`;
  const had = new Set<string>();
  for (const [rel, ps] of Object.entries(base)) for (const p of ps) had.add(key(rel, p));
  const now = new Set<string>();
  for (const [rel, ps] of Object.entries(report)) for (const p of ps) now.add(key(rel, p));

  const added = [...now].filter((k) => !had.has(k)).filter((k) => !k.split("\u0000")[1].endsWith("-lazy"));
  // only over the files this run looked at -- a scoped run (the pre-commit hook passes a few
  // paths) has no opinion about findings in notebooks it never opened
  const checked = new Set(targets);
  const fixed = [...had].filter((k) => !now.has(k) && checked.has(k.split("\u0000")[0]));
  console.log(`\nvs baseline ${baselineIn}:  ${added.length} NEW, ${fixed.length} resolved`);
  for (const k of added.slice(0, 30)) {
    const [rel, kind, detail] = k.split("\u0000");
    console.log(`  NEW  ${kind.padEnd(22)} ${rel.split("/").pop()}  ${detail}`);
  }
  if (added.length > 30) console.log(`  … ${added.length - 30} more`);
  process.exit(added.length ? 1 : 0);
}

if (explicit.length || blocking <= 40) {
  for (const [rel, ps] of Object.entries(report)) {
    console.log(`\n${rel}`);
    for (const p of ps.slice(0, 12)) console.log(`  ${p.kind.padEnd(20)} ${p.detail}`);
    if (ps.length > 12) console.log(`  … ${ps.length - 12} more`);
  }
}
process.exit(blocking ? 1 : 0);

}
