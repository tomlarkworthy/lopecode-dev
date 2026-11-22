// bun probes.ts <base|proto|tree dir> [--json out.json] [--only id]: the probe programs for owned groups, each with the
// verdict expected under the proposal (written before the patch, 2026-11-22). A verdict is the cell's status and the
// sorted set of its rule ids ("ok", "unsupported", or "rejected:<rule>,<rule>"). want "same:<id>" means: the verdict of
// probe <id> (a plain-Mut analogue) on the same tree, with the group's cells named alike.
export type Probe = { id: string; route: string; src: string; want: Record<string, string>; shell?: string; outside?: { name: string; view?: boolean }[] };

// the group used throughout: two owned Maps, an owned record and a plain field
const G = `type Tab = Mut<Map<string, number>>;
type G = Mut<{ types: Tab; vars: Mut<Map<string, string>>; inner: Mut<{ a: number[] }>; n: number }>;
`;
const MK = `mut({ types: mut(new Map<string, number>()), vars: mut(new Map<string, string>()), inner: mut({ a: [1] }), n: 0 })`;
// one cell a: make ctx, run body, return what ret says
const cell = (body: string, ret = "freeze(ctx).types.size") => `${G}const a = () => {\n  const ctx: G = ${MK};\n  ${body}\n  return ${ret};\n};`;
const fnCell = (body: string) => `${G}const a = () => (p: boolean, m: Map<string, number>, mm: Mut<Map<string, number>>) => {\n  const ctx: G = ${MK};\n  ${body}\n  return freeze(ctx).types.size;\n};`;
const R = (...rules: string[]) => `rejected:${[...new Set(rules)].sort().join(",")}`;

export const PROBES: Probe[] = [
  // ---- 0. what the proposal accepts ----
  { id: "acc-create", route: "0", src: cell(`ctx.types.set("a", 1);\n  ctx.vars.set("a", "x");\n  ctx.n = 1;\n  ctx.inner.a = [2];\n  ctx.types.delete("a");\n  ctx.types.clear();`), want: { a: "ok" } },
  { id: "acc-create-unannotated", route: "0", src: `const a = () => {\n  const ctx = mut({ types: mut(new Map<string, number>()), n: 0 });\n  ctx.types.set("a", 1);\n  return freeze(ctx).types.size;\n};`, want: { a: "ok" } },
  { id: "acc-array-field", route: "0", src: `const a = () => {\n  const ctx = mut({ xs: mut([1]), buf: mut(new Float32Array(2)), s: mut(new Set<number>()) });\n  ctx.xs.push(2);\n  ctx.xs[0] = 5;\n  ctx.buf.fill(1);\n  ctx.s.add(3);\n  return freeze(ctx).xs.length;\n};`, want: { a: "ok" } },
  { id: "acc-reads", route: "0", src: cell(`const n = ctx.types.size + (ctx.types.get("a") ?? 0) + (ctx.types.has("b") ? 1 : 0);\n  const ks = [...ctx.types.keys()];\n  let s = 0;\n  for (const [k, v] of ctx.types) s += v + k.length;\n  const js = JSON.stringify(ctx.inner);\n  const t = \`\${ctx.types.size}\`;\n  const e = equals(ctx.inner, { a: [1] });`, "n + ks.length + s + js.length + t.length + (e ? 1 : 0) + freeze(ctx).n"), want: { a: "ok" } },
  { id: "acc-local-helper", route: "0", src: cell(`const put = (k: string) => {\n    ctx.types.set(k, 1);\n    ctx.vars.set(k, k);\n  };\n  put("a");\n  put("b");`), want: { a: "ok" } },
  { id: "acc-group-param", route: "0", src: `${G}const fill = () => (ctx: G, k: string): number => {\n  ctx.types.set(k, 1);\n  ctx.inner.a = [3];\n  return ctx.types.size;\n};\nconst a = (fill) => {\n  const ctx: G = ${MK};\n  fill(ctx, "a");\n  return freeze(ctx).types.size;\n};`, want: { fill: "ok", a: "ok" } },
  { id: "acc-lend-field", route: "0", src: cell(`const fill = (m: Tab) => {\n    m.set("a", 1);\n  };\n  fill(ctx.types);`), want: { a: "ok" } },
  { id: "acc-lend-two-fields", route: "3", src: cell(`const both = (t: Tab, v: Mut<Map<string, string>>) => {\n    t.set("a", 1);\n    v.set("a", "b");\n  };\n  both(ctx.types, ctx.vars);`), want: { a: "ok" } },
  { id: "acc-lend-field-from-param", route: "3", src: `${G}const fill = () => (m: Tab) => m.size;\nconst g = (fill) => (ctx: G): number => fill(ctx.types);`, want: { fill: "ok", g: "ok" } },
  { id: "acc-freeze-then-read", route: "4", src: cell(`const f = freeze(ctx);\n  const t = f.types;\n  const keep = [f.types, f.inner];`, "t.size + keep.length"), want: { a: "ok" } },
  { id: "acc-freeze-type", route: "7", src: cell(`const f: { readonly types: Map<string, number>; readonly inner: { a: number[] } } = freeze(ctx);`, "f.types.size"), want: { a: "ok" } },
  { id: "acc-borrow-field", route: "6", src: `const frames = function* () {\n  const ctx = mut({ buf: mut(new Float32Array(2)), n: 0 });\n  for (let k = 0; k < 2; k++) {\n    ctx.buf[0] = k;\n    ctx.n = k;\n    yield borrow(ctx.buf);\n  }\n};\nconst total = (frames) => frames[0] ?? 0;`, want: { frames: "ok", total: "ok" } },
  { id: "acc-async-own", route: "6", src: `const a = () => async () => {\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  await 0;\n  ctx.t.set("a", 1);\n  return freeze(ctx).t.size;\n};`, want: { a: "ok" } },
  { id: "acc-generator-own", route: "6", src: `const g = function* () {\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  for (let i = 0; i < 3; i++) {\n    ctx.t.set(String(i), i);\n    yield ctx.t.size;\n  }\n};`, want: { g: "ok" } },
  { id: "acc-cond-fresh-inner", route: "2", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ t: mut(p ? [1] : [2]) });\n  ctx.t.push(3);\n  return freeze(ctx).t.length;\n};`, want: { a: "ok" } },
  { id: "acc-spread-plain-into-group", route: "2", src: `const a = () => (base: { n: number }) => {\n  const ctx = mut({ ...base, t: mut([1]) });\n  ctx.t.push(ctx.n);\n  return freeze(ctx).t.length;\n};`, want: { a: "ok" } },
  { id: "acc-conditional-receiver", route: "1", src: fnCell(`(p ? ctx.types : ctx.types).set("a", 1);`), want: { a: "ok" } },
  { id: "acc-copy-out", route: "1", src: cell(`const c = new Map(ctx.types);\n  const ks = Array.from(ctx.types.keys());\n  const xs = [...ctx.inner.a];`, "c.size + ks.length + xs.length"), want: { a: "ok" } },
  { id: "acc-in-operator", route: "1", src: cell(`const has = "types" in ctx;`, "has ? 1 : 0"), want: { a: "ok" } },

  // ---- 1. a second name for a field ----
  { id: "r1-bind", route: "1", src: cell(`const t = ctx.types;`), want: { a: R("mut-escape") } },
  { id: "r1-destructure", route: "1", src: cell(`const { types } = ctx;`), want: { a: R("mut-escape") } },
  { id: "r1-spread-object", route: "1", src: cell(`const s = { ...ctx };`), want: { a: R("mut-escape") } },
  { id: "r1-spread-into-mut", route: "1", src: cell(`const h = mut({ ...ctx });\n  h.types.set("a", 1);`), want: { a: R("mut-escape") } },
  { id: "r1-object-values", route: "1", src: cell(`const vs = Object.values(ctx);`), want: { a: R("mut-escape", "type") } },
  { id: "r1-object-entries", route: "1", src: cell(`const es = Object.entries(ctx);`), want: { a: R("mut-escape", "type") } },
  { id: "r1-structured-clone", route: "1", src: cell(`const c = structuredClone(ctx);`), want: { a: R("mut-escape") } },
  { id: "r1-return-field", route: "1", src: `${G}const a = () => {\n  const ctx: G = ${MK};\n  return ctx.types;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-return-field-param", route: "1", src: `${G}const a = () => (ctx: G): Map<string, number> => ctx.types;`, want: { a: R("mut-escape") } },
  { id: "r1-arrow-body", route: "1", src: cell(`const get = () => ctx.types;\n  get().set("a", 1);`), want: { a: R("mut-escape") } },
  { id: "r1-array", route: "1", src: cell(`const xs = [ctx.types];`), want: { a: R("mut-escape") } },
  { id: "r1-record", route: "1", src: cell(`const o = { t: ctx.types };`), want: { a: R("mut-escape") } },
  { id: "r1-into-map", route: "1", src: cell(`const m = mut(new Map<string, Map<string, number>>());\n  m.set("k", ctx.types);`), want: { a: R("mut-escape") } },
  { id: "r1-into-other-group", route: "1", src: cell(`const h = mut({ t: ctx.types });`), want: { a: R("mut-escape") } },
  { id: "r1-assign-to-let", route: "1", src: cell(`let t = new Map<string, number>();\n  t = ctx.types;`, "t.size"), want: { a: R("mut-escape") } },
  { id: "r1-capture-escaping", route: "1", src: `${G}const a = () => {\n  const ctx: G = ${MK};\n  const f = () => ctx.types.size;\n  return f;\n};`, want: { a: R("mut-capture") } },
  { id: "r1-capture-named-fnexpr", route: "1", src: `${G}const a = () => {\n  const ctx: G = ${MK};\n  const f = function g(): number {\n    return ctx.types.size;\n  };\n  return f;\n};`, want: { a: R("mut-capture") } },
  { id: "r1-callback", route: "1", src: cell(`[1].forEach(() => {\n    ctx.types.set("a", 1);\n  });`), want: { a: R("mut-capture") } },
  { id: "r1-yield", route: "1", src: `const g = function* () {\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  yield ctx.t;\n};`, want: { g: R("mut-escape") } },
  { id: "r1-non-mut-param", route: "1", src: `${G}const size = () => (m: Map<string, number>) => m.size;\nconst a = (size) => {\n  const ctx: G = ${MK};\n  return size(ctx.types);\n};`, want: { size: "ok", a: R("mut-escape") } },
  { id: "r1-computed", route: "1", src: cell(`const k = "types";\n  ctx[k].set("a", 1);`), want: { a: R("type") } },
  { id: "r1-computed-bind", route: "1", src: cell(`const t = ctx["types"];`), want: { a: R("mut-escape") } },
  { id: "r1-optional", route: "1", src: cell(`ctx?.types.set("a", 1);`), want: { a: "ok" } },
  { id: "r1-conditional-bind", route: "1", src: fnCell(`const t = p ? ctx.types : ctx.types;`), want: { a: R("mut-escape") } },
  { id: "r1-logical-bind", route: "1", src: cell(`const t = ctx.types ?? ctx.types;`), want: { a: R("mut-escape") } },
  { id: "r1-sequence", route: "1", src: cell(`(0, ctx.types).set("a", 1);`), want: { a: "unsupported" } },
  { id: "r1-for-in", route: "1", src: cell(`for (const k in ctx) ctx.n = k.length;`), want: { a: "unsupported" } },
  { id: "r1-throw", route: "1", src: cell(`if (ctx.n > 0) throw ctx.types;`), want: { a: R("mut-escape") } },
  { id: "r1-await", route: "1", src: `const a = () => async () => {\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  await ctx.t;\n  return freeze(ctx).t.size;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-state", route: "1", src: `const s = () => {\n  const ctx = mut({ t: mut([1]) });\n  return state(ctx.t);\n};`, want: { s: R("mut-escape") } },
  { id: "r1-jsx", route: "1", src: `const a = () => {\n  const ctx = mut({ t: mut([1]) });\n  return <div>{ctx.t}</div>;\n};`, want: { a: R("mut-escape", "type") } },
  { id: "r1-snapshot", route: "1", src: cell(`const c = snapshot(ctx);`), want: { a: R("mut-escape", "type") } },
  { id: "r1-borrow-group", route: "1", src: `const frames = function* () {\n  const ctx = mut({ t: mut([1]) });\n  yield borrow(ctx);\n};\nconst rd = (frames) => frames.t.length;`, want: { frames: R("mut-escape"), rd: "ok" } },
  { id: "r1-view-bind", route: "1", src: cell(`const it = ctx.types.values();`), want: { a: R("mut-view") } },
  { id: "r1-view-subarray", route: "1", src: `const a = () => {\n  const ctx = mut({ buf: mut(new Float32Array(4)) });\n  const v = ctx.buf.subarray(0, 2);\n  return freeze(ctx).buf.length;\n};`, want: { a: R("mut-view") } },
  { id: "r1-receiver-returned", route: "1", src: cell(`const set = (k: string) => ctx.types.set(k, 1);\n  set("a");`), want: { a: R("mut-view") } },
  { id: "r1-param-array-of-mut", route: "5", src: `const a = () => (xs: Mut<number[]>[]) => xs.length;`, want: { a: "ok" } },
  { id: "r1-param-record-of-mut", route: "5", src: `const a = () => (o: { f: Mut<number[]> }) => {\n  o.f.push(1);\n};`, want: { a: "ok" } },

  // named function expressions: the plain-Mut analogue of r1-capture-named-fnexpr, as S4.5 states it (added 01:10)
  { id: "p1-named-fnexpr-return", route: "6", src: `const a = () => {\n  const ctx = mut([1]);\n  const f = function g(): number {\n    return ctx.length;\n  };\n  return f;\n};`, want: { a: R("mut-capture") } },
  { id: "p1-named-fnexpr-array", route: "6", src: `const a = () => {\n  const ctx = mut([1]);\n  const fs = [function g(): void { ctx.push(2); }];\n  const r = freeze(ctx);\n  for (const f of fs) f();\n  return r;\n};`, want: { a: R("mut-capture") } },
  { id: "r1-named-fnexpr-array", route: "1", src: cell(`const fs = [function g(): void { ctx.types.set("a", 1); }];\n  const r = freeze(ctx);\n  for (const f of fs) f();`, "r.types.size"), want: { a: R("mut-capture") } },

  // ---- 2. an existing value put in ----
  { id: "r2-bare-proposal", route: "2", src: `const a = () => {\n  const ctx = mut({ types: new Map<string, number>() });\n  ctx.types.set("a", 1);\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-deep-write") } },
  { id: "r2-param-field", route: "2", src: `const a = () => (m: Map<string, number>) => {\n  const ctx = mut({ types: m });\n  ctx.types.set("a", 1);\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-deep-write") } },
  { id: "r2-mut-param-field", route: "2", src: `const a = () => (m: Mut<Map<string, number>>) => {\n  const ctx = mut({ types: m });\n  ctx.types.set("a", 1);\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-escape") } },
  { id: "r2-nested-not-fresh", route: "2", src: `const a = () => (m: Map<string, number>) => {\n  const ctx = mut({ types: mut(m) });\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-not-fresh") } },
  { id: "r2-call-result", route: "2", src: `const a = () => () => {\n  const mk = () => new Map<string, number>();\n  const ctx = mut({ types: mut(mk()) });\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-not-fresh") } },
  { id: "r2-conditional-field", route: "2", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ t: p ? mut([1]) : mut([2]) });\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-bind") } },
  { id: "r2-conditional-literal", route: "2", src: `const a = () => (p: boolean) => {\n  const ctx = mut(p ? { t: mut([1]) } : { t: mut([2]) });\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-bind") } },
  { id: "r2-other-group-field", route: "2", src: cell(`const h = mut({ t: mut(ctx.types) });`), want: { a: R("mut-escape", "mut-not-fresh") } },
  { id: "r2-shorthand", route: "2", src: `const a = () => {\n  const types = mut(new Map<string, number>());\n  const ctx = mut({ types });\n  return freeze(ctx).types.size;\n};`, want: { a: R("mut-escape") } },
  { id: "r2-computed-key", route: "2", src: `const a = () => {\n  const ctx = mut({ ["t"]: mut([1]) });\n  return freeze(ctx).t.length;\n};`, want: { a: R("no-member") } },
  { id: "r2-reassign-mut", route: "2", src: cell(`ctx.types = mut(new Map<string, number>());`), want: { a: R("mut-bind", "mut-field-assign") } },
  { id: "r2-reassign-plain", route: "2", src: cell(`ctx.types = new Map<string, number>();`), want: { a: R("mut-field-assign", "type") } },
  { id: "r2-reassign-other-field", route: "2", src: `type T2 = Mut<{ a: Mut<number[]>; b: Mut<number[]> }>;\nconst a = () => {\n  const ctx: T2 = mut({ a: mut([1]), b: mut([2]) });\n  ctx.a = ctx.b;\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape", "mut-field-assign") } },
  { id: "r2-reassign-param", route: "2", src: fnCell(`ctx.types = mm;`), want: { a: R("mut-escape", "mut-field-assign") } },
  { id: "r2-delete-field", route: "2", src: cell(`delete ctx.types;`), want: { a: R("mut-field-assign") } },
  { id: "r2-object-assign", route: "2", src: fnCell(`Object.assign(ctx, { types: m });`), want: { a: R("mut-escape") } },
  { id: "r2-annotated-not-fresh", route: "2", src: `${G}const a = () => (m: Map<string, number>) => {\n  const ctx: Mut<{ types: Tab }> = mut({ types: m });\n  return freeze(ctx).types.size;\n};`, want: { a: R("type") } },
  { id: "r2-type-arg-not-fresh", route: "2", src: `${G}const a = () => (m: Map<string, number>) => {\n  const ctx = mut<{ types: Tab }>({ types: m });\n  return freeze(ctx).types.size;\n};`, want: { a: R("type") } },
  { id: "r2-mut-outside-group", route: "2", src: `const a = () => {\n  const o = { t: mut([1]) };\n  return o.t.length;\n};`, want: { a: R("mut-bind") } },
  { id: "r2-group-as-argument", route: "2", src: `const a = () => (f: (x: number[]) => number) => f(freeze(mut({ t: mut([1]) })).t);`, want: { a: R("mut-bind") } },
  { id: "r2-let-group", route: "2", src: `const a = () => {\n  let ctx = mut({ t: mut([1]) });\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-bind") } },

  // ---- 3. lending part ----
  { id: "r3-helper-reaches-both", route: "3", src: cell(`const fill = (m: Tab) => {\n    m.set("a", 1);\n    ctx.vars.set("b", "c");\n  };\n  fill(ctx.types);`), want: { a: "ok" } },
  { id: "r3-group-and-its-field", route: "3", src: cell(`const two = (c: G, t: Tab) => {\n    t.set("a", 1);\n    c.types.set("b", 2);\n  };\n  two(ctx, ctx.types);`), want: { a: "ok" } },
  { id: "r3-same-field-twice", route: "3", src: cell(`const two = (t: Tab, u: Tab) => {\n    t.set("a", u.size);\n  };\n  two(ctx.types, ctx.types);`), want: { a: "ok" } },
  { id: "r3-callback-writes-other-field", route: "3", src: cell(`ctx.types.forEach((v, k) => {\n    ctx.vars.set(k, String(v));\n  });`), want: { a: R("mut-capture") } },
  { id: "r3-async-lend-then-freeze", route: "3", src: `type Tab = Mut<Map<string, number>>;\nconst a = () => async () => {\n  const fillA = async (m: Tab): Promise<void> => {\n    await 0;\n    m.set("a", 1);\n  };\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  const p = fillA(ctx.t);\n  const v = freeze(ctx);\n  await p;\n  return v.t.size;\n};`, want: { a: R("borrowed-await") } },
  { id: "r3-async-helper-captures", route: "3", src: `const a = () => async () => {\n  const ctx = mut({ t: mut(new Map<string, number>()) });\n  const h = async (): Promise<void> => {\n    await 0;\n    ctx.t.set("a", 1);\n  };\n  const p = h();\n  const v = freeze(ctx);\n  await p;\n  return v.t.size;\n};`, want: { a: R("borrowed-await") } },
  { id: "r3-async-group-param", route: "3", src: `${G}const a = () => async (ctx: G): Promise<number> => {\n  await 0;\n  return ctx.types.size;\n};`, want: { a: R("borrowed-await") } },

  // ---- 4. freezing ----
  { id: "r4-use-after-freeze", route: "4", src: cell(`const f = freeze(ctx);\n  ctx.types.set("a", 1);`, "f.types.size"), want: { a: R("mut-after-freeze") } },
  { id: "r4-write-frozen-field", route: "4", src: cell(`const f = freeze(ctx);\n  f.types.set("a", 1);`, "f.types.size"), want: { a: R("mutating-method") } },
  { id: "r4-write-frozen-record", route: "4", src: cell(`const f = freeze(ctx);\n  f.inner.a = [2];`, "f.types.size"), want: { a: R("member-write") } },
  { id: "r4-frozen-field-as-mut", route: "4", src: cell(`const f: Tab = freeze(ctx).types;`, "f.size"), want: { a: R("type") } },
  { id: "r4-partial-freeze", route: "4", src: cell(`const t = freeze(ctx.types);`), want: { a: R("mut-escape") } },
  { id: "r4-freeze-param", route: "4", src: `${G}const a = () => (ctx: G) => freeze(ctx).n;`, want: { a: R("mut-freeze-param") } },
  { id: "r4-helper-after-freeze", route: "4", src: cell(`const put = () => {\n    ctx.types.set("a", 1);\n  };\n  const f = freeze(ctx);\n  put();`, "f.types.size"), want: { a: R("mut-after-freeze") } },
  { id: "r4-freeze-in-nested", route: "4", src: cell(`const fr = () => freeze(ctx).n;\n  fr();`), want: { a: R("mut-capture") } },
  { id: "r4-freeze-in-switch", route: "4", src: `const a = () => (k: number): number => {\n  const ctx = mut({ t: mut([1]) });\n  let out = 0;\n  switch (k) {\n    case 1: out = freeze(ctx).t.length; break;\n  }\n  ctx.t.push(2);\n  return out;\n};`, want: { a: R("mut-after-freeze") } },
  { id: "r4-freeze-in-loop", route: "4", src: `const a = () => (xs: readonly number[]): number => {\n  const ctx = mut({ t: mut([1]) });\n  let out = 0;\n  for (const x of xs) {\n    if (x === 1) { out = freeze(ctx).t.length; continue; }\n    ctx.t.push(x);\n  }\n  return out;\n};`, want: { a: R("mut-after-freeze") } },

  // ---- 5. depth ----
  { id: "r5-group-in-group", route: "5", src: `const a = () => {\n  const ctx = mut({ g: mut({ t: mut([1]) }) });\n  return freeze(ctx).g.t.length;\n};`, want: { a: R("mut-bind", "type") } },
  { id: "r5-mut-array-of-mut", route: "5", src: `const a = () => {\n  const xs = mut([mut(new Map<string, number>())]);\n  return freeze(xs).length;\n};`, want: { a: R("mut-bind") } },
  { id: "r5-map-value-write", route: "5", src: `const a = () => {\n  const ctx = mut({ t: mut(new Map<string, number[]>()) });\n  ctx.t.get("k")?.push(1);\n  return freeze(ctx).t.size;\n};`, want: { a: R("mutating-method") } },
  { id: "r5-map-value-write-narrowed", route: "5", src: `const a = () => {\n  const ctx = mut({ t: mut(new Map<string, number[]>()) });\n  const xs = ctx.t.get("k");\n  if (xs !== undefined) xs.push(1);\n  return freeze(ctx).t.size;\n};`, want: { a: R("mutating-method") } },
  { id: "r5-inner-record-deep", route: "5", src: cell(`ctx.inner.a.push(1);`), want: { a: R("mut-deep-write") } },
  { id: "r5-map-of-mut", route: "5", src: `const a = () => {\n  const m = mut(new Map<string, Mut<number[]>>());\n  const x = m.get("a");\n  return freeze(m).size;\n};`, want: { a: "ok" } },

  // ---- edit 5: found after RESULTS draft 1 (a group inside an expression, group types that are not a plain record, narrowing) ----
  { id: "r1-values-cond-group", route: "1", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ a: mut([1]), b: mut([2]) });\n  const vs = Object.values(p ? ctx : ctx);\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-spread-cond-group", route: "1", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ a: mut([1]) });\n  const s = { ...(p ? ctx : ctx) };\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-spread-cond-into-mut", route: "1", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ a: mut([1]) });\n  const h = mut({ ...(p ? ctx : ctx) });\n  h.a.push(2);\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r3-borrow-logical-group", route: "3", src: `const g = function* () {\n  const ctx = mut({ a: mut([1]) });\n  yield borrow(ctx ?? ctx);\n};`, want: { g: R("mut-escape") } },
  { id: "r7-interface-group-freeze", route: "7", src: `interface Tabs { t: Mut<number[]> }\nconst a = () => {\n  const ctx: Mut<Tabs> = mut({ t: mut([1]) });\n  const f = freeze(ctx);\n  f.t.push(2);\n  return 1;\n};`, want: { a: R("mutating-method") } },
  { id: "r7-interface-group-values", route: "7", src: `interface Tabs { t: Mut<number[]> }\nconst a = () => {\n  const ctx = mut<Tabs>({ t: mut([1]) });\n  const vs = Object.values(ctx);\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r7-union-group-freeze", route: "7", src: `type A = { k: "a"; t: Mut<number[]> };\ntype B = { k: "b"; t: Mut<number[]> };\nconst a = () => {\n  const ctx: Mut<A | B> = mut({ k: "a", t: mut([1]) });\n  const f = freeze(ctx);\n  f.t.push(2);\n  return 1;\n};`, want: { a: R("mutating-method") } },
  { id: "r7-union-group-spread", route: "7", src: `type A = { k: "a"; t: Mut<number[]> };\ntype B = { k: "b"; t: Mut<number[]> };\nconst a = () => {\n  const ctx: Mut<A | B> = mut({ k: "a", t: mut([1]) });\n  const s = { ...ctx };\n  return 1;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-narrow-isarray", route: "1", src: `const a = () => {\n  const ctx = mut({ xs: mut([1]) });\n  if (Array.isArray(ctx.xs)) { const x = ctx.xs; }\n  return freeze(ctx).xs.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-narrow-truthy-typeof", route: "1", src: `const a = () => {\n  const ctx = mut({ xs: mut([1]) });\n  if (ctx.xs) { const x = ctx.xs; }\n  if (typeof ctx.xs === "object") { const y = ctx.xs; }\n  return 1;\n};`, want: { a: R("mut-escape") } },
  { id: "r7-narrow-nullable", route: "7", src: `const a = () => {\n  const ctx: Mut<{ xs: Mut<number[]> | null }> = mut({ xs: null });\n  if (ctx.xs !== null) { const x = ctx.xs; x.push(1); }\n  return 1;\n};`, want: { a: R("mut-escape", "mutating-method", "possibly-undefined") } },

  // ---- edit 6: aliases, type parameters, a union with a group member, JSX spread (advisor, second look) ----
  { id: "r7-alias-field-bind", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => {\n  const ctx: G = mut({ t: mut([1]), u: mut([2]) });\n  const x = ctx.t;\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r7-alias-delete", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => {\n  const ctx: G = mut({ t: mut([1]), u: mut([2]) });\n  delete ctx.t;\n  return 1;\n};`, want: { a: R("mut-field-assign") } },
  { id: "r7-alias-freeze-write", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => {\n  const ctx: G = mut({ t: mut([1]), u: mut([2]) });\n  const f = freeze(ctx);\n  f.t.push(2);\n  return 1;\n};`, want: { a: R("mutating-method") } },
  { id: "r7-alias-values", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => {\n  const ctx: G = mut({ t: mut([1]), u: mut([2]) });\n  const vs = Object.values(ctx);\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r7-alias-spread", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => {\n  const ctx: G = mut({ t: mut([1]), u: mut([2]) });\n  const s = { ...ctx };\n  return freeze(ctx).t.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r7-alias-param-return", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => (g: G): Tab => g.t;`, want: { a: R("mut-escape") } },
  { id: "r7-alias-param-values", route: "7", src: `type Tab = Mut<number[]>;\ntype G = Mut<{ t: Tab; u: Tab }>;\nconst a = () => (g: G): number => {\n  const vs = Object.values(g);\n  return 1;\n};`, want: { a: R("mut-escape") } },
  { id: "r3-generic-field-out", route: "3", src: `const a = () => {\n  const first = <T,>(o: Mut<{ a: T }>): T => o.a;\n  const ctx = mut({ a: mut([1]) });\n  const x = first(ctx);\n  const r = freeze(ctx);\n  x.push(1);\n  return r;\n};`, want: { a: R("mut-escape") } },
  { id: "r3-generic-values", route: "3", src: `const a = () => {\n  const vals = <T,>(o: Mut<T>) => Object.values(o);\n  const ctx = mut({ a: mut([1]) });\n  const x = vals(ctx);\n  return freeze(ctx);\n};`, want: { a: R("mut-escape", "type") } },
  { id: "r0-generic-group-param", route: "0", src: `const a = () => {\n  const len = <T,>(o: Mut<{ a: Mut<T[]> }>): number => o.a.length;\n  const ctx = mut({ a: mut([1]) });\n  const n = len(ctx);\n  return freeze(ctx).a.length + n;\n};`, want: { a: "ok" } },
  { id: "r1-values-union-member", route: "1", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ a: mut([1]) });\n  const vs = Object.values(p ? ctx : { a: [1] });\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-spread-union-member", route: "1", src: `const a = () => (p: boolean) => {\n  const ctx = mut({ a: mut([1]) });\n  const s = { ...(p ? ctx : { a: [1] }) };\n  return freeze(ctx).a.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-jsx-spread", route: "1", src: `const a = () => {\n  const C = (props: { a: Mut<number[]> }) => <div>{props.a.length}</div>;\n  const ctx = mut({ a: mut([1]) });\n  const el = <C {...ctx} />;\n  return freeze(ctx).a.length;\n};`, want: { a: "unsupported" } },

  // ---- 6. today's rules restated: each group program against its plain-Mut analogue ----
  { id: "p6-capture-generator", route: "6", src: `const a = () => {\n  const ctx = mut([1]);\n  const g = function* () {\n    yield ctx.length;\n  };\n  return g;\n};`, want: { a: R("mut-capture") } },
  { id: "r6-capture-generator", route: "6", src: `const a = () => {\n  const ctx = mut({ t: mut([1]) });\n  const g = function* () {\n    yield ctx.t.length;\n  };\n  return g;\n};`, want: { a: "same:p6-capture-generator" } },
  { id: "p6-capture-async", route: "6", src: `const a = () => {\n  const ctx = mut([1]);\n  const h = async () => ctx.length;\n  return h;\n};`, want: { a: R("mut-capture") } },
  { id: "r6-capture-async", route: "6", src: `const a = () => {\n  const ctx = mut({ t: mut([1]) });\n  const h = async () => ctx.t.length;\n  return h;\n};`, want: { a: "same:p6-capture-async" } },
  { id: "p6-action", route: "6", src: `const s = () => state(0);\nconst a = (s: State<number>) => {\n  const ctx = mut([1]);\n  return action(() => s.set(ctx.length));\n};`, want: { s: "ok", a: R("action-capture", "mut-capture") } },
  { id: "r6-action", route: "6", src: `const s = () => state(0);\nconst a = (s: State<number>) => {\n  const ctx = mut({ t: mut([1]) });\n  return action(() => s.set(ctx.t.length));\n};`, want: { s: "ok", a: "same:p6-action" } },
  { id: "p6-action-after-freeze", route: "6", src: `const s = () => state(0);\nconst a = (s: State<number>) => {\n  const ctx = mut([1]);\n  ctx.push(2);\n  const f = freeze(ctx);\n  return action(() => s.set(f.length));\n};`, want: { s: "ok", a: R("action-capture") } },
  { id: "r6-action-after-freeze", route: "6", src: `const s = () => state(0);\nconst a = (s: State<number>) => {\n  const ctx = mut({ t: mut([1]) });\n  ctx.t.push(2);\n  const f = freeze(ctx);\n  return action(() => s.set(f.t.length));\n};`, want: { s: "ok", a: "same:p6-action-after-freeze" } },
  { id: "p6-switch-return", route: "6", src: `const f = () => (k: number) => {\n  const ctx = mut([1]);\n  switch (k) {\n    case 1: return ctx;\n  }\n  return freeze(ctx);\n};`, want: { f: R("mut-escape") } },
  { id: "r6-switch-return", route: "6", src: `const f = () => (k: number) => {\n  const ctx = mut({ t: mut([1]) });\n  switch (k) {\n    case 1: return ctx;\n  }\n  return freeze(ctx);\n};`, want: { f: "same:p6-switch-return" } },
  { id: "p6-state-cell-value", route: "6", src: `const s = () => {\n  const ctx = mut([1]);\n  ctx.push(2);\n  return state(freeze(ctx));\n};`, want: { s: "ok" } },
  { id: "r6-state-cell-value", route: "6", src: `const s = () => {\n  const ctx = mut({ t: mut([1]) });\n  ctx.t.push(2);\n  return state(freeze(ctx));\n};`, want: { s: "same:p6-state-cell-value" } },
  { id: "p6-cell-param", route: "6", src: `const g = function* () {\n  const b = mut([1]);\n  yield borrow(b);\n};\nconst r = (g: Mut<number[]>) => g.length;`, want: { g: "ok", r: R("inject-type") } },
  { id: "r6-cell-param", route: "6", src: `const g = function* () {\n  const b = mut({ t: mut([1]) });\n  yield borrow(b.t);\n};\nconst r = (g: Mut<{ t: Mut<number[]> }>) => g.t.length;`, want: { g: "ok", r: "same:p6-cell-param" } },
  { id: "p6-boundary", route: "6", src: `const r = (x: Mut<number[]>) => x.length;`, outside: [{ name: "x" }], want: { r: R("boundary-type") } },
  { id: "r6-boundary", route: "6", src: `const r = (x: Mut<{ t: Mut<number[]> }>) => x.t.length;`, outside: [{ name: "x" }], want: { r: "same:p6-boundary" } },
  { id: "p6-boundary-fn", route: "6", src: `const r = (f: (m: Mut<number[]>) => number) => 1;`, outside: [{ name: "f" }], want: { r: R("boundary-type") } },
  { id: "r6-boundary-fn", route: "6", src: `const r = (f: (m: Mut<{ t: Mut<number[]> }>) => number) => 1;`, outside: [{ name: "f" }], want: { r: "same:p6-boundary-fn" } },
  { id: "p6-let-capture-helper", route: "6", src: `const a = () => {\n  const ctx = mut([1]);\n  const run = () => {\n    const inner = () => ctx.push(1);\n    return inner;\n  };\n  return freeze(ctx).length;\n};`, want: { a: R("mut-capture") } },
  { id: "r6-let-capture-helper", route: "6", src: `const a = () => {\n  const ctx = mut({ t: mut([1]) });\n  const run = () => {\n    const inner = () => ctx.t.push(1);\n    return inner;\n  };\n  return freeze(ctx).t.length;\n};`, want: { a: "same:p6-let-capture-helper" } },

  // ---- 7. typing ----
  { id: "r7-wider-param", route: "7", src: `${G}const a = () => {\n  const one = (c: Mut<{ types: Tab }>) => c.types.size;\n  const ctx: G = ${MK};\n  one(ctx);\n  return freeze(ctx).n;\n};`, want: { a: R("type") } },
  { id: "r7-readonly-field-param", route: "7", src: `type Tab = Mut<Map<string, number>>;\nconst a = () => {\n  const ro = (c: Mut<{ types: Tab; vars: Map<string, number> }>) => c.types.size;\n  const ctx = mut({ types: mut(new Map<string, number>()), vars: mut(new Map<string, number>()) });\n  ro(ctx);\n  return freeze(ctx).types.size;\n};`, want: { a: R("type") } },
  { id: "r7-optional-field", route: "7", src: `type O = Mut<{ t?: Mut<number[]> }>;\nconst a = () => (o: O) => {\n  o.t?.push(1);\n};`, want: { a: R("mut-deep-write") } },
  { id: "r7-group-into-plain-param", route: "7", src: `${G}const a = () => {\n  const pl = (c: { types: Map<string, number> }) => c.types.size;\n  const ctx: G = ${MK};\n  pl(ctx);\n  return freeze(ctx).n;\n};`, want: { a: R("mut-escape") } },
  // added 01:20, after the first proto run: an optional or nullable owned field, and a Borrowed reader typed with one
  { id: "r7-optional-owned", route: "7", src: `const a = () => {\n  const ctx: Mut<{ t?: Mut<number[]> }> = mut({ t: mut([1]) });\n  const x = ctx.t;\n  const r = freeze(ctx);\n  if (x !== undefined) x.push(2);\n  return r;\n};`, want: { a: R("mut-escape", "type") } },
  { id: "r7-nullable-owned", route: "7", src: `const a = () => {\n  const ctx: Mut<{ t: Mut<number[]> | null }> = mut({ t: mut([1]) });\n  const x = ctx.t;\n  const r = freeze(ctx);\n  if (x !== null) x.push(2);\n  return r;\n};`, want: { a: R("mut-escape", "type") } },
  { id: "r7-borrowed-reader-typed-group", route: "7", src: `const frames = function* () {\n  const b = mut({ t: [1] });\n  yield borrow(b);\n};\nconst rd = (frames: Borrowed<{ t: Mut<number[]> }>) => {\n  frames.t.push(1);\n  return 1;\n};`, want: { frames: "ok", rd: R("inject-type") } },
  // added 01:25: Object.values and Object.entries on a group whose fields have one type (no type error to stop them)
  { id: "r1-values-homogeneous", route: "1", src: `const a = () => {\n  const ctx = mut({ a: mut([1]), b: mut([2]) });\n  const vs = Object.values(ctx);\n  const r = freeze(ctx);\n  for (const v of vs) v.push(3);\n  return r;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-entries-homogeneous", route: "1", src: `const a = () => {\n  const ctx = mut({ a: mut([1]), b: mut([2]) });\n  const es = Object.entries(ctx);\n  return freeze(ctx).a.length + es.length;\n};`, want: { a: R("mut-escape") } },
  { id: "r1-json-group", route: "1", src: cell(`const js = JSON.stringify(ctx);`, "js.length"), want: { a: R("mut-escape") } },
];

// ---- the runner ----
type Verdict = string;
export function verdictOf(c: { status: string; errors: { rule: string }[] }): Verdict {
  if (c.status === "ok" || c.status === "unsupported" || c.status === "blocked") return c.status;
  return `rejected:${[...new Set(c.errors.map((e) => e.rule))].sort().join(",")}`;
}
if (import.meta.main) {
  const tree = process.argv[2] ?? "base";
  const at = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? null; };
  const only = at("--only"), out = at("--json");
  const { checkSources } = await import(`${tree.startsWith("/") ? tree : `./${tree}`}/lite/core.ts`);
  const got = new Map<string, Record<string, Verdict>>(), detail: Record<string, unknown> = {};
  for (const p of PROBES) {
    const r = checkSources({ cells: p.src, tsx: true, shell: p.shell ?? null, outside: p.outside ?? null, name: p.id });
    const v: Record<string, Verdict> = {};
    for (const c of r.cells) v[c.name] = verdictOf(c);
    if (r.module.length) v["#module"] = `rejected:${[...new Set(r.module.map((e: { rule: string }) => e.rule))].sort().join(",")}`;
    got.set(p.id, v);
    detail[p.id] = { cells: r.cells.map((c: { name: string; status: string; errors: { rule: string; msg: string }[]; unsupported: { msg: string }[] }) => ({ name: c.name, status: c.status, errors: c.errors.map((e) => `[${e.rule}] ${e.msg}`), unsupported: c.unsupported.map((e) => e.msg) })), module: r.module };
  }
  let pass = 0, fail = 0;
  const byRoute = new Map<string, [number, number]>();
  for (const p of PROBES) {
    if (only && p.id !== only) continue;
    const g = got.get(p.id) ?? {};
    const want: Record<string, string> = {};
    for (const [k, w] of Object.entries(p.want)) want[k] = w.startsWith("same:") ? (got.get(w.slice(5)) ?? {})[k] ?? "missing" : w;
    const ok = JSON.stringify(Object.keys(want).sort().map((k) => [k, want[k]])) === JSON.stringify(Object.keys(g).sort().map((k) => [k, g[k]]));
    const e = byRoute.get(p.route) ?? [0, 0];
    if (ok) { pass++; e[0]++; } else { fail++; e[1]++; }
    byRoute.set(p.route, e);
    if (!ok || process.argv.includes("--all")) console.log(`${ok ? "PASS" : "FAIL"} ${p.id} want ${JSON.stringify(want)} got ${JSON.stringify(g)}`);
  }
  console.log(`tree ${tree}: ${PROBES.length} probes, ${PROBES.reduce((s, p) => s + Object.keys(p.want).length, 0)} cells: PASS ${pass} FAIL ${fail}; by route ${[...byRoute].map(([r, [a, b]]) => `${r}:${a}/${a + b}`).join(" ")}`);
  if (out) await Bun.write(out, JSON.stringify({ tree, got: Object.fromEntries(got), detail }, null, 1));
}
