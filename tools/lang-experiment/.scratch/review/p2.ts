import { checkSources } from "../../lite/core.ts";
for (const s of [
`const a = () => {\n  const c: ReadonlyArray<number> = [1];\n  return () => c.length;\n};`,
`const a = () => {\n  const c: ReadonlyArray<number> = [1];\n  c.push(1);\n  return 1;\n};`,
`const a = () => {\n  const r: { readonly n: number } = { n: 1 };\n  return () => r.n;\n};`,
`const a = () => {\n  const xs: number[] | null = [1];\n  return () => xs?.length;\n};`,
]) { const r = checkSources({ cells: s, tsx: false }); console.log(JSON.stringify([...r.module, ...r.cells.flatMap((x: any) => x.errors)].map((e: any) => e.rule))); }
