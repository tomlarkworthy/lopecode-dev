const clicks = (): StateCell<number[]> => state<number[]>([]);
const recordClick = (clicks: State<number[]>) => action((t: number) => clicks.update((cs) => [...cs, t]));
const clickCount = (clicks: number[]) => clicks.length;
const lastGap = (clicks: number[]) => {
  const a = clicks[clicks.length - 1];
  const b = clicks[clicks.length - 2];
  return a === undefined || b === undefined ? null : a - b;
};
const clickView = (clickCount: number, recordClick: Action<[number]>) => <button onClick={recordClick}>clicked {clickCount}</button>;
