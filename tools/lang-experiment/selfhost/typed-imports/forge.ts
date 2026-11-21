// bun selfhost/typed-imports/forge.ts: forged definitions put into a running program, then the gate run over the
// Runtime's variables. Each forge is reported with the gate's verdict per module, and with the control gate that
// decompiles and checks but does not recompile. The forged texts are written out by hand (they are inputs).
import { build, gateInput, type Built } from "./rt.ts";
import { gate } from "./gate.ts";
import { linkTi } from "./ti-link.ts";
import { decompileVariable } from "../../lite/toolchain/ss-toolchain.ts";

const B = `export const n = (): number => 1;\nexport const good = () => 2;\nexport const evil = () => "s";\nexport const el = () => <div>ok</div>;\nexport type P = number;\nexport const s = () => state(1);`;
const A = `const m = (x) => x * 2;\nconst use = (k) => k + 1;\nconst same = (x) => x;`;
const IMPORTS = [{ local: "x", imported: "good", from: "@b" }, { local: "k", imported: "n", from: "@b" }];
const base = (bCells = B, aCells = A, variant?: ReturnType<typeof linkTi>) => build([{ name: "@b", cells: bCells }, { name: "@a", cells: aCells, imports: IMPORTS as any }], "typed", variant);
const def = (b: Built, m: string, n: string) => b.compiled.get(m)!.find((d) => d.name === n)!;
const redefine = (b: Built, m: string, n: string, inputs: string[], fn: unknown) => {
  for (const v of b.runtime._variables) if (v._module === b.modules.get(m) && v._name === n) { v.define(n, inputs, fn); return; }
  throw new Error(`no ${m}.${n}`);
};
const swap = (b: Built, m: string, n: string, from: string, to: string) => {
  const d = def(b, m, n);
  if (!d.definition.includes(from)) throw new Error(`forge: ${from} not in ${d.definition}`);
  const text = d.definition.replace(from, to);
  redefine(b, m, n, d.inputs, (0, eval)(`(${text})`));
  return text;
};
const verdict = (b: Built, opts = {}, read?: (f: unknown) => string) => {
  const G = gate(gateInput(b, read), opts);
  return Object.fromEntries([...G.verdicts].map(([k, v]) => [k, v.ss ? "SoundScript" : `another language (${v.why})`]));
};
type Row = { id: string; what: string; control: Record<string, string>; gate: Record<string, string>; note?: string };
const rows: Row[] = [];
const run = async (id: string, what: string, forge: (b: Built) => Promise<string | void> | string | void, b: Built = base(), read?: (f: unknown) => string) => {
  const note = (await forge(b)) ?? undefined;
  rows.push({ id, what, control: verdict(b, { recompile: false }, read), gate: verdict(b, {}, read), note: note || undefined });
};

await run("clean", "the program as compiled", () => {});
await run("comment-type-lie", "n's code returns \"s\"; its comments make the decompiled source `(): number => 1 + 0 * (\"s\").length`", async (b) => {
  const t = swap(b, "@b", "n", '=> 1)', '=> /*ss:1 + 0 * (*/"s"/*ss:).length*/)');
  return `decompiles to ${JSON.stringify(decompileVariable(t))}; runs to ${JSON.stringify(await b.value("@b", "n"))}; @a.use = ${JSON.stringify(await b.value("@a", "use"))}`;
});
await run("js-lookalike", "n's definition: the marker, header and function, inside a block that also writes globalThis", (b) => {
  const d = def(b, "@b", "n");
  const text = d.definition.replace("{return (", "{ globalThis.__forged = 1; return (");
  redefine(b, "@b", "n", d.inputs, (0, eval)(`(${text})`));
  return `decompiles to ${JSON.stringify(decompileVariable(text))}`;
});
await run("one-char-in-body", "n's `=> 1` changed to `=> 7` (the source it decompiles to is what runs)", (b) => void swap(b, "@b", "n", "=> 1)", "=> 7)"));
await run("one-char-in-type", "n's `/*ss:: number*/` changed to `/*ss:: string*/`", (b) => void swap(b, "@b", "n", "/*ss:: number*/", "/*ss:: string*/"));
await run("one-char-outside", "@a.m's argument `(x)` changed to `(-x)`", (b) => void swap(b, "@a", "m", ")(x)", ")(-x)"));
await run("one-char-header", "n's header `export const n = ` changed to `export const N = `", (b) => void swap(b, "@b", "n", "export const n = ", "export const N = "));
await run("type-cell-code", "the type cell P runs `globalThis.__forged = 1` in place of `0`", (b) => void swap(b, "@b", "$ss$type$P", "*/0)", "*/(globalThis.__forged = 1))"));
await run("jsx-lowered", "el's lowered h(\"div\", {}, \"ok\") changed to \"evil\"; the kept original still says ok", (b) => void swap(b, "@b", "el", 'h("div", {}, "ok")', 'h("div", {}, "evil")'));
await run("state-value-lookalike", "the value variable of state cell s defined as `(G, _) => 5` in place of Observable's G.input", (b) => void redefine(b, "@b", "s", ["Generators", "viewof s"], (0, eval)("((G, _) => 5)")));
await run("state-value-inputs", "the value variable of s keeps its text but takes viewof n", (b) => void redefine(b, "@b", "s", ["Generators", "viewof n"], (0, eval)("((G, _) => G.input(_))")));
const toStringForge = (b: Built) => {
  const legit = def(b, "@b", "n").definition;
  const f = Object.assign(function _n() { return "s"; }, { toString: () => legit });
  redefine(b, "@b", "n", [], f);
  return `String(definition) gives the compiled text; Function.prototype.toString gives the forged code`;
};
{
  const b1 = base();
  await run("tostring-own-property (read with String)", "n's function has its own toString returning the compiled text; the gate reads String(definition)", toStringForge, b1, (f) => String(f));
  const b2 = base();
  await run("tostring-own-property (read with Function.prototype.toString)", "the same forge; the gate reads Function.prototype.toString.call(definition)", toStringForge, b2);
}
await run("import-rewired (rejects)", "@a's import variable x rewired from @b.good (number) to @b.evil (string); @a.m is x * 2", (b) => {
  for (const v of b.runtime._variables) if (v._module === b.modules.get("@a") && v._name === "x") v.import("evil", "x", b.modules.get("@b"));
});
await run("import-rewired (still checks)", "the same rewiring, with @a holding only `same = (x) => x`", (b) => {
  for (const v of b.runtime._variables) if (v._module === b.modules.get("@a") && v._name === "x") v.import("evil", "x", b.modules.get("@b"));
}, base(B, "const same = (x) => x;\nconst use = (k) => k + 1;"));
{
  // a checker that once accepted `x!`: the syntax bans removed (the cells of lite/infer, given a syntaxBans that finds none)
  const loose = linkTi({ syntaxBans: () => [] });
  const B2 = `${B}\nexport const r = (): number => [1][0]!;`;
  await run("tightened-rule", "@b's r = (): number => [1][0]! compiled when the checker did not ban `!` (syntaxBans given as none), so r compiled as a running cell; gated by the present checker, which rejects it [no-non-null]", () => {}, base(B2, A, loose));
}
await run("cascade", "the comment-type lie on n: @b is another language, so @a's import k of n must cross as today, and @a was compiled without ss_cross", (b) => void swap(b, "@b", "n", '=> 1)', '=> /*ss:1 + 0 * (*/"s"/*ss:).length*/)'));

for (const r of rows) {
  console.log(`== ${r.id}: ${r.what}${r.note ? `\n   ${r.note}` : ""}`);
  console.log(`   control (decompile + check): ${JSON.stringify(r.control)}`);
  console.log(`   gate (decompile + check + recompile): ${JSON.stringify(r.gate)}`);
}
