// Use after freeze is flow-sensitive: branches join, loop back-edges are followed.
export let bad_loop_back_edge = () => {
  const out = mut([0]);
  let r: number[] = [];
  for (let i = 0; i < 2; i++) {
    out[0] = i;
    if (i === 0) r = freeze(out);
  }
  return r;
};
export let bad_while_freeze = () => {
  const out = mut([0]);
  let r: number[] = [];
  let i = 0;
  while (i < 3) { out[0] = i; r = freeze(out); i++; }
  return r;
};
export let bad_branch = (flag) => {
  const out = mut([0]);
  let r: number[] = [];
  if (flag) r = freeze(out);
  out[0] = 1;
  return r;
};
export let bad_twice = () => { const out = mut([0]); const a = freeze(out); const b = freeze(out); return [a, b]; };
export let bad_in_expression = () => { const out = mut([1]); return (freeze(out)[0] ?? 0) + (out[0] ?? 0); };
export let flag = () => true;
export let ok_branches_both_freeze = (flag) => {
  const out = mut([0]);
  if (flag) { out[0] = 1; return freeze(out); }
  out[0] = 2;
  return freeze(out);
};
export let ok_loop_declared = () => {
  const all: number[][] = [];
  let acc = all;
  for (let i = 0; i < 3; i++) {
    const row = mut([i]);
    row.push(i * 2);
    acc = [...acc, freeze(row)];
  }
  return acc;
};
export let ok_freeze_after_loop = () => {
  const out = mut([0]);
  for (let i = 0; i < 3; i++) out[0] += i;
  return freeze(out);
};
export let ok_break_then_freeze = () => {
  const out = mut([0]);
  for (let i = 0; i < 10; i++) { if (i > 3) break; out[0] = i; }
  return freeze(out);
};
