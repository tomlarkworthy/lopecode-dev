// lite/runtime-ss.ts with step and poolStep traced (redirect.ts STEP_TRACE)
import * as real from "./runtime-ss.copy.ts";
export * from "./runtime-ss.copy.ts";

const ids = new WeakMap<object, string>();
let n = 0;
const named = (o: object, kind: string) => { let i = ids.get(o); if (i === undefined) ids.set(o, (i = `#${kind}${++n}`)); return i; };
const plain = (v: unknown): unknown => {
  if (typeof v === "function") return named(v, "fn");
  if (typeof v === "symbol") return `#sym ${String(v)}`;
  if (typeof v === "bigint") return `#big ${v}`;
  if (v === undefined) return "#undefined";
  if (typeof v === "number" && !Number.isFinite(v)) return `#num ${v}`;
  if (v === null || typeof v !== "object") return v;
  if (v instanceof Error) return [named(v, "err"), v.message];
  if (v instanceof Map) return ["#map", [...v].map(([k, x]) => [plain(k), plain(x)])];
  if (v instanceof Set) return ["#set", [...v].map(plain)];
  if (Array.isArray(v)) return v.map(plain);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return named(v, "obj");
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
};
const out = (globalThis as any).__stepTrace as (line: string, tag: string, t: string, fxs: readonly string[]) => void;
const traced = <F extends (s: any, ev: any) => { effects: readonly unknown[] }>(tag: string, f: F): F =>
  ((s: unknown, ev: unknown) => {
    const r = f(s, ev);
    out(JSON.stringify([tag, plain(ev), plain(r.effects)]), tag, String((ev as { t: unknown }).t), r.effects.map((e) => String((e as { fx: unknown }).fx)));
    return r;
  }) as F;
export const step = traced("events", real.step);
export const poolStep = traced("pool", real.poolStep);
export const storeStep = traced("store", real.storeStep);
