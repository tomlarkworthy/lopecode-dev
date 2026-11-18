// Is a value derived from an outside cell, bound by a map callback, caught by [action-capture] (S6.9/S11.9)?
import { checkSources } from "../lite/core.ts";
const pre = `type Row = { pid: string };\nconst selected = () => state("");\n`;
for (const [t, src] of [
  ["direct", `const a = (rows: Row[], selected: State<string>) => action(() => selected.set(rows.length ? rows[0].pid : ""));`],
  ["const local", `const a = (rows: Row[], selected: State<string>) => { const p = rows.length ? rows[0].pid : ""; return action(() => selected.set(p)); };`],
  ["map callback param", `const a = (rows: Row[], selected: State<string>) => rows.map((r) => action(() => selected.set(r.pid)));`],
  ["map over a state cell's value", `const st = () => state([{ pid: "a" }]);\nconst a = (st: Row[], selected: State<string>) => st.map((r) => action(() => selected.set(r.pid)));`],
]) {
  const r = checkSources({ cells: pre + src, tsx: true, outside: [{ name: "rows" }] });
  console.log(`${t}: ${r.cells.filter((c: any) => c.name === "a").map((c: any) => c.status + " " + c.errors.map((e: any) => `[${e.rule}]`).join(" ")).join("")}`);
}
