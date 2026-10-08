// CPU-bound steps, from outside: the time of one request that runs a step `reps` times, less one that runs none.
// (Inside the Worker the clock did not move across the loop, with a timer on each side: see the record.)
import { BRAIN, NS, owner, timed, save } from "./lib.ts";
const U = (op: string, reps: number) => BRAIN + NS + `perf.inside?op=${op}&reps=${reps}`;
const ops: [string, number][] = [["empty", 20000], ["sha", 20000], ["hmac-import-sign", 20000], ["hmac-sign", 20000], ["hmac-verify", 20000], ["cel-parse", 2000], ["cel-decide", 20000], ["who-decide", 20000], ["callerof", 20000], ["headers", 20000], ["url", 20000], ["json-ledger&len=2000", 50], ["json-ledger&len=200", 500]];
const runs = 9, all: any = {};
const got: Record<string, number[]> = {}, base: Record<string, number[]> = {};
for (let i = 0; i < runs; i++)
  for (const [op, reps] of ops) {
    const z = await timed(U(op, 0), { headers: owner }), r = await timed(U(op, reps), { headers: owner });
    if (r.status !== 200) console.log("!", op, r.status, r.body.slice(0, 200));
    (base[op] ??= []).push(z.ms); (got[op] ??= []).push(r.ms);
  }
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)], min = (xs: number[]) => Math.min(...xs);
for (const [op, reps] of ops) {
  const us = (f: (xs: number[]) => number) => ((f(got[op]) - f(base[op])) * 1000) / reps;
  console.log(op.padEnd(24), "reps", String(reps).padStart(6), ` request ${med(got[op]).toFixed(0)} ms, with 0 reps ${med(base[op]).toFixed(0)} ms -> µs each: by medians ${us(med).toFixed(2)}, by minimums ${us(min).toFixed(2)}`);
  all[op] = { reps, got: got[op], base: base[op] };
}
save("cpu-" + Date.now(), all);
