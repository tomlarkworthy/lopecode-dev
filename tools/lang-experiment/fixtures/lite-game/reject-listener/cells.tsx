// A listener, on(events, action), is only the whole value of a cell.
type W = { readonly n: number };
export const world = (): RefCell<W> => ref<W>({ n: 0 });
export const tick = (world: Ref<W>) => action((dt: number) => world.update((w) => ({ n: w.n + dt })));
export const ticks = function* () {
  while (true) yield 16;
};
export const pulses = function* () {
  while (true) yield 1;
};
export const fast = () => true;
export const ok_one = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);
export const ok_either = (ticks: Events<number>, pulses: Events<number>, tick: Action<[number]>, fast: boolean) => (fast ? on(ticks, tick) : on(pulses, tick));
export const ok_returned = (ticks: Events<number>, tick: Action<[number]>) => {
  const label = "clock";
  return on(ticks, tick);
};
export const bad_list = (ticks: Events<number>, tick: Action<[number]>) => [on(ticks, tick)];
export const bad_record = (ticks: Events<number>, tick: Action<[number]>) => ({ clock: on(ticks, tick) });
export const bad_none = (ticks: Events<number>, tick: Action<[number]>, fast: boolean) => (fast ? on(ticks, tick) : null);
export const bad_inner = (ticks: Events<number>, tick: Action<[number]>) => () => on(ticks, tick);
export const bad_ref = (ticks: Events<number>, tick: Action<[number]>): RefCell<Listener> => ref(on(ticks, tick));
export const bad_argument = (ticks: Events<number>, tick: Action<[number]>) => [on(ticks, tick)].length;
export const bad_value = (ticks: Events<number>) => {
  const make = on;
  return 0;
};
export const bad_async = async (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick);
export const bad_empty_list = (): Listener[] => [];
// No cell may take a listener, so it ends only when its own cell runs again.
export const bad_forward = (ok_one) => ok_one;
