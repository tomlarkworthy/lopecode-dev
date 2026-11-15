// bun horde/try-compile.ts : SoundScript's real compile (lite/stdlib/runtime.ts compiler(), read-only) on
// horde/cells.ts, island batchOnPool, run in-thread (no pool in bun). Prints what it does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ss from "../lite/stdlib/runtime.ts";
const src = readFileSync(join(import.meta.dir, "cells.ts"), "utf8");
const spec = { inputs: ["batch", "base", "frame", "flow", "crowd", "binned", "bullets", "player"], refs: ["maze", "params"], outputs: ["nextAgents", "hits"] };
const verdicts = ss.check(src, true).cells.filter((c) => c.status !== "ok").map((c) => `${c.name}:${c.status}`);
console.log("check as compile runs it (tsx, default index mode): not ok =", verdicts.join(" ") || "none");
try {
  const c = ss.compiler(() => src);
  const make = c.for("batchOnPool", { maze: null, params: null });
  const f = make(spec);
  console.log("compile returned", typeof f);
} catch (e) { console.log("compile threw:", (e as Error).message); }
