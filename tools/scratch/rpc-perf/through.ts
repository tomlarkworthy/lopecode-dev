// Calls a second with k callers at once, from one client. bun through.ts
import { BRAIN, FLOOR, NS, owner, token, timed, row, save } from "./lib.ts";
const B = BRAIN + NS, tok = token(), all: any = {};
const run = async (name: string, total: number, k: number, f: () => Promise<any>) => {
  const rs: any[] = []; let next = 0;
  const t = performance.now();
  await Promise.all(Array.from({ length: k }, async () => { while (next++ < total) rs.push(await f()); }));
  const s = (performance.now() - t) / 1000, codes: any = {};
  for (const r of rs) codes[r.status] = (codes[r.status] || 0) + 1;
  console.log(row(`${name} x${k}`, rs.map((r) => r.ms), ` ${(rs.length / s).toFixed(0)} calls/s  status ${JSON.stringify(codes)}`));
  all[`${name} x${k}`] = { seconds: s, rs: rs.map((r) => ({ ms: r.ms, status: r.status })) };
};
await run("warm", 100, 50, () => timed(FLOOR + "/"));
await run("warm", 100, 50, () => timed(B + "perf.free"));
for (const k of [1, 10, 50]) {
  await run("floor", k === 1 ? 100 : 1000, k, () => timed(FLOOR + "/"));
  await run("free anon", k === 1 ? 100 : 1000, k, () => timed(B + "perf.free"));
  await run("free session", k === 1 ? 100 : 1000, k, () => timed(B + "perf.free", { headers: owner }));
  await run("chain 3 anon", k === 1 ? 100 : 500, k, () => timed(B + "perf.chain?d=2"));
}
await run("priced token", 30, 1, () => timed(B + "perf.priced", { headers: tok }));
await run("priced token", 60, 10, () => timed(B + "perf.priced", { headers: tok }));
await run("priced token", 150, 50, () => timed(B + "perf.priced", { headers: tok }));
save("through-" + Date.now(), all);
