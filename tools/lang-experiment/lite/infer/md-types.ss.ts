// The data of the module check port (lite/core.ts checkSources as cells, prefix md): what the entry is given, the
// module's working tables, and the result. Checked with the ix and ow sections and the sections they take.

// a problem as checkSources reports it: a rule, a line and the message
export type MdErr = { readonly rule: string; readonly line: number; readonly msg: string };
export type MdStatus = "ok" | "rejected" | "unsupported" | "blocked";
// what the registry glue hands back: a report of onErr (rule) or onUnsup (rule "unsupported"), with its line
export type MdReport = { readonly rule: string; readonly line: number; readonly msg: string };
export type MdForeignValue = { readonly name: string; readonly marker: string | null; readonly line: number; readonly t: Ty };
export type MdForeign = { readonly reports: MdReport[]; readonly rest: { readonly kind: string; readonly line: number }[]; readonly values: MdForeignValue[] };
export type MdCompiled = { readonly res: IxCompile; readonly out: IxDiag[] };
// one cell's registry (ix-types IxReg), and the same with core.ts's compile hook, whose reports the glue puts back in
// the registry's report buffer
export type MdCellReg = { readonly ix: IxReg; readonly withHook: (hook: (e: AstNode, options: Ty | null) => MdCompiled) => IxReg };
// the registry as the module check calls it (core.ts). loadUser reads the declarations from the tree the check parsed;
// cell takes the start of the cell's function, so the glue knows which cell a report or a gap belongs to
export type MdReg = {
  readonly builtin: Set<string>;
  readonly loadForeign: (text: string) => MdForeign;
  readonly loadUser: (ast: Ast, jsx: boolean, clash: number[]) => MdReport[];
  readonly cell: (at: number) => MdCellReg;
  // an annotation converted with nothing reported or kept, an alias expanded once (core.ts shellFn)
  readonly peekType: (n: AstNode) => Ty;
  readonly ops: RegOps;
  readonly globals: { name: string; t: Ty; kind: IxKind }[];
  readonly allowed: Set<string>;
  // CAPABILITIES' names and types
  readonly capabilities: Map<string, string>;
  // t1 (2026-11-24): Object.prototype's own names, read when the checker loads (core.ts PROTO_MEMBERS); the names a
  // compiled cell takes from outside the module by name, a capability or a global (core.ts RESERVED_INPUTS)
  readonly proto: Set<string>;
  readonly inputs: Set<string>;
};
export type MdOutside = { readonly name: string; readonly view: boolean };
export type MdSources = {
  readonly cells: string; readonly tsx: boolean; readonly foreign: string | null; readonly shell: string | null;
  readonly name: string | null; readonly outside: MdOutside[]; readonly probe: IxProbeAsk | null;
  // d1 (2026-11-24): the prelude names a compiled cell of this module binds from the runtime module (none in it)
  readonly bound: string[];
};
export type MdBoundary = { readonly shape: TypeShape; readonly ref: boolean };
export type MdCellRec = {
  readonly name: string; readonly status: MdStatus; readonly line: number; readonly errors: MdErr[]; readonly unsupported: MdErr[];
  readonly blockedBy: string[]; readonly value: string | null;
  // the problems the cell's Checker held (ch.diags, ch.unsup), with their spans
  readonly ch: IxDiag[]; readonly chUnsup: IxDiag[];
  // e1 (2026-11-23): the shapes of the cell's cast calls, in source order
  readonly casts: TypeShape[];
  // y1 (2026-11-24): whether the cell's value type names a promise (md-value.ss.ts), once its value rules ran
  readonly promises?: boolean;
  // where the cell's function starts (the harness pairs the records with core.ts's Checkers by it)
  readonly at: number;
};
export type MdParamInfo = { readonly name: string; readonly refTyped: boolean; readonly eventsTyped: boolean; readonly boundary: MdBoundary | null };
// facts.ts CellInfo
export type MdInfo = {
  readonly name: string; readonly span: number[]; readonly params: MdParamInfo[]; readonly returnsRef: boolean;
  readonly generator: boolean; readonly compiles: IslandSpec[]; readonly casts: TypeShape[];
  // y1 (2026-11-24): the cell's value type names no promise, so the run time refuses one in it (null: not known)
  readonly strict: boolean | null;
};
// gap: what the port does not implement that this module met (its result is NOT COVERED)
export type MdResult = { readonly port: string; readonly file: string; readonly ok: boolean; readonly module: MdErr[]; readonly cells: MdCellRec[]; readonly facts: MdInfo[]; readonly gap: string | null; readonly probe: IxProbe | null };

// a cell of the module: its name (a stand-in for a name declared again), function and statement
export type MdDef = { readonly name: string; readonly fn: FnNode; readonly stmt: AstNode };
// a name declared again: its stand-in, the name and where it was declared again
export type MdDup = { readonly ph: string; readonly name: string; readonly pos: number };
// what every cell's check reads of the module
export type MdCtx = {
  readonly R: MdReg; readonly src: string; readonly count: number; readonly line: (pos: number) => number;
  readonly defs: MdDef[]; readonly byName: Map<string, MdDef>; readonly cellNames: Set<string>; readonly shellNames: Set<string>;
  readonly foreign: Map<string, MdForeignValue>; readonly outside: Map<string, MdOutside>; readonly takenAsEvents: Set<string>; readonly probe: IxProbeAsk | null;
  readonly bound: string[];
};
// the tables core.ts's cell loop writes and later cells read
export type MdTables = {
  value: Map<string, Ty | null>; refInner: Map<string, Ty>; eventsInner: Map<string, Ty>; listeners: Set<string>;
  stateful: Map<string, string>; fnFed: Map<string, string>; boundaries: Map<string, Map<string, MdBoundary>>;
  viewTypes: Map<string, { readonly ty: Ty; readonly cell: string }>; out: Map<string, MdCellRec>; probe: IxProbe | null;
};
export type MdMod = Mut<MdTables>;
// one cell's problems as they are collected: errors written straight to the record, and the Checker's two lists
export type MdLogs = { errors: MdErr[]; ch: IxDiag[]; chUnsup: IxDiag[]; blockedBy: string[] };
export type MdL = Mut<MdLogs>;
