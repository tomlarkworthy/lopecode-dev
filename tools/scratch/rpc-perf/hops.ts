// The hop table, from outside: every case once a round, n rounds. bun hops.ts [rounds]
import { BRAIN, FLOOR, NS, owner, token, timed, interleave, report, save } from "./lib.ts";
const rounds = Number(process.argv[2] || 120);
const B = BRAIN + NS, tok = token();
const cases: Record<string, () => Promise<any>> = {
  "floor": () => timed(FLOOR + "/"),
  "kernel wrapper (_health)": () => timed(BRAIN + "/xrpc/_health"),
  "kernel app (/auth/session)": () => timed(BRAIN + "/auth/session"),
  "kernel bad session 401": () => timed(B + "perf.free", { headers: { authorization: "Bearer v1.e30.x" } }),
  "kernel bad token 401": () => timed(B + "perf.free", { headers: { authorization: "Bearer nope" } }),
  "core 501 anon": () => timed(B + "perf.nope"),
  "free anon": () => timed(B + "perf.free"),
  "free session": () => timed(B + "perf.free", { headers: owner }),
  "owner-rule session": () => timed(B + "perf.owner", { headers: owner }),
  "free token": () => timed(B + "perf.free", { headers: tok }),
  "priced token": () => timed(B + "perf.priced", { headers: tok }),
  "priced refund token": () => timed(B + "perf.fail", { headers: tok }),
  "priced settle token": () => timed(B + "perf.settle", { headers: tok }),
  "chain 1 anon": () => timed(B + "perf.chain?d=0"),
  "chain 2 anon": () => timed(B + "perf.chain?d=1"),
  "chain 3 anon": () => timed(B + "perf.chain?d=2"),
  "chain 4 anon": () => timed(B + "perf.chain?d=3"),
  "chainp 1 token": () => timed(B + "perf.chainp?d=0", { headers: tok }),
  "chainp 2 token": () => timed(B + "perf.chainp?d=1", { headers: tok }),
  "chainp 3 token": () => timed(B + "perf.chainp?d=2", { headers: tok })
};
const t = Date.now();
const out = await interleave(cases, rounds);
console.log(new Date().toISOString(), "rounds", rounds, "took", Math.round((Date.now() - t) / 1000), "s");
report(out);
// What the services saw: the time of the call each made to the next, by depth.
for (const k of ["chain 4 anon", "chainp 3 token"]) {
  const inner: number[][] = [];
  for (const r of out[k]) { let b: any = JSON.parse(r.body || "null"), d = 0; while (b) { (inner[d] ??= []).push(b.ms); b = b.inner && b.inner.body; d++; } }
  console.log(k, "inner ms p50 by depth", inner.map((xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]).join(" "));
}
save("hops-" + Date.now(), out);
