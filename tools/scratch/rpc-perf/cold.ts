// First call to a Worker left idle: perf3 and perf2 have had no call since the time printed by the run before.
// The connection, the kernel and the core are warmed first with calls that do not reach them.
import { BRAIN, FLOOR, NS, timed, save } from "./lib.ts";
const B = BRAIN + NS, out: any[] = [];
for (let i = 0; i < 5; i++) await timed(B + "perf.free");
const show = async (name: string, url: string) => { const r = await timed(url); out.push({ name, ...r }); console.log(name.padEnd(34), r.ms.toFixed(1).padStart(7), "ms", r.perf, r.body.slice(0, 200)); };
await show("perf.free warm", B + "perf.free");
await show("perf3.free first", B + "perf3.free");
await show("perf3.free second", B + "perf3.free");
await show("chain perf->perf2(first)->perf3", B + "perf.chain?d=2");
await show("chain again", B + "perf.chain?d=2");
console.log(new Date().toISOString());
save("cold-" + Date.now(), out);
