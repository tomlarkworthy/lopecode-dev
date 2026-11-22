// bun lite/oracle.ts [--no-mutants] [--quick]
// Compares lite (lite/check.ts) with the existing harness (check.ts, TypeScript + lint) on every fixture,
// the three ports, and mutants of the ports, and prints the tables in lite/README.md.
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPort, type LiteResult } from "./check.ts";
import { parse, type Node } from "./parse.ts";
import { kids } from "./parse.ts";
import { specRejects } from "./soundscript/spec-cases.ts";
import { checkSources } from "./core.ts";

const LITE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(LITE);
const args = process.argv.slice(2);
const MUTANTS = !args.includes("--no-mutants");
const SCRATCH = process.env.LITE_SCRATCH ?? join(LITE, ".oracle-scratch"); // deleted and rewritten on every run

type OracleCell = { name: string; rules: string[] };
type Oracle = { cells: Map<string, OracleCell>; module: string[]; ms: number };
function oracle(dir: string): Oracle {
  const t0 = performance.now();
  const p = Bun.spawnSync(["bun", "check.ts", dir, "--json"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const ms = performance.now() - t0;
  const j = JSON.parse(p.stdout.toString());
  const cells = new Map<string, OracleCell>();
  for (const c of j.cells) if (c.file === "cells.ts") cells.set(c.name, { name: c.name, rules: [] });
  const module: string[] = [];
  for (const e of j.errors) {
    const c = e.file === "cells.ts" && e.cell ? cells.get(e.cell) : undefined;
    if (c) c.rules.push(e.rule);
    else module.push(e.rule);
  }
  return { cells, module, ms };
}
// TypeScript diagnostics and lite's type rules are the same reason under different names.
const norm = (r: string) => (/^ts\d+$/.test(r) || ["type", "no-member", "possibly-undefined", "arity", "excess-property", "unknown-type", "untyped-parameter", "const-assign"].includes(r) ? "type" : r);
const uniq = <T,>(xs: T[]) => [...new Set(xs)].sort();
const fmt = (xs: string[]) => (xs.length ? xs.join(", ") : "-");

function liteRules(r: LiteResult): string[] { return uniq([...r.module.map((e) => e.rule), ...r.cells.flatMap((c) => c.errors.map((e) => e.rule))]); }
function verdict(r: LiteResult): string {
  if (r.module.length || r.cells.some((c) => c.status === "rejected")) return "reject";
  if (r.cells.some((c) => c.status === "unsupported" || c.status === "blocked")) return "unsupported";
  return "accept";
}

// ---- targets ----
const fixDir = join(ROOT, "fixtures");
const legacy = readdirSync(fixDir).filter((d) => existsSync(join(fixDir, d, "cells.ts"))).sort();
const liteGroups = readdirSync(fixDir).filter((d) => d.startsWith("lite-") && statSync(join(fixDir, d)).isDirectory()).sort();
const liteFix: { group: string; name: string; dir: string; want: string[] }[] = [];
for (const g of liteGroups) {
  const want = JSON.parse(readFileSync(join(fixDir, g, "lite-expect.json"), "utf8"));
  for (const d of readdirSync(join(fixDir, g)).sort()) if (existsSync(join(fixDir, g, d, "cells.ts")) || existsSync(join(fixDir, g, d, "cells.tsx"))) liteFix.push({ group: g, name: d, dir: join(fixDir, g, d), want: want[d] ?? [] });
}
const ports = readdirSync(join(ROOT, "ports")).filter((d) => existsSync(join(ROOT, "ports", d, "cells.ts"))).sort();

type Pair = { target: string; cell: string; oracle: string[]; lite: LiteResult["cells"][number] | undefined; liteU: LiteResult["cells"][number] | undefined };
const pairs: Pair[] = [];
const collect = (target: string, o: Oracle, l: LiteResult, lu: LiteResult) => {
  for (const [name, oc] of o.cells) pairs.push({ target, cell: name, oracle: oc.rules, lite: l.cells.find((c) => c.name === name), liteU: lu.cells.find((c) => c.name === name) });
};

const out: string[] = [];
const say = (s = "") => { out.push(s); console.log(s); };

// ---- 1. existing fixtures ----
say("### Existing fixtures\n");
say("| fixture | expected | oracle | lite (strict index) | lite (--unchecked-index) | lite rules (--unchecked-index) | same reason |");
say("|---|---|---|---|---|---|---|");
let fixAgree = 0, fixTotal = 0;
for (const d of legacy) {
  const dir = join(fixDir, d);
  const ex = existsSync(join(dir, "expect.json")) ? JSON.parse(readFileSync(join(dir, "expect.json"), "utf8")) : { check: { ok: true } };
  const want: string[] = ex.check.rules ?? [];
  const o = oracle(dir);
  const l = checkPort(dir), lu = checkPort(dir, { strictIndex: false });
  collect(`fixtures/${d}`, o, l, lu);
  const oRules = uniq([...o.module, ...[...o.cells.values()].flatMap((c) => c.rules)]);
  const expected = d.startsWith("reject-") ? "reject" : "accept";
  const lr = liteRules(lu);
  const same = expected === "reject" ? JSON.stringify(uniq(lr.map(norm))) === JSON.stringify(uniq(want.map(norm))) : verdict(lu) === "accept";
  if (d === "known-slips") {
    const slips = [...o.cells.keys()].filter((n) => /^[sw]\d+$/.test(n));
    const caught = slips.filter((n) => l.cells.find((c) => c.name === n)?.status !== "ok");
    say(`| ${d} | accept (oracle's slips) | ${oRules.length ? "reject" : "accept"} | rejects ${caught.length}/${slips.length} slips | rejects ${slips.filter((n) => lu.cells.find((c) => c.name === n)?.status !== "ok").length}/${slips.length} | ${fmt(lr)} | accepted: ${fmt(slips.filter((n) => !caught.includes(n)))} |`);
    continue;
  }
  fixTotal++;
  if (verdict(lu) === expected && same) fixAgree++;
  say(`| ${d} | ${expected}${want.length ? ` (${want.join(", ")})` : ""} | ${oRules.length ? "reject" : "accept"} | ${verdict(l)} | ${verdict(lu)} | ${fmt(lr)} | ${same ? "yes" : "no"} |`);
}
say(`\n${fixAgree}/${fixTotal} existing fixtures (known-slips excluded) get the expected verdict for the same reason under --unchecked-index.`);

// ---- 1b. reject cases of the specification module (lite/soundscript/spec.ojs, spec_rejects*) ----
// each case is written out as a port directory so both checkers read it as they read a fixture
say("\n### Specification reject cases\n");
say("| statement | source | expected | oracle | lite (--unchecked-index) | oracle same reason | lite same reason |");
say("|---|---|---|---|---|---|---|");
const SPEC_DIR = join(LITE, ".oracle-scratch-spec"); // deleted and rewritten on every run
rmSync(SPEC_DIR, { recursive: true, force: true });
let specOracle = 0, specLite = 0, specJudged = 0;
const specCases = specRejects();
specCases.forEach((c, i) => {
  const dir = join(SPEC_DIR, String(i));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cells.ts"), c.source + "\n");
  if (c.shell) writeFileSync(join(dir, "shell.ts"), c.shell + "\n");
  // a case with cells in other languages (section 11) has nothing tsc can be given for them: n/a for the oracle
  const o = c.outside ? null : oracle(dir);
  const lu = c.outside ? checkSources({ cells: c.source, shell: c.shell, tsx: false, outside: c.outside }, { strictIndex: false }) : checkPort(dir, { strictIndex: false });
  const oRules = o ? uniq([...o.module, ...[...o.cells.values()].flatMap((x) => x.rules)]) : [], lr = liteRules(lu);
  const want = JSON.stringify([norm(c.rule)]);
  const oSame = !!o && JSON.stringify(uniq(oRules.map(norm))) === want, lSame = JSON.stringify(uniq(lr.map(norm))) === want;
  if (oSame) specOracle++;
  if (o) specJudged++;
  if (lSame) specLite++;
  const others = c.outside ? ` (other languages: ${c.outside.map((x) => (x.view ? "viewof " : "") + x.name).join(", ") || "none"})` : "";
  say(`| ${c.statement} | \`${c.source.replace(/\n/g, " ")}\`${c.shell ? " (shell: \`" + c.shell + "\`)" : ""}${others} | ${c.rule} | ${o ? fmt(oRules) : "n/a"} | ${fmt(lr)} | ${o ? (oSame ? "yes" : "no") : "n/a"} | ${lSame ? "yes" : "no"} |`);
});
say(`\n${specCases.length} specification reject cases: the oracle judges ${specJudged} (the rest name cells in other languages) and gives exactly the expected rule for ${specOracle}; lite gives it for ${specLite}.`);

// ---- 2. lite fixtures ----
say("\n### lite fixtures (fixtures/lite-*/)\n");
say("| fixture | lite expects | lite | ok* cells ok | bad* cells rejected | oracle rejects bad* | oracle rejects ok* |");
say("|---|---|---|---|---|---|---|");
let liteOk = 0;
for (const f of liteFix) {
  const tsx = !existsSync(join(f.dir, "cells.ts")); // the oracle harness reads cells.ts only
  const o: Oracle = tsx ? { cells: new Map(), module: [], ms: 0 } : oracle(f.dir);
  const l = checkPort(f.dir), lu = checkPort(f.dir, { strictIndex: false });
  if (!tsx) collect(`fixtures/${f.group}/${f.name}`, o, l, lu);
  const cells = l.cells;
  const oks = cells.filter((c) => /^ok/.test(c.name) || f.name.startsWith("accept-"));
  const bads = cells.filter((c) => /^(bad|uns)/.test(c.name));
  const okPass = oks.filter((c) => c.status === "ok").length;
  const badPass = bads.filter((c) => (c.name.startsWith("uns") ? c.status === "unsupported" : c.status === "rejected")).length;
  const rules = uniq(cells.flatMap((c) => [...c.errors.map((e) => e.rule), ...(c.status === "unsupported" ? ["unsupported"] : [])]).concat(l.module.map((e) => e.rule)));
  const pass = okPass === oks.length && badPass === bads.length && JSON.stringify(rules) === JSON.stringify(uniq(f.want));
  if (pass) liteOk++;
  const oBad = bads.filter((c) => (o.cells.get(c.name)?.rules.length ?? 0) > 0).length;
  const oOk = oks.filter((c) => (o.cells.get(c.name)?.rules.length ?? 0) > 0).length;
  say(`| ${f.group}/${f.name} | ${fmt(f.want)} | ${pass ? "pass" : `FAIL (${fmt(rules)})`} | ${okPass}/${oks.length} | ${badPass}/${bads.length} | ${tsx ? "n/a (.tsx)" : `${oBad}/${bads.length}`} | ${tsx ? "n/a (.tsx)" : `${oOk}/${oks.length}`} |`);
}
say(`\n${liteOk}/${liteFix.length} lite fixtures pass.`);

// ---- 3. ports ----
say("\n### Ports\n");
say("| port | cells | mode | ok | rejected | unsupported | blocked | top rejection rules | top unsupported |");
say("|---|---|---|---|---|---|---|---|---|");
const portRes = new Map<string, { strict: LiteResult; loose: LiteResult; o: Oracle }>();
for (const p of ports) {
  const dir = join(ROOT, "ports", p);
  const o = oracle(dir);
  const l = checkPort(dir), lu = checkPort(dir, { strictIndex: false });
  portRes.set(p, { strict: l, loose: lu, o });
  collect(`ports/${p}`, o, l, lu);
  for (const [mode, r] of [["strict index", l], ["--unchecked-index", lu]] as const) {
    const n = (s: string) => r.cells.filter((c) => c.status === s).length;
    const top = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(", ") || "-"; };
    const rej = top(r.cells.filter((c) => c.status === "rejected").map((c) => uniq(c.errors.map((e) => e.rule)).join("+")));
    const uns = top(r.cells.flatMap((c) => uniq(c.unsupported.map((e) => e.msg))));
    say(`| ${p} | ${r.cells.length} | ${mode} | ${n("ok")} | ${n("rejected")} | ${n("unsupported")} | ${n("blocked")} | ${rej} | ${uns} |`);
  }
}

// ---- 4. mutants ----
type Mut = { port: string; cell: string; op: string; desc: string; oracle: string[]; lite: string; liteRules: string[]; liteU: string; liteURules: string[]; why: string };
const mutants: Mut[] = [];
if (MUTANTS) {
  rmSync(SCRATCH, { recursive: true, force: true });
  for (const p of ports) {
    const src = readFileSync(join(ROOT, "ports", p, "cells.ts"), "utf8");
    const P = parse(src);
    const cellsOf = (pos: number) => {
      for (const st of P.program.body) if (st.start <= pos && pos < st.end) { const d = st.type === "ExportNamedDeclaration" ? st.declaration : st; return d?.id?.name ?? d?.declarations?.[0]?.id.name ?? null; }
      return null;
    };
    const cands: { op: string; edit: [number, number, string]; desc: string; at: number }[] = [];
    const visit = (n: Node, parent: Node | null) => {
      if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && !(parent?.type === "AssignmentExpression" && parent.left === n))
        cands.push({ op: "rename-property", edit: [n.property.start, n.property.end, n.property.name + "X"], desc: `.${n.property.name} -> .${n.property.name}X`, at: n.start });
      if (n.type === "Literal" && typeof n.value === "number" && parent?.type !== "TSLiteralType" && parent?.type !== "Property")
        cands.push({ op: "number-to-string", edit: [n.start, n.end, JSON.stringify(String(n.value))], desc: `${n.raw} -> "${n.value}"`, at: n.start });
      if (n.type === "IfStatement" && !n.alternate && /^(ReturnStatement|ThrowStatement|BreakStatement|ContinueStatement)$/.test(n.consequent.type))
        cands.push({ op: "drop-guard", edit: [n.start, n.end, ";"], desc: `removed ${src.slice(n.start, Math.min(n.end, n.start + 40)).replace(/\s+/g, " ")}`, at: n.start });
      if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "freeze" && n.arguments.length === 1)
        cands.push({ op: "drop-freeze", edit: [n.start, n.end, src.slice(n.arguments[0].start, n.arguments[0].end)], desc: `freeze(x) -> x`, at: n.start });
      if (n.type === "CallExpression" && n.arguments.length >= 1 && n.callee.type !== "Identifier" || (n.type === "CallExpression" && n.callee.type === "Identifier" && n.arguments.length >= 2)) {
        const a = n.arguments;
        const from = a.length > 1 ? a[a.length - 2].end : a[0].start;
        cands.push({ op: "drop-last-arg", edit: [from, a[a.length - 1].end, ""], desc: `dropped last argument of ${src.slice(n.callee.start, n.callee.end).slice(0, 30)}`, at: n.start });
      }
      if (n.type === "VariableDeclaration" && n.kind === "const" && n.declarations[0]?.init?.type === "CallExpression" && n.declarations[0].init.callee.name === "mut") {
        const d = n.declarations[0];
        cands.push({ op: "mut-of-binding", edit: [d.init.start, d.init.end, `mut(${src.slice(d.init.arguments[0].start, d.init.arguments[0].end)}), ${d.id.name}__alias = ${d.id.name}`], desc: `alias the Mut ${d.id.name}`, at: n.start });
      }
      if (n.type === "BinaryExpression" && ["===", "!=="].includes(n.operator) && n.right.type === "Literal" && n.right.value === null)
        cands.push({ op: "null-to-undefined", edit: [n.right.start, n.right.end, "undefined"], desc: `${n.operator} null -> ${n.operator} undefined`, at: n.start });
      for (const c of kids(n)) visit(c, n);
    };
    visit(P.program, null);
    // deterministic sample: at most 12 per operator per port, spread over the file
    const byOp = new Map<string, typeof cands>();
    for (const c of cands) { if (!cellsOf(c.at)) continue; const l = byOp.get(c.op) ?? []; l.push(c); byOp.set(c.op, l); }
    let k = 0;
    for (const [op, list] of byOp) {
      const step = Math.max(1, Math.floor(list.length / 12));
      for (let i = 0; i < list.length && i / step < 12; i += step) {
        const c = list[i];
        const cell = cellsOf(c.at)!;
        const mdir = join(SCRATCH, `${p}-${op}-${k++}`);
        mkdirSync(mdir, { recursive: true });
        for (const f of readdirSync(join(ROOT, "ports", p))) copyFileSync(join(ROOT, "ports", p, f), join(mdir, f));
        writeFileSync(join(mdir, "cells.ts"), src.slice(0, c.edit[0]) + c.edit[2] + src.slice(c.edit[1]));
        let o: Oracle;
        try { o = oracle(mdir); } catch { continue; }
        const l = checkPort(mdir), lu = checkPort(mdir, { strictIndex: false });
        const lc = l.cells.find((x) => x.name === cell), luc = lu.cells.find((x) => x.name === cell);
        const oc = o.cells.get(cell);
        if (!oc || !lc || !luc) continue;
        mutants.push({ port: p, cell, op, desc: c.desc, oracle: uniq([...oc.rules, ...o.module]), lite: lc.status, liteRules: uniq(lc.errors.map((e) => e.rule)), liteU: luc.status, liteURules: uniq(luc.errors.map((e) => e.rule)), why: uniq([...luc.errors.map((e) => `${e.rule}: ${e.msg}`), ...luc.unsupported.map((e) => `unsupported: ${e.msg}`), ...luc.blockedBy.map((b) => `blocked: ${b}`)]).join("; ").slice(0, 160) });
      }
    }
  }
  say("\n### Mutants of the ports\n");
  say(`${mutants.length} mutants (one edit each, in a copy of the port under ${SCRATCH}); verdict of the mutated cell. Lite in --unchecked-index mode, which matches the oracle's indexing.\n`);
  say("| operator | mutants | oracle rejects | lite rejects | lite unsupported | lite accepts, oracle rejects | oracle accepts, lite rejects |");
  say("|---|---|---|---|---|---|---|");
  const ops = uniq(mutants.map((m) => m.op));
  for (const op of ops) {
    const ms = mutants.filter((m) => m.op === op);
    say(`| ${op} | ${ms.length} | ${ms.filter((m) => m.oracle.length).length} | ${ms.filter((m) => m.liteU === "rejected").length} | ${ms.filter((m) => m.liteU === "unsupported" || m.liteU === "blocked").length} | ${ms.filter((m) => m.liteU === "ok" && m.oracle.length).length} | ${ms.filter((m) => m.liteU === "rejected" && !m.oracle.length).length} |`);
  }
  say("\nMutants where lite's verdict differs from the oracle's:\n");
  say("| port | operator | edit | cell | oracle | lite | lite's reason |");
  say("|---|---|---|---|---|---|---|");
  for (const m of mutants) if ((m.liteU === "ok") !== (m.oracle.length === 0)) say(`| ${m.port} | ${m.op} | ${m.desc.replace(/\|/g, "\\|")} | ${m.cell} | ${fmt(m.oracle)} | ${m.liteU} | ${m.why.replace(/\|/g, "\\|")} |`);
}

// ---- 5. soundness ----
say("\n### Lite accepts, oracle rejects\n");
const allPairs = [...pairs, ...mutants.map((m) => ({ target: `mutant ${m.port} (${m.op}: ${m.desc})`, cell: m.cell, oracle: m.oracle, lite: { status: m.lite } as any, liteU: { status: m.liteU } as any }))];
const gap = allPairs.filter((p) => p.oracle.length && p.liteU?.status === "ok");
say(`Over ${pairs.length} fixture and port cells and ${mutants.length} mutants, lite --unchecked-index returns ok where the oracle reports an error for ${gap.length}:\n`);
for (const p of gap) say(`- ${p.target} \`${p.cell}\`: oracle [${p.oracle.join(", ")}]; lite strict: ${p.lite?.status}`);
const gapS = allPairs.filter((p) => p.oracle.length && p.lite?.status === "ok");
say(`\nIn the default (strict index) mode the same list has ${gapS.length} entr${gapS.length === 1 ? "y" : "ies"}${gapS.length ? ": " + gapS.map((p) => `${p.target} ${p.cell}`).join("; ") : ""}.`);

say("\n### Oracle accepts, lite does not\n");
for (const [mode, pick] of [["strict index", (p: Pair) => p.lite], ["--unchecked-index", (p: Pair) => p.liteU]] as const) {
  const miss = pairs.filter((p) => !p.oracle.length && pick(p) && pick(p)!.status !== "ok");
  const groups = new Map<string, string[]>();
  for (const p of miss) {
    const c = pick(p)!;
    const cause = c.status === "rejected" ? `rejected: ${uniq(c.errors.map((e) => e.rule)).join("+")}` : c.status === "unsupported" ? `unsupported: ${uniq(c.unsupported.map((e) => e.msg)).join("; ")}` : `blocked by ${c.blockedBy.join(", ")}`;
    const l = groups.get(cause) ?? [];
    l.push(`${p.target.replace(/^fixtures\//, "")}:${p.cell}`);
    groups.set(cause, l);
  }
  say(`${mode}: ${miss.length} cells\n`);
  say("| cause | cells | examples |");
  say("|---|---|---|");
  for (const [cause, l] of [...groups].sort((a, b) => b[1].length - a[1].length)) say(`| ${cause} | ${l.length} | ${l.slice(0, 4).join(", ")}${l.length > 4 ? ", …" : ""} |`);
  say("");
}

// ---- 6. size and speed ----
say("### Size and speed\n");
say("| file | lines |");
say("|---|---|");
for (const f of ["parse.ts", "types.ts", "infer/rg-registry.ts", "core.ts", "infer-ss.ts", "check.ts", "intrinsics.ts", "oracle.ts"]) {
  const n = readFileSync(join(LITE, f), "utf8").split("\n").length;
  say(`| lite/${f} | ${n} |`);
}
const bdir = join(SCRATCH, "bundle");
mkdirSync(bdir, { recursive: true });
const build = (external: boolean) => {
  const outfile = join(bdir, external ? "lite-noparser.js" : "lite.js");
  const cmd = ["bun", "build", join(LITE, "check.ts"), "--minify", "--target", "bun", "--outfile", outfile, ...(external ? ["--external", "acorn", "--external", "@sveltejs/acorn-typescript"] : [])];
  Bun.spawnSync(cmd, { cwd: LITE, stdout: "pipe", stderr: "pipe" });
  return existsSync(outfile) ? statSync(outfile).size : -1;
};
const withP = build(false), withoutP = build(true);
say(`\nMinified bundle (bun build --minify --target bun lite/check.ts): ${(withP / 1024).toFixed(1)} KiB with acorn + acorn-typescript, ${(withoutP / 1024).toFixed(1)} KiB without the parser.\n`);
say("| port | lite (bun lite/check.ts) | oracle (bun check.ts) | lite check time in-process |");
say("|---|---|---|---|");
const wall = (cmd: string[]) => {
  const ts: number[] = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe" }); ts.push(performance.now() - t0); }
  return ts.sort((a, b) => a - b)[2];
};
for (const p of ports) {
  const dir = join("ports", p);
  const l = wall(["bun", "lite/check.ts", dir, "--unchecked-index"]);
  const o = wall(["bun", "check.ts", dir]);
  const inproc = [1, 2, 3, 4, 5].map(() => checkPort(join(ROOT, dir)).ms).sort((a, b) => a - b)[2];
  say(`| ${p} | ${l.toFixed(0)} ms | ${o.toFixed(0)} ms | ${inproc.toFixed(0)} ms |`);
}
say("\nWall times are the median of 5 runs of the whole process, including bun start-up.");
writeFileSync(join(SCRATCH, "oracle-output.md"), out.join("\n") + "\n");
