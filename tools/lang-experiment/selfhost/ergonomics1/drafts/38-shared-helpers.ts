const fmt = () => ({
  pct: (x: number) => `${(x * 100).toFixed(1)}%`,
  plural: (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`,
  clamp: (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x)),
});
const scores = () => [0.5, 0.9, 1.2, -0.1];
const shown = (fmt, scores: number[]) => scores.map((s) => fmt.pct(fmt.clamp(s, 0, 1)));
const summary = (fmt, scores: number[]) => fmt.plural(scores.length, "score");
