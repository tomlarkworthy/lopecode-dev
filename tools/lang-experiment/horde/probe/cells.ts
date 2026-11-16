// Probe: constructs the horde game would want, each in its own cell, to read the checker's verdicts.
export type W = { readonly xs: Float32Array };
export const n = () => 4;
// 1. Math.imul for a fast integer hash
export const p_imul = () => Math.imul(2654435761, 7);
// 2. seeded random inside an island: the random capability
export const p_noise = (random: Random) => random();
export const p_island_random = (compile: Compile, pool: Pool) => compile({ inputs: [], refs: [], outputs: ["p_noise"], options: { runtime: pool } });
// 3. a function value as a state cell crossing into the island
export const f = () => (x: number) => x * 2;
export const g = (f: (x: number) => number, n: number) => f(n);
export const p_fn_ref = (compile: Compile, pool: Pool) => compile({ inputs: ["n"], refs: ["f"], outputs: ["g"], options: { runtime: pool } });
// 4. world state as a state cell holding typed arrays, updated per frame by an action
export const world = (): StateCell<W> => state<W>({ xs: new Float32Array(8) });
export const step = () => (w: W, dt: number): W => {
  const xs = mut(new Float32Array(w.xs.length));
  for (let i = 0; i < xs.length; i++) xs[i] = w.xs[i] + dt;
  return { xs: freeze(xs) };
};
export const tick = (world: State<W>, step: (w: W, dt: number) => W) => action((dt: number) => world.update((w) => step(w, dt)));
// 5. an action awaiting the pool's result (an async write)
export const sim = (compile: Compile, pool: Pool) => compile({ inputs: ["n"], refs: [], outputs: ["g2"], options: { runtime: pool } });
export const g2 = (n: number) => n + 1;
export const p_async_action = (world: State<W>, sim) => action(async (dt: number) => { const r = await sim({ n: dt }); world.update((w) => w); });
// 6. writing into a typed array a caller passed in (reuse a buffer across frames)
export const p_write_param = () => (out: Mut<Float32Array>, v: number) => { out[0] = v; };
// 7. a canvas element in JSX is not available in .ts; WebGPU in a checked cell
export const p_gpu = (navigator) => navigator.gpu;
// 8. strict index reads on a typed array
export const p_index = () => { const a = new Float32Array(4); return a[0] + 1; };
