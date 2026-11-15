// bun horde/try-compile.ts : SoundScript's real compile (lite/stdlib/runtime.ts compiler(), read-only) on
// horde/cells.ts, island batchOnPool, run in-thread (no pool in bun). Prints what it does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ss from "../lite/stdlib/runtime.ts";
const src = readFileSync(join(import.meta.dir, "cells.ts"), "utf8");
const spec = { inputs: ["batch", "base", "frame", "flow", "neigh", "binned", "bullets", "player", "shock", "active"], refs: ["maze", "params"], outputs: ["nextAgents", "hits"] };
const verdicts = ss.check(src, true).cells.filter((c) => c.status !== "ok").map((c) => `${c.name}:${c.status}`);
console.log("check as compile runs it (tsx, default index mode): not ok =", verdicts.join(" ") || "none");
// the generated sim gives real maze, params and inputs; the compiled island's output must equal stepBatch's
const hordeSim = new Function(readFileSync(join(import.meta.dir, "proto/sim.gen.js"), "utf8") + "; return hordeSim")();
const sim = hordeSim(), M = sim.maze, P = sim.params;
try {
  const c = ss.compiler(() => src);
  const make = c.for("batchOnPool", { maze: M, params: P });
  const f = make(spec);
  console.log("compile returned", typeof f);
  const pl = new Float32Array([80.5, 50.5]);
  let agents = sim.initial(4096, 0);
  const flow = sim.flowOf(M, pl), bullets = new Float32Array([81, 50.5, 20, 0]), shock = new Float32Array([80.5, 50.5, 8, 20]);
  for (let fr = 0; fr < 30; fr++) agents = sim.stepBatch(agents, 0, fr, flow, sim.neighOf(M, [agents]), sim.binsOf(M, bullets), bullets, pl, shock, 4096, M, P).agents;
  const args = { batch: agents, base: 0, frame: 30, flow, neigh: sim.neighOf(M, [agents]), binned: sim.binsOf(M, bullets), bullets, player: pl, shock, active: 4096 };
  const want = sim.stepBatch(args.batch, 0, 30, flow, args.neigh, args.binned, bullets, pl, shock, 4096, M, P);
  const got: any = await f(args);
  const a = new Uint32Array(got.nextAgents.buffer), b = new Uint32Array(want.agents.buffer);
  let same = a.length === b.length;
  for (let i = 0; same && i < a.length; i++) if (a[i] !== b[i]) same = false;
  console.log(`compiled island run in-thread on 4096 agents: nextAgents ${same ? "bit-identical to" : "DIFFERS from"} stepBatch, hits ${got.hits.length / 3}`);
} catch (e) { console.log("compile threw:", (e as Error).message); }
