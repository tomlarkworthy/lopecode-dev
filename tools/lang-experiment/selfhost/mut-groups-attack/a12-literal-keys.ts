import type { Attack } from "./harness.ts";
// the group literal: which property the checker types and which one JavaScript keeps
export const attacks: Attack[] = [
  {
    name: "duplicate-key-later-frozen", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const ctx = mut({ xs: mut([0]), xs: x });
  ctx.xs.push(3);
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "duplicate-key-plain-then-owned", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const ctx = mut({ xs: x, xs: mut([0]) });
  ctx.xs.push(3);
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "spread-overrides-owned-field", family: "group-literal-keys",
    src: `const x = () => ({ xs: [1, 2] });
const y = (x: { xs: number[] }) => {
  const ctx = mut({ xs: mut([0]), ...x });
  ctx.xs.push(3);
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "computed-duplicate-key", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const ctx = mut({ xs: mut([0]), ["xs"]: x });
  ctx.xs.push(3);
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "string-key-duplicate", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const ctx = mut({ xs: mut([0]), "xs": x });
  ctx.xs.push(3);
  return 0;
};`,
    show: ["x"],
  },
  {
    name: "plain-mut-duplicate-key", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const m = mut({ n: 0, n: x });
  return typeof m.n;
};`,
    show: ["y"],
  },
  {
    name: "proto-key", family: "group-literal-keys",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const m = mut({ __proto__: x });
  return 0;
};`,
    show: ["x"],
  },
];
