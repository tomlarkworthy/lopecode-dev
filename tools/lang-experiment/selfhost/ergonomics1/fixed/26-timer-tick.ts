const running = (): StateCell<boolean> => state(true);
const elapsed = (): StateCell<number> => state(0);
const clock = function* (now: Clock, running: boolean) {
  if (!running) return;
  let last = now();
  while (true) {
    const t = now();
    yield t - last;
    last = t;
  }
};
const addTime = (elapsed: State<number>) => action((dt: number) => elapsed.update((e) => e + dt));
const onClock = (clock: Events<number>, addTime: Action<[number]>) => on(clock, addTime);
const seconds = (elapsed: number) => (elapsed / 1000).toFixed(1) + "s";
const stop = (running: State<boolean>) => action(() => running.set(false));
