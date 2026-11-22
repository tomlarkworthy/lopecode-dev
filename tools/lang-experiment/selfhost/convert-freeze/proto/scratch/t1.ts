import { conversionSites } from "../tree/lite/proto-sites.ts";
const srcs = [
`const a = () => { const m = [1]; m.push(2); return m; };`,
`const a = () => { const m = { x: 1 }; const f = (o: { x: number }) => o.x; f(m); const g = () => m.x; return g; };`,
`const a = () => { const m = new Map<string, number>(); const xs: Map<string, number>[] = []; xs.push(m); m.set("k", 1); return xs.length; };`,
`const a = () => { const m = [1]; try { throw m; } catch (e) { return 1; } };`,
`const a = () => { const m = [1]; const o = { m }; return o; };`,
`const a = () => { const m = [1]; const id = <T,>(x: T): T => x; const y = id(m); return y.length; };`,
];
for (const s of srcs) { const r = conversionSites(s, true); console.log(JSON.stringify(r.result.cells.map((c: any) => [c.name, c.status, c.errors.map((e: any) => e.rule)])), r.sites.map((x) => `${x.kind}@${s.slice(x.start, x.end)}${x.names ? "[" + x.names + "]" : ""}`).join(" | ")); }
