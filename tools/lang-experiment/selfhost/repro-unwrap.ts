// unwrap of Mut or Borrowed written without a type argument. Run with the original types.ts and with the port.
import { checkSources } from "../lite/core.ts";
for (const src of [
  "const a = () => {\n  const g = (m: Mut) => m.length;\n  return 1;\n};",
  "const a = () => {\n  const g = (m: Borrowed) => m.length;\n  return 1;\n};",
  "const a = () => {\n  const m: Mut = mut([1]);\n  m.push(2);\n  return 1;\n};",
]) {
  try {
    const r = checkSources({ cells: src, tsx: false });
    console.log(JSON.stringify(src), "->", JSON.stringify(r.cells.map((c) => [c.name, c.status, c.errors.map((e) => `[${e.rule}] ${e.msg}`), (c.unsupported ?? []).map((u) => u.msg)])));
  } catch (e) { console.log(JSON.stringify(src), "-> THROWS", (e as Error).stack?.split("\n").slice(0, 3).join(" | ")); }
}
