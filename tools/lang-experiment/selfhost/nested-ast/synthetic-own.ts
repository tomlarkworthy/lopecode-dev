// Sources for the identity visitor's differential (diff-own.ts) that reach the branches of opaqueCaptures the corpus
// reaches rarely or not at all: a let, a param of an enclosing function, a Mut, a for...of binding, a function
// declaration, a helper that calls itself, a JSX component name and a JSX attribute inside an action body.
export const SYNTHETIC_OWN: { id: string; src: string; tsx: boolean }[] = [
  { id: "own-1.tsx", tsx: true, src: [
    `const s = () => state(0);`,
    `const view = (s: State<number>, lim: number) => {`,
    `  let k = 1;`,
    `  const total = lim + 1;`,
    `  const list: number[] = [];`,
    `  for (const x of [1, 2]) list.push(x);`,
    `  function helper(n: number): number { return n > 0 ? helper(n - 1) + k : total; }`,
    `  const Btn = () => <b>{total}</b>;`,
    `  const mk = (p: number) => action(() => s.set(p + total));`,
    `  return action(() => { s.set(read(s) + k + total + helper(2)); const el = <Btn title="t" />; return el; });`,
    `};`,
    `const loop = (s: State<number>) => { for (const y of [1, 2]) { const z = y; return action(() => s.set(z)); } return action(() => s.set(0)); };`,
    `const muts = (s: State<number>) => { const m = mut([1]); const c = m.length; return action(() => s.set(c)); };`,
    // a helper whose body reads a let, and nothing tainted by name: only the binding's fnNode leads to the let
    `const fnspan = (s: State<number>) => { let j = 1; function h2(): number { return j; } return action(() => s.set(h2())); };`,
  ].join("\n") },
];
