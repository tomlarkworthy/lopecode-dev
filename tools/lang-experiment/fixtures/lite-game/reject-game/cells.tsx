type W = { readonly n: number };
export const world = (): RefCell<W> => ref<W>({ n: 0 });
export const ok_tick = (world: Ref<W>) => action((dt: number) => world.update((w) => ({ n: w.n + dt })));
export const ok_ticks = function* () {
  while (true) yield 16;
};
export const ok_subscriptions = (ok_ticks: Source<number>, ok_tick: Action<[number]>) => [on(ok_ticks, ok_tick)];
// A generator loop that writes the world itself: writes belong in actions.
export const bad_loop = function* (world: Ref<W>) {
  while (true) {
    world.update((w) => ({ n: w.n + 1 }));
    yield 1;
  }
};
// A cell may not run an action; the runner does, for each event of a subscribed source.
export const bad_call_tick = (ok_tick: Action<[number]>) => {
  ok_tick(16);
  return 0;
};
// on takes an action, not a function.
export const bad_on_fn = (ok_ticks: Source<number>) => [on(ok_ticks, (dt: number) => dt)];
// The source yields numbers; an action taking a string does not fit.
export const bad_on_type = (ok_ticks: Source<number>, world: Ref<W>) => [on(ok_ticks, action((s: string) => world.set({ n: s.length })))];
// A Source must name a generator cell, and its type must match what it yields.
export const bad_source_not_generator = (world: Source<W>) => world;
export const bad_source_wrong_type = (ok_ticks: Source<string>) => ok_ticks;
// ok_ticks is taken as a Source above, so a plain reader would get the handle, not a number.
export const bad_plain_reader = (ok_ticks: number) => ok_ticks + 1;
// Passing the set on is fine; the runner counts it once.
export const ok_forward = (ok_subscriptions) => ok_subscriptions;
