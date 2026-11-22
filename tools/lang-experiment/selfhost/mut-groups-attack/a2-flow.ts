import type { Attack } from "./harness.ts";
// the flow check after freeze: code that runs after freeze but is not on the path the check walks
export const attacks: Attack[] = [
  {
    name: "generator-helper-runs-after-freeze", family: "helper-deferred-body",
    src: `const a = () => {
  const m = mut([1]);
  const gen = function* () {
    m.push(2);
    yield 0;
  };
  const it = gen();
  const fr = freeze(m);
  const before = fr.length;
  const drained = [...it];
  return [before, fr.length, drained.length];
};`,
    show: ["a"],
  },
  {
    name: "generator-fn-decl-helper", family: "helper-deferred-body",
    src: `const a = () => {
  const m = mut([1]);
  function* gen(): Generator<number> {
    m.push(2);
    yield 0;
  }
  const it = gen();
  const fr = freeze(m);
  const before = fr.length;
  for (const v of it) {
    v;
  }
  return [before, fr.length];
};`,
    show: ["a"],
  },
  {
    name: "finally-after-return-freeze", family: "try-finally",
    src: `const a = () => {
  const m = mut([1]);
  try {
    return freeze(m);
  } finally {
    m.push(2);
  }
};
const b = (a: number[]) => a.length;`,
    show: ["a", "b"],
  },
  {
    name: "catch-after-throw-freeze", family: "try-finally",
    src: `const a = () => {
  const m = mut([1]);
  let keep: number[] = [];
  try {
    keep = freeze(m);
    throw new Error("x");
  } catch (e) {
    m.push(2);
  }
  return keep;
};`,
    show: ["a"],
  },
  {
    name: "escaping-thunk-calls-helper", family: "helper-transitive",
    src: `const a = () => {
  const m = mut([1]);
  const h = () => {
    m.push(2);
    return 0;
  };
  const fr = freeze(m);
  return { fr, poke: () => h() };
};
const b = (a: { fr: number[]; poke: () => number }) => {
  const before = a.fr.length;
  a.poke();
  return [before, a.fr.length];
};`,
    show: ["a", "b"],
  },
  {
    name: "callback-third-arg-alias", family: "intrinsic-callback-alias",
    src: `const g = function* () {
  const out = mut([1]);
  const alias = out.map((v, i, arr) => arr)[0];
  yield alias;
  out.push(2);
};
const r = (g: number[]) => g;`,
    show: ["g", "r"],
  },
  {
    name: "loop-update-after-freeze", family: "loop",
    src: `const a = () => {
  const m = mut([1]);
  let r: number[] = [];
  for (let i = 0; i < 1; m.push(9), i++) {
    r = freeze(m);
  }
  return r;
};`,
    show: ["a"],
  },
];
