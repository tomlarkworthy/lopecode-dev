import { readFileSync } from "node:fs";
const ex = (f: string) => readFileSync(new URL(`../../lite/notebook/examples/${f}`, import.meta.url), "utf8");
const cells = ex("01-cells.ts"), errors = ex("02-errors.ts"), mut = ex("03-mut.ts"), counter = ex("04-counter.tsx"), reducer = ex("05-reducer.tsx"), game = ex("09-breakout.tsx"), jsx = ex("08-reject-jsx.tsx");
export const srcs: [string, string][] = [
  ["L17 width=800", cells.replace("const width = () => 640;", "const width = () => 800;")],
  ["L17 width='800'", cells.replace("const width = () => 640;", 'const width = () => "800";')],
  ["L17 Number(width)", cells.replace("const width = () => 640;", 'const width = () => "800";').replace("(width: number, height: number) => width * height", "(width: string, height: number) => Number(width) * height").replace("(width / height)", "(Number(width) / height)")],
  ["L50 errors as is", errors],
  ["L58 label:string", errors.replace("(label: number) => label * 2", "(label: string) => label * 2")],
  ["L70 copy", mut.replace("const done = xs;", "const done = [...xs];")],
  ["L84 onClick=count", counter.replace("onClick={increment}", "onClick={count}")],
  ["L128 +last", reducer.replace("s.total - last", "s.total + last")],
  ["L242 <60", game.replace("< 28)", "< 60)")],
  ["jsx as is", jsx],
  ["L200 free component alone", jsx.split("\n").find((l) => l.includes("bad_free_component"))!],
];
