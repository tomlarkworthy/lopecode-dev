// The data of the registry port (lite/registry.ts as cells over the typed tree, prefix rg): the declarations a load
// builds, the memos and the report log the module check owns, and the knot. Checked with ../types.ss.ts,
// ../subtype.ss.ts and the acorn sections.

export type RgOrigin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
// a declared type name: an alias or an interface (its declarations of one origin merged), its type parameters, its parse
export type RgDecl = { readonly kind: "alias" | "iface"; readonly tps: string[]; readonly nodes: AstNode[]; readonly origin: RgOrigin; readonly ast: Ast };
export type RgValue = { readonly t: Ty; readonly origin: RgOrigin; readonly node: AstNode; readonly marker: "pure" | "effect" | null; readonly flags: Flags | null };
// what onErr or onUnsup received, at a node of some parse
export type RgReport = { readonly start: number; readonly end: number; readonly line: number; readonly rule: string; readonly msg: string };
export type RgLog = { readonly r: RgReport; readonly next: RgLog | null };
// a memo entry added while a peek runs, removed when it ends; n counts the entries
export type RgUndo = { readonly memo: "expand" | "iface"; readonly key: string; readonly n: number; readonly next: RgUndo | null };
// interfaces being built, innermost first; an expansion memo key that holds one of them (Registry keeps one object)
export type RgNames = { readonly name: string; readonly next: RgNames | null };
export type RgAlias = { readonly name: string; readonly key: string; readonly next: RgAlias | null };
// mode: keep reports, drop them (peek), or only note that one came (trial)
export type RgCtl = {
  mode: "keep" | "mute" | "loud"; loud: boolean; peeks: number; undo: RgUndo | null; log: RgLog | null;
  strict: boolean; fresh: number; gap: string | null; building: RgNames | null; aliases: RgAlias | null;
};
export type RgPeek = { readonly mode: "keep" | "mute" | "loud"; readonly loud: boolean; readonly peeks: number; readonly undo: RgUndo | null };
// TypeCtx with the parse and origin convert takes: the type parameters in scope, the typeof lookup
export type RgCtx = { readonly tps: Set<string>; readonly look: Map<string, Ty> | null; readonly ast: Ast; readonly origin: RgOrigin };
// interface bookkeeping while its declarations are merged
export type RgAcc = { readonly index: Ty | undefined; readonly calls: Fn[] | undefined; readonly ctors: Fn[] | undefined };
export type RgParamOut = { readonly k: "param"; readonly p: Param } | { readonly k: "rest"; readonly t: Ty } | { readonly k: "none" };

// the declarations (written by a load only), the expansion and interface memos, quiet's keys, the control record
export type RgTypes = Mut<Map<string, RgDecl>>;
export type RgValues = Mut<Map<string, RgValue>>;
export type RgExpandMemo = Mut<Map<string, Ty>>;
export type RgIfaceMemo = Mut<Map<string, Rec>>;
export type RgQuietKeys = Mut<Set<string>>;
export type RgCtls = Mut<RgCtl>;

// the recursive entry points; isAlias, memberOf, subOps and at are the subtype cells bound to these tables (rg-index.ts)
export type RgK = {
  readonly convert: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, c: RgCtx) => Ty;
  readonly expand: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, t: Ty) => Ty;
  readonly ifaceRec: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, name: string) => Rec;
  readonly sig: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, params: AstNode[], ret: AstNode | null, tp: AstNode | null, c: RgCtx, flags: Flags | null) => Fn;
  readonly literal: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, ms: AstNode[], c: RgCtx) => Rec;
  readonly quietGo: (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, K: RgQuietKeys, S: Mut<Set<string>>, x: Ty) => boolean;
  readonly isAlias: (n: string) => boolean;
  readonly memberOf: (s: Ty, t: Ty) => boolean;
  readonly subOps: (s: Ty, t: Ty, seen: Mut<Set<string>>) => boolean;
  readonly at: (ts: Ty[], i: number) => Ty;
};
// the kinds of binding a cell's globals take (ix-types IxKind)
export type RgKind = "prelude" | "global";
