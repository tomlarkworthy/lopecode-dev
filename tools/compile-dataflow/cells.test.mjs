// bun test tools/compile-dataflow/cells.test.mjs
//
// Guards the generated notebook cells. A cell source that does not parse, or an md cell whose
// backticks were escaped wrongly, breaks the whole module when it lands — and it lands through a
// browser, where the failure is a blank pane rather than a stack trace. Both are cheap to check here.
import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;

// Regenerate rather than read a stale cells.json: the file is a build artifact, not a source.
execFileSync("node", [dir + "make-cells.mjs"], { stdio: "pipe" });
const cells = JSON.parse(readFileSync(dir + "cells.json", "utf8"));

// `name = rhs`, or a block cell `name = { … }`. Anonymous cells are not generated here.
const split = (src) => {
  const i = src.indexOf("=");
  return { name: src.slice(0, i).trim(), rhs: src.slice(i + 1).trim() };
};

test("every generated cell parses as an Observable cell body", () => {
  const bad = [];
  for (const src of cells) {
    const { name, rhs } = split(src);
    // A block cell is a function body; anything else is an expression to return. `async` because
    // the runtime allows top-level await in a cell and several of these use it.
    const wrapped = rhs.startsWith("{")
      ? `(async function () ${rhs})`
      : `(async function () { return (\n${rhs}\n); })`;
    try {
      new Function(`return ${wrapped};`);
    } catch (e) {
      bad.push(`${name}: ${e.message}`);
    }
  }
  expect(bad).toEqual([]);
});

test("cell names are unique, so bulk-define cannot silently drop one", () => {
  const names = cells.map((c) => split(c).name);
  expect(names.length).toBe(new Set(names).size);
});

// The escaping is the part that has bitten before: a lone backtick inside an md cell terminates the
// template and the rest of the prose becomes syntax. Evaluating with a tag that returns the raw
// string is the only check that proves the round trip, rather than that the result parses.
test("md cells round-trip docs.md exactly", () => {
  const raw = readFileSync(dir + "docs.md", "utf8");
  const sections = raw.split(/^=== (\w+)$/m).slice(1);
  expect(sections.length).toBeGreaterThan(0);

  const md = (strings, ...values) => String.raw({ raw: strings }, ...values);
  for (let i = 0; i < sections.length; i += 2) {
    const name = sections[i];
    const expected = sections[i + 1].trim();
    const cell = cells.find((c) => split(c).name === name);
    expect(cell, `no generated cell named ${name}`).toBeTruthy();
    const got = new Function("md", `return (${split(cell).rhs});`)(md);
    expect(got, `${name} did not round-trip`).toBe(expected);
  }
});

// The prose claims the demo has no captures and that its `.source` is self-contained. That is a
// claim about a cell nobody has run — the notebook it belongs to has not been rebuilt yet — so run
// the cell here, with the four dependencies the notebook would supply.
test("the polygonPath demo compiles to captureless, self-contained source", async () => {
  const { Runtime } = await import("../../vendor/observable-runtime/src/index.js");
  const { compileDataflow } = await import("./compile-dataflow.mjs");
  const cdFixture = (build) => {
    const mod = new Runtime({}).module();
    build(mod);
    return mod;
  };
  const cell = cells.find((c) => split(c).name === "polygonPath");
  const run = new Function(
    "cdFixture", "cdDispose", "invalidation", "compileDataflow",
    `return (async function () ${split(cell).rhs})();`
  );
  const fn = await run(cdFixture, () => true, new Promise(() => {}), compileDataflow);

  expect(fn.captureNames).toEqual([]);
  expect(fn.params).toEqual([]);
  expect(fn().path).toBe("M0,-40L38.04,-12.36L23.51,32.36L-23.51,32.36L-38.04,-12.36Z");

  // self-contained: eval the text in a bare scope and it must give the same answer
  const standalone = new Function(`return (${fn.source});`)();
  expect(standalone()).toEqual(fn());
});

test("the docs mention every option compileDataflow actually accepts", () => {
  const impl = readFileSync(dir + "compile-dataflow.mjs", "utf8");
  const destructure = impl.match(/const \{\s*name = "compiled",[^}]*\}/);
  expect(destructure).toBeTruthy();
  // the KEY, not the local it is renamed to, when a destructure renames one
  const options = [...destructure[0].matchAll(/(\w+)\s*(?::\s*\w+\s*)?=/g)].map((m) => m[1]);
  const usage = readFileSync(dir + "docs.md", "utf8");
  const missing = options.filter((o) => !usage.includes(o));
  expect(missing).toEqual([]);
});
