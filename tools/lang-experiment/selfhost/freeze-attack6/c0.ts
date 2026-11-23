// c0: controls. freeze-attack5's c0 (attack4's 7 checker-skipped controls, the switch control, the k5 rows with the
// checker on: silent in mode b on the tree before the S4.10 fix); and 24 of round 5's 128 N rows, checker skipped,
// so a mode-b run that does not fire them would mean the harness cannot see N
import { C } from "../freeze-attack3/harness.ts";
import { cands as fa5c0 } from "../freeze-attack5/c0.ts";
import { cands as n1 } from "../freeze-attack5/n1.ts";
import { cands as n3 } from "../freeze-attack5/n3.ts";
import { readFileSync } from "node:fs";
const silentB = new Set(readFileSync(new URL("../freeze-attack5/out-b.txt", import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("SILENT ")).map((l) => l.slice(7).split(":")[1]));
const pick = [...n1, ...n3].filter((c: any) => silentB.has(c.name)).filter((_: any, i: number) => i % 4 === 0).slice(0, 24);
export const cands = [
  ...fa5c0.map((c: any) => ({ ...c, name: `fa5-${c.name}` })),
  ...pick.map((c: any) => ({ ...c, name: `fa5-ctl-${c.name}`, ctl: true })),
];
