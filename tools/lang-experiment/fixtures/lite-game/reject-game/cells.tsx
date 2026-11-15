type W = { readonly n: number };
export const world = (): RefCell<W> => ref<W>({ n: 0 });
export const ok_tick = (world: Ref<W>) => action((dt: number) => world.update((w) => ({ n: w.n + dt })));
export const ok_ticks = function* () {
  while (true) yield 16;
};
export const ok_onTick = (ok_ticks: Events<number>, ok_tick: Action<[number]>) => on(ok_ticks, ok_tick);
// A generator loop that writes the world itself: writes belong in actions.
export const bad_loop = function* (world: Ref<W>) {
  while (true) {
    world.update((w) => ({ n: w.n + 1 }));
    yield 1;
  }
};
// A cell may not run an action; the notebook does, for each value of the events a listener names.
export const bad_call_tick = (ok_tick: Action<[number]>) => {
  ok_tick(16);
  return 0;
};
// on takes an action, not a function.
export const bad_on_fn = (ok_ticks: Events<number>) => on(ok_ticks, (dt: number) => dt);
// The events are numbers; an action taking a string does not fit.
export const bad_on_type = (ok_ticks: Events<number>, world: Ref<W>) => on(ok_ticks, action((s: string) => world.set({ n: s.length })));
// Events must name a generator cell, and its type must match what it yields.
export const bad_events_not_generator = (world: Events<W>) => world;
export const bad_events_wrong_type = (ok_ticks: Events<string>) => ok_ticks;
// ok_ticks is taken as Events above, so a plain reader would get the handle, not a number.
export const bad_plain_reader = (ok_ticks: number) => ok_ticks + 1;
// The old name gives a hint.
export const bad_old_name = (ok_ticks: Source<number>) => 1;
