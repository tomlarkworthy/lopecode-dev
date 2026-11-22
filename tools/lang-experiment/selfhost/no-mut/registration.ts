// bun selfhost/no-mut/registration.ts: the four programs NOTES-checker-port.md (r2, last section) gives as the reason
// run-time closure registration is kept (a kept function returns a Mut held below the top of a captured local, and a
// consumer cell writes it), through today's checker and the census counter; then each with its Mut annotations removed,
// which is all D lets one write, to show which D rule rejects it.
import { analyzeSource } from "./analyze.ts";
import { attacks as b1 } from "../freeze-attack/b1.ts";
import { attacks as b2 } from "../freeze-attack/b2.ts";
import { attacks as h6 } from "../../lite/infer/attack/h6-attacks.ts";
import { attacks as h9 } from "../../lite/infer/attack/h9-attacks.ts";

const want: [string, any[], string][] = [["b1", b1, "reg-for-of"], ["b2", b2, "fo-index"], ["h6", h6, "h6-array-container"], ["h9", h9, "h9-r2-kept-returns-field"]];
// the same programs with every Mut removed from the text (written by hand from each program; what D still lets one write)
const stripped: Record<string, string> = {
  "reg-for-of": "const a = () => { const reg = [[0]]; return (): number[] => { for (const x of reg) return x; return []; }; };\nconst c = (a: () => number[]) => { a().push(1); return 0; };",
  "fo-index": "const a = () => { const reg = [[0]]; return (): number[] => reg[0] ?? []; };\nconst c = (a: () => number[]) => { a().push(1); return 0; };",
  "h6-array-container": "const a = () => { const reg = [[0]]; return (): number[] => reg[0] ?? []; };\nconst c = (a: () => number[]) => { a().push(1); return 0; };",
  "h9-r2-kept-returns-field": "const a = () => { const r = { t: [0] }; return (): number[] => r.t; };\nconst c = (a: () => number[]) => { a().push(1); return 0; };",
};
const show = (r: ReturnType<typeof analyzeSource>) => r.cells.map((c) => {
  const w = c.writes.map((x) => `${x.captured ? "f/" : ""}${x.group} ${x.how} (${x.why})`);
  return `${c.name}:${c.status}${c.rules.length ? "[" + c.rules.join(",") + "]" : ""} explicit=[${c.explicit.map((x) => x.pos).join(",")}] writes=[${w.join("; ")}] rets=[${c.rets.map((x) => x.tShow).join(",")}]`;
}).join("  |  ");
let found = 0;
for (const [set, list, name] of want) {
  const a = list.find((x: any) => x.name === name);
  if (!a) { console.log(`${set} ${name}: NOT FOUND`); continue; }
  found++;
  const r = analyzeSource({ cells: a.src, tsx: true, outside: [] } as any);
  console.log(`${set} ${name}\n  today:    ${show(r)}`);
  const s = analyzeSource({ cells: stripped[name]!, tsx: true, outside: [] } as any);
  console.log(`  no Mut:   ${show(s)}`);
}
console.log(`${found}/4 programs found`);
