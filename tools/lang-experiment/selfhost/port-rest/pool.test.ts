// Differential test: lite/browser/workers.ts makePool against the prototype (pool-shell.ts over pool.ss.ts), on
// random scripts of runs, owner deaths, worker answers, worker errors and posts that throw, with fake workers that
// answer only when the script says. No timers: each step is followed by microtask turns. Two mutants of one cell
// each are run as controls. Run: bun selfhost/port-rest/pool.test.ts [scripts]
import { makePool as original, type Job } from "../../lite/browser/workers.ts";
import { makePool as proto, linkPool } from "./pool-shell.ts";
import { requireChecked } from "./ss-check.ts";

requireChecked(`${import.meta.dir}/pool.ss.ts`);
const N = Number(process.argv[2] ?? 2000), STEPS = 40, SIZE = 2;

class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  posted: { id: number; job: Job }[] = [];
  constructor(private i: number, private trace: string[]) {}
  postMessage(m: { id: number; job: Job }) {
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
  ["prototype", (size, mk) => proto(size, mk)],
  // controls: the queue keeps jobs of a dead owner; a missing island is sent again without the once limit
  ["mutant takeLive (no drop)", (size, mk) => proto(size, mk, linkPool({ takeLive: () => (queue: readonly number[]) => ({ dropped: [], qid: queue[0] ?? null, rest: queue.slice(1) }) } as never))],
  ["mutant settle (answered not counted)", (size, mk) => proto(size, mk, linkPool({ settle: (withSlot: any) => (st: any, slot: number, id: number, qid: number) => ({ ...st, waiting: new Map([...st.waiting].filter(([i]: [number]) => i !== id)), jobs: new Map([...st.jobs].filter(([q]: [number]) => q !== qid)), slots: withSlot(st.slots, slot, (s: any) => ({ ...s, busy: false })) }) } as never))],
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
  if (name === "prototype" ? differ > 0 : differ === 0) fail++;
}
// what the scripts reached, in the original's traces
{
  const all = (await Promise.all(Array.from({ length: 200 }, (_, i) => play(i + 1, original)))).flat();
  let resends = 0;
  for (let i = 0; i < 200; i++) { const ids = (await play(i + 1, original)).filter((l) => / post /.test(l)).map((l) => l.split(" ")[2]); resends += ids.length - new Set(ids).size; }
  console.log(`  original, 200 scripts: ${resends} resends of a missing island`);
  for (const pat of ["SupersededError", "DataCloneError", "was not sent", "worker failed", "boom", "resolve"]) console.log(`  original, 200 scripts: ${all.filter((l) => l.includes(pat)).length} lines with ${pat}`);
}
console.log(fail ? `FAIL ${fail}` : "pass");
process.exit(fail ? 1 : 0);
