import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "accept-nested-helper-fetches-and-reads", src: `const both = async (fetch: Fetch) => {
  const get = async (u: string): Promise<string> => { const res = await fetch(u); return await res.text(); };
  const xs = await Promise.all([get("a"), get("b")]);
  return xs.join(",");
};`, show: ["both"], fetchBody: "hi" },
  { name: "accept-nested-helper-checks-ok-then-reads", src: `const both = async (fetch: Fetch) => {
  const get = async (u: string): Promise<string> => { const res = await fetch(u); if (!res.ok) throw new Error(u + ": " + res.status); const t = await res.text(); return t; };
  return (await get("a")).length;
};`, show: ["both"], fetchBody: "hello" },
  { name: "accept-nested-helper-returns-response", src: `const both = async (fetch: Fetch) => {
  const get = async (u: string) => await fetch(u);
  const res = await get("a");
  return await res.text();
};`, show: ["both"], fetchBody: "hi" },
  { name: "accept-nested-helper-response-across-two-awaits", src: `const both = async (fetch: Fetch) => {
  const get = async (u: string): Promise<string> => { const res = await fetch(u); await Promise.resolve(); return await res.text(); };
  return await get("a");
};`, show: ["both"], fetchBody: "hi" },
  { name: "nested-helper-mut-array-written-after-await", src: `const n = async () => {
  const f = async (): Promise<number> => { const xs = [1]; await Promise.resolve(); xs.push(2); return xs.length; };
  return await f();
};`, show: ["n"] },
  { name: "nested-helper-mut-array-read-after-await", src: `const n = async () => {
  const f = async (): Promise<number> => { const xs = [1]; await Promise.resolve(); return xs.length; };
  return await f();
};`, show: ["n"] },
];
export const srcs = toSrcs(cands);
