// The runtime's SoundScript cells, in runtime.ss.ts, events.ss.ts, store.ss.ts, render.ss.ts and cross.ss.ts, and the worker pool's, in
// pool.ss.ts. This file links them for bun (link.ts); in the notebook they are compiled cells of
// @tomlarkworthy/soundscript-runtime and, the pool's, of @tomlarkworthy/soundscript-workers.
import type { Elem } from "./jsx/h.ts";
import * as cells from "./runtime.ss.ts";
import * as eventCells from "./events.ss.ts";
import * as storeCells from "./store.ss.ts";
import * as renderCells from "./render.ss.ts";
import * as crossCells from "./cross.ss.ts";
import * as poolCells from "./pool.ss.ts";
import { link } from "./link.ts";
import { freeze, borrow, SsMap, SsSet, SsURL, out, deepFreeze, yielded, closure, methods } from "./freeze.ts";
export type { Shape, PointerLike, Ptr, Place, Compiler, Data } from "./runtime.ss.ts";
export type { Delivery, DeliveryEvent, Effect } from "./events.ss.ts";
export type { StoreState, StoreEvent, StoreEffect, StoreRecord, Seen } from "./store.ss.ts";
export type { Key, Props, Kid, Drawn, PropOp, ChildOp } from "./render.ss.ts";
export type { ValueSeen, Dispatch } from "./cross.ss.ts";
export type { PoolState, PoolEvent, PoolEffect, PoolResult } from "./pool.ss.ts";

// a cell that uses mut or freeze takes the runtime module's own cell of that name, as in the notebook
const L = link({ ...cells, ...eventCells, ...storeCells, ...renderCells, ...crossCells }, { mut: cells.mut(), freeze });
export { freeze, borrow, SsMap, SsSet, SsURL, out, deepFreeze, yielded, closure, methods };
export const { mut, want, flat, ptr, DOM_EVENTS, PROPS, same, orderKeyed, rejected, compileFor } = L;
export const { emptyDelivery, step, handleAtKey, sweepCandidates, liveEventsCount, runningCount, pullingCount } = L;
export const { emptyStore, storeStep, isIdle, committedOf, updateSees, readSees, refPlan } = L;
export const { drawnTag, propOps, childOps, keepsNode } = L;
export const { describeSeen, mismatchText, trimPath, tagDispatch, memberTakes, soleMembers, isSoleMiss, fnPlan, thrownText, primFits, propStep, elemShape, triesMember, unionMiss } = L;
// a SoundScript type has no type predicates; render.ts narrows with this
export const isElem = L.isElem as (x: unknown) => x is Elem;
// boundary.ts passes the copies it made, which are Data; it holds them as unknown
export const deepEqual = L.deepEqual as (a: unknown, b: unknown) => boolean;
// the pool's cells take only each other
export const { newPool, poolStep, answeredOf } = link(poolCells);
