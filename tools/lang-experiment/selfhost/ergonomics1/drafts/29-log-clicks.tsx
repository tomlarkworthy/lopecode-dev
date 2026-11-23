const clicks = (): StateCell<number[]> => state<number[]>([]);
const recordClick = (clicks: State<number[]>, now: Clock) => action(() => clicks.update((cs) => [...cs, now()]));
const clickCount = (clicks: number[]) => clicks.length;
const lastGap = (clicks: number[]) => (clicks.length < 2 ? null : clicks[clicks.length - 1] - clicks[clicks.length - 2]);
const clickView = (clickCount: number, recordClick: Action<[]>) => <button onClick={recordClick}>clicked {clickCount}</button>;
