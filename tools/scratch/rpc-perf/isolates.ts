// How many instances of brain-x-perf answer: each has its own counter and birth time (x-perf: name;n=;age=).
import { BRAIN, NS, timed } from "./lib.ts";
const births = (rs: any[]) => { const m = new Map<number, number>(); for (const r of rs) { const a = /n=(\d+);age=(\d+)/.exec(r.perf)!; const born = Math.round((r.at - Number(a[2])) / 2000); m.set(born, (m.get(born) || 0) + 1); } return [...m.values()].sort((a, b) => b - a); };
const one = async () => { const r = await timed(BRAIN + NS + "perf.free"); return { ...r, at: Date.now() }; };
const seq: any[] = []; for (let i = 0; i < 200; i++) seq.push(await one());
console.log("200 calls one after another: instances", births(seq).length, births(seq).join(","));
const par = (await Promise.all(Array.from({ length: 50 }, async () => { const o = []; for (let i = 0; i < 8; i++) o.push(await one()); return o; }))).flat();
console.log("400 calls, 50 at once:       instances", births(par).length, births(par).join(","));
