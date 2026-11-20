// Port attempt (2026-11-20): lite/browser/workers.ts and lite/stdlib/runtime.ts, the declarations the runtime
// module holds. bun selfhost/rt/check.ts selfhost/rt/workers.ss.ts
type Job = { key: string; js?: string; names: string[]; order: { name: string; params: string[] }[]; values: Record<string, unknown>; outputs: string[] };
type Pool = { readonly size: number; readonly answered: readonly number[]; run(job: Job, owner: { dead: boolean }): Promise<Record<string, unknown>> };
type Shape = { k: "num" } | { k: "str" };
type Elem = { readonly tag: string; readonly props: { readonly [k: string]: unknown }; readonly children: readonly unknown[] };
type Compiler = { for(caller: string, refs: { readonly [k: string]: unknown }): unknown };

// the source a worker evaluates: a string, its content JavaScript
export const EXEC = () => `(function () { return function run(job) { return {}; }; })()`;
export const WORKER = (EXEC: string) => `const run = ${EXEC};\nself.onmessage = (e) => {};`;
export const superseded = () => (): Error => Object.assign(new Error("superseded"), { name: "SupersededError" });
export const supersededPlain = () => (): { readonly message: string; readonly name: string } => ({ message: "superseded", name: "SupersededError" });
export const makePool = (superseded: () => Error) => (size: number, makeWorker: () => Worker): Pool => {
  const slots: { worker: Worker; busy: boolean }[] = [];
  let next = 0;
  for (let i = 0; i < size; i++) slots.push({ worker: makeWorker(), busy: false });
  return { size, answered: [], run: (job: Job) => new Promise((resolve) => { next++; resolve({}); }) };
};
export const pagePool = (makePool: (size: number, makeWorker: () => Worker) => Pool, WORKER: string) => {
  let shared: Pool | null = null;
  return (): Pool => {
    if (shared !== null) return shared;
    const size = Math.max(1, Math.min(8, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
    const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
    shared = makePool(size, () => new Worker(url));
    return shared;
  };
};
export const rejected = () => (name: string, why: readonly string[]): never => {
  throw new Error(`${name} does not check: ${why.join("; ")}`);
};
export const viewRef = (isRefHandle: (v: unknown) => boolean, viewHandle: (el: { value: unknown }, name: string, check: (v: unknown) => unknown) => object, checkShape: (v: unknown, s: Shape, path: string) => unknown) =>
  (el: unknown, shape: Shape, name: string): object => {
    if (typeof el !== "object" || el === null || !("value" in el) || !("addEventListener" in el) || !("dispatchEvent" in el) || typeof el.addEventListener !== "function" || typeof el.dispatchEvent !== "function")
      throw new TypeError(`viewof ${name}: expected a view (an element with a value), found ${el === null ? "null" : typeof el}`);
    return viewHandle(el, name, (v: unknown) => checkShape(v, shape, name));
  };
export const joined = () => new Map<string, readonly string[]>();
export const joinCells = (joined: Map<string, readonly string[]>) => (texts: readonly string[]): string => {
  const source = texts.join("\n\n");
  joined.delete(source);
  joined.set(source, [...texts]);
  return source;
};
export const compileFor = () => (c: Compiler | null, caller: string, refs: { readonly [k: string]: unknown }): unknown => {
  if (c === null || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
};
export const mount = (patch: (node: Node, x: Elem) => void, create: (doc: Document, x: unknown) => Node) => (x: unknown, prev: unknown): Node => create(document, x);
export const lazyPool = (pagePool: () => Pool) => (): Pool => {
  let p: Pool | null = null;
  const get = (): Pool => { if (p === null) p = pagePool(); return p; };
  return { get size(): number { return get().size; }, get answered(): readonly number[] { return p === null ? [] : p.answered; }, run: (job: Job, owner: { dead: boolean }) => get().run(job, owner) };
};
