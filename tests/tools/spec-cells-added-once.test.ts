// The build adds eight cells to the spec module: specStatus (carried from the previous build, carryCells) and the
// built_* cells (spec-as-built-short.md, patchSpec). Since its seed was deleted (i13600, 2026-10-18) the module is
// what cb4 serves, which already has them: each is added only when the module lacks it, so the build's spec is the
// same with them as without them. The cells are cut out of the module with acorn (defsOf of spec-patch.ts).
//
//   bun test ./tests/tools/spec-cells-added-once.test.ts
import { expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as acorn from "../../tools/node_modules/acorn/dist/acorn.mjs";
import { blockContent } from "../../tools/lib/notebook-blocks.ts";
import { carryCells, defsOf, patchSpec, SPEC } from "../../tools/cloud-brain/spec-patch.ts";
import { running, testNeedingRunning } from "./needs";

const ROOT = resolve(import.meta.dir, "../..");
const ADDED = ["viewof specStatus", "specStatus", "built_summary", "built_exists", "built_verified", "built_not_verified", "built_not_built", "built_limits"];
const { test } = testNeedingRunning("spec-cells-added-once.test.ts", "cloud-brain-specs", [resolve(ROOT, SPEC.first)]);
// As build.ts reads it, and the module it carries from when there is no previous build.
const served = () => readFileSync(running("cloud-brain-specs"), "utf8").replace(/\n?$/, "\n");
const first = () => blockContent(readFileSync(resolve(ROOT, SPEC.first), "utf8"), SPEC.was)!;
const build = (src: string, from: string) => patchSpec(carryCells(src, from, SPEC));
const names = (src: string) => new Set(defsOf(src).map((d) => d.name));

// The module without the eight: the two as-built spans patchSpec writes (consts, $defs), then specStatus's.
function without(src: string): string {
  for (let open = src.indexOf("// <as-built>\n"); open >= 0; open = src.indexOf("// <as-built>\n"))
    src = src.slice(0, open) + src.slice(src.indexOf("// </as-built>\n", open) + "// </as-built>\n".length);
  const defs = defsOf(src).filter((d) => d.name?.endsWith("specStatus"));
  const pids = new Set(defs.map((d) => d.pid));
  const ast: any = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const consts = ast.body.filter((n: any) => n.type === "VariableDeclaration" && pids.has(n.declarations[0].id.name));
  const cuts = [...defs, ...consts].map((n: any) => ({ start: src.lastIndexOf("\n", n.start) + 1, end: src.indexOf("\n", n.end) + 1 })).sort((a, b) => b.start - a.start);
  for (const c of cuts) src = src.slice(0, c.start) + src.slice(c.end);
  return src;
}

test("the served module has the eight, and the build leaves it as it is", () => {
  for (const name of ADDED) expect([name, names(served()).has(name)]).toEqual([name, true]);
  expect(build(served(), first())).toBe(served());
  expect(build(build(served(), first()), first())).toBe(served());
});

test("a module without the eight gets them, and the same module as one that had them", () => {
  const stub = without(served());
  for (const name of ADDED) expect([name, names(stub).has(name)]).toEqual([name, false]);
  expect(stub.includes("// <as-built>")).toBe(false);
  const built = build(stub, first());
  for (const name of ADDED) expect([name, names(built).has(name)]).toEqual([name, true]);
  expect(built).toBe(build(served(), first()));
});
