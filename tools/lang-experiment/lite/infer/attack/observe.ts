// An accepted program run in runCells, every value a cell was fulfilled with read again after the run: a value that
// reads differently changed after a cell exposed it. A function is read by calling it with no arguments.
import { runCells } from "../../browser/run.ts";

export const ser = (v: unknown, seen = new Set<unknown>()): string => {
  if (typeof v === "function") { if (seen.has(v)) return "fn"; seen.add(v); try { return `fn(${ser((v as () => unknown)(), seen)})`; } catch (x) { return `fn(throws ${String((x as Error)?.message).slice(0, 40)})`; } finally { seen.delete(v); } }
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (seen.has(v)) return "<cycle>";
  seen.add(v);
  try {
    if (v instanceof URL) return `URL(${v.href})`;
    if (v instanceof Date) return `Date(${v.getTime()})`;
    if (v instanceof Map) return `Map{${[...v].map(([k, x]) => `${ser(k, seen)}=>${ser(x, seen)}`).join(",")}}`;
    if (v instanceof Set) return `Set{${[...v].map((x) => ser(x, seen)).join(",")}}`;
    if (ArrayBuffer.isView(v)) return `${v.constructor.name}[${[...(v as unknown as ArrayLike<number>) as number[]].join(",")}]`;
    if (Array.isArray(v)) return `[${v.map((x) => ser(x, seen)).join(",")}]`;
    return `{${Object.keys(v).map((k) => `${k}:${ser((v as Record<string, unknown>)[k], seen)}`).join(",")}}`;
  } finally { seen.delete(v); }
};
// silent: a cell whose value changed and that is not in error; threw: some cell is in error
export async function observe(src: string, lent: readonly string[] = []): Promise<{ silent: string[]; threw: boolean }> {
  const first = new Map<string, { obj: unknown; s: string }[]>();
  const p = runCells(src, { tsx: true, onChange: (r) => { if (r.status === "fulfilled") first.set(r.name, [...(first.get(r.name) ?? []), { obj: r.value, s: ser(r.value) }]); } });
  try {
    await p.settle(800);
    const errored = new Set([...p.recs.values()].filter((r) => r.status === "rejected").map((r) => r.name));
    const silent: string[] = [];
    for (const [n, vs] of first) if (!lent.includes(n) && !errored.has(n)) for (const x of vs) {
      if (x.obj === null || (typeof x.obj !== "object" && typeof x.obj !== "function")) continue;
      const now = ser(x.obj);
      if (now !== x.s) silent.push(`${n}: ${x.s} -> ${now}`);
    }
    return { silent, threw: errored.size > 0 };
  } finally { p.dispose(); }
}
