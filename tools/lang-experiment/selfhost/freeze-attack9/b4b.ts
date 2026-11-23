// target 3, B4d recheck: await flattens every level (pb7.ts), so a local `await f()` is consistent; these rows read a
// Promise<Promise<T>> where no await flattens it: a cell input and a then callback.
import { tyRow, type Cand } from "./lib9.ts";
export const cands: Cand[] = [
  tyRow("pp-cell-input", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`, (v) => v === "object"),
  tyRow("pp-then-callback", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); return await f().then((v) => typeof v); };`, (v) => v === "number"),
  tyRow("pp-then-callback-ann", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); return await f().then((v: Promise<number>) => typeof v); };`, (v) => v === "object"),
  tyRow("pp-cell-input-unann", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p) => typeof p;`, (v) => v === "object"),
  tyRow("sync-cell-promise-input", `const p = () => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`, (v) => v === "object"),
  tyRow("sync-cell-promise-input-nested", `const p = () => Promise.resolve(Promise.resolve(5));\nconst g = (p: Promise<number>) => typeof p;`, (v) => v === "object"),
  tyRow("pp-await-local-consistent", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); const n: number = await f(); return typeof n; };`, (v) => v === "number"),
];
