// Plain cells, a function-valued cell, an async cell and a generator, in each accepted form.
type Point = { readonly x: number; readonly y: number };

export let base = () => 21;
export let double = () => (n: number) => n * 2;
export let answer = (base, double) => double(base);
export const origin = (): Point => ({ x: 0, y: 0 });
export function shifted(origin, answer): Point {
  return { ...origin, x: origin.x + answer };
}
export let later = async (answer) => {
  await Promise.resolve();
  return answer + 1;
};
export let ticks = function* () {
  for (let i = 0; i < 3; i++) yield i;
};
export let names = () => ["b", "a", "c"];
export let sorted = (names) => names.toSorted();

export let test_answer = (answer) => {
  if (answer !== 42) throw new Error(`expected 42, got ${answer}`);
  return "ok";
};
export let test_later = (later) => {
  if (later !== 43) throw new Error(`expected 43, got ${later}`);
  return "ok";
};
export let test_ticks = (ticks) => {
  if (ticks < 0 || ticks > 2) throw new Error(`tick out of range ${ticks}`);
  return ticks;
};
export let test_shifted = (shifted) => {
  if (!equals(shifted, { x: 42, y: 0 })) throw new Error("shifted");
  return "ok";
};

// Capabilities: provided by the harness, deterministic per consuming cell.
export let roll = (random, now) => ({ r: random(), t: now() });
export let noted = (log, answer) => {
  log("answer is", answer);
  return answer;
};
export let watched = (invalidation) => typeof invalidation.then;

// URL and URLSearchParams are allowed intrinsics (v1).
export let query = () => new URL("https://example.com/a?b=1").searchParams.get("b");
export let qs = () => new URLSearchParams({ x: "1", y: "2" }).toString();
export let test_url = (query, qs) => {
  if (query !== "1" || qs !== "x=1&y=2") throw new Error(`${query} ${qs}`);
  return "ok";
};
