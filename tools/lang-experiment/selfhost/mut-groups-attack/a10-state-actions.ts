import type { Attack } from "./harness.ts";
// state cells, actions, events and listeners carrying a Mut, a group or a field
export const attacks: Attack[] = [
  {
    name: "action-mut-param-from-listener", family: "state-action-events",
    src: `const ticks = function* () {
  yield [1];
  yield [2];
};
const bump = () => action((m: Mut<number[]>) => {
  m.push(9);
});
const l = (ticks: Events<number[]>, bump: Action<[Mut<number[]>]>) => on(ticks, bump);`,
  },
  {
    name: "state-of-group", family: "state-action-events",
    src: `const s = () => {
  const ctx = mut({ xs: mut([1]) });
  return state(ctx);
};`,
  },
  {
    name: "state-of-frozen-group-then-write", family: "state-action-events",
    src: `const s = () => {
  const ctx = mut({ xs: mut([1]) });
  const fr = freeze(ctx);
  ctx.xs.push(2);
  return state(fr);
};`,
  },
  {
    name: "action-captures-group", family: "state-action-events",
    src: `const n = () => state(0);
const a = (n: State<number>) => {
  const ctx = mut({ xs: mut([1]) });
  return action(() => {
    ctx.xs.push(1);
    n.set(ctx.xs.length);
  });
};`,
  },
  {
    name: "action-update-callback-mut", family: "state-action-events",
    src: `const s = () => state([1]);
const a = (s: State<number[]>) => action(() => {
  s.update((v) => {
    const mk = (f: (x: number[]) => Mut<number[]>) => f(v);
    return v;
  });
});`,
  },
  {
    name: "action-group-forEach-callback", family: "field-own-method-callback",
    src: `const a = () => {
  const ctx = mut({ types: mut(new Map<string, number>([["a", 1]])), vars: mut(new Map<string, number>()) });
  ctx.types.forEach((v, k) => {
    ctx.vars.set(k, v);
  });
  return freeze(ctx);
};`,
  },
  {
    name: "group-field-forEach-self", family: "field-own-method-callback",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1, 2]) });
  ctx.xs.forEach(() => {
    ctx.xs.push(0);
  });
  return freeze(ctx);
};`,
  },
  {
    name: "events-yield-frozen-then-write", family: "state-action-events",
    src: `const ev = function* () {
  const m = mut([1]);
  const fr = freeze(m);
  yield fr;
  m.push(2);
};`,
  },
];
