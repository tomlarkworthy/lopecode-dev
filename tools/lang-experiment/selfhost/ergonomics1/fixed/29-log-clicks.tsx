const clicks = (): StateCell<number[]> => state<number[]>([]);
const recordClick = (clicks: State<number[]>) => action((p: PointerData) => clicks.update((cs) => [...cs, p.t]));
const clickCount = (clicks: number[]) => clicks.length;
const lastGap = (clicks: number[]) => {
  const a = clicks[clicks.length - 1];
  const b = clicks[clicks.length - 2];
  return a === undefined || b === undefined ? null : a - b;
};
const clickView = (clickCount: number, recordClick: Action<[PointerData]>) => (
  <div>
    <canvas width={80} height={24} onPointerDown={recordClick} />
    <span>clicked {clickCount}</span>
  </div>
);
