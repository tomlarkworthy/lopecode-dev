import { readFileSync } from "node:fs";
const ex = (f: string) => readFileSync(new URL(`../../lite/notebook/examples/${f}`, import.meta.url), "utf8");
const cells = ex("01-cells.ts"), jsx = ex("08-reject-jsx.tsx");
const s = cells.replace("const width = () => 640;", 'const width = () => "800";');
export const srcs: [string, string][] = [
  ["L17 Number(width) only", s.replace("width * height", "Number(width) * height").replace("(width / height)", "(Number(width) / height)")],
  ["jsx mut/child/comp", jsx.split("\n").filter((l, i) => !/bad_(attr|unknown|handler)/.test(l)).join("\n")],
];
