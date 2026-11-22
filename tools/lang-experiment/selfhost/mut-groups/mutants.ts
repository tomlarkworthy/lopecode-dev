// bun mutants.ts: break each new rule of proto/ in turn, in a scratch tree mtree/ (proto/ copied once), and run the
// probes on it. A mutant is killed when some probe changes verdict. Writes out/mutants.txt.
import { cpSync, existsSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
const H = import.meta.dir, P = join(H, "proto/lite/infer"), M = join(H, "mtree/lite/infer");
type Mutant = { name: string; rule: string; file: string; old: string; new: string };
const MUTANTS: Mutant[] = [
  { name: "M1-field-position-off", rule: "a field that is Mut stands only where a Mut name may", file: "ow-group.ss.ts", old: "if (t !== undefined && o !== undefined && owTopMut(t) && isNamed(o, \"Mut\")) why = owFieldPos(O, W, n);", new: "if (t === undefined && o === undefined && owTopMut(t)) why = owFieldPos(O, W, n);" },
  { name: "M3-group-spread-allowed", rule: "a group is not spread", file: "ow-group.ss.ts", old: "if (p.type === \"SpreadElement\") return grp ?", new: "if (p.type === \"SpreadElement\") return null && grp ?" },
  { name: "M4-group-to-intrinsic-allowed", rule: "a group is given only to a Mut parameter, freeze, equals, messageOf", file: "ow-group.ss.ts", old: "  const dp = pre === null ? owDeclParam(O, p, i, false) : undefined;", new: "  if (pre === null) return null;\n  const dp = pre === null ? owDeclParam(O, p, i, false) : undefined;" },
  { name: "M5-group-borrow-allowed", rule: "a group is not borrowed whole", file: "ow-group.ss.ts", old: "if (i < 0 || pre === \"freeze\"", new: "if (i < 0 || pre === \"borrow\" || pre === \"freeze\"" },
  { name: "M6-field-assign-off", rule: "an owned field is not assigned or deleted", file: "ow-group.ss.ts", old: "owErr(W, x, \"mut-field-assign\"", new: "void (W, x, \"mut-field-assign\"" },
  { name: "M7-freeze-thaw-off", rule: "freeze of a group freezes its fields (type)", file: "ix-prelude.ss.ts", old: "const y = ixThaw(K.reg.quiet, x);", new: "const y = x;" },
  { name: "M8-group-depth-unbounded", rule: "one level: the group's mut(...) is a const's initializer", file: "ow-place.ss.ts", old: "(g !== null && owConstInit(O, g))", new: "g !== null" },
  { name: "M9-array-groups", rule: "a group is an object literal", file: "ow-place.ss.ts", old: "  const outer = lit === undefined ? undefined : O.T.parent.get(lit.nid);", new: "  const outer = lit === undefined ? undefined : O.T.parent.get(lit.nid);\n  if (p !== undefined && p.type === \"ArrayExpression\" && lit !== undefined && lit.type === \"CallExpression\" && owPrelude(O, lit) === \"mut\") return lit;" },
  { name: "M10-computed-key-fields", rule: "a group field has a plain key", file: "ow-place.ss.ts", old: "p.value.nid !== n.nid || p.computed || p.shorthand", new: "p.value.nid !== n.nid || p.shorthand" },
  { name: "M11-union-fields-unchecked", rule: "an optional or nullable owned field is checked as one", file: "ow-group.ss.ts", old: "isNamed(t, \"Mut\") || (t.k === \"union\" && t.ts.some((m) => isNamed(m, \"Mut\")))", new: "isNamed(t, \"Mut\")" },
  { name: "M12-helper-fix-off", rule: "a named function expression is a helper only when bound to a const and every name is only called", file: "ow-tree.ss.ts", old: "  let bound = f.type !== \"FunctionExpression\";", new: "  let bound = true;\n  if (bound) return (O.T.refs.get(b.id) ?? []).every((r) => owIsCallee(O, r)) ? b : undefined;" },
  { name: "M13-group-ref-identifier-only", rule: "a group inside a conditional, logical or chain is a group (keyed on the operand's type)", file: "ow-group.ss.ts", old: "if (p === undefined || t === undefined) return null;", new: "if (p === undefined || t === undefined || n.type !== \"Identifier\") return null;" },
  { name: "M14-thaw-union-off", rule: "freeze of a union group thaws each member", file: "ix-prelude.ss.ts", old: "const grp = owned(e) || (e.k === \"union\" && e.ts.some(owned));", new: "const grp = owned(e);" },
  { name: "M15-thaw-fail-open", rule: "freeze fails closed when the frozen group would still hold a Mut", file: "ix-prelude.ss.ts", old: "return grp && owHoldsMut(R, M, u, 0) ? null : u;", new: "return u;" },
  { name: "M16-generic-param-lend", rule: "a group is lent only to a parameter declared as a group, not Mut<T> of a type variable", file: "ow-group.ss.ts", old: "if (dp !== undefined && owIsGroup(O.R, dp)) return null;", new: "if (dp !== undefined && dp.k === \"named\" && dp.n === \"Mut\") return null;" },
  { name: "M17-union-member-group-off", rule: "a union with a group member is a group", file: "ow-group.ss.ts", old: "const grp = owIsGroup(O.R, t) || (t.k === \"union\" && t.ts.some((m) => owIsGroup(O.R, m)));", new: "const grp = owIsGroup(O.R, t);" },
];
if (!existsSync(join(H, "mtree"))) { cpSync(join(H, "proto"), join(H, "mtree"), { recursive: true, filter: (s) => !s.includes("node_modules") }); symlinkSync("../../../../lite/node_modules", join(H, "mtree/lite/node_modules")); }
const base = JSON.parse(readFileSync(join(H, "out/probes.proto.json"), "utf8")).got;
const lines: string[] = [`mutants of proto/, ${new Date().toString()}`];
for (const m of MUTANTS) {
  for (const f of ["ow-group.ss.ts", "ix-prelude.ss.ts", "ow-place.ss.ts", "ow-tree.ss.ts"]) writeFileSync(join(M, f), readFileSync(join(P, f), "utf8"));
  const text = readFileSync(join(P, m.file), "utf8");
  if (!text.includes(m.old)) { lines.push(`${m.name}: PATTERN NOT FOUND`); continue; }
  writeFileSync(join(M, m.file), text.replace(m.old, m.new));
  const out = join(H, `scratch/${m.name}.json`);
  const r = Bun.spawnSync(["bun", join(H, "probes.ts"), join(H, "mtree"), "--json", out]);
  if (!existsSync(out)) { lines.push(`${m.name}: probes did not run: ${r.stderr.toString().slice(0, 300)}`); continue; }
  const got = JSON.parse(readFileSync(out, "utf8")).got;
  const flipped = Object.keys(base).filter((id) => JSON.stringify(base[id]) !== JSON.stringify(got[id]));
  lines.push(`${m.name} (${m.rule}): ${flipped.length ? "KILLED" : "SURVIVED"} by ${flipped.length} probe(s): ${flipped.map((id) => `${id} ${JSON.stringify(base[id])} -> ${JSON.stringify(got[id])}`).join("; ")}`);
  rmSync(out);
}
for (const f of ["ow-group.ss.ts", "ix-prelude.ss.ts", "ow-place.ss.ts", "ow-tree.ss.ts"]) writeFileSync(join(M, f), readFileSync(join(P, f), "utf8"));
writeFileSync(join(H, "out/mutants.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
