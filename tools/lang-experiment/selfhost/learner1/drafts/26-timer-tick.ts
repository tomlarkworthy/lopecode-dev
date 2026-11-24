const running = (): StateCell<boolean> => state(true);
const elapsed = (): StateCell<number> => state(0);

// Yields the ms since the previous value while running; yields nothing once running is false.
const clock = function* (now: Clock, running: boolean) {
  if (!running) return;
  let t = now();
  while (true) {
    const t1 = now();
    yield t1 - t;
    t = t1;
  }
};

const addTime = (elapsed: State<number>) => action((dt: number) => elapsed.update((e) => e + dt));

const onClock = (clock: Events<number>, addTime: Action<[number]>) => on(clock, addTime);

const stop = (running: State<boolean>) => action(() => running.set(false));

const seconds = (elapsed: number) => `${(elapsed / 1000).toFixed(1)}s`;
