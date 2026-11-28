// cd lite && bun test infer/cp.test.ts: the cp cells (completion and cell facts) are accepted by the live checker,
// their names are their own (prefix cp) across every .ss.ts file, complete.test.ts's 58 cases pass on them, and
// cp-diff.ts finds no difference from complete.ts and facts.ts while each control's broken cell makes one.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources } from "../core.ts";
import { parse, type Node } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { IX_FILES, OW_FILES, MD_FILES } from "../infer-ss.ts";
import { CP_FILES } from "./cp-index.ts";

const LITE = join(import.meta.dir, "..");
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const texts = (f: string) => { const s = readFileSync(join(LITE, f), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
function declared(st: Node): string {
  const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  return d.type === "VariableDeclaration" ? d.declarations[0].id.name : d.id.name;
}
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
const CP = CP_FILES.map((f) => `infer/${f}`);

test("CP_FILES is every cp-*.ss.ts file of lite/infer", () => {
  expect([...new Glob("cp-*.ss.ts").scanSync(import.meta.dir)].sort()).toEqual([...CP_FILES].sort());
});

test("every cp cell is accepted by the checker", () => {
  const infer = [...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`);
  const r = checkSources({ cells: [...WITH, ...infer, ...CP].flatMap(texts).join("\n\n"), tsx: true, shell: readFileSync(join(LITE, "acorn/acorn-shell.ts"), "utf8") });
  const own = new Set(CP.flatMap(texts).map((t) => parse(t).program.body[0]).filter((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st).type === "VariableDeclaration").map(declared));
  const mine = r.cells.filter((c) => own.has(c.name));
  expect(r.module).toEqual([]);
  expect(mine.length).toBe(own.size);
  expect(mine.filter((c) => c.status !== "ok").map((c) => `${c.name}: ${c.status} ${c.errors.map((e) => e.msg).join("; ")}`)).toEqual([]);
}, 600000);

test("every name declared in a cp file starts with cp and is declared in no other .ss.ts file", () => {
  const ROOT = join(LITE, "..");
  const where = new Map<string, string[]>();
  for (const f of new Glob("lite/**/*.ss.ts").scanSync(ROOT)) {
    // selfhost/** is skipped: prototype agents keep copies of the lite tree there (opaque-handles, effect-runner)
    if (f.includes("node_modules") || f.includes(".scratch")) continue;
    // a copy of the lite tree under selfhost/ (selfhost/opaque-handles/*/lite/, 2026-11-22) holds copies of these files
    if (f.startsWith("selfhost/") && f.includes("/lite/")) continue;
    // a file that does not parse (another agent's, half written) declares nothing a cell could take
    let body: Node[];
    try { body = parse(readFileSync(join(ROOT, f), "utf8")).program.body; } catch { expect(f.startsWith("lite/infer/cp-")).toBe(false); continue; }
    for (const st of body) { const n = declared(st); where.set(n, [...(where.get(n) ?? []), f]); }
  }
  const mine = [...where].filter(([, fs]) => fs.some((f) => f.startsWith("lite/infer/cp-")));
  expect(mine.length).toBeGreaterThan(40);
  expect(mine.filter(([n]) => !n.toLowerCase().startsWith("cp"))).toEqual([]);
  expect(mine.filter(([, fs]) => fs.length > 1)).toEqual([]);
}, 120000);

// until 2026-11-22 a --preload (cp-redirect.ts) sent complete.test.ts's import to cp-index.ts; complete.ts is the cells now
test("complete.test.ts's cases pass on the cells", () => {
  const p = Bun.spawnSync(["bun", join(LITE, "complete.test.ts")], { cwd: LITE });
  const out = p.stdout.toString() + p.stderr.toString();
  expect(out).toContain("58 pass, 0 fail");
  expect(p.exitCode).toBe(0);
}, 300000);

test("cp-diff.ts: no difference on a seventh of the positions and on the facts; each control differs", () => {
  const p = Bun.spawnSync(["bun", join(import.meta.dir, "cp-diff.ts"), "--quick", "--controls", "--show", "3", "--out", join(LITE, "soundscript/.scratch/cp-port/cp-diff-test.json")], { cwd: join(LITE, "..") });
  const out = p.stdout.toString() + p.stderr.toString();
  const line = (has: string) => out.split("\n").find((l) => l.includes(has)) ?? "";
  const n = (l: string, k: string) => parseInt(l.split(`${k} `)[1] ?? "", 10);
  // S4 (2026-11-22): the codemod dropped mut/freeze/borrow calls from the corpus, 6385 -> 6099 positions
  // 5013d689 (2026-11-26): the Mandelbrot zoom, in 07-workers.tsx and its copy accept-compile/cells.tsx, 344 -> 532 each, 6099 -> 6475
  expect(out).toContain("complete-diff.ts positions 6475");
  const c = line("completion: ");
  expect(n(c, "DIFFERENT")).toBe(0);
  expect(n(c, "SAME")).toBeGreaterThan(2000);
  expect(n(line("addParameter / annotationOf: "), "DIFFERENT")).toBe(0);
  const f = line("facts: ");
  expect(n(f, "DIFFERENT")).toBe(0);
  expect(f.split("sets SAME")[1]?.includes("DIFFERENT 0 ")).toBe(true);
  const controls = out.split("\n").filter((l) => l.startsWith("control "));
  expect(controls.length).toBe(5);
  for (const l of controls) expect(n(l, "DIFFERENT")).toBeGreaterThan(0);
}, 900000);

// the position of the cursor read on the Lezer tree (cp-lezer.ts, 2026-11-22), in text that does not parse: the mode
// and an option that must be there ("" for none) or must not (a leading "!")
import { completionsAt } from "../complete.ts";
import { cpLezerAt } from "./cp-lezer.ts";
import { linkCp } from "./cp-index.ts";
const AT: [string, string, string][] = [
  ["const f = (x: { readonly a: number }) => x.‸", "member", "a"],
  ["const f = (x: { readonly a: number }) => x?.‸", "member", "a"],
  ["const f = (x: { readonly a: number }) => x. ‸", "member", "a"],
  ["const f = (x) => { if (x.‸", "member", ""],
  ["const f = (co‸", "param", "count"],
  ["const f = (‸", "param", "count"],
  ["const f = (a, ‸", "param", "count"],
  ["const f = async (‸", "param", "count"],
  ["function f(‸", "param", "count"],
  ["const f = function (‸", "param", "count"],
  ["export const f = (‸", "param", "count"],
  ["const f = (count, ‸", "param", "!count"],
  ["const f = (x = 1, ‸", "param", "count"],
  ["const f = ([a], ‸", "param", "count"],
  ["const f = ({ a }, ‸", "param", "count"],
  ["const f = (cb = () => 1, co‸", "param", "count"],
  ["/* a */ x /* b */ const f = (co‸", "name", ""],
  ["const f = (x: ‸", "type", "number"],
  ["const f = (x: Ma‸", "type", "Map"],
  ["const f = (x: number): ‸", "type", "string"],
  ["const f = (x: { a: ‸", "type", "number"],
  ["const f = (x: Map<string, ‸", "type", "number"],
  ["const f = (x: number = ‸", "name", ""],
  ["const f = (a: number, b: string) => (‸", "name", ""],
  ["const f = (x: { readonly a: number }) => `http://h/${x.‸", "member", "a"],
  ["const f = (x: { readonly a: number }) => `don't ${x.‸", "member", "a"],
  ["const f = () => `tpl ${ ‸", "name", ""],
  ['const f = () => "str‸', "none", ""],
  ["const f = () => 'str‸", "none", ""],
  ["const f = () => 1; // comm‸", "none", ""],
  ["const f = () => 1; /* comm‸", "none", ""],
  ["const f = () => `tpl ‸", "none", ""],
  ["const f = () => `a ${1} b‸", "none", ""],
  ["const f = (x: { readonly a: number }) => ({ ...‸", "none", ""],
  ["const f = () => [...‸", "none", ""],
  ["const f = () => 1.‸", "none", ""],
  ["const f = () => <div ‸", "jsx", "class"],
  ['const f = () => <div class="a" ‸', "jsx", "!class"],
  ["const f = () => <div cl‸", "jsx", "class"],
  ["const f = () => <div class={1} ‸", "jsx", "!class"],
  ['const f = () => <div class="‸', "none", ""],
  ["const f = () => <div class=‸", "name", ""],
  ["const f = () => <div class={‸", "name", ""],
  ["const f = () => <Foo ‸", "name", ""],
  ["const f = () => <div>text ‸", "name", ""],
  ["const f = (x: number) => x as ‸", "name", ""],
  ["const f = () => foo(1, ‸", "name", ""],
];
test("completion modes at cursor positions in incomplete text", () => {
  const got = AT.map(([t, mode, label]) => {
    const r = completionsAt(["const count = () => 1;", t.split("‸").join("")], 1, t.indexOf("‸"), true);
    const labels = r.options.map((o) => o.label);
    const ok = r.mode === mode && (label === "" || (label.startsWith("!") ? !labels.includes(label.slice(1)) : labels.includes(label)));
    return ok ? "ok" : `${t}: ${r.mode} ${JSON.stringify(labels.slice(0, 8))}`;
  });
  expect(got.filter((g) => g !== "ok")).toEqual([]);
}, 120000);
test("the brackets open at the end of a text, innermost first, from the tree", () => {
  const L = linkCp();
  const closers = (t: string) => L.cpScan(t, cpLezerAt(t, t.length, true)).closers;
  expect(closers("f(a, [1, {b: `x ${y")).toEqual(["}", "`", "}", "]", ")"]);
  expect(closers("if (a) { g(")).toEqual([")", "}"]);
  expect(closers("const s = `http://h/${a.")).toEqual(["}", "`"]);
  expect(closers("x = f(a) + [1]")).toEqual([]);
  expect(L.cpScan("x = `a ${b} c", cpLezerAt("x = `a ${b} c", 13, true)).quoted).toBe(true);
});
