// The runtime's SoundScript cells, in runtime.ss.ts and events.ss.ts. This file links them for bun (link.ts); in the
// notebook they are compiled cells of @tomlarkworthy/soundscript-runtime.
import type { Elem } from "./jsx/h.ts";
import * as cells from "./runtime.ss.ts";
import * as eventCells from "./events.ss.ts";
import { link } from "./link.ts";
export type { Shape, PointerLike, Ptr, Place, Compiler, Data } from "./runtime.ss.ts";
export type { Delivery, DeliveryEvent, Effect } from "./events.ss.ts";

// a cell that uses mut or freeze takes the runtime module's own cell of that name, as in the notebook
const L = link({ ...cells, ...eventCells }, { mut: cells.mut(), freeze: cells.freeze() });
export const { newStore, mut, freeze, borrow, want, flat, ptr, DOM_EVENTS, PROPS, same, orderKeyed, rejected, compileFor } = L;
export const { emptyDelivery, step, handleAtKey, sweepCandidates, liveEventsCount, runningCount, pullingCount } = L;
// a SoundScript type has no type predicates; render.ts narrows with this
export const isElem = L.isElem as (x: unknown) => x is Elem;
// boundary.ts passes the copies it made, which are Data; it holds them as unknown
export const deepEqual = L.deepEqual as (a: unknown, b: unknown) => boolean;
