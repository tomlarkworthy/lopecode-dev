// bun test infer/rg.test.ts (from lite): the registry cells are accepted by the live checker, their names are their
// own across every .ss.ts file, and rg-diff.ts finds no difference from registry.ts on the corpus and the probes while
// each control differs at the registry level.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources } from "../core.ts";
import { parse, type Node } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { RG_FILES } from "./rg-index.ts";

const LITE = join(import.meta.dir, "..");
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const texts = (f: string) => { const s = readFileSync(join(LITE, f), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
// the sections the rg cells take types and cells of
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts"];
function declared(st: Node): string {
  const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  return d.type === "VariableDeclaration" ? d.declarations[0].id.name : d.id.name;
}

test("RG_FILES is every rg-*.ss.ts file of lite/infer", () => {
  expect([...new Glob("rg-*.ss.ts").scanSync(import.meta.dir)].sort()).toEqual([...RG_FILES].sort());
});
test("every rg cell is accepted by the checker", () => {
  const rg = RG_FILES.map((f) => `infer/${f}`);
  const r = checkSources({ cells: [...WITH, ...rg].flatMap(texts).join("\n\n"), tsx: true, shell: readFileSync(join(LITE, "acorn/acorn-shell.ts"), "utf8") });
  const own = new Set(rg.flatMap(texts).map((t) => parse(t).program.body[0]).filter((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st).type === "VariableDeclaration").map(declared));
  const mine = r.cells.filter((c) => own.has(c.name));
  expect(r.module).toEqual([]);
  expect(mine.length).toBe(own.size);
  expect(mine.filter((c) => c.status !== "ok").map((c) => `${c.name}: ${c.status} ${c.errors.map((e) => e.msg).join("; ")}`)).toEqual([]);
}, 300000);
test("no name declared in an rg file is declared in another .ss.ts file", () => {
  const ROOT = join(LITE, "..");
  const where = new Map<string, string[]>();
  for (const f of new Glob("{lite,selfhost}/**/*.ss.ts").scanSync(ROOT)) {
    if (f.includes("node_modules") || f.includes(".scratch")) continue;
    let body: Node[];
    try { body = parse(readFileSync(join(ROOT, f), "utf8")).program.body; } catch { continue; }
    for (const st of body) { const n = declared(st); where.set(n, [...(where.get(n) ?? []), f]); }
  }
  // a copy of the lite tree elsewhere (selfhost/opaque-handles/proto/lite/, 2026-11-21) holds the same file: not a clash
  const mine = (f: string) => f.startsWith("lite/infer/rg-");
  const copyOfMine = (f: string) => /(^|\/)lite\/infer\/rg-[a-z]+\.ss\.ts$/.test(f);
  const clash = [...where].filter(([, fs]) => fs.some(mine) && fs.some((f) => !copyOfMine(f)));
  expect(clash).toEqual([]);
  for (const [n, fs] of where) if (fs.some(mine)) expect(n.startsWith("rg") || n.startsWith("Rg") || n.startsWith("RG_")).toBe(true);
});

const diff = (...args: string[]) => {
  const p = Bun.spawnSync(["bun", join(import.meta.dir, "rg-diff.ts"), "--show", "3", "--out", join(LITE, "soundscript/.scratch/rg-port/rg-diff-test.json"), ...args]);
  return p.stdout.toString() + p.stderr.toString();
};
const counts = (line: string) => {
  const n = (k: string) => Number(line.split(`${k} `)[1]?.split(" ")[0] ?? NaN);
  return { same: n("SAME"), different: n("DIFFERENT"), notCovered: n("NOT COVERED") };
};
test("registry.ts and the rg cells agree on the corpus, registry level and end to end", () => {
  const out = diff("--skip-big");
  const reg = counts(out.split("\n").find((l) => l.startsWith("registry level:")) ?? "");
  const e2e = counts(out.split("\n").find((l) => l.startsWith("end to end:")) ?? "");
  expect(reg.different).toBe(0);
  expect(reg.same).toBeGreaterThan(60000);
  expect(e2e.different).toBe(0);
  expect(e2e.same).toBeGreaterThan(950);
  // all from the probes other-forms and no-return-type (Other nodes in the typed tree)
  expect(reg.notCovered).toBe(33);
  expect(e2e.notCovered).toBe(2);
}, 600000);
test("on the probes each control differs at the registry level", () => {
  const out = diff("--only", "rgprobe:", "--controls");
  const reg = counts(out.split("\n").find((l) => l.startsWith("registry level:")) ?? "");
  expect(reg.different).toBe(0);
  expect(reg.notCovered).toBe(33);
  const controls = out.split("\n").filter((l) => l.startsWith("control (") && l.includes(") registry level:"));
  expect(controls.length).toBe(8);
  for (const l of controls) expect(counts(l).different).toBeGreaterThan(0);
}, 600000);
