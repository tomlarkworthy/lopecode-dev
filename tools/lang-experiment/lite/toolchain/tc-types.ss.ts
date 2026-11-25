// The data of the toolchain cells (prefix tc): ss-toolchain.ts, comment-types.ts, module-js.ts and erase.ts as cells.
// Checked with the acorn sections, the infer sections (md-facts) and tc-shell.ts as the shell.

// one Observable variable: what compileCell returns
export type TcVar = { readonly name: string; readonly inputs: string[]; readonly definition: string };
// a piece of a cell's body: text, a reference to an input (spelled as the input, or $k in the definition for a
// viewof), or an input listed at that point that writes no text
export type TcPart = { readonly k: "text"; readonly text: string } | { readonly k: "in"; readonly input: string } | { readonly k: "mention"; readonly input: string };
export type TcBuilt = { readonly text: string; readonly vars: TcVar[]; readonly key: string | null; readonly ref: boolean };
// replace source[from, to) with text
export type TcEdit = { readonly from: number; readonly to: number; readonly text: string };
export type TcToken = { readonly label: string; readonly start: number; readonly end: number };
// facts.ts CellInfo, the fields the compiler reads
export type TcBoundary = { readonly shape: unknown; readonly ref: boolean };
export type TcParam = { readonly name: string; readonly refTyped: boolean; readonly eventsTyped: boolean; readonly boundary: TcBoundary | null };
export type TcInfo = { readonly name: string; readonly params: TcParam[]; readonly returnsRef: boolean; readonly generator: boolean; readonly compiles: { readonly refs: string[] }[]; readonly casts: readonly unknown[]; readonly holes: readonly boolean[]; readonly strict: boolean | null };
// ss-toolchain.ts Context with its optional fields as null
export type TcCtx = {
  readonly generators: Set<string>; readonly events: Set<string>; readonly accepted: Set<string> | null;
  readonly facts: Map<string, TcInfo> | null; readonly why: Map<string, string[]> | null;
  readonly inputs: Map<string, string> | null; readonly module: string | null;
};
// the check result fields the context and the editor states read
export type TcCheckCell = { readonly name: string; readonly status: string; readonly errors: { readonly rule: string; readonly msg: string }[]; readonly unsupported: { readonly msg: string }[]; readonly blockedBy: string[] };
export type TcCheck = { readonly cells: TcCheckCell[]; readonly facts: Map<string, TcInfo> | null; readonly unparsed: Map<string, string> | null };
export type TcCellState = { readonly state: "ok" | "rejected" | "blocked"; readonly why: string[]; readonly blockedBy: string[] };
// a compiled definition, read once: its comments in definition coordinates, the header, and the call around the function
export type TcShape = "plain" | "apply" | "listen" | "ref" | "events" | "rejected";
export type TcHeader = { readonly d: string | null; readonly h: string | null; readonly t: string | null; readonly text: string };
export type TcCompiled = {
  readonly comments: AstComment[]; readonly header: TcHeader; readonly headerEnd: number;
  readonly fnEnd: number; readonly hasFn: boolean; readonly callee: TcShape | null; readonly name: string | null; readonly refs: string[];
};
export type TcKind = { readonly callee: TcShape; readonly kind: string | null; readonly refs: string[] };
export type TcModuleVar = { readonly pid: string; readonly name: string | null; readonly inputs: string[]; readonly definition: string };
export type TcModuleImport = { readonly from: string; readonly remote: string; readonly local: string };
export type TcObsVar = { readonly name: string | null; readonly inputs: string[]; readonly definition: string };
export type TcTranslated = { readonly text: string; readonly reason: null } | { readonly text: null; readonly reason: string };
// fnreg.ts closure registration: a node of the cell function's walk, a work item of freeIn (pat: the node is a binding
// pattern), an edit before its final position is taken, a function's start and captures, and the result
export type TcRegNode = { readonly n: AstNode; readonly parent: AstNode | null; readonly depth: number };
export type TcFreeItem = { readonly n: AstNode | null; readonly b: Set<string>; readonly pat: boolean };
export type TcRegEdit = { readonly at: number; readonly depth: number; readonly end: boolean; readonly text: string; readonly use: string | null };
export type TcRegHit = { readonly edits: TcRegEdit[] };
// open part 6 (HO): an index or length write (tc-reg.ss.ts tcHoleSites): the assignment or update, its target, its depth
export type TcHoleSite = { readonly n: AstNode; readonly t: AstNode; readonly depth: number };
export type TcRegNames = { readonly closure: string; readonly methods: string; readonly out?: string };
export type TcRegs = { readonly edits: TcEdit[]; readonly uses: string[] };
