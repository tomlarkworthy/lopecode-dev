// The gate over a set of modules' running variables: a module is SoundScript when its marked variables decompile,
// the program check (ti cells) accepts what it accepts, and the toolchain recompiles that source to exactly the
// running variables (names, inputs, definitions). A module that fails is another language: no importer is
// offered its exports, so they cross as section 11 says. The modules are taken in import order, so a module whose
// exporter fails is checked with that import as a cell in another language, and must have been compiled so.
import { decompileVariable, contextFromCheck, keyOfVariable, declaredNameAt, isDuplicateKey, langOf, STATE_VALUE, INPUTS } from "../../lite/toolchain/ss-toolchain.ts";
import { checkProgram } from "./ti-link.ts";
import { compileTi } from "./compile.ts";
import { tiSameDefs } from "./ti-gate-link.ts";
import type { TiImport, TiModule, TiProgram, TiModResult } from "./ti-types.ss.ts";
import type { TiVar } from "./ti-gate.ss.ts";

export type GateModule = { name: string; variables: TiVar[]; imports: TiImport[] };
export type Gated = { program: TiProgram; verdicts: Map<string, { ss: boolean; why: string | null }> };

// core.ojs ss_isSs over plain records: the marker, or the value variable of a marked state cell's handle
export function ssVariables(vars: TiVar[]): TiVar[] {
  const byName = new Map(vars.map((v) => [v.name, v]));
  return vars.filter((v) => langOf(v.definition) === "ss" || (v.definition === STATE_VALUE && langOf(byName.get(`viewof ${v.name}`)?.definition ?? "") === "ss"));
}
// core.ojs ss_moduleCells: one text per cell, the variable's own name winning over the name its text declares
export function moduleTexts(ss: TiVar[]): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [], seen = new Set<string>();
  for (const v of ss) {
    let text = decompileVariable(v.definition);
    if (text === null) continue;
    const key = keyOfVariable(v.name);
    if (!key.startsWith("type ") && !isDuplicateKey(key)) {
      const head = declaredNameAt(text);
      if (head && head.name !== key) text = text.slice(0, head.start) + key + text.slice(head.end);
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, text });
  }
  const dup = out.filter((c) => isDuplicateKey(c.key)).sort((a, b) => (a.key < b.key ? -1 : 1));
  return [...out.filter((c) => !isDuplicateKey(c.key)), ...dup];
}

// recompile: false is the control, a gate that decompiles and checks only
export function gate(mods: GateModule[], opts: { recompile?: boolean } = {}): Gated {
  const verdicts = new Map<string, { ss: boolean; why: string | null }>();
  const texts = new Map<string, { key: string; text: string }[]>(), ssVars = new Map<string, TiVar[]>();
  const progMods: TiModule[] = [];
  for (const m of mods) {
    const ss = ssVariables(m.variables);
    ssVars.set(m.name, ss);
    const ssNames = new Set(ss.map((v) => v.name)), imported = new Set(m.imports.map((i) => i.local));
    const outside = [...new Set(m.variables.filter((v) => !ssNames.has(v.name) && !imported.has(v.name.replace(/^viewof /, ""))).map((v) => v.name))]
      .map((n) => ({ name: n.replace(/^viewof /, ""), view: n.startsWith("viewof ") }));
    let t: { key: string; text: string }[] = [];
    try { t = moduleTexts(ss); } catch (e) { verdicts.set(m.name, { ss: false, why: `decompile: ${(e as Error).message}` }); }
    texts.set(m.name, t);
    progMods.push({ name: m.name, cells: t.map((c) => c.text).join("\n\n"), outside, imports: m.imports });
  }
  const after = (_S: unknown, r: TiModResult, lite: Parameters<typeof contextFromCheck>[0]): TiModResult => {
    const early = verdicts.get(r.name);
    if (early) return { ...r, ss: false, why: early.why };
    let why: string | null;
    if (opts.recompile === false) { verdicts.set(r.name, { ss: true, why: null }); return r; }
    try {
      const ctx = { ...contextFromCheck(lite), inputs: INPUTS, module: r.name };
      const again = (texts.get(r.name) ?? []).flatMap((c) => compileTi(c.text, ctx, c.key));
      why = tiSameDefs(ssVars.get(r.name) ?? [], again);
    } catch (e) { why = `recompile: ${(e as Error).message}`; }
    verdicts.set(r.name, { ss: why === null, why });
    return { ...r, ss: why === null, why };
  };
  const program = checkProgram(progMods, after as never);
  for (const [n, r] of program.modules) if (!r.ss) verdicts.set(n, { ss: false, why: r.why });
  return { program, verdicts };
}
