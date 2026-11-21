// complete.ts annotationOf reads a value from another language: its prototype and its own properties. A cell can do
// neither, so cp-index.ts passes the two reads in as functions (plain, field). Checked 2026-11-21 with the live checker
// (lite/soundscript/.scratch/cp-port/chk.ts on this file), each cell rejected:
//   a  [no-member] no property getPrototypeOf on { entries: ...; keys: ...; values: ...; ... }
//   b  [type] cannot index object with string
//   c  [type] object is not assignable to { [k: string]: unknown }
export const a = () => (v: unknown): boolean => { const p = Object.getPrototypeOf(v); return p === null; };
export const b = () => (v: unknown, k: string): unknown => (typeof v === "object" && v !== null ? v[k] : null);
export const c = () => (v: unknown): unknown[] => (typeof v === "object" && v !== null ? Object.values(v) : []);
