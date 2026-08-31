import { gzipSync } from "node:zlib";

// Fixtures for the robocoop-5 capability evals. Kept out of evals.mjs because they are DATA (a served
// package, a planted black-box library, seeded module sources) and because the reference solutions in
// evals.mjs must reuse the exact same bytes the criteria grade against.

// ── tiny-chunk: the "npm package" the vendoring evals fetch ─────────────────────────────────────────
// Served from a sentinel URL by setup.routes, so the run never touches a real CDN. `__tcOut` is an
// implementation-only identifier: it can appear in a module file ONLY if the agent pasted the library
// source instead of bundling it, which is what the not_contains_string criteria catch.
export const TINY_CHUNK_URL = "https://eval.test/npm/tiny-chunk@3.1.4/index.js";
export const TINY_CHUNK_SRC = `/*! tiny-chunk v3.1.4 | MIT */
export const VERSION = "3.1.4";

export function chunk(list, size) {
  if (!Array.isArray(list)) throw new TypeError("tiny-chunk: expected an array");
  if (!(size > 0)) throw new RangeError("tiny-chunk: size must be a positive number");
  const __tcOut = [];
  for (let __tcAt = 0; __tcAt < list.length; __tcAt += size) __tcOut.push(list.slice(__tcAt, __tcAt + size));
  return __tcOut;
}

export function flatten(nested) {
  return nested.reduce((acc, part) => acc.concat(part), []);
}
`;

// ── @user/report: a module that pulls the package off the network on every run ───────────────────────
// Seeded for vendor-offline-report, whose task is to make it self-contained.
export const REPORT_SRC = `const _intro = function intro(md){return( md\`# Paginated report\` )};
const _tinyChunk = async function tinyChunk(){
  const src = await (await fetch("${TINY_CHUNK_URL}")).text();
  return await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
};
const _rows = function rows(){return( [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] )};
const _pages = function pages(tinyChunk, rows){return( tinyChunk.chunk(rows, 4) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_tinyChunk", "tinyChunk", [], _tinyChunk);
  $def("_rows", "rows", [], _rows);
  $def("_pages", "pages", ["tinyChunk", "rows"], _pages);
  return main;
}
`;

// ── @user/kiln: the planted black box for the reflection eval ────────────────────────────────────────
// The API is reachable ONLY by running it: the cell body evaluates a base64 payload, so reading the
// module file shows a blob, not a contract. Calling it wrong yields errors that name the next step
// (`kiln.steps`, the spec keys, the known step names) — the surface a reverse-engineering turn walks.
// Steps over [4, 8, 15, 16, 23, 42]: fold=108, spread=38, tally=6.
const KILN_FACTORY = `(function () {
  var STEPS = {
    fold: function (a) { return a.reduce(function (x, y) { return x + y; }, 0); },
    spread: function (a) { return Math.max.apply(null, a) - Math.min.apply(null, a); },
    tally: function (a) { return a.length; }
  };
  function kiln(spec) {
    if (spec === undefined)
      throw new Error("kiln: call kiln(spec). kiln.steps lists the step names it knows.");
    if (typeof spec !== "object" || spec === null)
      throw new TypeError("kiln: spec must be an object");
    if (!Array.isArray(spec.source))
      throw new TypeError("kiln: spec.source must be an array of numbers");
    if (!Array.isArray(spec.recipe))
      throw new TypeError("kiln: spec.recipe must be an array of step names from kiln.steps");
    var out = {};
    spec.recipe.forEach(function (step) {
      if (!Object.prototype.hasOwnProperty.call(STEPS, step))
        throw new Error('kiln: unknown step "' + step + '"; known steps: ' + Object.keys(STEPS).join(", "));
      out[step] = STEPS[step](spec.source);
    });
    return out;
  }
  kiln.steps = Object.freeze(Object.keys(STEPS));
  return kiln;
})()`;

const KILN_B64 = Buffer.from(KILN_FACTORY, "utf8").toString("base64");

export const KILN_SRC = `const _kiln = function kiln(){
  return new Function("return " + atob("${KILN_B64}"))();
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_kiln", "kiln", [], _kiln);
  return main;
}
`;

// ── One package per SHAPE the vendoring doc names ────────────────────────────────────────────────────
// knowledge/vendoring-npm-dependencies.md § 2 tabulates what `import(blobUrl)` does to each shape and
// what the fix is. These five fixtures are those rows made executable: the naive route fails with the
// error the doc quotes, and only the documented trick produces a working value.
//
// Every library carries an internal `__xxOut` accumulator name that appears NOWHERE in its public API,
// so a module file containing it can only have got there by pasting the source — which is what the
// not_contains_string criteria catch. Every one is served from an eval.test sentinel URL: no run
// touches a real CDN.

// (a) BARE SPECIFIER — the published entry point is unimportable; a bundled build exists next to it.
//     Naive attach of index.js → `Failed to resolve module specifier "tiny-stats-core"`.
export const MINI_STATS_ENTRY_URL = "https://eval.test/npm/mini-stats@2.0.0/index.js";
export const MINI_STATS_BUNDLE_URL = "https://eval.test/npm/mini-stats@2.0.0/+esm";
export const MINI_STATS_ENTRY_SRC = `/*! mini-stats v2.0.0 */
import { mean } from "tiny-stats-core";
export const VERSION = "2.0.0";
export { mean };
export function spread(list) { return Math.max.apply(null, list) - Math.min.apply(null, list); }
`;
export const MINI_STATS_BUNDLE_SRC = `/*! mini-stats v2.0.0 bundled */
function mean(list) { let __msOut = 0; for (const n of list) __msOut += n; return __msOut / list.length; }
export const VERSION = "2.0.0";
export { mean };
export function spread(list) { return Math.max.apply(null, list) - Math.min.apply(null, list); }
`;

// (b) RELATIVE IMPORT, two files, no bundle published. Naive attach of index.js →
//     `Failed to resolve module specifier "./pad.js". Invalid relative url or base scheme isn't
//     hierarchical.` Doc § 3: attach both, mint a blob URL for the dependency, rewrite the specifier.
export const DUO_FMT_ENTRY_URL = "https://eval.test/npm/duo-fmt@1.0.0/index.js";
export const DUO_FMT_PAD_URL = "https://eval.test/npm/duo-fmt@1.0.0/pad.js";
export const DUO_FMT_ENTRY_SRC = `/*! duo-fmt v1.0.0 */
import { pad } from "./pad.js";
export const VERSION = "1.0.0";
export function stamp(n) { return "#" + pad(String(n), 4); }
`;
export const DUO_FMT_PAD_SRC = `export function pad(text, width) {
  let __dfOut = String(text);
  while (__dfOut.length < width) __dfOut = "0" + __dfOut;
  return __dfOut;
}
`;

// (c) UMD. `import(blobUrl)` → `Cannot set properties of undefined`. Running it as a script is not
//     enough either: this page HAS an AMD loader (probed {"define":"function","amd":true}), so the
//     bundle takes the define([], factory) branch and never assigns the global. Doc § 2.1.
export const PAINTBOX_URL = "https://eval.test/npm/paintbox@1.2.0/paintbox.umd.js";
export const PAINTBOX_SRC = `/*! paintbox v1.2.0 (umd) */
(function (root, factory) {
  if (typeof define === "function" && define.amd) { define([], factory); }
  else if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.paintbox = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  function channels(hex) {
    return [1, 3, 5].map(function (at) { return parseInt(hex.substr(at, 2), 16); });
  }
  function mix(a, b) {
    var __pbOut = channels(a).map(function (n, at) {
      return ("0" + Math.round((n + channels(b)[at]) / 2).toString(16)).slice(-2);
    });
    return "#" + __pbOut.join("");
  }
  return { VERSION: "1.2.0", mix: mix };
});
`;

// (d) COMMONJS. `import(blobUrl)` → `module is not defined`. Doc § 2.2: supply module/exports.
export const SLUGPRESS_URL = "https://eval.test/npm/slugpress@0.4.1/index.cjs";
export const SLUGPRESS_SRC = `/*! slugpress v0.4.1 (cjs) */
"use strict";
function slugify(text) {
  var __spOut = String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return __spOut;
}
module.exports = { VERSION: "0.4.1", slugify: slugify };
`;

// (e) GZIP. Every JS attachment in the corpus is stored compressed (doc § 4): the notebook holds the
//     .gz bytes and a cell expands them through DecompressionStream before importing. Served as bytes
//     via the route fixture's bodyBase64.
export const PACKRAT_URL = "https://eval.test/npm/packrat@5.0.0/packrat.esm.js.gz";
export const PACKRAT_SRC = `/*! packrat v5.0.0 */
export const VERSION = "5.0.0";
export function pack(list) {
  const __prOut = [];
  for (const item of list) {
    const last = __prOut[__prOut.length - 1];
    if (last && last[0] === item) last[1] += 1; else __prOut.push([item, 1]);
  }
  return __prOut;
}
`;
export const PACKRAT_GZ_B64 = gzipSync(Buffer.from(PACKRAT_SRC, "utf8")).toString("base64");
