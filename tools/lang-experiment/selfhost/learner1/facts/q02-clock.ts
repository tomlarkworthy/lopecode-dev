import { callN, toSrcs, type Cand } from "./h.ts";
const LOG = `const times = (): StateCell<readonly number[]> => state<readonly number[]>([]);\n`;
export const cands: Cand[] = [
  // rejected: an action uses now
  { name: "reject-now-in-action", src: LOG + `const recordClick = (times: State<readonly number[]>, now: Clock) => action(() => times.update((xs) => [...xs, now()]));` },
  // accepted: a click bumps a counter; a generator cell takes now and the counter and yields now() once per click; a listener stores it
  { name: "accept-click-stamps-listener", src: LOG + `const clicks = (): StateCell<number> => state(0);
const recordClick = (clicks: State<number>) => action(() => clicks.update((n) => n + 1));
const stamps = function* (now: Clock, clicks: number) {
  if (clicks > 0) yield now();
};
const store = (times: State<readonly number[]>) => action((t: number) => times.update((xs) => [...xs, t]));
const onStamp = (stamps: Events<number>, store: Action<[number]>) => on(stamps, store);
const view = (recordClick: Action<[]>, times: readonly number[]) => <div><button onClick={recordClick}>click</button><span>{times.length}</span></div>;`,
    drive: callN((p) => p.value("recordClick"), 3, ["clicks", "times"]) },
  // accepted: a canvas's pointer event carries t
  { name: "accept-canvas-pointer-t", src: LOG + `const record = (times: State<readonly number[]>) => action((p: PointerData) => times.update((xs) => [...xs, p.t]));
const view = (record: Action<[PointerData]>) => <canvas width={40} height={20} onPointerDown={record} />;`,
    drive: callN((p) => p.value("record"), 2, ["times"], [{ x: 1, y: 2, t: 123.5, id: 1, buttons: 1 }]) },
  // rejected: button has no onPointerDown
  { name: "reject-button-pointerdown", src: LOG + `const record = (times: State<readonly number[]>) => action((p: PointerData) => times.update((xs) => [...xs, p.t]));
const view = (record: Action<[PointerData]>) => <button onPointerDown={record}>x</button>;` },
  // the learner's form: clock generator into state, read in the click action
  { name: "accept-learner-clock-into-state", src: LOG + `const lastNow = (): StateCell<number> => state(0);
const clock = function* (now: Clock) { while (true) yield now(); };
const setNow = (lastNow: State<number>) => action((t: number) => lastNow.set(t));
const onClock = (clock: Events<number>, setNow: Action<[number]>) => on(clock, setNow);
const recordClick = (times: State<readonly number[]>, lastNow: State<number>) => action(() => { const t = read(lastNow); times.update((xs) => [...xs, t]); });`,
    drive: callN((p) => p.value("recordClick"), 2, ["lastNow", "times"]) },
];
// the click-stamps program again, three clicks in one turn with no frame between: the generator restarts on each click
// and the listener pulls once per frame, so how many stamps are stored?
const cs = cands.find((c) => c.name === "accept-click-stamps-listener")!;
cands.push({ ...cs, name: "click-stamps-three-clicks-no-frame-between", drive: async (p: any) => { const a = p.value("recordClick"); a(); a(); a(); await p.settle(400); return "called 3 times in one turn"; }, show: ["clicks", "times"] });
cands.push({ ...cands.find((c) => c.name === "accept-learner-clock-into-state")!, name: "learner-clock-three-clicks-no-frame-between", drive: async (p: any) => { const a = p.value("recordClick"); a(); a(); a(); await p.settle(400); return "called 3 times in one turn"; }, show: ["times"] });
export const srcs = toSrcs(cands);
