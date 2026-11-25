// freeze-attack14 class 2 (S6.9): an action that uses a value that depends on state, by each route in q7.ts (receivers,
// callbacks, accumulators, helpers, forward reads, loops, implicit flow, catch, Maps, nested parameters named log or
// invalidation). actDrive: b called with c = 0, then a sets c = 1, then the latest b; DIFF when k differs
import { actDrive, type Cand } from "./lib14.ts";
import { srcs as q7 } from "./q7.ts";
const A = `const a = (c: State<number>) => action(() => c.set(1));\n`;
const R: Cand[] = q7.map(([n, s]) => ({ name: `s69-${n}`, src: A + s, show: ["c", "k"], drive: actDrive }));
R.push({ name: "s69-ctl-direct", ctl: true, src: A + q7.find(([n]) => n === "direct")![1], show: ["c", "k"], drive: actDrive });
R.push({ name: "s69-ctl-map-recv", ctl: true, src: A + q7.find(([n]) => n === "map-recv")![1], show: ["c", "k"], drive: actDrive });
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
