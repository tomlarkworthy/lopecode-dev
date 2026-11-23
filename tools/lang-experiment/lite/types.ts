// The checker's SoundScript cells, in types.ss.ts, subtype.ss.ts, walks.ss.ts, messages.ss.ts and island.ss.ts. This file links them for the TypeScript
// checker under bun (link.ts); in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.
import type { Ty, Named } from "./types.ss.ts";
import type { Node } from "./parse.ts";
import * as cells from "./types.ss.ts";
import * as subtypeCells from "./subtype.ss.ts";
import * as walkCells from "./walks.ss.ts";
import * as messageCells from "./messages.ss.ts";
import * as islandCells from "./island.ss.ts";
import { link } from "./link.ts";
import * as prelude from "../prelude.runtime.ts";
export type { Flags, Param, Fn, Prop, Rec, Named, Ty, Subst } from "./types.ss.ts";
export type { IslandCell, IslandSpec, Island } from "./island.ss.ts";
export type { RegOps, DeclOps, DeclInfo, Sub, FnSub, Unify } from "./subtype.ss.ts";

const L = link({ ...cells, ...subtypeCells, ...walkCells, ...messageCells, ...islandCells }, prelude);
export const {
  NUM, STR, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, ERR, SYMBOL, TRUE, FALSE, BOOL,
  lit, arr, named, rec, WRAPPERS, unwrap, propT, union, members, show, subst, hasTv, instantiate, widen, isPrimitive, typeKey, inexact,
} = L;
export const { builtinNamesOf, isAliasWith, memberWith, callSigsWith, iterElemWith, subWith, memberOfWith, unifyWith, hasAnyTv } = L;
export const { uncloneableWith, cloneProblemWith, admitsUndefinedWith, holdsWith, hasErrWith } = L;
export const { islandWith } = L;
export const { viewofInputName, reservedName, RESERVED_MSG, reservedCellName, RESERVED_CELL_MSG, captureMessage, banMessage, UNDEF_FIX } = L;
// a SoundScript type has no type predicates (TypePredicate is unsupported); TypeScript callers narrow with this one
export const isNamed = L.isNamed as (t: Ty, n: string) => t is Named;
// tpNames reads two fields of a type parameter list node; the parser's Node type has only an index signature
export const tpNames = L.tpNames as unknown as (tp: Node | undefined) => string[];
