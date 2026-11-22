// The data of the ownership port (lite/own.ts ownership, actionEscapes and iterIn as cells, prefix ow), read from
// the facts of the inference port (ix-facts.ss.ts).

// the cell's tree as own.ts walks it: parse.ts kids order; refs: each binding's references, bindings in the order met
export type OwTree = {
  readonly fn: AstNode; readonly parent: Map<number, AstNode>; readonly byNid: Map<number, AstNode>;
  readonly all: AstNode[]; readonly fns: AstNode[]; readonly refs: Map<number, AstNode[]>; readonly other: string | null;
};
export type OwCtx = { readonly T: OwTree; readonly F: IxFacts; readonly R: IxRegCore };
// own.ts err: the first report of a rule at a start position is kept
export type OwLog = { errs: IxLog | null; seen: Set<string>; unsup: IxLog | null };
export type OwW = Mut<OwLog>;
// per function: the Mut and Borrowed bindings it captures, those of them it writes, the let and param bindings it
// assigns, the helpers it calls
export type OwCap = { readonly mut: number[]; readonly wmut: number[]; readonly let: number[]; readonly read: number[]; readonly calls: number[] };
export type OwCaps = Mut<Map<number, OwCap>>;
export type OwKind = "mut" | "borrowed" | "view";

// ---- the flow check ----
// the bindings used up by a freeze, an await or a yield on the way to a point
export type OwSt = Set<number>;
// the enclosing loops and switches, innermost first: what reaches their breaks and continues
export type OwLoops = { readonly breaks: OwSt[]; readonly conts: OwSt[]; readonly isSwitch: boolean; readonly next: OwLoops | null };
// acc: inside a try block, the union of every state met (own.ts tryAcc)
export type OwFlowCtl = { loops: OwLoops | null; acc: OwSt | null };
export type OwX = Mut<OwFlowCtl>;
export type OwFlowFn = { readonly f: AstNode; readonly tracked: OwSt; readonly loaned: OwSt; readonly borrowed: number[]; readonly caps: Map<number, OwCap> };
export type OwK = {
  readonly expr: (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, n: AstNode, st: OwSt) => OwSt;
  readonly stmt: (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: AstNode, st: OwSt) => OwSt | null;
};
export type OwOutput = { diags: IxDiag[]; actions: IxDiag[]; unsup: IxDiag[]; gap: string | null };
