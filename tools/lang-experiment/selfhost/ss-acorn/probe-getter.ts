// A result whose read throws (a getter, a proxy trap): what the checked cell's error is (uncaught, as the runtime has
// it; probe 3 shows a checked catch sees the same value). Run: bun probe-getter.ts
import { load } from "./rt.ts";
const COPY = process.env.SSA_COPY ?? "rule";
const foreign = { foreign: true };
const src = `type R = { n: number };
export const r = (f: (s: string) => R) => f("x").n;
export const a = async (g: (s: string) => Promise<R>) => (await g("x")).n;`;
const cases: [string, () => unknown][] = [
  ["a getter that throws an object", () => ({ get n() { throw foreign; } })],
  ["a getter that throws a TypeError", () => ({ get n() { throw new TypeError("f(...) forged"); } })],
  ["a proxy whose get trap throws", () => new Proxy({}, { get() { throw foreign; } })],
  ["(async only) a real Promise whose constructor getter throws", () => { const q = Promise.resolve({ n: 1 }); Object.defineProperty(q, "constructor", { get() { throw foreign; } }); return q; }],
  ["a proxy whose getPrototypeOf trap throws", () => new Proxy({ n: 1 }, { getPrototypeOf() { throw foreign; } })],
];
console.log(`copy: ${COPY}`);
for (const [label, mk] of cases) {
  const L = await load(COPY, src, { f: [[], () => () => mk()], g: [[], () => label.startsWith("(async only)") ? () => mk() : async () => mk()] });
  const r = await L.value("r"), a = await L.value("a");
  const seen = (x: any) => x.ok ? `value ${JSON.stringify(x.v)}` : `${x.e === foreign ? "THE FOREIGN OBJECT" : String(x.e)}; a TypeError: ${x.e instanceof TypeError}`;
  console.log(`${label}: sync ${seen(r)} | async ${seen(a)}`);
}
process.exit(0);
