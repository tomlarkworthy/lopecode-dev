// The runtime's SoundScript cells, in runtime.ss.ts. This file links them for bun (link.ts); in the notebook they
// are compiled cells of @tomlarkworthy/soundscript-runtime.
import type { Elem } from "./jsx/h.ts";
import * as cells from "./runtime.ss.ts";
import { link } from "./link.ts";
export type { Shape, PointerLike, Ptr, Place, Compiler } from "./runtime.ss.ts";

const L = link(cells);
export const { newStore, mut, freeze, borrow, want, flat, ptr, DOM_EVENTS, PROPS, same, orderKeyed, rejected, compileFor } = L;
// a SoundScript type has no type predicates; render.ts and prelude.runtime.ts narrow with these
export const thenable = L.thenable as (r: unknown) => r is PromiseLike<unknown>;
export const isElem = L.isElem as (x: unknown) => x is Elem;
