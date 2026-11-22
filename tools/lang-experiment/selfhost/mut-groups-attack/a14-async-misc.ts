import type { Attack } from "./harness.ts";
// suspension, shadowing, JSX, reflection, for...in, Reflect, Object.* on groups and fields
const show = ["a"];
export const attacks: Attack[] = [
  {
    name: "async-group-param-field-after-await", family: "async-suspension",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const work = async (c: Mut<{ xs: Mut<number[]> }>): Promise<number> => {
    await 0;
    c.xs.push(2);
    return 0;
  };
  const p = work(ctx);
  return freeze(ctx);
};`, show,
  },
  {
    name: "async-field-param-after-await", family: "async-suspension",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const work = async (v: Mut<number[]>): Promise<number> => {
    await 0;
    v.push(2);
    return 0;
  };
  const p = work(ctx.xs);
  return freeze(ctx);
};`, show,
  },
  {
    name: "async-helper-captures-group", family: "async-suspension",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const work = async (): Promise<number> => {
    await 0;
    ctx.xs.push(2);
    return 0;
  };
  const p = work();
  return freeze(ctx);
};`, show,
  },
  {
    name: "async-await-in-arg-before-write", family: "async-suspension",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const work = async (c: Mut<{ xs: Mut<number[]> }>): Promise<number> => {
    const w = (n: number, v: Mut<number[]>) => v.push(n);
    w(await Promise.resolve(2), c.xs);
    return 0;
  };
  const p = work(ctx);
  return freeze(ctx);
};`, show,
  },
  {
    name: "shadow-group-name-in-helper", family: "shadowing",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const h = () => {
    const ctx = mut({ xs: mut([5]) });
    return freeze(ctx);
  };
  const fr = freeze(ctx);
  return [h(), fr];
};`, show,
  },
  {
    name: "shadow-mut-by-param", family: "shadowing",
    src: `const x = () => [1];
const y = (x: number[]) => {
  const run = (mut: (v: number[]) => Mut<number[]>) => {
    const m = mut(x);
    m.push(2);
    return 0;
  };
  return 0;
};`,
  },
  {
    name: "jsx-child-group", family: "jsx",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  return <div>{ctx.xs.length}</div>;
};`,
  },
  {
    name: "jsx-field-prop", family: "jsx",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  return <div title={String(ctx.xs)}>{ctx.xs}</div>;
};`,
  },
  {
    name: "for-in-group", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  let k = "";
  for (const key in ctx) k = key;
  return k;
};`,
  },
  {
    name: "reflect-get-field", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const v = Reflect.get(ctx, "xs");
  return 0;
};`,
  },
  {
    name: "object-entries-group", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const e = Object.entries(ctx);
  return 0;
};`,
  },
  {
    name: "structuredclone-group", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const c = structuredClone(ctx);
  return 0;
};`,
  },
  {
    name: "in-operator-group", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  return "xs" in ctx;
};`, show,
  },
  {
    name: "equals-group-field", family: "reflection",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  return equals(ctx, ctx.xs);
};`, show,
  },
  {
    name: "freeze-in-loop-group", family: "flow",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  let out: { xs: number[] } = { xs: [] };
  for (let i = 0; i < 2; i++) {
    if (i === 1) out = freeze(ctx);
    else ctx.xs.push(i);
  }
  return out;
};`, show,
  },
  {
    name: "freeze-in-switch-fallthrough-group", family: "flow",
    src: `const a = (k: number) => {
  const ctx = mut({ xs: mut([1]) });
  let out: { xs: number[] } = { xs: [] };
  switch (k) {
    case 1:
      out = freeze(ctx);
      break;
    default:
      break;
  }
  ctx.xs.push(2);
  return out;
};`,
  },
];
