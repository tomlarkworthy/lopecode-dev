type W = { readonly n: number };
const world = (): StateCell<W> => state<W>({ n: 0 });
const ok_tick = (world: State<W>) => action((dt: number) => world.update((w) => ({ n: w.n + dt })));
const ok_ticks = function* () {
  while (true) yield 16;
};
const ok_onTick = (ok_ticks: Events<number>, ok_tick: Action<[number]>) => on(ok_ticks, ok_tick);
// A generator loop that writes the world itself: writes belong in actions.
const bad_loop = function* (world: State<W>) {
  while (true) {
    world.update((w) => ({ n: w.n + 1 }));
    yield 1;
  }
};
// A cell may not run an action; the notebook does, for each value of the events a listener names.
const bad_call_tick = (ok_tick: Action<[number]>) => {
  ok_tick(16);
  return 0;
};
// on takes an action, not a function.
const bad_on_fn = (ok_ticks: Events<number>) => on(ok_ticks, (dt: number) => dt);
// The events are numbers; an action taking a string does not fit.
const bad_on_type = (ok_ticks: Events<number>, world: State<W>) => on(ok_ticks, action((s: string) => world.set({ n: s.length })));
// Events must name a generator cell, and its type must match what it yields.
const bad_events_not_generator = (world: Events<W>) => world;
const bad_events_wrong_type = (ok_ticks: Events<string>) => ok_ticks;
// ok_ticks is taken as Events above, so a plain reader would get the handle, not a number.
const bad_plain_reader = (ok_ticks: number) => ok_ticks + 1;
// The old name gives a hint.
const bad_old_name = (ok_ticks: Source<number>) => 1;
