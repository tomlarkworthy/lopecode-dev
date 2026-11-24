// the two listings the tutorial draws from files outside examples/: they exist beside tutorial.ojs
import { readFileSync } from "node:fs";
import { callN, toSrcs, type Cand } from "./h.ts";
const dir = new URL("../../../lite/soundscript/", import.meta.url).pathname;
export const cands: Cand[] = [
  { name: "tutorial-async.tsx", src: readFileSync(dir + "tutorial-async.tsx", "utf8"), drive: callN((p) => p.value("measureWord"), 1, ["measureAsked", "measured", "wordSize"]) },
];
export const srcs = toSrcs(cands);
