// bun test lite/infer: the port's cells are accepted by the live checker, their names are their own across every
// .ss.ts file, and diff.ts finds no cell where the port and the real Checker differ (and does find the control's).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources } from "../core.ts";
import { parse, type Node } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { IX_FILES } from "./index.ts";

const LITE = join(import.meta.dir, "..");
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const texts = (f: string) => { const s = readFileSync(join(LITE, f), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const WITH = ["types.ss.ts", "subtype.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts"];

test("IX_FILES is every .ss.ts file of lite/infer", () => {
  expect([...new Glob("*.ss.ts").scanSync(import.meta.dir)].sort()).toEqual([...IX_FILES].sort());
});
test("every ix cell is accepted by the checker", () => {
  const ix = IX_FILES.map((f) => `infer/${f}`);
  const r = checkSources({ cells: [...WITH, ...ix].flatMap(texts).join("\n\n"), tsx: true, shell: readFileSync(join(LITE, "acorn/acorn-shell.ts"), "utf8") });
  // a type declaration is no cell of the result; a problem with one is a module error
  const own = new Set(ix.flatMap(texts).map((t) => parse(t).program.body[0]).filter((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st).type === "VariableDeclaration").map(declared));
  const mine = r.cells.filter((c: { name: string }) => own.has(c.name));
  expect(r.module).toEqual([]);
  expect(mine.length).toBe(own.size);
  expect(mine.filter((c: { status: string }) => c.status !== "ok").map((c: { name: string; status: string; errors: { msg: string }[] }) => `${c.name}: ${c.status} ${c.errors.map((e) => e.msg).join("; ")}`)).toEqual([]);
}, 120000);

function declared(st: Node): string {
  const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  return d.type === "VariableDeclaration" ? d.declarations[0].id.name : d.id.name;
}
test("no name declared in lite/infer is declared in another .ss.ts file", () => {
  const ROOT = join(LITE, "..");
  const where = new Map<string, string[]>();
  for (const f of new Glob("{lite,selfhost}/**/*.ss.ts").scanSync(ROOT)) {
    if (f.includes("node_modules") || f.includes(".scratch")) continue;
    // a file that does not parse declares nothing a cell could take (selfhost/repro-unknown-class.ss.ts)
    let body: Node[];
    try { body = parse(readFileSync(join(ROOT, f), "utf8")).program.body; } catch { expect(f.startsWith("lite/infer/")).toBe(false); continue; }
    for (const st of body) {
      const n = declared(st);
      where.set(n, [...(where.get(n) ?? []), f]);
    }
  }
  const clash = [...where].filter(([, fs]) => fs.some((f) => f.startsWith("lite/infer/")) && fs.length > 1);
  expect(clash).toEqual([]);
});

const diff = (...args: string[]) => {
  const p = Bun.spawnSync(["bun", join(import.meta.dir, "diff.ts"), "--show", "3", "--out", join(LITE, "soundscript/.scratch/infer-port/diff-test.json"), ...args]);
  return p.stdout.toString() + p.stderr.toString();
};
const counts = (out: string, has: string) => {
  const line = out.split("\n").find((l) => l.includes(has)) ?? "";
  const n = (k: string) => Number(line.split(`${k} `)[1]?.split(" ")[0] ?? NaN);
  return { same: n("SAME"), different: n("DIFFERENT"), notCovered: n("NOT COVERED") };
};
test("the port and the Checker agree on the corpus and the probes; the control differs", () => {
  const out = diff("--control", "--file", join(import.meta.dir, "probes/wide.ts"), "--file", join(import.meta.dir, "probes/wide-state.ts"));
  const main = counts(out, " sources, ");
  expect(main.different).toBe(0);
  expect(main.same).toBeGreaterThan(3000);
  expect(counts(out, "control (").different).toBeGreaterThan(0);
  expect(out).toContain("sources whose result the port's run changed: 0");
}, 120000);
