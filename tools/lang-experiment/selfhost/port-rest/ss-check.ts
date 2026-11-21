// The real checker on a prototype .ss.ts file, as ts-cells.ts ssStatements checks a shipped SoundScript source: the
// cell texts of the shipped sources it takes cells from (ssCellTexts), then its own, joined and given to checkSources
// (tsx: true); a cell is accepted as acceptedOf says. Prints each of the prototype's own cells.
// Run: bun selfhost/port-rest/ss-check.ts <file.ss.ts> [--with runtime.ss.ts,types.ss.ts]
import { readFileSync } from "node:fs";
import { checkSources } from "../../lite/core.ts";
import { splitCells, acceptedOf, whyOf, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { ssCellTexts } from "../../lite/soundscript/ts-cells.ts";

export type Row = { name: string; status: string; accepted: boolean; why: string[]; lines: number; value: string };
export function checkProto(path: string, withFiles: readonly string[] = []): { ok: boolean; module: string[]; rows: Row[] } {
  const texts = splitCells(readFileSync(path, "utf8"), false);
  const own = new Set(texts.map(declaredName).filter((n): n is string => !!n));
  const lines = new Map(texts.map((t) => [declaredName(t) ?? "", t.trim().split("\n").length]));
  const r = checkSources({ cells: [...withFiles.flatMap(ssCellTexts), ...texts].join("\n\n"), tsx: true });
  const acc = acceptedOf(r);
  const rows = r.cells.filter((c) => own.has(c.name)).map((c) => ({
    name: c.name, status: c.status, accepted: acc.has(c.name), why: acc.has(c.name) ? [] : c.errors.length || c.unsupported?.length ? [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)] : whyOf(r, c), lines: lines.get(c.name) ?? 0, value: c.value ?? "",
  }));
  const module = r.module.map((e) => `[${e.rule}] L${e.line} ${e.msg}`);
  return { ok: !module.length && rows.every((x) => x.accepted), module, rows };
}

// a test file's first step: the cells it exercises must all be accepted, or the test means nothing
export function requireChecked(path: string, withFiles: readonly string[] = []) {
  const c = checkProto(path, withFiles);
  if (!c.ok) {
    for (const m of c.module) console.log(`module ${m}`);
    for (const x of c.rows.filter((x) => !x.accepted)) console.log(`${x.name}: ${x.status} ${x.why.join("; ")}`);
    throw new Error(`${path}: not every cell is accepted by the checker`);
  }
  const big = c.rows.reduce((a, x) => (x.lines > a.lines ? x : a), c.rows[0]);
  console.log(`checker: ${c.rows.length} cells of ${path.split("/").pop()} accepted; largest ${big.name}, ${big.lines} lines`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--with");
  const withFiles = at >= 0 ? args[at + 1].split(",") : [];
  const path = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--with")!;
  const c = checkProto(path, withFiles);
  for (const m of c.module) console.log(`module ${m}`);
  for (const x of c.rows) console.log(`${x.name}: ${x.accepted ? "ok" : x.status} (${x.lines} lines)${x.value && !x.accepted ? "" : ""}${x.why.length ? "\n    " + x.why.join("\n    ") : ""}`);
  console.log(`${c.rows.length} cells, ${c.rows.filter((x) => !x.accepted).length} not accepted, ${c.module.length} module errors`);
}
