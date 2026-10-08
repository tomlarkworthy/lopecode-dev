// A call made after the core's 5 s of memory has passed, and the same call made again at once. bun spaced.ts [rounds] [gapMs]
import { BRAIN, NS, owner, token, timed, row, save } from "./lib.ts";
const rounds = Number(process.argv[2] || 20), gap = Number(process.argv[3] || 7000);
const B = BRAIN + NS, tok = token();
const cases: Record<string, () => Promise<any>> = {
  "free anon": () => timed(B + "perf.free"),
  "chain 2 anon": () => timed(B + "perf.chain?d=1"),
  "priced token": () => timed(B + "perf.priced", { headers: tok }),
  "free session": () => timed(B + "perf.free", { headers: owner })
};
const out: Record<string, any[]> = {};
for (let i = 0; i < rounds; i++)
  for (const [k, f] of Object.entries(cases)) {
    await new Promise((r) => setTimeout(r, gap));
    (out[k + " | after " + gap / 1000 + " s"] ??= []).push(await f());
    (out[k + " | again at once"] ??= []).push(await f());
  }
console.log(new Date().toISOString(), "rounds", rounds, "gap", gap);
for (const [k, rs] of Object.entries(out)) console.log(row(k, rs.map((r) => r.ms)));
save("spaced-" + Date.now(), out);
