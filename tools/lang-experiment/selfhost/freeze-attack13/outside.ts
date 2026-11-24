// freeze-attack13 target 5: an async function from another language (drive-rt's outside cell) called by an accepted
// SoundScript cell; the function calls an Action after its first await. drive-run has no outside cells.
import { type Cand } from "./lib13.ts";
const R: Cand[] = [];
const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
const drive = async (p: any) => { await p.settle(); const c = p.value("c"); return c !== 0 ? `DIFF STATE c is ${c} with no event; g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 80)}` : `same: c=${c} g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 100)}`; };
const ext = { ext: [[], () => (f: () => void) => { (async () => { await null; f(); })(); return 1; }] };
const extSync = { ext: [[], () => (f: () => void) => { f(); return 1; }] };
R.push({ name: "o-outside-async-action", src: ACT + `const g = (a: Action<[]>, ext: (f: Action<[]>) => number) => ext(a);`, show: ["c", "g"], drive, outside: ext } as any);
R.push({ name: "o-outside-async-unknown", src: ACT + `const g = (a: Action<[]>, ext: unknown) => 1;`, show: ["c", "g"], drive, outside: ext } as any);
R.push({ name: "o-outside-sync-action", src: ACT + `const g = (a: Action<[]>, ext: (f: Action<[]>) => number) => ext(a);`, show: ["c", "g"], drive, outside: extSync } as any);
R.push({ name: "o-ctl-outside-async", ctl: true, src: ACT + `const g = (a: Action<[]>, ext: (f: Action<[]>) => number) => ext(a);`, show: ["c", "g"], drive, outside: ext } as any);
export const cands = R;
