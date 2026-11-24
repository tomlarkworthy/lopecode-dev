// freeze-attack11: the minimal program of each break, with its detector. Run with drive-rt.ts and drive-run.ts.
import { tyRow, type Cand } from "../freeze-attack9/lib9.ts";
const R: any[] = [];
const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
const stateDrive = (p: any) => (p.status("c") === "fulfilled" && p.value("c") !== 0 ? `DIFF STATE c is ${p.value("c")} with no event; g ${p.status("g")}=${JSON.stringify(p.value("g"))} ${String(p.error("g") ?? "").slice(0, 80)}` : `same: c=${p.value("c")} g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 80)}`);
R.push({ name: "min-action-template", src: ACT + "const g = (a: Action<[]>) => `${{ toString: a }}`;", show: ["c", "g"], drive: stateDrive });
R.push({ name: "min-action-hidden-json", src: ACT + "const g = (a: Action<[]>) => { const x = { n: 1, toJSON: a }; const o: { readonly n: number } = x; return JSON.stringify(o); };", show: ["c", "g"], drive: stateDrive });
R.push(tyRow("min-then-async", `const g = async () => { const x = { n: 1, then: (r: (v: string) => void) => r("s") }; const o: { readonly n: number } = x; return o; };`, (v: any) => typeof v?.n === "number"));
R.push(tyRow("min-fn-name", `const g = () => { const v: { readonly name?: number } = (x: number) => x; return typeof v.name; };`, (v) => v === "undefined" || v === "number"));
R.push(tyRow("min-scope", `const g = () => { const f = () => Math.max(1, 2); const Math = { max: (a: number, b: number) => "s" }; return f(); };`, (v) => typeof v === "number"));
R.push({ name: "min-scope-action", src: ACT + `const g = (a: Action<[]>) => { const x = () => 0; { const f = () => x(); const x = a; f(); return 1; } };`, show: ["c", "g"], drive: stateDrive });
R.push(tyRow("min-json-undefined", `const g = () => JSON.stringify(undefined);`, (v) => typeof v === "string"));
R.push({ name: "min-this", src: `const this = () => 5;\nconst g = () => 6;`, show: ["g"], drive: (p: any) => `g ${p.status("g")} ${JSON.stringify(p.value("g"))}` });
const U = `"https://x.test/"`;
R.push({ name: "min-resp-race", src: `const r = async (fetch: Fetch) => { const res = await fetch(${U}); const x = { n: 1, res }; const o: { readonly n: number } = x; return o; };`, fetchBody: "body", show: ["r", "o1", "o2"],
  after: {
    o1: [["r"], async (r: any) => { try { return await (await r).res.text(); } catch (e) { return "used: " + (e as Error).message; } }],
    o2: [["r"], async (r: any) => { for (let i = 0; i < 600; i++) await null; try { return await (await r).res.text(); } catch (e) { return "used: " + (e as Error).message; } }],
  },
  drive: (p: any) => (/already used/i.test(String(p.value("o2"))) && p.value("o1") === "body" ? `DIFF USED o2: ${p.value("o2")}` : `same: o1=${p.value("o1")} o2=${p.value("o2")}`) });
R.push({ name: "min-ctl-action-call", ctl: true, src: ACT + "const g = (a: Action<[]>) => { a(); return 1; };", show: ["c", "g"], drive: stateDrive });
export const cands = R;
