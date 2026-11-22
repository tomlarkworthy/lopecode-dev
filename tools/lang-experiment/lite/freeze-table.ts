// Every kind of object a SoundScript cell can construct or get from an intrinsic, and the one way freeze.ts
// deepFreeze keeps a published one from changing (2026-11-22, causes C and D). freeze-table.test.ts checks the rows
// against INTRINSIC_DECLS (every `new`-able name has a row) and runs each probe through every route.
//   frozen     Object.freeze stops every write the language has (strict mode: the write throws)
//   guarded    a subclass whose writers throw once the instance is frozen (SsMap, SsSet, SsURL)
//   copied     the published value is a copy in its slot; the cell's later writes hit its private original. Where no
//              slot can be written (a function's captures, an already frozen value) deepFreeze throws at publish
//   read-only  the intrinsic table gives the language no writer
//   opaque     a handle; what it reaches is frozen through it (a promise's resolved value, a function's captures)
//   banned     deepFreeze throws at publish
//   absent     not constructible in the language ([new-non-intrinsic] or not an intrinsic); a foreign one is left alone
export type Treatment = "frozen" | "guarded" | "copied" | "read-only" | "opaque" | "banned" | "absent";
// probe: setup defines `v`, the published value, and `t`, what the late write changes (often v); write(x) changes t
// through the expression x; `ty` is v's type
export type Probe = { readonly setup: string; readonly ty: string; readonly write: (x: string) => string };
export type Row = { readonly kind: string; readonly names: readonly string[]; readonly treatment: Treatment; readonly why: string; readonly probe: Probe | null };
const TYPED = "Float32Array Float64Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array".split(" ");
export const VALUE_TABLE: readonly Row[] = [
  { kind: "array", names: ["Array"], treatment: "frozen", why: "index writes and every mutator throw on a frozen array", probe: { setup: "const v = [0]; const t = v;", ty: "number[]", write: (x) => `${x}.push(1);` } },
  { kind: "plain record", names: ["Object"], treatment: "frozen", why: "a frozen record refuses a field write or a new field", probe: { setup: "const v = { n: 0 }; const t = v;", ty: "{ n: number }", write: (x) => `${x}.n = 1;` } },
  { kind: "Map", names: ["Map"], treatment: "guarded", why: "SsMap: set, delete and clear throw once frozen", probe: { setup: "const v = new Map([[\"k\", 0]]); const t = v;", ty: "Map<string, number>", write: (x) => `${x}.set("j", 1);` } },
  { kind: "Set", names: ["Set"], treatment: "guarded", why: "SsSet: add, delete and clear throw once frozen", probe: { setup: "const v = new Set([0]); const t = v;", ty: "Set<number>", write: (x) => `${x}.add(1);` } },
  ...TYPED.map((n): Row => ({ kind: n, names: [n], treatment: "copied", why: "a non-empty typed array cannot be frozen", probe: { setup: `const v = new ${n}(2); const t = v;`, ty: n, write: (x) => `${x}[0] = 1;` } })),
  { kind: "ArrayBuffer", names: ["ArrayBuffer"], treatment: "copied", why: "its bytes are written through a view", probe: { setup: "const t = new Uint8Array(2); const v = t.buffer;", ty: "ArrayBuffer", write: (x) => `${x}[0] = 1;` } },
  { kind: "Error", names: ["Error", "TypeError", "RangeError"], treatment: "frozen", why: "message, name, stack and cause are own or inherited data properties; frozen, a write throws", probe: { setup: "const v = new TypeError(\"x\"); const t = v;", ty: "Error", write: (x) => `${x}.message = "y";` } },
  { kind: "RegExp", names: ["RegExp"], treatment: "frozen", why: "frozen, lastIndex is unwritable: exec/test on a g or y RegExp throws", probe: { setup: "const v = new RegExp(\"a\", \"g\"); const t = v;", ty: "RegExp", write: (x) => `${x}.exec("aa");` } },
  { kind: "URL", names: ["URL"], treatment: "guarded", why: "SsURL: every setter throws once frozen (Object.freeze does not stop URL setters)", probe: { setup: "const v = new URL(\"https://x.test/a\"); const t = v;", ty: "URL", write: (x) => `${x}.pathname = "/b";` } },
  { kind: "URLSearchParams", names: ["URLSearchParams"], treatment: "read-only", why: "the table has get, has and toString only; searchParams of a URL changes only through the URL (guarded)", probe: null },
  { kind: "Promise", names: ["Promise"], treatment: "opaque", why: "in a slot: replaced by p.then(deepFreeze); among captures: its resolved value is frozen in place when it settles", probe: { setup: "const t = [0]; const v = Promise.resolve(t);", ty: "Promise<number[]>", write: (x) => `${x}.push(1);` } },
  { kind: "function", names: [], treatment: "opaque", why: "the compiler registers each closure's captured locals (fnreg.ts); deepFreeze freezes them at publish", probe: { setup: "const t = [0]; const v = () => t.length;", ty: "() => number", write: (x) => `${x}.push(1);` } },
  { kind: "action", names: ["action"], treatment: "opaque", why: "the handle is registered with its body as a capture", probe: { setup: "const t = [0]; const v = action(() => t.length);", ty: "() => number", write: (x) => `${x}.push(1);` } },
  { kind: "JSX element", names: ["h"], treatment: "frozen", why: "h freezes the element, its props and children; deepFreeze walks them", probe: { setup: "const t = [0]; const v = <b data={t}>x</b>;", ty: "unknown", write: (x) => `${x}.push(1);` } },
  { kind: "iterator", names: ["values", "keys", "entries"], treatment: "banned", why: "next() changes it and it cannot be frozen or copied", probe: { setup: "const v = [1, 2].values(); const t = v;", ty: "Iterable<number>", write: () => "" } },
  // live views of a guarded or copied kind's internal state (2026-11-22, holes7): each one published, then its source written
  { kind: "URL searchParams", names: [], treatment: "copied", why: "SsURL's searchParams is a detached snapshot (new URLSearchParams(search)); URLSearchParams is read-only in the table", probe: { setup: "const t = new URL(\"https://x.test/?q=1\"); const v = t.searchParams;", ty: "URLSearchParams", write: (x) => `${x}.search = "?q=2";` } },
  { kind: "typed array subarray", names: [], treatment: "copied", why: "a view shares its source's bytes; the published copy does not", probe: { setup: "const t = new Uint8Array(4); const v = t.subarray(1, 3);", ty: "Uint8Array", write: (x) => `${x}[1] = 9;` } },
  { kind: "typed array buffer", names: [], treatment: "copied", why: "t.buffer is the bytes t writes; the published copy is not", probe: { setup: "const t = new Float64Array(2); const v = t.buffer;", ty: "ArrayBuffer", write: (x) => `${x}.fill(3);` } },
  { kind: "Map iterator", names: [], treatment: "banned", why: "m.values() follows the Map and next() changes it", probe: { setup: "const t = new Map([[\"k\", 0]]); const v = t.values();", ty: "Iterable<number>", write: () => "" } },
  { kind: "Set iterator", names: [], treatment: "banned", why: "s.entries() follows the Set and next() changes it", probe: { setup: "const t = new Set([0]); const v = t.entries();", ty: "Iterable<[number, number]>", write: () => "" } },
  { kind: "Error cause", names: [], treatment: "frozen", why: "Error(m, { cause }) is not in the table; an Error is walked by its own data properties and frozen", probe: { setup: "const t = [0]; const e = new Error(\"x\"); const v = { e, c: t };", ty: "{ e: Error; c: number[] }", write: (x) => `${x}.push(1);` } },
  // a record with a callable then: the runtime (and every await) would call then and publish what it passes on (holes7)
  { kind: "thenable", names: [], treatment: "banned", why: "deepFreeze throws on a value with a callable then that is not a Promise, at any depth", probe: { setup: "const t = [0]; const v = { then: (r: (x: number[]) => void) => r(t) };", ty: "{ then: (r: (x: number[]) => void) => void }", write: (x) => `${x}.push(1);` } },
  { kind: "State, Events, listener handles", names: ["state", "on"], treatment: "opaque", why: "frozen records the runtime makes; a write goes through set/update, which freezes the value it stores", probe: null },
  ...["DataView", "Date", "WeakMap", "WeakSet", "Intl", "TextEncoder", "TextDecoder"].map((n): Row => ({ kind: n, names: [n], treatment: "absent", why: "not constructible in SoundScript", probe: null })),
];
