// The rule end to end on a toy: a function (s: string) => number from a cell in another language, called by a checked cell.
// Run: bun toy.ts
import { load, verdicts } from "./rt.ts";
const SRC = `type R = { n: number; s: string };
export const twice = (len: (s: string) => R) => (s: string): number => len(s).n * 2;
export const out = (twice: (s: string) => number) => twice("abc");`;
for (const copy of ["base", "rule"]) {
  const L = await load(copy, SRC, { len: [[], () => (s: string) => ({ n: s.length, s, extra: 1 })] });
  console.log(`${copy}:`, verdicts(L.checked).join(" | "));
  if (copy === "rule") console.log("compiled twice:", L.compiled.find((d) => d.name === "twice")!.definition.replace(/\/\*ss\^.*?\*\//s, "/*ss^…*/"));
  console.log(`${copy} out =`, JSON.stringify(await L.value("out")));
}
