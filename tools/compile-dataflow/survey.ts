#!/usr/bin/env bun
// How much of a real module can compileDataflow actually compile?
//
//   bun tools/compile-dataflow/survey-pure.ts modules/@tomlarkworthy/code-metrics.js [...]
//
// Loads each module into a headless runtime and tries to compile EACH named cell on its own, with
// `frontier: "all"` so every ancestor it can recompile is pulled in. Reports the refusal reason per
// cell, grouped, plus the cells that compiled and their capture count.
//
// This is a census, not a benchmark: it says which constructs the strict emitter meets in the wild
// and how often, so the refusal list can be judged against real code rather than fixtures.
import { Runtime } from "@observablehq/runtime";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "../node_modules/acorn/dist/acorn.mjs";
import { compileDataflow } from "./compile-dataflow.mjs";

const VIEWS = process.argv.includes("--snapshot") ? "snapshot" : "refuse";
// --print <cell> dumps that cell's emitted source instead of counting: the census says how much
// compiles, only the artifact says whether what comes out is worth publishing.
const printAt = process.argv.indexOf("--print");
const PRINT = printAt > 0 ? process.argv[printAt + 1] : null;
const files = process.argv.slice(2).filter((a, i) => !a.startsWith("--") && a !== PRINT);
if (!files.length) throw new Error("usage: survey.ts <module.js> [...]");

// A definition that throws for want of a builtin still classifies fine — the compiler only reads
// _name/_inputs/_definition, never runs anything.
const BROWSER_GLOBALS = ["document", "window", "navigator", "Element", "Node", "HTMLElement", "getComputedStyle", "requestAnimationFrame", "CustomEvent", "Event", "DOMParser", "Blob", "URL", "fetch", "localStorage", "SVGElement", "IntersectionObserver", "MutationObserver", "ResizeObserver", "performance", "structuredClone", "btoa", "atob", "TextEncoder", "TextDecoder", "AbortController", "FileReader", "Image", "Worker", "location", "history", "screen", "matchMedia", "crypto", "self", "top", "parent", "frames", "customElements", "CSS", "Range", "Selection", "XMLSerializer", "requestIdleCallback", "queueMicrotask", "reportError", "alert", "confirm", "prompt", "open", "close", "scrollTo", "getSelection"];

const totals = new Map<string, number>();
const bump = (k: string) => totals.set(k, (totals.get(k) || 0) + 1);
const bumpN = (k: string, n: number) => totals.set(k, (totals.get(k) || 0) + n);
let modulesRead = 0;

// Refusal messages name the cell; strip that so the same construct groups together.
const classify = (msg: string): string[] => {
  const lines = msg.split("\n").filter((l) => l.startsWith("  - "));
  return [...new Set(lines.map((l) =>
    l.slice(4)
      .replace(/^\S+ /, "")
      .replace(/"[^"]*"/g, '"…"')
      .replace(/mutable \S+/g, "mutable …")
      .replace(/^\d+ captured/, "N captured")
      .slice(0, 90)
  ))];
};

// A module's define() body runs at import: modules with file attachments call window.lopecode
// synchronously there. The census only needs the variables registered, never their values.
(globalThis as any).window ??= {
  lopecode: { contentSync: () => ({ status: 404, mime: "text/plain", bytes: new Uint8Array() }) }
};

for (const file of files) {
  let main: any;
  try {
    const abs = resolve(file);
    const ns = await import(pathToFileURL(abs).href);
    const runtime: any = new Runtime({});
    // Older @observablehq/runtime in tools/node_modules has no fileAttachments(); the census never
    // resolves an attachment, so a stub is enough to get past the module's define() body.
    if (typeof runtime.fileAttachments !== "function")
      runtime.fileAttachments = () => (name: string) => ({ url: async () => name });
    main = runtime.module(ns.default, () => true);
    await new Promise((r) => setTimeout(r, 400));
  } catch (e: any) {
    console.log(`\n=== ${file}\n  SKIPPED: ${String(e).split("\n")[0].slice(0, 120)}`);
    continue;
  }

  // Only real cells of this module: an implicit variable (an unsatisfied builtin like `md`) and an
  // import handle are not things anyone would ask to compile, and counting them buries the signal.
  const names = [...main._scope.keys()].filter((n: string) => {
    if (typeof n !== "string" || n.startsWith("module ") || n === "@variable") return false;
    const v = main._scope.get(n);
    if (!v || v._type !== 1) return false;
    return !(v._inputs || []).some((i: any) => {
      const inp = i && i._name;
      return inp === "@variable" || (typeof inp === "string" && inp.startsWith("module "));
    });
  });

  let ok = 0;
  bumpN("CANDIDATES", names.length);
  const refusedBy = new Map<string, number>();
  const compiled: string[] = [];

  for (const n of names) {
    if (PRINT && n !== PRINT) continue;
    const v = main._scope.get(n);
    if (!v || !v._definition) continue;
    try {
      const fn = compileDataflow(null, {
        module: main,
        outputs: [n],
        frontier: "all",
        live: false,
        views: VIEWS,
        parse,
        globals: BROWSER_GLOBALS
      });
      ok++;
      if (PRINT) {
        console.log(
          `${file} ${n}: cells=${fn.body.length} captures=[${fn.captureNames.join(", ")}] ` +
            `snapshots=[${fn.snapshots.join(", ")}] unresolved=[${fn.unresolved.map((u: any) => u.name).join(", ")}]\n` +
            "-".repeat(70) + "\n" + fn.source
        );
        process.exit(0);
      }
      compiled.push(`${n} (${fn.body.length} cells, ${fn.captures.length} captures, ${fn.unresolved.length} unresolved)`);
      bump("COMPILED");
    } catch (e: any) {
      if (PRINT) { console.log(e.message); process.exit(1); }
      for (const reason of classify(e.message)) {
        refusedBy.set(reason, (refusedBy.get(reason) || 0) + 1);
        bump(reason);
      }
    }
  }

  modulesRead++;
  console.log(`\n=== ${file}`);
  console.log(`${ok}/${names.length} named cells compile`);
  if (compiled.length) console.log("  compiled: " + compiled.slice(0, 12).join("\n            "));
  const sorted = [...refusedBy].sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sorted.slice(0, 12)) console.log(`  ${String(count).padStart(4)}  ${reason}`);
  if (sorted.length > 12) console.log(`        (+${sorted.length - 12} more reasons)`);
}

console.log(`\n=== across all modules (views: ${VIEWS})`);
console.log(`${modulesRead} modules read`);
for (const [k, n] of [...totals].sort((a, b) => b[1] - a[1]))
  console.log(`${String(n).padStart(5)}  ${k}`);
