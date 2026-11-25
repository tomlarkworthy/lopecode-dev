// The cells of lite/infer (ix: the type check of one cell, ow: ownership and captures, md: the module check, rg: the
// registry of declarations over the typed tree, cp: completion and cell facts), linked for bun (link.ts) with the cells of other sections they take;
// in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.
import "./infer/ix-types.ss.ts";
import * as core from "./infer/ix-core.ss.ts";
import * as hides from "./infer/ix-hides.ss.ts";
import * as expr from "./infer/ix-expr.ss.ts";
import * as ops from "./infer/ix-ops.ss.ts";
import * as cond from "./infer/ix-cond.ss.ts";
import * as fn from "./infer/ix-fn.ss.ts";
import * as stmt from "./infer/ix-stmt.ss.ts";
import * as flow from "./infer/ix-flow.ss.ts";
import * as lit from "./infer/ix-lit.ss.ts";
import * as call from "./infer/ix-call.ss.ts";
import * as apply from "./infer/ix-apply.ss.ts";
import * as preludeCells from "./infer/ix-prelude.ss.ts";
import * as jsx from "./infer/ix-jsx.ss.ts";
import * as entry from "./infer/ix-entry.ss.ts";
import * as facts from "./infer/ix-facts.ss.ts";
import "./infer/ow-types.ss.ts";
import * as owTree from "./infer/ow-tree.ss.ts";
import * as owCapture from "./infer/ow-capture.ss.ts";
import * as owPlace from "./infer/ow-place.ss.ts";
import * as owFlow from "./infer/ow-flow.ss.ts";
import * as owStmt from "./infer/ow-stmt.ss.ts";
import * as owLoop from "./infer/ow-loop.ss.ts";
import * as owAction from "./infer/ow-action.ss.ts";
import * as owTaint from "./infer/ow-taint.ss.ts";
import * as owOpaque from "./infer/ow-opaque.ss.ts";
import * as owLate from "./infer/ow-late.ss.ts";
import * as owEntry from "./infer/ow-entry.ss.ts";
import "./infer/md-types.ss.ts";
import * as mdShape from "./infer/md-shape.ss.ts";
import * as mdGraph from "./infer/md-graph.ss.ts";
import * as mdInject from "./infer/md-inject.ss.ts";
import * as mdTaint from "./infer/md-taint.ss.ts";
import * as mdCompile from "./infer/md-compile.ss.ts";
import * as mdValue from "./infer/md-value.ss.ts";
import * as mdRun from "./infer/md-run.ss.ts";
import * as mdCell from "./infer/md-cell.ss.ts";
import * as mdFacts from "./infer/md-facts.ss.ts";
import * as mdEntry from "./infer/md-entry.ss.ts";
import "./infer/rg-types.ss.ts";
import * as rgCtl from "./infer/rg-ctl.ss.ts";
import * as rgConvertCells from "./infer/rg-convert.ss.ts";
import * as rgSigCells from "./infer/rg-sig.ss.ts";
import * as rgExpandCells from "./infer/rg-expand.ss.ts";
import * as rgLoadCells from "./infer/rg-load.ss.ts";
import * as rgView from "./infer/rg-view.ss.ts";
import "./infer/cp-types.ss.ts";
import * as cpText from "./infer/cp-text.ss.ts";
import * as cpMembers from "./infer/cp-members.ss.ts";
import * as cpModes from "./infer/cp-modes.ss.ts";
import * as cpParam from "./infer/cp-param.ss.ts";
import * as cpFacts from "./infer/cp-facts.ss.ts";
import { linkShape } from "./shape-ss.ts";
import { link } from "./link.ts";
import * as T from "./types.ts";
import { linkAcorn } from "./acorn/index.ts";
import * as prelude from "../prelude.runtime.ts";
export type * from "./infer/ix-types.ss.ts";
export type * from "./infer/md-types.ss.ts";
export type * from "./infer/rg-types.ss.ts";
export type * from "./infer/cp-types.ss.ts";

// file names in lite/infer
export const IX_FILES = ["types", "core", "hides", "expr", "ops", "cond", "fn", "stmt", "flow", "lit", "call", "apply", "prelude", "jsx", "entry", "facts"].map((x) => `ix-${x}.ss.ts`);
export const OW_FILES = ["types", "tree", "capture", "place", "flow", "stmt", "loop", "action", "taint", "opaque", "late", "entry"].map((x) => `ow-${x}.ss.ts`);
export const MD_FILES = ["types", "shape", "graph", "inject", "taint", "compile", "value", "run", "cell", "facts", "entry"].map((x) => `md-${x}.ss.ts`);
export const CP_FILES = ["types", "text", "members", "modes", "param", "facts"].map((x) => `cp-${x}.ss.ts`);
export const RG_FILES = ["types", "ctl", "convert", "sig", "expand", "load", "view"].map((x) => `rg-${x}.ss.ts`);
export const OW_CELLS = { ...owTree, ...owCapture, ...owPlace, ...owFlow, ...owStmt, ...owLoop, ...owAction, ...owTaint, ...owOpaque, ...owLate, ...owEntry };
export const IX_CELLS = { ...core, ...hides, ...expr, ...ops, ...cond, ...fn, ...stmt, ...flow, ...lit, ...call, ...apply, ...preludeCells, ...jsx, ...entry, ...facts, ...OW_CELLS };
export const CP_CELLS = { ...cpText, ...cpMembers, ...cpModes, ...cpParam, ...cpFacts };
export const RG_CELLS = { ...rgCtl, ...rgConvertCells, ...rgSigCells, ...rgExpandCells, ...rgLoadCells, ...rgView };
export const MD_CELLS = { ...mdShape, ...mdGraph, ...mdInject, ...mdTaint, ...mdCompile, ...mdValue, ...mdRun, ...mdCell, ...mdFacts, ...mdEntry };
const A = linkAcorn();
const GIVEN = {
  NUM: T.NUM, STR: T.STR, BIGINT: T.BIGINT, NULL: T.NULL, UNDEF: T.UNDEF, VOID: T.VOID, NEVER: T.NEVER, UNKNOWN: T.UNKNOWN,
  OBJECT: T.OBJECT, ERR: T.ERR, SYMBOL: T.SYMBOL, BOOL: T.BOOL, lit: T.lit, arr: T.arr, named: T.named, unwrap: T.unwrap,
  propT: T.propT, union: T.union, members: T.members, show: T.show, subst: T.subst, hasTv: T.hasTv, instantiate: T.instantiate,
  widen: T.widen, typeKey: T.typeKey, inexact: T.inexact, isPrimitive: T.isPrimitive, isNamed: T.isNamed, kidsOf: A.kidsOf, nodeKind: A.nodeKind, isFnNode: A.isFnNode, childrenOf: A.childrenOf, TYPE_FIELDS: A.TYPE_FIELDS,
  WRAPPERS: T.WRAPPERS, builtinNamesOf: T.builtinNamesOf, leadingComments: A.leadingComments, UNDEF_FIX: T.UNDEF_FIX, shapeAt: linkShape().shapeAt, forgotWith: T.forgotWith, extraParamsWith: T.extraParamsWith, jsonGapWith: T.jsonGapWith, plainWith: T.plainWith,
};
// the cells of other sections the md cells take
export const MD_GIVEN = {
  ...GIVEN, parseTree: A.parseTree, nameAt: A.nameAt, standIn: A.standIn, moduleShape: A.moduleShape, syntaxBans: A.syntaxBans, mutPlaces: A.mutPlaces, lineAt: A.lineAt,
  hasErrWith: T.hasErrWith, uncloneableWith: T.uncloneableWith, admitsUndefinedWith: T.admitsUndefinedWith, holdsWith: T.holdsWith, islandWith: T.islandWith,
  reservedName: T.reservedName, RESERVED_MSG: T.RESERVED_MSG, reservedCellName: T.reservedCellName, RESERVED_CELL_MSG: T.RESERVED_CELL_MSG, reservedText: T.reservedText, RESERVED_TEXT_MSG: T.RESERVED_TEXT_MSG, captureMessage: T.captureMessage, boundaryShapeAt: linkShape().boundaryShapeAt,
};
// over: cells in place of the port's (lite/infer/diff.ts's controls); given: values in place of other sections' cells
export const linkIx = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...IX_CELLS, ...over } as typeof IX_CELLS, prelude, GIVEN);
export const linkMd = (over: Record<string, (...inputs: never[]) => unknown> = {}, given: Record<string, unknown> = {}) =>
  link({ ...IX_CELLS, ...MD_CELLS, ...over } as typeof IX_CELLS & typeof MD_CELLS, prelude, { ...MD_GIVEN, ...given });
// the registry cells (over: lite/infer/rg-diff.ts's controls)
export const linkRg = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...RG_CELLS, ...over } as typeof RG_CELLS, prelude, GIVEN);
// the completion and facts cells, with the ix and md cells they take (over: lite/infer/cp-diff.ts's controls)
export const linkCp = (over: Record<string, (...inputs: never[]) => unknown> = {}) =>
  link({ ...IX_CELLS, ...MD_CELLS, ...CP_CELLS, ...over } as typeof IX_CELLS & typeof MD_CELLS & typeof CP_CELLS, prelude, MD_GIVEN);
export const { mdCheckSources, ixHidden, ixActionIn, owIter, mdProtoMembers, PROTO_MEMBER_MSG } = linkMd();
export const { cpCompletionsAt, cpMembersOf, cpAnnotationOf, cpAddParameter, cpTypeNames, cpPH, cpCellsOf, cpGlobalRefs, mdFactsOf, mdPreludeCalls } = linkCp();
export const {
  rgFreshCtl, rgConvert, rgExpand, rgIfaceRec, rgSig, rgLiteral, rgQuietGo, rgSub, rgFresh, rgPeekOpen, rgPeekClose, rgLoad, rgTake,
  rgIsTypedArray, rgOriginOf, rgHasTypeQuery, rgBuiltin, rgGlobals, rgRestOf, rgForeignValues, rgSkip, rgPeekType, rgMayHide,
} = linkRg();
