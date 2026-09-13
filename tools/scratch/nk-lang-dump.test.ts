// Dump each authored notebook-kit node: mode, source, grouped variables and their roles.
// run: bun test tools/scratch/nk-lang-dump.test.ts
import { test } from "bun:test";
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { importNotebookModule } from "../notebook-import.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"])
  (globalThis as any)[k] = (window as any)[k];
(globalThis as any).document = window.document;
process.on("unhandledRejection", () => {});

test("dump", async () => {
  const realizeFallback = async (sources: string[]) =>
    sources.map((src) => {
      let f: any;
      eval("f = " + src);
      return f;
    });
  const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
    overrides: {
      kit: { transpileJavaScript, transpileObservable, define },
      Runtime,
      realize: realizeFallback,
      runtime: { _global: () => undefined }
    }
  });
  const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const groupCells = await cm.value("groupCells");
  const a = await cm.value("runtimeAccessors");
  const roleOf = await cm.value("roleOf");
  const fixture = await nk.value("nkFixture");
  const doc = await nk.value("nkFixtureDoc");
  const vars = [...fixture.module._runtime._variables].filter((v: any) => v._module === fixture.module);
  const named = new Map(vars.filter((v: any) => v._name != null).map((v: any) => [String(v._name), v]));
  const cells = groupCells(vars, a).get(fixture.module);
  for (const d of doc) console.log("DOC", JSON.stringify(d).slice(0, 160));
  for (const c of cells)
    console.log(
      "CELL", c.type, JSON.stringify(c.lang), "|",
      c.variables.map((v: any) => `${v._name}:${roleOf(v, a, (n: string) => named.get(n))}`).join(", ")
    );
  nk.dispose();
  cm.dispose();
});
