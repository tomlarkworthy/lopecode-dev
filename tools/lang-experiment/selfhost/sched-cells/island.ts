// The language's compile on compile-probe.ss.ts's stepCompiled island ({ st, ev } -> { out }). compiled is what a
// cell taking compile gets (async). islandStepSync runs the same job (captured through a pool whose run is
// compile's own runHere) without the await: what a synchronous compile would give.
import { readFileSync } from "node:fs";
import { splitCells } from "../../lite/toolchain/ss-toolchain.ts";
import { compiler, joinCells } from "../../lite/stdlib/runtime.ts";
import { runHere, type Job } from "../../lite/browser/workers.ts";

const at = (p: string) => new URL(p, import.meta.url).pathname;
const files = [at("../../lite/runtime.ss.ts"), at("./step.ss.ts"), at("./compile-probe.ss.ts")];
const source = joinCells(files.flatMap((p) => splitCells(readFileSync(p, "utf8"), false)));
let job: Job | null = null;
const pool = { size: 1, answered: [], run: (j: Job) => { job = j; return Promise.resolve(runHere(j)); } };
const spec = { inputs: ["st", "ev"], refs: [], outputs: ["out"] };
export const compiled = compiler(() => source).for("stepCompiled", {})({ ...spec }) as (a: { st: unknown; ev: unknown }) => Promise<{ out: any }>;
const viaPool = compiler(() => source).for("stepCompiled", {})({ ...spec, options: { runtime: pool as any } }) as typeof compiled;
await viaPool({ st: { hs: new Map(), at: new Map(), ls: new Map(), lat: new Map(), placer: false, generation: 0, born: new Map() }, ev: { t: "kick", hid: 0 } });
const j = job!;
export const islandCells = j.names;
export const islandStepSync = (st: any, ev: any) => runHere({ ...j, values: { st, ev } }).out;
