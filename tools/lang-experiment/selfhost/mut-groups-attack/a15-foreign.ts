// bun a15-foreign.ts: foreign declarations typed with Mut (checker verdicts only: run.ts has no foreign runtime)
import { writeFileSync } from "node:fs";
const cases: { name: string; foreign: string; cells: string }[] = [
  { name: "foreign-const-typed-mut", foreign: "/** pure */\ndeclare const lib: Mut<number[]>;", cells: "const a = (lib: Mut<number[]>) => {\n  lib.push(1);\n  return lib.length;\n};" },
  { name: "foreign-const-typed-mut-unannotated", foreign: "/** pure */\ndeclare const lib: Mut<number[]>;", cells: "const a = (lib) => {\n  lib.push(1);\n  return lib.length;\n};" },
  { name: "foreign-fn-returns-mut", foreign: "/** pure */\ndeclare function grab(): Mut<number[]>;", cells: "const a = (grab) => {\n  const m = grab();\n  m.push(1);\n  return freeze(m);\n};" },
  { name: "foreign-fn-takes-mut", foreign: "/** pure */\ndeclare function keep(m: Mut<number[]>): void;", cells: "const a = (keep) => {\n  const m = mut([1]);\n  keep(m);\n  return freeze(m);\n};" },
  { name: "foreign-fn-takes-group", foreign: "/** pure */\ndeclare function keep(m: Mut<{ xs: Mut<number[]> }>): void;", cells: "const a = (keep) => {\n  const ctx = mut({ xs: mut([1]) });\n  keep(ctx);\n  return freeze(ctx);\n};" },
  { name: "foreign-fn-generic-identity", foreign: "/** pure */\ndeclare function id<T>(v: T): Mut<T>;", cells: "const x = () => [1];\nconst a = (id, x: number[]) => {\n  const m = id(x);\n  m.push(1);\n  return 0;\n};" },
  { name: "foreign-fn-takes-field", foreign: "/** pure */\ndeclare function keep(m: Mut<number[]>): void;", cells: "const a = (keep) => {\n  const ctx = mut({ xs: mut([1]) });\n  keep(ctx.xs);\n  return freeze(ctx);\n};" },
];
const res: Record<string, Record<string, string>> = {};
for (const t of ["base", "proto", "refac"]) {
  const { checkSources } = await import(`../mut-groups/${t}/lite/core.ts`);
  for (const c of cases) {
    const r = checkSources({ cells: c.cells, foreign: c.foreign, tsx: true, outside: [] });
    const bad = r.cells.filter((x: any) => x.status !== "ok" || x.errors.length);
    (res[c.name] ??= {})[t] = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => `module[${m.rule}] ${m.msg}`), ...bad.map((x: any) => `${x.name}:${x.status}${x.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join(" ")}${x.unsupported.map((e: any) => `{${e.msg}}`).join("")}`)].join(" ")}` : "ACCEPT";
  }
}
for (const [n, v] of Object.entries(res)) { console.log(`== ${n}`); for (const [t, s] of Object.entries(v)) console.log(`   ${t}: ${s}`); }
writeFileSync("a15-foreign.out.json", JSON.stringify(res, null, 1));
