// The ti cells linked for bun with the md, ix and ow cells (lite/infer-ss.ts linkMd), and the glue a check of
// several modules needs: one Registry per module, given the declarations of the types it imports from the
// Registries of the modules that declare them. Nothing shipped is edited; lite/core.ts mdRegistry is reused.
import * as TiModule from "./ti-module.ss.ts";
import * as TiProgram from "./ti-program.ss.ts";
import "./ti-types.ss.ts";
import { linkMd } from "../../lite/infer-ss.ts";
import { mdRegistry, type LiteResult, type LiteCell } from "../../lite/core.ts";
import { linkAcorn } from "../../lite/acorn/index.ts";
import { CAPABILITIES } from "../../lite/intrinsics.ts";
import type { Registry } from "../../lite/registry.ts";
import type { CellInfo } from "../../lite/facts.ts";
import type { MdResult } from "../../lite/infer/md-types.ss.ts";
import type { TiSources, TiModResult, TiModule as Mod, TiProgram as Prog, TiExport, TiTypeDecl, TiKnown, TiHead } from "./ti-types.ss.ts";

export const TI_CELLS = { ...TiModule, ...TiProgram };
const A = linkAcorn();
type Entry = (R: unknown, S: TiSources) => { result: MdResult; exports: TiExport[]; types: TiTypeDecl[] };
type Glue = { checkOne: (S: TiSources) => TiModResult };
// the ti cells linked; given: values in place of other sections' cells (a checker variant, as lite/infer/diff.ts runs one)
export function linkTi(given: Record<string, unknown> = {}) {
  const L = linkMd(TI_CELLS as never, { declOf: A.declOf, ...given }) as any;
  return {
    tiCheckSources: L.tiCheckSources as Entry, tiCheckProgram: L.tiCheckProgram as (G: Glue, mods: Mod[], caps: Set<string>) => Prog,
    tiStep: L.tiStep as (G: Glue, K: TiKnown, m: Mod, h: TiHead, cyclic: Set<string>, caps: Set<string>) => TiKnown,
    tiMerge: L.tiMerge as (ks: TiKnown[]) => TiKnown, tiGraph: L.tiGraph as (mods: Mod[]) => { heads: Map<string, TiHead>; order: string[]; cyclic: Set<string> },
  };
}
const T = linkTi();
export const { tiCheckSources, tiCheckProgram, tiStep, tiMerge, tiGraph } = T;
export const CAPS = new Set(Object.keys(CAPABILITIES));

// an MdResult as core.ts runCheck gives it (LiteResult, with its facts), for the toolchain's contextFromCheck
export function toLite(r: MdResult, ms = 0): LiteResult {
  const cells: LiteCell[] = r.cells.map((c) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors.map((e) => ({ ...e })), unsupported: c.unsupported.map((e) => ({ ...e })), blockedBy: [...c.blockedBy], ...(c.value === null ? {} : { value: c.value }) }));
  const result: LiteResult = { port: r.port, file: r.file, ok: r.ok, module: r.module.map((e) => ({ ...e })), cells, ms };
  const facts = new Map<string, CellInfo>(r.facts.map((f) => [f.name, {
    name: f.name, span: [f.span[0] ?? 0, f.span[1] ?? 0], returnsRef: f.returnsRef, generator: f.generator, compiles: f.compiles.map((c) => ({ ...c })),
    params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, ...(p.boundary ? { boundary: p.boundary } : {}) })),
  }]));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  return result;
}

// The checks of one program: each module's Registry kept, so a later module is given the declarations it imports.
// after: run on each module's result before it is returned (the gate recompiles there and may mark it ss: false).
export function programGlue(after: (S: TiSources, r: TiModResult, lite: LiteResult) => TiModResult = (_s, r) => r, entry: Entry = tiCheckSources) {
  const regs = new Map<string, Registry>();
  const checkOne = (S: TiSources): TiModResult => {
    const t0 = performance.now();
    const R = mdRegistry(true, null);
    for (const d of S.types) {
      const src = regs.get(d.origin)?.types.get(d.name);
      if (src) R.reg.types.set(d.name, { ...src, nodes: [...src.nodes] });
    }
    let out: ReturnType<typeof tiCheckSources>;
    try { out = entry(R, S); } catch (e) {
      // core.ts throws on a source that does not parse: the module is another language, and exports nothing
      const msg = (e as Error).message;
      return { name: S.name ?? "", result: { port: S.name ?? "cells", file: "cells.tsx", ok: false, module: [{ rule: "parse", line: 0, msg }], cells: [], facts: [], gap: null, probe: null }, exports: [], types: [], ss: false, why: `check: ${msg}` };
    } finally { R.finish(); }
    regs.set(S.name ?? "", R.reg);
    const r: TiModResult = { name: S.name ?? "", result: out.result, exports: out.exports, types: out.types, ss: true, why: null };
    return after(S, r, toLite(out.result, performance.now() - t0));
  };
  return { checkOne, regs };
}
export const checkProgram = (mods: Mod[], after?: Parameters<typeof programGlue>[0], variant: ReturnType<typeof linkTi> = T) => variant.tiCheckProgram(programGlue(after, variant.tiCheckSources), mods, CAPS);
