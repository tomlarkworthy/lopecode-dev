// An action may not read the clock, so the clock reaches state through an events cell and a
// listener; recordClick reads the latest reading with read().
const clicks = (): StateCell<readonly number[]> => state<readonly number[]>([]);
const lastNow = (): StateCell<number> => state(0);

const frames = function* (now: Clock) {
  while (true) yield now();
};

const setNow = (lastNow: State<number>) => action((t: number) => lastNow.set(t));

const onFrame = (frames: Events<number>, setNow: Action<[number]>) => on(frames, setNow);

const recordClick = (clicks: State<readonly number[]>, lastNow: State<number>) =>
  action(() => {
    const t = read(lastNow);
    clicks.update((c) => [...c, t]);
  });

const clickCount = (clicks: readonly number[]) => clicks.length;

const lastGap = (clicks: readonly number[]) => {
  const last = clicks.at(-1);
  const before = clicks.at(-2);
  return last === undefined || before === undefined ? null : last - before;
};

const clickView = (clickCount: number, recordClick: Action<[]>) => (
  <button onClick={recordClick}>{`clicked ${clickCount}`}</button>
);
