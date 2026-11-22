// Use after freeze is flow-sensitive: branches join, loop back-edges are followed.
let bad_loop_back_edge = () => {
  const out = [0];
  let r: number[] = [];
  for (let i = 0; i < 2; i++) {
    out[0] = i;
    if (i === 0) r = out;
  }
  return r;
};
let bad_while_freeze = () => {
  const out = [0];
  let r: number[] = [];
  let i = 0;
  while (i < 3) { out[0] = i; r = out; i++; }
  return r;
};
let bad_branch = (flag) => {
  const out = [0];
  let r: number[] = [];
  if (flag) r = out;
  out[0] = 1;
  return r;
};
let bad_twice = () => { const out = [0]; const a = out; const b = out; return [a, b]; };
let bad_in_expression = () => { const out = [1]; return (out[0] ?? 0) + (out[0] ?? 0); };
let flag = () => true;
let ok_branches_both_freeze = (flag) => {
  const out = [0];
  if (flag) { out[0] = 1; return out; }
  out[0] = 2;
  return out;
};
let ok_loop_declared = () => {
  const all: number[][] = [];
  let acc = all;
  for (let i = 0; i < 3; i++) {
    const row = [i];
    row.push(i * 2);
    acc = [...acc, row];
  }
  return acc;
};
let ok_freeze_after_loop = () => {
  const out = [0];
  for (let i = 0; i < 3; i++) out[0] += i;
  return out;
};
let ok_break_then_freeze = () => {
  const out = [0];
  for (let i = 0; i < 10; i++) { if (i > 3) break; out[0] = i; }
  return out;
};
