const pct = () => (x: number): string => `${(x * 100).toFixed(1)}%`;
const plural = () => (n: number, word: string): string => `${n} ${n === 1 ? word : word + "s"}`;
const clamp = () => (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

const scores = () => [0.5, 0.9, 1.2, -0.1];

const shown = (scores: readonly number[], clamp, pct) => scores.map((s) => pct(clamp(s, 0, 1)));

const summary = (scores: readonly number[], plural) => plural(scores.length, "score");
