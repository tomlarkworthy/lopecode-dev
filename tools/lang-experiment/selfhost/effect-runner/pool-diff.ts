// Differential: makePool of a frozen copy of today's lite/browser/workers.ts against the live one (workers.ts over
// pool.ss.ts), on random scripts of runs, owner deaths, worker answers, worker errors, posts that throw (an
// uncloneable job, and a worker told to throw on its next post, which reaches a resend whose post throws), with fake
// workers that answer only when the script says. No timers. Copied from selfhost/port-rest/pool.test.ts.
// Copied from lite/soundscript/.scratch/ports-night/pool-diff.ts. Arms: the shipped makePool and this folder's
// (pool-shell.ts over runner.ts), each against the frozen original; RUNNER_MUTANT=<name> makes the runner a control.
// Run: bun pool-diff.ts [scripts]
import { makePool as original, type Job } from "../../lite/soundscript/.scratch/ports-night/frozen/lite/browser/workers.ts";
import { makePool as shipped } from "../../lite/browser/workers.ts";
import { makePool as live } from "./pool-shell.ts";
import * as poolCells from "../../lite/pool.ss.ts";
import { link } from "../../lite/link.ts";
import { requireChecked } from "../port-rest/ss-check.ts";

requireChecked(`${import.meta.dir}/../../lite/pool.ss.ts`);
const MUTANT = process.env.RUNNER_MUTANT ?? "";
const linkPool = (over: object = {}) => link({ ...poolCells, ...over } as typeof poolCells);
const proto = (size: number, mk: () => Worker, S = linkPool()) => live(size, mk, S.poolStep);
const N = Number(process.argv[2] ?? 2000), STEPS = 40, SIZE = 2;

class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  posted: { id: number; job: Job }[] = [];
  throwNext = false;
  sent = new Set<number>();
  constructor(private i: number, private trace: string[]) {}
  postMessage(m: { id: number; job: Job }) {
    if (this.throwNext) { this.throwNext = false; this.trace.push(`w${this.i} post ${m.id} threw${this.sent.has(m.id) ? " (resend)" : ""}`); throw new Error(`post failed on w${this.i}`); }
    this.sent.add(m.id);
    // a job holding a function cannot be cloned
    if (typeof m.job.values.fn === "function") throw new Error(`DataCloneError on w${this.i}`);
    this.trace.push(`w${this.i} post ${m.id} ${m.job.key} code=${m.job.js !== undefined}`);
    this.posted.push(m);
  }
}
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

async function play(seed: number, make: typeof original): Promise<string[]> {
  const r = rng(seed), trace: string[] = [], ws: FakeWorker[] = [];
  const pool = make(SIZE, () => { const w = new FakeWorker(ws.length, trace); ws.push(w); return w as unknown as Worker; });
  const owners = [{ dead: false }, { dead: false }, { dead: false }];
  let n = 0;
  const turn = async () => { for (let i = 0; i < 6; i++) await null; };
  for (let s = 0; s < STEPS; s++) {
    const x = r();
    if (x < 0.4) {
      const q = ++n, o = Math.floor(r() * 3), key = `k${Math.floor(r() * 4)}`;
      const job: Job = { key, js: r() < 0.8 ? "code" : undefined, names: [], order: [], values: r() < 0.08 ? { fn: () => 1 } : { x: q }, outputs: [] };
      pool.run(job, owners[o]).then((v) => trace.push(`q${q} resolve ${JSON.stringify(v)}`), (e: Error) => trace.push(`q${q} reject ${e.name}: ${e.message}`));
    } else if (x < 0.5) {
      const o = Math.floor(r() * 3);
      owners[o].dead = true;
      owners[o] = { dead: false };
    } else if (x < 0.56) {
      const w = ws[Math.floor(r() * ws.length)];
      w.throwNext = true;
      trace.push(`w? throw next`);
    } else if (x < 0.95) {
      const w = ws[Math.floor(r() * ws.length)], m = w.posted.shift();
      if (m) {
        const y = r();
        const data = m.job.js === undefined && y < 0.5 ? { id: m.id, missing: true } : y < 0.8 ? { id: m.id, out: { v: m.id } } : y < 0.9 ? { id: m.id, error: "boom" } : { id: m.id + 1000, out: {} };
        trace.push(`w? answer ${JSON.stringify(data)}`);
        w.onmessage!({ data });
      }
    } else {
      const w = ws[Math.floor(r() * ws.length)];
      trace.push(`w? error`);
      w.onerror!(r() < 0.5 ? { message: "oops" } : {});
    }
    await turn();
  }
  trace.push(`answered ${JSON.stringify(pool.answered)}`);
  return trace;
}

const arms: [string, typeof original][] = [
  // controls: the queue keeps jobs of a dead owner; a missing island is sent again without the once limit
  ["shipped", (size, mk) => shipped(size, mk)],
  [MUTANT ? `runner mutant ${MUTANT}` : "runner", (size, mk) => proto(size, mk)],
  ["mutant takeLive (no drop)", (size, mk) => proto(size, mk, linkPool({ takeLive: () => (queue: readonly number[]) => ({ dropped: [], qid: queue[0] ?? null, rest: queue.slice(1) }) } as never))],
  ["mutant settle (answered not counted)", (size, mk) => proto(size, mk, linkPool({ settleSlot: (withSlot: any) => (st: any, slot: number, id: number, qid: number) => ({ ...st, waiting: new Map([...st.waiting].filter(([i]: [number]) => i !== id)), jobs: new Map([...st.jobs].filter(([q]: [number]) => q !== qid)), slots: withSlot(st.slots, slot, (s: any) => ({ ...s, busy: false })) }) } as never))],
];
let fail = 0;
for (const [name, make] of arms) {
  let differ = 0, events = 0, first = -1;
  for (let seed = 1; seed <= N; seed++) {
    const a = await play(seed, original), b = await play(seed, make);
    events += a.length;
    if (JSON.stringify(a) !== JSON.stringify(b)) { differ++; if (first < 0) first = seed; }
  }
  console.log(`${name}: ${differ} of ${N} scripts differ from the original (${events} trace lines in the original's runs)${first >= 0 ? `, first seed ${first}` : ""}`);
  // the shipped shell and the real runner must not differ; a cell mutant or a runner mutant must
  if (name === "shipped" || name === "runner" ? differ > 0 : differ === 0) fail++;
}
// what the scripts reached, in the original's traces
{
  const all = (await Promise.all(Array.from({ length: 200 }, (_, i) => play(i + 1, original)))).flat();
  let resends = 0;
  for (let i = 0; i < 200; i++) { const ids = (await play(i + 1, original)).filter((l) => / post /.test(l)).map((l) => l.split(" ")[2]); resends += ids.length - new Set(ids).size; }
  console.log(`  original, 200 scripts: ${resends} resends of a missing island`);
  console.log(`  original, 200 scripts: ${all.filter((l) => l.includes("threw (resend)")).length} resends whose post threw`);
  for (const pat of ["post failed", "SupersededError", "DataCloneError", "was not sent", "worker failed", "boom", "resolve"]) console.log(`  original, 200 scripts: ${all.filter((l) => l.includes(pat)).length} lines with ${pat}`);
}
console.log(fail ? `FAIL ${fail}` : "pass");
process.exit(fail ? 1 : 0);
