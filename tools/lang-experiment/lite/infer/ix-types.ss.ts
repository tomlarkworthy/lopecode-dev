// The data of the type inference port (lite/infer.ts Checker as cells, prefix ix): its working tables, the
// environment, the registry view and the knot. Checked with ../types.ss.ts, ../subtype.ss.ts and the acorn sections.

// a diagnostic at a node's span; unsupported items keep rule "unsupported" in their own log
export type IxDiag = { readonly start: number; readonly end: number; readonly rule: string; readonly msg: string };
// a persistent log, newest first, with its length
export type IxLog = { readonly d: IxDiag; readonly n: number; readonly next: IxLog | null };
// the scope ids enclosing a scope, innermost first (Scope.parent)
export type IxChain = { readonly id: number; readonly up: IxChain | null };
export type IxKind = "const" | "let" | "param" | "fn" | "global" | "prelude";
// what a read of a binding with no type yet does (Binding.lazy): report, or check its hoisted declaration
export type IxLazy = { k: "none" } | { k: "unsup"; at: AstNode } | { k: "hoist"; fn: AstNode; env: IxEnv; busy: boolean };
// fi: the nid of the function declaring it (Binding.fi.node); fnNode: the nid of the function it names; -1 for none
export type IxBinding = {
  id: number; scope: number; name: string; t: Ty; kind: IxKind; nid: number; fi: number; fnNode: number;
  mutOwned: boolean; assigned: boolean; cellParam: boolean; checked: boolean; lazy: IxLazy;
};
// FnInfo without its lists (rets and yields live in IxCtl while the function is checked)
export type IxFnCtx = {
  fid: number; parent: IxFnCtx | null; isAsync: boolean; isGen: boolean; isCell: boolean; inAction: boolean;
  retCtx: Ty | null; retFromCtx: boolean; yieldCtx: Ty | null; tps: string[];
};
// Env without its flow: the flow of the environment in use is IxCtl.cur
export type IxEnv = { scope: number; up: IxChain | null; fi: IxFnCtx; dead: boolean };
export type IxFlow = Map<string, Ty>;
// a condition's two flows, by flow id
export type IxCond = { t: number; f: number };
// the flows at the breaks of each enclosing switch (null for a loop), innermost first
export type IxBreaks = { readonly exits: number[] | null; readonly next: IxBreaks | null };
export type IxCtl = {
  cur: number; nextFlow: number; diags: IxLog | null; unsup: IxLog | null; rets: Ty[]; yields: Ty[];
  quiet: number; nextId: number; nextScope: number; nextNid: number; fresh: number;
  short: Set<number>; clones: Set<number>; breaks: IxBreaks | null; flagsAt: number; flags: Flags | undefined;
  gap: string | null; facts: IxFactLog | null;
};
// a write the TypeScript Checker makes to facts, actionBodies, inActionUses or stateProps, which the passes after it read
export type IxFact =
  | { readonly k: "binding"; readonly b: IxBinding }
  | { readonly k: "bind"; readonly at: number; readonly id: number }
  | { readonly k: "helper"; readonly at: number; readonly id: number }
  | { readonly k: "sig"; readonly at: number; readonly sig: Fn }
  | { readonly k: "prelude"; readonly at: number; readonly name: string }
  | { readonly k: "flags"; readonly at: number; readonly flags: Flags | null }
  | { readonly k: "action"; readonly at: number }
  | { readonly k: "use"; readonly fi: number; readonly at: number; readonly rule: string; readonly msg: string }
  | { readonly k: "stateProp"; readonly at: number };
export type IxFactLog = { readonly f: IxFact; readonly next: IxFactLog | null };
// CallFact: each field null when the TypeScript leaves it unset
export type IxCallFact = { readonly sig: Fn | null; readonly prelude: string | null; readonly helper: number | null };
export type IxUse = { readonly fi: number; readonly at: number; readonly rule: string; readonly msg: string };
// the facts as plain data, keyed by nid, bindings by id (Checker.facts without fnInfo, which nothing reads)
export type IxFacts = {
  readonly types: Map<number, Ty>; readonly bindingOf: Map<number, number>; readonly bindings: Map<number, IxBinding>;
  readonly calls: Map<number, IxCallFact>; readonly memberFlags: Map<number, Flags | null>;
  readonly actionBodies: Set<number>; readonly inActionUses: IxUse[]; readonly stateProps: Set<number>;
};
// the expression types by nid, the bindings by "<scope>:<name>", the flows by id, the rest
export type IxTypes = Mut<Map<number, Ty>>;
export type IxVars = Mut<Map<string, IxBinding>>;
export type IxFlows = Mut<Map<number, IxFlow>>;
export type IxCtls = Mut<IxCtl>;

// lite/registry.ts as the port calls it; quiet: the same functions, each inside Registry.peek; lax: strictIndex off
export type IxRegCore = {
  readonly isAlias: (n: string) => boolean;
  readonly expand: (t: Ty) => Ty;
  readonly member: (t: Ty, k: string) => Prop | undefined;
  readonly sub: (a: Ty, b: Ty) => boolean;
  readonly callSigs: (t: Ty) => Fn[];
  readonly iterElem: (t: Ty) => Ty | undefined;
  readonly unify: (p: Ty, a: Ty, m: Mut<Map<string, Ty>>, tvs: Set<string>) => void;
  readonly isTypedArray: (t: Ty) => boolean;
};
export type IxReg = {
  readonly isAlias: (n: string) => boolean;
  readonly expand: (t: Ty) => Ty;
  readonly member: (t: Ty, k: string) => Prop | undefined;
  readonly sub: (a: Ty, b: Ty) => boolean;
  readonly callSigs: (t: Ty) => Fn[];
  readonly iterElem: (t: Ty) => Ty | undefined;
  readonly unify: (p: Ty, a: Ty, m: Mut<Map<string, Ty>>, tvs: Set<string>) => void;
  readonly isTypedArray: (t: Ty) => boolean;
  readonly quiet: IxRegCore;
  readonly lax: IxRegCore;
  readonly strictIndex: boolean;
  readonly same: (a: Ty, b: Ty) => boolean;
  readonly origin: (n: string) => string | null;
  readonly convert: (n: AstNode, tps: string[], look: Map<string, Ty> | null) => Ty;
  readonly sig: (params: AstNode[], ret: AstNode, tps: string[], look: Map<string, Ty> | null) => Fn;
  readonly hasTypeQuery: (n: AstNode) => boolean;
  readonly cloneProblem: (t: Ty) => string | null;
  // what the registry reported since the last call, in order
  readonly drain: () => IxDiag[];
  // core.ts's compile hook, run until it asks for the type of the options expression, then again with it
  readonly compile: ((e: AstNode, options: Ty | null) => IxCompile) | null;
};
export type IxCompile = { k: "options"; at: AstNode } | { k: "done"; t: Ty };
// what one cell's check is given
export type IxInput = {
  fn: AstNode; injected: Ty[]; src: string; count: number; cellNames: Set<string>; allowed: Set<string>;
  globals: { name: string; t: Ty; kind: IxKind }[];
};
export type IxOutput = { fn: Ty; diags: IxDiag[]; unsup: IxDiag[]; gap: string | null; facts: IxFacts };

// the recursive entry points and the per-check constants every method reads
export type IxK = {
  readonly reg: IxReg; readonly src: string; readonly cellNames: Set<string>; readonly allowed: Set<string>;
  readonly infer: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode) => Ty;
  readonly check: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null, soft: boolean, ctx: boolean) => Ty;
  readonly cond: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode) => IxCond;
  readonly stmt: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode) => boolean;
  readonly fnExpr: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv | null, e: AstNode, expected: Ty | null, injected: Ty[] | null) => Ty;
  readonly call: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null) => Ty;
  readonly bind: (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: AstNode, t: Ty, kind: IxKind, extra: IxExtra) => void;
};
// Partial<Binding> as bindPattern passes it on
export type IxExtra = { assigned: boolean; cellParam: boolean };
