import type { Attack } from "./harness.ts";
// the one-off try.ts probes of the first minutes, kept so the count is exact
export const attacks: Attack[] = [
  { name: "freeze-local-alias-untyped", family: "prelude-as-value", src: `const g = function* () {\n  const m = mut([1]);\n  const fz = freeze;\n  const r = fz(m);\n  yield r;\n  m.push(2);\n  yield r;\n};` },
  { name: "generator-helper-next", family: "helper-deferred-body", src: `const a = () => {\n  const m = mut([1]);\n  const gen = function* (): Generator<number> {\n    m.push(2);\n    yield 0;\n  };\n  const it = gen();\n  const fr = freeze(m);\n  const before = fr.length;\n  it.next();\n  return [before, fr.length];\n};` },
  { name: "async-helper-sync-part", family: "async-suspension", src: `const a = () => {\n  const m = mut([1]);\n  const gen = async (): Promise<number> => {\n    m.push(2);\n    return 0;\n  };\n  const fr = freeze(m);\n  return fr;\n};` },
  { name: "yield-star-iterator", family: "helper-deferred-body", src: `const g = function* () {\n  const m = mut([1]);\n  const h = function* (): Generator<number[]> {\n    m.push(2);\n    yield [0];\n  };\n  const it = h();\n  const fr = freeze(m);\n  yield fr;\n  yield* it;\n};` },
  { name: "yield-star-call", family: "helper-deferred-body", src: `const g = function* () {\n  const m = mut([1]);\n  const h = function* (): Generator<number[]> {\n    m.push(2);\n    yield [0];\n  };\n  const fr = freeze(m);\n  yield fr;\n  yield* h();\n};` },
];
