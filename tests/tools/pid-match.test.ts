// The measured cases (exporter-3 94/95, lopepage-2 7/7, 392/428 across a whole
// jumpgate output) prove the happy path. These cover what a real export does not
// contain: an ambiguous name, a rename that would collide, `$nk`, and the fixture text
// that a textual search-and-replace would corrupt.
//
//   bun test tests/tools/pid-match.test.ts
import { test, expect } from "bun:test";
import { remapPids } from "../../tools/lope-pid-match.ts";

/** A minimal module block in exporter-3's shape. */
const mod = (cells: Array<[pid: string, name: string | null, body: string, deps?: string[]]>) =>
  cells.map(([pid, name, body, deps = []]) =>
    `const ${pid} = function _f(${deps.join(",")}){return(\n${body}\n)};`).join("\n") +
  "\nfunction define(runtime, observer) {\n  const main = runtime.module();\n" +
  cells.map(([pid, name, , deps = []]) =>
    `  $def("${pid}", ${name === null ? "null" : JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`).join("\n") +
  "\n}\nexport default define;\n";

test("a named cell keeps the old pid even though the body was recompiled", () => {
  const oldSrc = mod([["_old1", "alpha", "1 + 1"]]);
  const newSrc = mod([["_new1", "alpha", "1  +  1"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(1);
  expect(report.matched[0]).toMatchObject({ pid: "_new1", oldPid: "_old1", how: "name" });
  // Both sites move together: the registration string and the holder binding.
  expect(src).toContain("const _old1 = function");
  expect(src).toContain(`$def("_old1", "alpha"`);
  expect(src).not.toContain("_new1");
});

test("an anonymous cell is matched on its normalised body", () => {
  // Observable writes `{return(x)}`, the exporter `{ return x; }` — sig() sees through it.
  const oldSrc = `const _oldA = function _1(md){return(\nmd\`hi\`\n)};\n` +
    `function define(runtime, observer) {\n  const main = runtime.module();\n` +
    `  $def("_oldA", null, ["md"], _oldA);\n}\nexport default define;\n`;
  const newSrc = `const _newA = function _1(md) { return md\`hi\`; };\n` +
    `function define(runtime, observer) {\n  const main = runtime.module();\n` +
    `  $def("_newA", null, ["md"], _newA);\n}\nexport default define;\n`;
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.matched).toEqual([{ pid: "_newA", oldPid: "_oldA", name: null, how: "body" }]);
  expect(src).toContain(`$def("_oldA", null`);
});

test("an unchanged pid is not reported as a change", () => {
  const same = mod([["_keep", "alpha", "1"]]);
  const { src, report } = remapPids(same, same);
  expect(report.changed).toBe(0);
  expect(src).toBe(same);
});

test("a duplicated name is left alone rather than guessed at", () => {
  const oldSrc = mod([["_o1", "dup", "1"], ["_o2", "dup", "2"]]);
  const newSrc = mod([["_n1", "dup", "1"], ["_n2", "dup", "2"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(0);
  expect(report.unmatched.map((u) => u.why)).toEqual(["name not unique in new", "name not unique in new"]);
  expect(src).toBe(newSrc);
});

test("two anonymous cells with the same body are left alone", () => {
  const oldSrc = mod([["_o1", null, "1"], ["_o2", null, "1"]]);
  const newSrc = mod([["_n1", null, "1"], ["_n2", null, "1"]]);
  const { report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(0);
});

test("a rename that would collide with another cell's pid is dropped, not applied", () => {
  // `beta` wants `_x`, which is already `alpha`'s pid in the new module and stays there
  // because `alpha` has no counterpart upstream. Two cells sharing a pid is worse than
  // churn: persistentIdToVariableRef is keyed by it.
  const oldSrc = mod([["_x", "beta", "2"]]);
  const newSrc = mod([["_x", "alpha", "1"], ["_y", "beta", "2"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(0);
  expect(report.dropped).toEqual([{ pid: "_y", oldPid: "_x", name: "beta", how: "name" }]);
  expect(src).toBe(newSrc);
});

test("a rename onto a non-pid top-level binding is dropped", () => {
  const oldSrc = mod([["_helper", "alpha", "1"]]);
  const newSrc = "const _helper = 42;\n" + mod([["_n1", "alpha", "1"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.dropped).toEqual([{ pid: "_n1", oldPid: "_helper", name: "alpha", how: "name" }]);
  expect(src).toBe(newSrc);
});

test("a pid that appears as fixture text inside a template is not rewritten", () => {
  // exporter-3's own suite asserts on the literal string `$def("_e3keep", …)`. A textual
  // rename would rewrite the fixture and the test would then assert on the wrong thing.
  const oldSrc = mod([["_e3keep", "alpha", "1"]]);
  const newSrc = mod([["_n1", "alpha", "1"], ["_n2", "test_x", "`  $def(\"_e3keep\", \"n\", [], _e3keep);`"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(1);
  // alpha took `_e3keep`; the fixture text that spells the same pid survives verbatim,
  // and `test_x`'s own registration still names `_n2`.
  expect(src).toContain('$def("_e3keep", "alpha"');
  expect(src).toContain('`  $def("_e3keep", "n", [], _e3keep);`');
  expect(src).toContain('$def("_n2", "test_x"');
});

test("a $nk cell carries the pid of every output variable", () => {
  const block = (p: string, q: string) =>
    `const ${p} = { body: "x" };\n` +
    `function define(runtime, observer) {\n  const main = runtime.module();\n` +
    `  $nk("${p}", "viewof v", ${p}, [["${q}", "v"]]);\n}\nexport default define;\n`;
  const { src, report } = remapPids(block("_n1", "_n2"), block("_o1", "_o2"));
  expect(report.changed).toBe(2);
  expect(src).toContain(`$nk("_o1", "viewof v", _o1, [["_o2", "v"]]);`);
});

test("a cell absent upstream keeps its fresh pid", () => {
  const oldSrc = mod([["_o1", "alpha", "1"]]);
  const newSrc = mod([["_n1", "alpha", "1"], ["_n2", "brandnew", "2"]]);
  const { src, report } = remapPids(newSrc, oldSrc);
  expect(report.changed).toBe(1);
  expect(report.unmatched).toEqual([{ pid: "_n2", name: "brandnew", why: "name absent or not unique in old" }]);
  expect(src).toContain(`$def("_n2", "brandnew"`);
});

test("remapping is idempotent", () => {
  const oldSrc = mod([["_o1", "alpha", "1"], ["_o2", "beta", "2"]]);
  const newSrc = mod([["_n1", "alpha", "1"], ["_n2", "beta", "2"]]);
  const once = remapPids(newSrc, oldSrc);
  const twice = remapPids(once.src, oldSrc);
  expect(twice.report.changed).toBe(0);
  expect(twice.src).toBe(once.src);
});
