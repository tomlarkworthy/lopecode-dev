// attack1 observer: runs a program with the prototype's runCells (conversions compiled in when SS_CONVERT=1) and
// re-reads everything a cell delivered. Differs from proto observe.ts: promises are followed to their settled value
// and rejection reason; functions are called at delivery and called again later (results compared); iterator
// values are pulled; nested functions/promises inside delivered data are tracked; two re-read rounds, each after
// pumping frames and settling the runtime (settle waits for the runtime to go idle, not for a fixed time).
import { runCells } from "../proto/tree/lite/browser/run.ts";
import { scheduler } from "../proto/tree/lite/browser/cells.ts";
import { isAction } from "../proto/tree/prelude.runtime.ts";

export const ser = (v: unknown, seen = new Set<unknown>()): string => {
  if (typeof v === "function") return isAction(v) ? "action" : "fn";
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (typeof v === "symbol") return String(v);
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (seen.has(v)) return "<cycle>";
  seen.add(v);
  try {
    const own = (o: object) => Object.getOwnPropertyNames(o).filter((k) => k !== "length" || !Array.isArray(o)).map((k) => {
      const d = Object.getOwnPropertyDescriptor(o, k)!;
      return `${k}:${"value" in d ? ser(d.value, seen) : (() => { try { return "get=" + ser((o as any)[k], seen); } catch (x) { return "get-throws"; } })()}`;
    }).join(",");
    if (v instanceof URL) return `URL(${v.href})`;
    if (v instanceof URLSearchParams) return `USP(${v.toString()})`;
    if (v instanceof Date) return `Date(${v.getTime()})`;
    if (v instanceof RegExp) return `RegExp(${v.source}/${v.flags} li=${v.lastIndex}${own(v) ? "," + own(v) : ""})`;
    if (v instanceof Error) return `Error(${v.name}:${v.message},${own(v)}${"cause" in v ? `,cause=${ser(v.cause, seen)}` : ""})`;
    if (v instanceof ArrayBuffer) return `AB[${[...new Uint8Array(v)].join(",")}]`;
    if (v instanceof DataView) return `DV[${[...new Uint8Array(v.buffer, v.byteOffset, v.byteLength)].join(",")}]`;
    if (v instanceof Promise) return "Promise";
    if (v instanceof Map) return `Map{${[...Map.prototype.entries.call(v)].map(([k, x]) => `${ser(k, seen)}=>${ser(x, seen)}`).join(",")}}`;
    if (v instanceof Set) return `Set{${[...Set.prototype.values.call(v)].map((x) => ser(x, seen)).join(",")}}`;
    if (ArrayBuffer.isView(v)) return `${v.constructor.name}[${[...(v as unknown as ArrayLike<number>) as number[]].join(",")}]`;
    if (Array.isArray(v)) return `[${v.map((x) => ser(x, seen)).join(",")}${Object.keys(v).filter((k) => !/^\d+$/.test(k)).map((k) => `,${k}:${ser((v as any)[k], seen)}`).join("")}]`;
    return `{${own(v)}}`;
  } finally { seen.delete(v); }
};

const frames: (() => void)[] = [];
scheduler.frame = (f) => void frames.push(f);
const isIter = (v: any) => v && typeof v === "object" && typeof v.next === "function" && !Array.isArray(v);

export type Prog = { name: string; src: string; drive?: (p: any) => unknown };
export type Obs = { changed: string[]; silent: string[]; errors: string[]; unhandled: string[]; tracked: number; calls: number };

let unhandled: string[] = [];
process.on("unhandledRejection", (e: any) => { unhandled.push(String(e?.message ?? e).slice(0, 160)); });
process.on("uncaughtException", (e: any) => { unhandled.push("uncaught " + String(e?.message ?? e).slice(0, 160)); });

export async function observeDeep(p: Prog): Promise<Obs> {
  unhandled = [];
  const held: { cell: string; label: string; obj: object; s: string }[] = [];
  const calls: { cell: string; label: string; fn: Function; s: string }[] = [];
  const track = (cell: string, label: string, v: unknown, d = 0): void => {
    if (d > 5) return;
    if (v instanceof Promise) { v.then((x) => track(cell, label + ">", x, d + 1), (e) => track(cell, label + "!>", e, d + 1)); return; }
    if (typeof v === "function") {
      if (isAction(v)) return;
      let r: unknown;
      try { r = (v as () => unknown)(); } catch (x) { calls.push({ cell, label, fn: v, s: `throws ${String((x as Error)?.message).slice(0, 60)}` }); return; }
      calls.push({ cell, label, fn: v, s: ser(r) });
      track(cell, label + "()", r, d + 1);
      return;
    }
    if (!v || typeof v !== "object") return;
    if (isIter(v)) {
      for (let i = 0; i < 4; i++) {
        let r: any;
        try { r = (v as any).next(); } catch (x) { calls.push({ cell, label: `${label}.next${i}`, fn: () => { throw x; }, s: "throws" }); break; }
        if (r instanceof Promise) { r.then((x: any) => track(cell, `${label}.next${i}>`, x?.value, d + 1), () => {}); continue; }
        if (!r || r.done) break;
        track(cell, `${label}.next${i}`, r.value, d + 1);
      }
      return;
    }
    held.push({ cell, label, obj: v, s: ser(v) });
    // functions, promises and iterators inside the data
    const kids = (o: any): [string, unknown][] => {
      try {
        if (o instanceof Map) return [...Map.prototype.entries.call(o)].flatMap(([k, x], i) => [[`.mk${i}`, k], [`.mv${i}`, x]]) as [string, unknown][];
        if (o instanceof Set) return [...Set.prototype.values.call(o)].map((x, i) => [`.s${i}`, x]);
        if (ArrayBuffer.isView(o) || o instanceof ArrayBuffer || o instanceof Date || o instanceof URL) return [];
        return Object.getOwnPropertyNames(o).map((k) => { const ds = Object.getOwnPropertyDescriptor(o, k)!; return [`.${k}`, "value" in ds ? ds.value : (() => { try { return o[k]; } catch { return undefined; } })()]; });
      } catch { return []; }
    };
    const seen = new Set<unknown>([v]);
    const walk = (o: any, path: string, dd: number) => {
      if (dd > 6) return;
      for (const [k, x] of kids(o)) {
        if (typeof x === "function" || x instanceof Promise || isIter(x)) track(cell, label + path + k, x, d + 1);
        else if (x && typeof x === "object" && !seen.has(x)) { seen.add(x); walk(x, path + k, dd + 1); }
      }
    };
    walk(v, "", 0);
  };
  frames.length = 0;
  const idx = new Map<string, number>();
  const prog = runCells(p.src, { tsx: true, onChange: (r) => {
    // a state cell's handle (name$ref) reads the current state through a getter: it is a ref by design, not a value
    if (r.status !== "fulfilled" || r.name.endsWith("$ref")) return;
    const i = (idx.get(r.name) ?? 0) + 1; idx.set(r.name, i);
    track(r.name, `${r.name}#${i}`, r.value);
  } });
  const pump = async () => { for (let i = 0; i < 12 && frames.length; i++) { for (const f of frames.splice(0)) f(); await prog.settle(400); } };
  const changed: string[] = [], silent: string[] = [], errors: string[] = [];
  const done = new Set<string>();
  try {
    await prog.settle(800);
    await pump();
    if (p.drive) { try { await p.drive(prog); } catch (x) { errors.push(`drive threw: ${(x as Error).message}`); } await prog.settle(800); await pump(); }
    for (let round = 1; round <= 2; round++) {
      await prog.settle(800); await pump();
      const errored = new Set([...prog.recs.values()].filter((r: any) => r.status === "rejected").map((r: any) => r.name));
      const note = (cell: string, line: string) => {
        if (done.has(line.split(":")[0]!)) return;
        done.add(line.split(":")[0]!);
        changed.push(`round ${round} ${line}${errored.has(cell) ? " (cell in error)" : ""}`);
        if (!errored.has(cell)) silent.push(`round ${round} ${line}`);
      };
      for (const h of held) { const now = ser(h.obj); if (now !== h.s) note(h.cell, `${h.label}: ${h.s.slice(0, 120)} -> ${now.slice(0, 120)}`); }
      for (const c of [...calls]) {
        let now: string;
        try { now = ser(c.fn()); } catch (x) { now = `throws ${String((x as Error)?.message).slice(0, 60)}`; }
        if (now !== c.s && !now.startsWith("throws")) note(c.cell, `${c.label} call: ${c.s.slice(0, 120)} -> ${now.slice(0, 120)}`);
      }
    }
    for (const r of prog.recs.values() as any) if (r.status === "rejected") errors.push(`${r.name}: ${String(r.error?.message ?? r.error).slice(0, 160)}`);
    return { changed, silent, errors, unhandled: [...unhandled], tracked: held.length, calls: calls.length };
  } finally { prog.dispose(); frames.length = 0; }
}
