// One shell instance over the variant named by SCHED_VARIANT (variants.ts NAMES; default copy). Same exports as cells.ts.
import { makeShell } from "./factory.ts";
import { pick } from "./variants.ts";
export { cellsOf, factsOf, type CellInfo } from "../../lite/facts.ts";
export const variant = process.env.SCHED_VARIANT ?? "copy";
export const { generatorish, guard, stepsRun, scheduler, isEvents, isListener, on, nameAction, running, liveEvents, pulling,
  events, setListenerOrder, listenerOrderChanged, listen, release, sweep } = makeShell(pick(variant));
