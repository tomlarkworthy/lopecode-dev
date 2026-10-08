// What the core counted, by method, from the metrics service. bun metrics.ts [hours]
import { call, NS, save } from "./lib.ts";
const hours = Number(process.argv[2] || 24), until = Date.now(), since = until - hours * 3600e3;
const r = await call(NS + `metrics.query?since=${since}&until=${until}&step=${hours * 3600e3}`);
if (r.status !== 200) { console.log(r.status, r.text.slice(0, 300)); process.exit(1); }
const rows = r.data.series;
console.log("row shape", JSON.stringify(rows[0]));
const by = new Map<string, any>();
for (const x of rows) { const k = x.worker + " " + String(x.method).replace("com.lopecode.brain.", "") + " " + x.caller + " " + x.status; const b = by.get(k) || { n: 0, ms: 0, max: 0 }; by.set(k, { n: b.n + x.n, ms: b.ms + x.ms, max: Math.max(b.max, x.max) }); }
const list = [...by].sort((a, b) => b[1].n - a[1].n);
console.log(`last ${hours} h, ${list.reduce((a, [, v]) => a + v.n, 0)} calls counted by the core`);
for (const [k, v] of list.slice(0, 40)) console.log(String(v.n).padStart(7), String(Math.round(v.ms / v.n)).padStart(6) + " ms mean", String(v.max).padStart(7) + " max ", k);
save("metrics-" + until, rows);
