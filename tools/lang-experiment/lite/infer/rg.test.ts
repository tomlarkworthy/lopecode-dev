// bun test infer/rg.test.ts (from lite): the registry cells are accepted by the live checker, their names are their
// own across every .ss.ts file, and rg-diff.ts finds no difference from registry.ts on the corpus and the probes while
// each control differs at the registry level.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources, runCheck, mdRegistry, RG, GAP_RULE, type Sources } from "../core.ts";
import { linkMd, mdCheckSources } from "../infer-ss.ts";
import { parseTree, type AstNode, type Parse } from "../acorn/index.ts";
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
  for (const f of new Glob("lite/**/*.ss.ts").scanSync(ROOT)) {
    // selfhost/** is skipped: prototype agents keep copies of the lite tree there (opaque-handles, effect-runner)
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
  // the probes other-forms and no-return-type were 33 and 2 until the typed tree read their forms (2026-11-22)
  expect(reg.notCovered).toBe(0);
  expect(e2e.notCovered).toBe(0);
}, 600000);
test("on the probes each control differs at the registry level", () => {
  const out = diff("--only", "rgprobe:", "--controls");
  const reg = counts(out.split("\n").find((l) => l.startsWith("registry level:")) ?? "");
  expect(reg.different).toBe(0);
  expect(reg.notCovered).toBe(0);
  const controls = out.split("\n").filter((l) => l.startsWith("control (") && l.includes(") registry level:"));
  expect(controls.length).toBe(8);
  for (const l of controls) expect(counts(l).different).toBeGreaterThan(0);
}, 600000);

// A form the registry cells do not read (a gap) is a loud rejection on the shipped path (core.ts runCheck), never a
// skipped check. The typed tree now reads every form the corpus and the probes hold, so the gap is made here: a
// parseTree that turns one node of a parse into Other, handed to the md cells (linkMd's given) and to the glue (RG).
const otherAt = (want: (n: AstNode) => boolean) => (text: string, jsx: boolean): Parse => {
  const p = parseTree(text, jsx);
  if (!p.ok) return p;
  let done = false;
  const swap = (n: AstNode): AstNode => {
    if (!done && want(n)) { done = true; return { type: "Other", nid: n.nid, start: n.start, end: n.end, line: n.line, kind: n.type, fields: [], props: [] }; }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) out[k] = Array.isArray(v) ? v.map((x) => (x && typeof x === "object" && "nid" in x ? swap(x as AstNode) : x)) : v && typeof v === "object" && "nid" in v ? swap(v as AstNode) : v;
    return out as AstNode;
  };
  return { ok: true, ast: { ...p.ast, program: swap(p.ast.program) } };
};
const withOther = (want: (n: AstNode) => boolean, src: Sources) => {
  const pt = otherAt(want);
  return runCheck(linkMd({}, { parseTree: pt }).mdCheckSources, src, {}, { ...RG, parseTree: pt }).result;
};
const gapErrs = (c: { errors: { rule: string; msg: string }[] }) => c.errors.filter((e) => e.rule === GAP_RULE);
const isNum = (n: AstNode) => n.type === "TSNumberKeyword";
test("a gap rejects the cell it is met in, the cells after it, and a module whose declarations hold one", () => {
  const a = withOther(isNum, { cells: "export const f = () => (x: { a: number }) => x.a;\nexport const g = () => 1;" });
  expect(a.cells.map((c) => [c.name, c.status, gapErrs(c).length])).toEqual([["f", "rejected", 1], ["g", "rejected", 1]]);
  expect(gapErrs(a.cells[0]!)[0]!.msg).toContain("TSNumberKeyword");
  // a user declaration two cells use
  const b = withOther(isNum, { cells: "type T = { a: number };\nexport const f = () => (x: T) => x.a;\nexport const g = () => (x: T) => x.a;" });
  expect(b.ok).toBe(false);
  expect(b.cells.every((c) => c.status === "rejected" && gapErrs(c).length === 1)).toBe(true);
  // foreign.d.ts with no cell: a module error
  const c = withOther(isNum, { cells: "", foreign: "declare const v: number;" });
  expect(c.ok).toBe(false);
  expect(c.module.filter((e) => e.rule === GAP_RULE).length).toBe(1);
  // the same sources with no Other node: no gap
  const ok = runCheck(mdCheckSources, { cells: "type T = { a: number };\nexport const f = () => (x: T) => x.a;\nexport const g = () => 1;" });
  expect([ok.rgGap, ok.result.ok, ok.result.cells.map((x) => x.status)]).toEqual([null, true, ["ok", "ok"]]);
});
test("a gap met inside a peek (quiet) is still reported", () => {
  const pt = otherAt(isNum);
  const R = mdRegistry(true, null, { ...RG, parseTree: pt });
  const ast = pt("type T = { a: number };", false);
  if (!ast.ok) throw new Error(ast.message);
  R.loadUser(ast.ast, false, []);
  const { ix } = R.cell(0);
  ix.quiet.expand({ k: "named", n: "T", args: [] });
  ix.drain();
  R.finish();
  expect(R.gaps.map((g) => g.at)).toEqual([0]);
});
