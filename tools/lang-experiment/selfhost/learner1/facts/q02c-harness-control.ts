// control for the drive-run.ts anomaly of q02-clock: no events cell, no listener; a counter, its action, a view that
// holds the action. Same drive (callN, 3 calls) under drive-run.ts and drive-rt.ts --both
import { callN, toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "control-counter-view-holds-action", src: `const clicks = (): StateCell<number> => state(0);
const recordClick = (clicks: State<number>) => action(() => clicks.update((n) => n + 1));
const view = (recordClick: Action<[]>, clicks: number) => <div><button onClick={recordClick}>click</button><span>{clicks}</span></div>;`,
    drive: callN((p) => p.value("recordClick"), 3, ["clicks"]) },
  { name: "control-counter-no-view", src: `const clicks = (): StateCell<number> => state(0);
const recordClick = (clicks: State<number>) => action(() => clicks.update((n) => n + 1));`,
    drive: callN((p) => p.value("recordClick"), 3, ["clicks"]) },
];
export const srcs = toSrcs(cands);
