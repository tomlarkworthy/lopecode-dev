// cd lite && bun test toolchain/tc.test.ts: the tc cells are accepted by the live checker, their names are their own
// across every .ss.ts file, the toolchain's test files pass with the cells in place of the shipped functions (and fail
// with a broken cell), and tc-diff.ts finds no call where the cells and today's functions differ.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources } from "../core.ts";
import { parse, type Node } from "../parse.ts";
import { splitCells } from "./ss-toolchain.ts";
import { TC_FILES } from "./tc-index.ts";
import { IX_FILES, OW_FILES, MD_FILES } from "../infer-ss.ts";

const LITE = join(import.meta.dir, "..");
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const texts = (f: string) => { const s = readFileSync(join(LITE, f), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const declared = (st: Node): string => {
  const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  return d.type === "VariableDeclaration" ? d.declarations[0].id.name : d.id.name;
};
// the sections the tc cells take cells of: the acorn cells, and md-facts with the infer sections it is checked with
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts",
  ...[...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`)];

test("TC_FILES is every tc-*.ss.ts file", () => {
  expect([...new Glob("tc-*.ss.ts").scanSync(import.meta.dir)].sort()).toEqual([...TC_FILES].sort());
});
test("every tc cell is accepted by the checker", () => {
  const tc = TC_FILES.map((f) => `toolchain/${f}`);
  const shell = ["acorn/acorn-shell.ts", "toolchain/tc-shell.ts"].map((f) => readFileSync(join(LITE, f), "utf8")).join("\n");
  const r = checkSources({ cells: [...WITH, ...tc].flatMap(texts).join("\n\n"), tsx: true, shell });
  const own = new Set(tc.flatMap(texts).map((t) => parse(t).program.body[0]).filter((st) => (st.type === "ExportNamedDeclaration" ? st.declaration : st).type === "VariableDeclaration").map(declared));
  const mine = r.cells.filter((c: { name: string }) => own.has(c.name));
  expect(r.module).toEqual([]);
  expect(mine.length).toBe(own.size);
  expect(mine.filter((c: { status: string }) => c.status !== "ok").map((c: { name: string; status: string; errors: { msg: string }[] }) => `${c.name}: ${c.status} ${c.errors.map((e) => e.msg).join("; ")}`)).toEqual([]);
}, 600000);
test("no name declared in a tc file is declared in another .ss.ts file, and each starts with tc or Tc", () => {
  const ROOT = join(LITE, "..");
  const where = new Map<string, string[]>();
  for (const f of new Glob("lite/**/*.ss.ts").scanSync(ROOT)) {
    // selfhost/** is skipped: prototype agents keep copies of the lite tree there (opaque-handles, effect-runner)
    // selfhost/opaque-handles/{base,proto}/lite is another agent's copy of lite/, tc files included
    if (f.includes("node_modules") || f.includes(".scratch") || (f.startsWith("selfhost/") && f.includes("/lite/"))) continue;
    let body: Node[];
    try { body = parse(readFileSync(join(ROOT, f), "utf8")).program.body; } catch { expect(f.startsWith("lite/toolchain/")).toBe(false); continue; }
    for (const st of body) where.set(declared(st), [...(where.get(declared(st)) ?? []), f]);
  }
  const mine = [...where].filter(([, fs]) => fs.some((f) => f.startsWith("lite/toolchain/tc-")));
  expect(mine.filter(([, fs]) => fs.length > 1)).toEqual([]);
  expect(mine.map(([n]) => n).filter((n) => !/^(tc|Tc)[A-Z]/.test(n))).toEqual([]);
});

// the owner's shape rules on the AST: no `!`, no cast, no module state; every ===/!== between two non-literals is listed
// here after reading it (all compare strings, numbers or booleans: names, nids, positions, lengths), so a new one fails
const EQ_READ = 28;
test("tc cells: no non-null assertion or cast, nothing at the top but const cells and types, the equalities read", () => {
  const kids = (n: any): any[] => Object.entries(n).flatMap(([, v]) => (Array.isArray(v) ? v : [v])).filter((v: any) => v && typeof v === "object" && typeof v.type === "string");
  const lit = (n: any) => n.type === "Literal" || n.type === "TemplateLiteral" || n.type === "UnaryExpression" || (n.type === "Identifier" && n.name === "undefined");
  const bad: string[] = [];
  let eq = 0;
  for (const f of TC_FILES) {
    const src = readFileSync(join(import.meta.dir, f), "utf8");
    const body = parse(src).program.body;
    for (const st of body) {
      const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
      if (d.type === "VariableDeclaration" ? d.kind !== "const" : d.type !== "TSTypeAliasDeclaration") bad.push(`${f}: top-level ${d.type}`);
    }
    const todo: any[] = [...body];
    while (todo.length) {
      const n = todo.pop();
      if (["TSNonNullExpression", "TSAsExpression", "TSTypeAssertion", "TSSatisfiesExpression"].includes(n.type)) bad.push(`${f}: ${n.type} ${src.slice(n.start, n.end)}`);
      if (n.type === "BinaryExpression" && (n.operator === "===" || n.operator === "!==") && !lit(n.left) && !lit(n.right)) eq++;
      todo.push(...kids(n));
    }
  }
  expect(bad).toEqual([]);
  expect(eq).toBe(EQ_READ);
});

// the shipped test files, their toolchain imports resolved to tc-shim.ts (tc-preload.ts)
const runTest = (file: string, control: string | null) => {
  const p = Bun.spawnSync(["bun", "--preload", join(import.meta.dir, "tc-preload.ts"), join(LITE, file)], { cwd: LITE, env: { ...process.env, TC_CONTROL: control ?? "", TC_SHOW: "1" } });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
};
// each file with the control that breaks it (tc-shim.ts CONTROLS)
const FILES: [string, string][] = [["toolchain/ss-toolchain.test.ts", "edits"], ["toolchain/roundtrip-edge.test.ts", "args"], ["toolchain/translate.test.ts", "ownthis"],
  ["toolchain/comment-types.test.ts", "lang"], ["browser/erase.test.ts", "edits"], ["toolchain/ojs-roundtrip.test.ts", "lang"]];
for (const [file, control] of FILES) {
  test(`${file} passes on the tc cells and fails with the ${control} control`, () => {
    const on = runTest(file, null);
    expect(on.out).toContain("-> tc-shim.ts");
    expect(on.code).toBe(0);
    expect(runTest(file, control).code).not.toBe(0);
  }, 300000);
}

const counts = (out: string, prefix: string) => {
  const l = out.split("\n").find((x) => x.startsWith(prefix)) ?? "";
  const n = (k: string) => Number(l.split(`${k} `)[1]?.split(" ")[0] ?? NaN);
  return { same: n("SAME"), different: n("DIFFERENT"), notCovered: n("NOT COVERED") };
};
test("tc-diff.ts on the toolchain sources: no call differs; every control differs", () => {
  const p = Bun.spawnSync(["bun", join(import.meta.dir, "tc-diff.ts"), "--only", "toolchain", "--controls"], { cwd: join(LITE, "..") });
  const out = p.stdout.toString() + p.stderr.toString();
  const main = counts(out, "corpus calls, repro rows left out: ");
  // the one known difference is today's erase bug (repro/erase-optional-comment.ts); nothing else in the repro rows
  expect(counts(out, "all calls: ").different).toBe(1);
  expect(counts(out, "  erase (repro) ").different).toBe(1);
  expect(main.different).toBe(0);
  expect(main.notCovered).toBe(0);
  expect(main.same).toBeGreaterThan(10000);
  const controls = out.split("\n").filter((l) => l.startsWith("control "));
  expect(controls.length).toBe(9);
  // tcOptionalCut is met only in lite/toolchain/repro on these sources; the full corpus has 18 (NOTES.md)
  for (const l of controls.filter((l) => !l.includes("tcOptionalCut"))) expect(counts(l.slice(l.indexOf("): ") + 3), "").different).toBeGreaterThan(0);
}, 900000);
