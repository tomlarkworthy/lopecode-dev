export const cands = [
  { name: "cell-h", src: `const h = () => 5;\nconst v = (h: number) => <b>{h}</b>;`, show: ["v"] },
  { name: "cell-h-fn", src: `const h = () => (x: number) => x + 1;\nconst v = (h: (x: number) => number) => <b>{h(1)}</b>;`, show: ["v"] },
];
