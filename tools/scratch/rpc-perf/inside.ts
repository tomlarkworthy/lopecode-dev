// Timings taken inside brain-x-perf, with its own clock across I/O. bun inside.ts io|cpu|grow [n]
import { BRAIN, NS, owner, call, stats, row, save } from "./lib.ts";
const mode = process.argv[2] || "io", n = Number(process.argv[3] || 100);
const inside = async (q: string) => { const r = await call(NS + "perf.inside?" + q, { headers: owner }); if (r.status !== 200) console.log("  !", q, r.status, r.text.slice(0, 200)); return r.data; };
const all: any = {};
if (mode === "io") {
  const ops = ["noop", "x501", "xrpc", "xrpcq", "xrpc&target=perf2.free", "secret-held", "secret-get", "sql1", "sqlt", "sqlw", "rows-miss", "rows-get", "rows-put", "rows-list", "rows-inc"];
  const acc: Record<string, number[]> = Object.fromEntries(ops.map((o) => [o, []]));
  // Several short batches in turn, so one op does not get one moment of the network to itself.
  const batch = 25;
  for (let done = 0; done < n; done += batch) for (const op of ops) { const d = await inside(`op=${op}&n=${batch}`); if (d && d.ms) acc[op].push(...d.ms); }
  for (const op of ops) console.log(row(op, acc[op]));
  Object.assign(all, acc);
  for (const op of ["xrpc", "rows-get", "sql1", "x501"]) { const d = await inside(`op=${op}&n=50&par=50`); if (d) { console.log(row(op + " x50 at once", d.ms, ` total ${d.total} ms`)); all[op + "-par50"] = d; } }
}
if (mode === "cpu") {
  const ops: [string, number][] = [["empty", 20000], ["sha", 20000], ["hmac-import-sign", 20000], ["hmac-sign", 20000], ["hmac-verify", 20000], ["cel-parse", 2000], ["cel-decide", 20000], ["who-decide", 20000], ["callerof", 20000], ["headers", 20000], ["url", 20000], ["json-ledger&len=2000", 20], ["json-ledger&len=200", 200]];
  for (const [op, reps] of ops) {
    const per: number[] = [];
    for (let i = 0; i < 5; i++) { const d = await inside(`op=${op}&reps=${reps}`); if (d) per.push((d.ms * 1000) / reps); }
    const s = per.sort((a, b) => a - b);
    console.log(op.padEnd(24), "reps", String(reps).padStart(6), " µs each: min", s[0]?.toFixed(1), "median", s[Math.floor(s.length / 2)]?.toFixed(1), "max", s[s.length - 1]?.toFixed(1));
    all[op] = { reps, usEach: per };
  }
}
if (mode === "grow") {
  // The day's list of one account, as the core reads it for a priced call: append one entry, read the whole list.
  for (const len of [0, 250, 500, 1000, 1500, 2000]) {
    await inside(`op=setup&len=${len}`);
    const a = await inside(`op=rows-append-getbig&n=30`), g = await inside(`op=rows-getbig&n=30`), p = await inside(`op=rows-append&n=30`);
    console.log(`list of ${String(len).padStart(4)}  append+get p50 ${stats(a.ms).p50}  get p50 ${stats(g.ms).p50}  append p50 ${stats(p.ms).p50}`);
    all["len" + len] = { a: a.ms, g: g.ms, p: p.ms };
  }
  await inside("op=setup&len=0");
}
save("inside-" + mode + "-" + Date.now(), all);
