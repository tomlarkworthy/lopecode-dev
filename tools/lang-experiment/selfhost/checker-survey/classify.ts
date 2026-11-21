// Verdicts for the sampled units (out/sample.json), with the probe that shows each, and the tables RESULTS.md
// gives: per class, per stratum, extrapolated to the inventory, and the blocker groups.
// Run: bun selfhost/checker-survey/classify.ts   (writes out/classify.txt)
//
// A verdict assumes three preconditions, which are measured apart (RESULTS.md, "Preconditions"):
//   P1 typed AST: Node is the union in probes/ast.ss.ts, narrowed by `type`; kids/fields are typed tables (astlib)
//   P2 container: a class is one cell; its state is flat Mut tables, Env an immutable record (container_demo)
//   P3 parser: a SoundScript `parse` cell exists (a stub in the probes); acorn cannot be taken (p_parse_outside)
// Classes:
//   a   checks as is, or after a mechanical rewrite (cell form; mut()/freeze() around a local container the function
//       fills; this.x -> the local; ReadonlySet/Map -> Set/Map; a node parameter typed by its narrowed node type)
//   b   checks after small local rewrites, each named
//   b*  expected b: the blocking constructs were probed reduced and a local rewrite is named for each; the full
//       body was not ported, and not every named rewrite was itself checked (see RESULTS.md)
//   c   blocked by a closable language gap with no local rewrite
//   d   blocked by something the language forbids on purpose
// how: full = the whole original body ported and checked; reduced = only the named constructs probed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inventory, stratum } from "./inventory.ts";
import { parse, type Node } from "../../lite/parse.ts";

type V = "a" | "b" | "b*" | "c" | "d";
type Row = { file: string; name: string; v: V; how: "full" | "reduced"; probe: string; why: string; groups: string[] };
const R = (file: string, name: string, v: V, how: Row["how"], probe: string, why: string, groups: string[] = []): Row => ({ file, name, v, how, probe, why, groups });
const I = "lite/infer/frozen/infer.ts", G = "lite/registry.ts", C = "lite/infer/frozen/core.ts", O = "lite/infer/frozen/own.ts", K = "lite/infer/frozen/capture.ts", M = "lite/infer/frozen/complete.ts",
  T = "lite/toolchain/ss-toolchain.ts", CT = "lite/toolchain/comment-types.ts";
export const ROWS: Row[] = [
  // infer.ts (P2 applies to every member)
  R(I, "Checker.conditional", "b", "full", "container_demo.checker", "env.flow = join(T, F)! -> the flow returned; ! dropped", ["env-field-write", "non-null"]),
  R(I, "Scope.vars", "b", "reduced", "p_infer.red_scopeField, container_demo", "a Map inside a Mut record: [mut-deep-write]; as the flat table scopeVars keyed scope:name", ["mut-shallow"]),
  R(I, "Checker.filter", "a", "full", "container_demo.checker", "unchanged given P2 (keep is pure once the registry is)"),
  R(I, "Checker.narrowIn", "b", "full", "p_infer.narrowIn", "the copied record's props.set -> a mut Map frozen into a new record", ["mut-shallow"]),
  R(I, "Checker.varDecl", "b*", "reduced", "p_infer.red_bindingUpdate, red_lazyThunk", "b.t = …, b.lazy = … on a stored Binding: [member-write]; a thunk that reports: [mut-capture]; -> bindingT table by id, the lazy case a table entry the ident lookup acts on", ["shared-record-write", "mut-capture-callback"]),
  R(I, "Checker.typeTag", "b", "full", "container_demo.checker", "x === m on Ty: [strict-eq-object] -> equals(x, m)", ["identity"]),
  R(I, "Checker.fnExpr", "b*", "reduced", "p_infer.red_fnInfoPush, red_forEachReport", "FnInfo shared through env.fi, appended to by return/yield: [mutating-method]; params.forEach with reports: [mut-capture]; -> FnInfo by id with rets/yields tables, a for loop", ["shared-record-write", "mut-capture-callback"]),
  R(I, "Checker.binary", "a", "full", "p_infer.binaryCell", "unchanged given P1, P2 (the dispatcher passes a BinaryExpression)"),
  R(I, "Checker.switchStmt", "b*", "reduced", "p_infer.red_breaksStack, red_reduceNoInit, red_synthNode", "this.breaks (Mut of arrays break statements append to): [mutating-method]; reduce without an initial value: [arity], !: [no-non-null]; synthesized node and diags.splice ok", ["mut-shallow", "env-field-write", "non-null", "intrinsic-signature"]),
  R(I, "Checker.apply", "b*", "reduced", "p_infer.fresh, red_forEachReport", "module-level let fresh: [cell-not-function] -> a counter local to the checker cell (types.ss.ts instantiate already takes it); args.forEach with reports: [mut-capture] -> for loops; paramAt(i)!", ["module-state", "mut-capture-callback", "non-null"]),
  R(I, "Checker.lvalue", "b", "full", "p_infer.lvalueCell", "reg.strictIndex = false around index(…) -> an argument; property name read after narrowing the property node", ["shared-record-write", "ast-narrowing"]),
  R(I, "Checker.member", "b*", "reduced", "p_infer.red_shortSet", "this.short Set and facts writes are flat tables (ok); e.property.value/name read without narrowing (P1 narrowing, as lvalue)", ["ast-narrowing"]),
  R(I, "Checker.hidden", "b", "full", "p_infer.hiddenCell", "with hiddenFn as one cell (mutual recursion); strict index s.args[0], sx.els[i], t.args[i] guarded", ["strict-index"]),
  R(I, "Checker.infer1", "b*", "reduced", "p_infer.red_caseGroupField, red_literalBigint, red_fnInfoPush", "a case group reading e.expression that not every member has (split the group); Literal.bigint (add the field to the AST type); env.fi.yields.push (FnInfo table); env.flow writes", ["ast-narrowing", "shared-record-write", "env-field-write"]),
  // registry.ts
  R(G, "builtinTypeNames", "a", "full", "p_registry.builtinTypeNames", "unchanged"),
  R(G, "Registry.ifaceRec", "b*", "reduced", "p_registry.ifaceRecReduced", "the memo entry is stored before it is filled in place: [mutating-method]; -> a visiting set against extends cycles and no memo", ["shared-record-write", "memo"]),
  R(G, "Registry.iterElem", "b", "full", "p_registry.iterElem, iterElem_rw", "(t as any).v: [no-cast] [no-any] -> case split; es as Ty[] -> loop; strict index", ["cast", "strict-index"]),
  R(G, "Registry.sub", "b", "full", "p_registry.sub", "s === t -> equals; every/some callbacks that call sub (writes seen) -> loops: [mut-capture]; (s as any).n by narrowing; strict index", ["identity", "mut-capture-callback", "cast", "strict-index"]),
  R(G, "Registry.convert", "b", "full", "p_rest.convertCell", "onUnsup/onErr hooks -> local writers; .map(c) -> loop; literal/argument reads narrowed; strict index", ["mut-capture-callback", "ast-narrowing", "strict-index"]),
  R(G, "Registry.unify", "b*", "reduced", "p_registry.unifyReduced", "U closes over the Mut map m and is passed to forEach: [mut-capture] -> loops; ! -> guards", ["mut-capture-callback", "non-null"]),
  // core.ts
  R(C, "reservedName", "a", "full", "p_small.reservedName / p_core.reservedName", "unchanged"),
  R(C, "syntaxPass", "b", "full", "p_core.syntaxPass", "for…in over keys -> fields(n); parent.property === x -> the field the child came through; report/unsup callbacks -> a returned list", ["generic-walk", "identity", "mut-capture-callback"]),
  R(C, "distinctNames", "b", "full", "p_core.distinctNames, distinctNames_rw", "catch (e): (e as {pos}).pos [no-cast], e instanceof SyntaxError [unsupported], e.message [no-member]; /re/.exec(…)?.[0] cannot index; checks (distinctNames_rw) against a parser that returns its error as a value: a P3 requirement, not a local rewrite", ["caught-error", "regexp-index", "cast"]),
  // own.ts
  R(O, "iterIn", "a", "full", "p_small.iterIn", "unchanged but for `depth = 0` on the recursive function (a wrapper)"),
  R(O, "ownership>position", "b", "full", "p_own.ownershipSlice", "10 node-identity tests (p.object !== x, …) -> same(a, b) (span + type); pp?.type narrowing -> pp &&", ["identity", "optchain-narrowing"]),
  R(O, "ownership>fresh", "b", "full", "p_own.ownershipSlice, red_optChainTruthy", "!!s.flags?.intrinsic does not narrow s.flags: [possibly-undefined] -> !!s.flags && …", ["optchain-narrowing"]),
  R(O, "ownership>helper", "b", "full", "p_own.ownershipSlice", "p.callee === r -> same()", ["identity"]),
  R(O, "actionEscapes>methodValue", "b", "full", "p_own.actionEscapesSlice", "identity -> same(); parent.get(x)! -> a guard; parent.get(p)?.kind narrowed", ["identity", "non-null", "optchain-narrowing"]),
  R(O, "actionEscapes>chain", "b", "full", "p_own.actionEscapesSlice", "g !== to -> same()", ["identity"]),
  // capture.ts
  R(K, "captureMessage", "a", "full", "p_small.captureMessage", "unchanged"),
  R(K, "bound", "b", "full", "p_small.bound", "writes the caller's Set and returns it -> a Mut parameter and a wrapper that returns a fresh Set", ["shared-record-write"]),
  R(K, "captures", "b", "full", "p_small.captures", "every/find callbacks over the Mut taint map -> loops", ["mut-capture-callback"]),
  // complete.ts
  R(M, "PH", "a", "full", "p_small.PH", "unchanged"),
  R(M, "typeAt", "b", "full", "p_small.typeAt, p_small_rw.typeAt", "head[0] on a RegExpMatchArray: [type] cannot index -> replace with the anchored pattern", ["regexp-index"]),
  R(M, "completionsAt", "d", "reduced", "p_rest.completionHookReduced, completionPatchReduced", "replaces ch.member on the checker object and sets ch.identHook to a function that assigns its let got: [member-write] [let-capture]; a port needs the checker to return the scope at the placeholder", ["monkey-patch"]),
  // intrinsics.ts, parse.ts, facts.ts, island.ts, link.ts
  R("lite/intrinsics.ts", "PRELUDE_FNS", "a", "full", "p_small.PRELUDE_FNS", "unchanged"),
  R("lite/parse.ts", "TS", "d", "reduced", "p_parse_outside.TS", "acorn.Parser.extend(tsPlugin()): a parser class and a plugin function; a function cannot cross into SoundScript", ["parser"]),
  R("lite/parse.ts", "parse", "c", "full", "p_parse.parse, p_parse_outside.parseVia, p_ast_crossing", "the body checks given an acornParse cell; acorn cannot be that cell (a function cannot cross), and its Program cannot cross as data (a recursive type)", ["parser"]),
  R("lite/parse.ts", "kids", "b", "full", "astlib.kids", "for…in over keys -> one case per node type (10 lines -> 66)", ["generic-walk"]),
  R("lite/facts.ts", "preludeCalls", "a", "full", "p_small.preludeCalls", "unchanged"),
  R("lite/facts.ts", "cellsOf", "b", "full", "p_small.cellsOf, p_small_rw.cellsOf", "d?.type === … does not narrow d (two cascades of one [no-member] per union member) -> d && d.type === …", ["optchain-narrowing"]),
  R("lite/island.ts", "ISLAND_CAPABILITIES", "a", "full", "p_small.ISLAND_CAPABILITIES", "unchanged"),
  R("lite/island.ts", "island", "a", "full", "p_small.island", "mut/freeze around its own lists"),
  R("lite/link.ts", "link", "d", "reduced", "p_rest.linkReduced", "new Function over each cell's text: [new-non-intrinsic]; a linker that evaluates source is outside the language", ["eval"]),
  // ss-toolchain.ts
  R(T, "keyOfVariable", "b", "full", "p_toolchain.keyOfVariable, keyOfVariable_rw", "m[1], m[2] on a RegExpMatchArray -> replace with $1/$2", ["regexp-index"]),
  R(T, "contextOf", "a", "full", "p_toolchain.contextOf", "ReadonlySet -> Set"),
  R(T, "tokensOf", "c", "full", "p_toolchain.tokensOf", "the body checks given a tokenizer cell; acorn's tokenizer is an object of functions, which cannot cross", ["parser"]),
  R(T, "keepJsx", "b", "full", "p_toolchain.keepJsx, keepJsx_rw", "replace with a callback: [type] () => string is not string (no callback overload), and the callback advances a let: [let-capture] -> split and rejoin", ["intrinsic-signature", "mut-capture-callback"]),
  R(T, "parseCompiled", "d", "reduced", "p_toolchain.memoWrite, identityTest, header", "module-level memo parsedCompiled: [mutating-method]; n === fn: [strict-eq-object]; JSON.parse of the header is unknown; drop the memo, same(), and a typed header reader", ["module-state", "memo", "identity", "unknown-json"]),
  R(T, "fromObservableVariables", "c", "reduced", "p_toolchain.reasonOf", "the parse error's message: [no-member] property message on Js/unknown; acorn.parseExpressionAt (P3); the rest is P1 narrowing", ["caught-error", "parser", "ast-narrowing"]),
  R(T, "compileChecked", "b*", "reduced", "p_toolchain.ojsCell, typeCellName", "ojsCell's recorder r writes a Mut and is passed into the body builder: [mut-capture] -> a two-pass text with markers; a regex test on d.type does not narrow d (80 [no-member] lines) -> === tests", ["mut-capture-callback", "regex-narrowing"]),
  // comment-types.ts, lower.ts, erase.ts, module-js.ts, boundary.ts
  R(CT, "commentTypes", "a", "full", "p_rest.commentTypes", "unchanged"),
  R(CT, "cutsOf", "b*", "reduced", "p_rest.cutsOfReduced, mergeReduced, p_jsx_erase.eraseEachReduced", "tokenizer onComment callback assigns a let: [let-capture]; the merge writes into the last pair: [member-write]; v.forEach(each) writing cuts: [mut-capture]; for…in -> fields; erase, its twin, ported", ["mut-capture-callback", "generic-walk", "parser"]),
  R("lite/jsx/lower.ts", "lowerJsx", "b", "full", "p_jsx_erase.lowerJsx", "op.name.name, a.value.expression read after narrowing", ["ast-narrowing"]),
  R("lite/browser/erase.ts", "erase", "b", "full", "p_jsx_erase.erase", "for…in -> fields; v.forEach(each) writing cuts -> loop; /re/.exec(gap)![0].length -> what replace removes", ["generic-walk", "mut-capture-callback", "regexp-index", "non-null"]),
  R("lite/toolchain/module-js.ts", "syntaxStub", "b", "full", "p_jsx_erase.syntaxStub", "for…in -> fields; the let msg assigned in a walk passed to forEach -> returned; deep any reads narrowed", ["generic-walk", "mut-capture-callback", "ast-narrowing"]),
  R("lite/boundary.ts", "shapeOf", "b", "full", "p_rest.shapeOf", "t.args[0] strict index guarded; `depth = 0` wrapper", ["strict-index"]),
  // types
  R(T, "Variable", "a", "full", "p_types.useTypes5", "unchanged"),
  R(M, "Completions", "a", "full", "p_types.useTypes5", "unchanged"),
  R(G, "Origin", "a", "full", "p_types.useTypes5", "unchanged"),
  R(C, "Outside", "a", "full", "p_types.useTypes5", "unchanged"),
  R(O, "Rule", "a", "full", "p_types.useTypes5", "unchanged (Node is the typed AST)"),
  R(T, "Context", "a", "full", "p_small_rw.useContext", "ReadonlySet/ReadonlyMap -> Set/Map ([unknown-type] as written)"),
  // giant inner units
  R(C, "checkSources>visit", "b", "full", "p_core.visitSlice", "out.get(x)!.errors.push(…) writes the result records -> a cycleErrors table", ["shared-record-write", "non-null"]),
  R(C, "checkSources>uncloneable", "b", "full", "p_core.uncloneable", "`depth = 0` on the recursive function -> a wrapper"),
  R(C, "checkSources>compileType", "b*", "reduced", "p_core.compileHookReduced, sideReduced, container.q8_instance", "it is the Checker's compileHook and reports through ch.err: a hook capturing the checker's Mut cannot be made ([mut-capture], q8) -> a local function of the checker cell taking core's tables; props[n] = t on a Record -> a Mut record (q_class.sideRecMut ok)", ["mut-capture-callback", "shared-record-write"]),
];

// code lines of each sampled unit: from the inventory, or for a giant's inner unit from the parse
const inv = inventory().filter((d) => d.kind !== "import");
const ROOT = join(import.meta.dir, "../..");
function innerCode(file: string, outer: string, inner: string): number {
  const src = readFileSync(join(ROOT, file), "utf8"), P = parse(src);
  const comment = new Uint8Array(src.length);
  for (const c of P.comments) comment.fill(1, c.start, c.end);
  for (const s0 of P.program.body as Node[]) {
    const s = s0.declaration ?? s0;
    if (s.type !== "FunctionDeclaration" || s.id.name !== outer) continue;
    for (const b of s.body.body as Node[]) {
      const hit = (b.type === "FunctionDeclaration" && b.id.name === inner) || (b.type === "VariableDeclaration" && b.declarations.some((d: Node) => d.id.name === inner));
      if (!hit) continue;
      const lines = new Set<number>();
      for (let i = b.start; i < b.end; i++) if (!comment[i] && !/\s/.test(src[i]!)) lines.add(P.line(i));
      return lines.size;
    }
  }
  throw new Error(`no ${outer}>${inner} in ${file}`);
}
const codeOf = (r: Row) => r.name.includes(">") ? innerCode(r.file, ...(r.name.split(">") as [string, string])) : inv.find((d) => d.file === r.file && d.name === r.name)!.code;

// check: the rows are exactly the drawn sample
const sample: { file: string; name: string }[] = JSON.parse(readFileSync(join(import.meta.dir, "out/sample.json"), "utf8"));
const key = (x: { file: string; name: string }) => `${x.file}:${x.name}`;
const missing = sample.filter((s) => !ROWS.some((r) => key(r) === key(s))), extra = ROWS.filter((r) => !sample.some((s) => key(s) === key(r)));
if (missing.length || extra.length) throw new Error(`rows and sample differ: missing ${missing.map(key)} extra ${extra.map(key)}`);

// strata for extrapolation
const GIANT = new Set(["lite/own.ts:ownership", "lite/own.ts:actionEscapes", "lite/core.ts:checkSources"]);
const BORDER = new Set(inventory().filter((d) => stratum(d) === "borderline").map((d) => `${d.file}:${d.name}`));
const groupOf = (file: string, name: string, kind: string): string =>
  kind === "type" ? "types" : BORDER.has(`${file}:${name}`) ? "borderline" : name.includes(".") ? "class members" :
  ["lite/toolchain/ss-toolchain.ts", "lite/toolchain/comment-types.ts", "lite/jsx/lower.ts", "lite/link.ts"].includes(file) ? "toolchain + linker" :
  file === "lite/infer/frozen/complete.ts" ? "completion" :
  GIANT.has(`${file}:${name}`) ? "giant functions" : "checker functions";
const rowGroup = (r: Row) => r.name.includes(">") ? "giant functions" : groupOf(r.file, r.name, inv.find((d) => d.file === r.file && d.name === r.name)?.kind ?? "");
const pop = inv.filter((d) => stratum(d) === "core" || stratum(d) === "borderline");
const out: string[] = [];
const P = (s = "") => out.push(s);
const CLASSES: V[] = ["a", "b", "b*", "c", "d"];
const rows = ROWS.map((r) => ({ ...r, code: codeOf(r), group: rowGroup(r) }));
P(`sample: ${rows.length} units, ${rows.reduce((s, r) => s + r.code, 0)} code lines; ported in full ${rows.filter((r) => r.how === "full").length}, reduced ${rows.filter((r) => r.how === "reduced").length}`);
P();
P("| class | units | code lines |");
P("|---|---|---|");
for (const c of CLASSES) { const rs = rows.filter((r) => r.v === c); P(`| ${c} | ${rs.length} | ${rs.reduce((s, r) => s + r.code, 0)} |`); }
P();
// extrapolation per group: unit fraction and line fraction of the sample, applied to the group's population
P("| stratum | population units / code lines | sample units / lines | a | b | b* | c | d | ported (a+b), units | ported (a+b), lines | with b*, lines |");
P("|---|---|---|---|---|---|---|---|---|---|---|");
let totLo = 0, totHi = 0, totLoU = 0, totHiU = 0, totPopU = 0, totPopL = 0;
const groups = ["checker functions", "giant functions", "class members", "completion", "toolchain + linker", "borderline", "types"];
for (const g of groups) {
  const popU = g === "giant functions" ? pop.filter((d) => GIANT.has(`${d.file}:${d.name}`)) : pop.filter((d) => groupOf(d.file, d.name, d.kind) === g);
  const pu = popU.length, pl = popU.reduce((s, d) => s + d.code, 0);
  const rs = rows.filter((r) => r.group === g);
  const sl = rs.reduce((s, r) => s + r.code, 0);
  const cnt = (cs: V[]) => rs.filter((r) => cs.includes(r.v));
  const lines = (cs: V[]) => cnt(cs).reduce((s, r) => s + r.code, 0);
  const lo = sl ? Math.round((pl * lines(["a", "b"])) / sl) : 0, hi = sl ? Math.round((pl * lines(["a", "b", "b*"])) / sl) : 0;
  const loU = rs.length ? Math.round((pu * cnt(["a", "b"]).length) / rs.length) : 0, hiU = rs.length ? Math.round((pu * cnt(["a", "b", "b*"]).length) / rs.length) : 0;
  totLo += lo; totHi += hi; totLoU += loU; totHiU += hiU; totPopU += pu; totPopL += pl;
  P(`| ${g} | ${pu} / ${pl} | ${rs.length} / ${sl} | ${CLASSES.map((c) => cnt([c]).length).join(" | ")} | ${loU}–${hiU} of ${pu} | ${lo} of ${pl} | ${hi} of ${pl} |`);
}
P(`| total | ${totPopU} / ${totPopL} | ${rows.length} / ${rows.reduce((s, r) => s + r.code, 0)} | ${CLASSES.map((c) => rows.filter((r) => r.v === c).length).join(" | ")} | ${totLoU}–${totHiU} of ${totPopU} | ${totLo} of ${totPopL} | ${totHi} of ${totPopL} |`);
P();
// blocker groups: units of the sample whose verdict names the group
const gs = new Map<string, typeof rows>();
for (const r of rows) for (const g of r.groups) gs.set(g, [...(gs.get(g) ?? []), r]);
P("| blocker group | sampled units naming it | their code lines | units |");
P("|---|---|---|---|");
for (const [g, rs] of [...gs].sort((a, b) => b[1].length - a[1].length)) P(`| ${g} | ${rs.length} | ${rs.reduce((s, r) => s + r.code, 0)} | ${rs.map((r) => r.name).join(", ")} |`);
P();
P("| file | unit | code | class | how | probe | what |");
P("|---|---|---|---|---|---|---|");
for (const r of rows) P(`| ${r.file.replace("lite/", "")} | ${r.name} | ${r.code} | ${r.v} | ${r.how} | ${r.probe} | ${r.why.replaceAll("|", "\\|")} |`);
writeFileSync(join(import.meta.dir, "out/classify.txt"), out.join("\n") + "\n");
console.log(out.join("\n"));
