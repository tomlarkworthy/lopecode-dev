// freeze-attack14 class 2: S6.10 and S6.14. A top-level call that throws keeps none of its writes, and none of the
// writes of the actions it called; a caught throw of a nested action keeps that action's earlier writes; read sees the
// call's earlier writes. callRow: the drive makes the top-level call, then reads the cell named last
import { callRow, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const K = `const k = (): StateCell<number> => state(0);\nconst g = (k: number) => k;\n`;
const C = (name: string, body: string, want: number, ctl = false) => R.push(callRow(`c-${name}`, K + body, "b", [], isLit(want), "g", ctl));
C("throw-after-set", `const b = (k: State<number>) => action(() => { k.set(1); throw new Error("x"); });`, 0);
C("throw-after-nested", `const a = (k: State<number>) => action(() => k.set(1));\nconst b = (a: Action<[]>) => action(() => { a(); throw new Error("x"); });`, 0);
C("update-throws", `const b = (k: State<number>) => action(() => { k.set(2); k.update((v) => { if (v > 1) throw new Error("x"); return v; }); });`, 0);
C("caught-nested-keeps", `const a = (k: State<number>) => action(() => { k.set(1); throw new Error("x"); });\nconst b = (a: Action<[]>) => action(() => { try { a(); } catch (e) { } });`, 1);
C("caught-then-throw", `const a = (k: State<number>) => action(() => { k.set(1); throw new Error("x"); });\nconst b = (a: Action<[]>) => action(() => { try { a(); } catch (e) { } throw new Error("y"); });`, 0);
C("read-sees-write", `const b = (k: State<number>) => action(() => { k.set(5); k.set(read(k) + 1); });`, 6);
C("update-sees-write", `const b = (k: State<number>) => action(() => { k.set(5); k.update((v) => v + 1); });`, 6);
C("nested-read", `const a = (k: State<number>) => action(() => k.set(read(k) + 10));\nconst b = (a: Action<[]>, k: State<number>) => action(() => { k.set(1); a(); });`, 11);
C("throw-in-map", `const b = (k: State<number>) => action(() => { [1, 2].forEach((x) => { k.set(x); if (x === 2) throw new Error("x"); }); });`, 0);
C("throw-in-update-after-nested", `const a = (k: State<number>) => action(() => k.set(3));\nconst b = (a: Action<[]>, k: State<number>) => action(() => { a(); k.update((v) => { throw new Error("x"); }); });`, 0);
C("caught-update", `const b = (k: State<number>) => action(() => { k.set(1); try { k.update((v) => { throw new Error("x"); }); } catch (e) { } });`, 1);
C("caught-update-partial", `const b = (k: State<number>) => action(() => { try { k.update((v) => { k.set(9); throw new Error("x"); }); } catch (e) { } });`, 9); // S6.10: a write applies when it is made; the caught throw keeps it
C("ctl-write-kept", `const b = (k: State<number>) => action(() => { k.set(1); });`, 0, true);


// S6.14: calls that return before the commit share it; the reader runs once for them and sees no value between
const seq = (acts: string[], bad: (vs: unknown[]) => boolean) => async (p: any) => {
  for (const a of acts) { try { p.value(a)(); } catch (e) { return `same: ${a} threw ${(e as Error).message.slice(0, 80)}`; } }
  await p.settle();
  const vs = p.values("g");
  return bad(vs) ? `DIFF g saw ${JSON.stringify(vs)}` : `same: g saw ${JSON.stringify(vs)}`;
};
const between = (vs: unknown[]) => vs.some((v) => v !== 0 && v !== vs[vs.length - 1]);
R.push({ name: "c-two-calls-one-commit", src: K + `const b = (k: State<number>) => action(() => k.update((v) => v + 1));`, show: ["g"], drive: seq(["b", "b"], between) });
R.push({ name: "c-two-actions-one-commit", src: K + `const b = (k: State<number>) => action(() => k.update((v) => v + 1));\nconst d = (k: State<number>) => action(() => k.update((v) => v * 10));`, show: ["g"], drive: seq(["b", "d", "b"], between) });
R.push({ name: "c-two-states-one-commit", src: `const k = (): StateCell<number> => state(0);\nconst j = (): StateCell<number> => state(0);\nconst g = (k: number, j: number) => k - j;\nconst b = (k: State<number>, j: State<number>) => action(() => { k.set(read(k) + 1); j.set(read(j) + 1); });\nconst d = (k: State<number>) => action(() => k.set(read(k) + 1));`, show: ["g"], drive: seq(["d", "b"], (vs) => vs.some((v) => v !== 0 && v !== 1)) });
R.push({ name: "c-ctl-between", ctl: true, src: K + `const b = (k: State<number>) => action(() => k.update((v) => v + 1));`, show: ["g"], drive: async (p: any) => { p.value("b")(); await p.settle(); p.value("b")(); await p.settle(); const vs = p.values("g"); return between(vs) ? `DIFF g saw ${JSON.stringify(vs)}` : `same: ${JSON.stringify(vs)}`; } });
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
