import type { Attack } from "./harness.ts";
export const attacks: Attack[] = [
  { name: "sanity-quick", src: "const a = () => [1];\nconst b = (a: number[]) => a.length;", drive: (p) => `a frozen=${Object.isFrozen(p.value("a"))}` },
  { name: "sanity-gen", src: "const a = function* () { yield [1]; };", drive: (p) => `a frozen=${Object.isFrozen(p.value("a"))}` },
  { name: "sanity-async-inside", src: "const a = () => { const f = async () => 1; return [1]; };", drive: (p) => `a frozen=${Object.isFrozen(p.value("a"))}` },
];
