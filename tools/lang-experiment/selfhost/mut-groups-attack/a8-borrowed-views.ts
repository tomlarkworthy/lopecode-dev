import type { Attack } from "./harness.ts";
// a view taken from a Borrowed: the view rules (S4.8) look at Mut receivers, the Borrowed rules at Borrowed-typed results
const frames = `const frames = function* () {
  const buf = mut(new Float32Array(2));
  for (let k = 1; k < 4; k++) {
    buf[0] = k;
    yield borrow(buf);
  }
};
`;
export const attacks: Attack[] = [
  { name: "borrowed-subarray-kept", family: "borrowed-view", src: frames + `const keep = (frames: Borrowed<Float32Array>) => frames.subarray(0);`, show: ["keep"], lent: ["frames", "tab", "rows"] },
  { name: "borrowed-subarray-in-record", family: "borrowed-view", src: frames + `const keep = (frames: Borrowed<Float32Array>) => ({ v: frames.subarray(0, 1) });`, show: ["keep"], lent: ["frames", "tab", "rows"] },
  { name: "borrowed-buffer-kept", family: "borrowed-view", src: frames + `const keep = (frames: Borrowed<Float32Array>) => ({ b: frames.buffer });
const look = (keep: { b: ArrayBuffer }) => new Float32Array(keep.b.slice(0))[0];`, show: ["keep", "look"] },
  { name: "borrowed-sort-receiver", family: "borrowed-view", src: frames + `const keep = (frames: Borrowed<Float32Array>) => [frames.subarray(0)];`, show: ["keep"], lent: ["frames", "tab", "rows"] },
  {
    name: "borrowed-map-values-iter", family: "borrowed-view",
    src: `const tab = function* () {
  const m = mut(new Map<string, number>());
  for (let k = 1; k < 4; k++) {
    m.set("a", k);
    yield borrow(m);
  }
};
const keep = (tab: Borrowed<Map<string, number>>) => [...tab.values()];`, show: ["keep"], lent: ["frames", "tab", "rows"],
  },
  {
    name: "borrowed-array-of-arrays-elem", family: "borrowed-view",
    src: `const rows = function* () {
  const m = mut([[0]]);
  for (let k = 1; k < 4; k++) {
    m[0] = [k];
    yield borrow(m);
  }
};
const keep = (rows: Borrowed<number[][]>) => rows[0];`, show: ["keep"], lent: ["frames", "tab", "rows"],
  },
];
