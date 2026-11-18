// The checker's types are SoundScript cells, in types.ss.ts. This file links them for the TypeScript
// checker under bun (link.ts); in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.
import type { Ty, Named } from "./types.ss.ts";
import type { Node } from "./parse.ts";
import * as cells from "./types.ss.ts";
import { link } from "./link.ts";
export type { Flags, Param, Fn, Prop, Rec, Named, Ty, Subst } from "./types.ss.ts";

const L = link(cells);
export const {
  NUM, STR, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, ERR, SYMBOL, TRUE, FALSE, BOOL,
  lit, arr, named, rec, WRAPPERS, unwrap, propT, union, members, show, subst, hasTv, instantiate, widen, isPrimitive,
} = L;
// a SoundScript type has no type predicates (TypePredicate is unsupported); TypeScript callers narrow with this one
export const isNamed = L.isNamed as (t: Ty, n: string) => t is Named;
// tpNames reads two fields of a type parameter list node; the parser's Node type has only an index signature
export const tpNames = L.tpNames as unknown as (tp: Node | undefined) => string[];
