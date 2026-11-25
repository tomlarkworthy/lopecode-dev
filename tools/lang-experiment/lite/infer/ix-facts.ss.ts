// The facts the passes after the check read (lite/infer.ts Checker.facts, actionBodies, inActionUses, stateProps),
// folded from the log in the order the TypeScript writes them.

export const ixFactList = () => (log: IxFactLog | null): IxFact[] => {
  const out: Mut<IxFact[]> = [];
  for (let x = log; x !== null; x = x.next) out.push(x.f);
  out.reverse();
  return out;
};
export type IxBindingFacts = { readonly bindingOf: Map<number, number>; readonly bindings: Map<number, IxBinding> };
// bindingOf in insertion order; each binding as last written; the globals as scope 0 holds them
export const ixFoldBindings = () => (V: IxVars, fs: IxFact[]): IxBindingFacts => {
  const of: Mut<Map<number, number>> = new Map(), bs: Mut<Map<number, IxBinding>> = new Map();
  for (const b of V.values()) if (b.scope === 0) bs.set(b.id, b);
  for (const f of fs) {
    if (f.k === "binding") bs.set(f.b.id, f.b);
    else if (f.k === "bind") of.set(f.at, f.id);
  }
  return { bindingOf: of, bindings: bs };
};
export const IX_NO_CALL = (): IxCallFact => ({ sig: null, prelude: null, helper: null });
// a helper or prelude fact replaces the call's entry; a signature is merged into it
export const ixFoldCalls = (IX_NO_CALL) => (fs: IxFact[]): Map<number, IxCallFact> => {
  const out: Mut<Map<number, IxCallFact>> = new Map();
  for (const f of fs) {
    if (f.k === "helper") out.set(f.at, { ...IX_NO_CALL, helper: f.id });
    else if (f.k === "prelude") out.set(f.at, { ...IX_NO_CALL, prelude: f.name });
    else if (f.k === "sig") out.set(f.at, { ...(out.get(f.at) ?? IX_NO_CALL), sig: f.sig });
  }
  return out;
};
export const ixFoldFlags = () => (fs: IxFact[]): Map<number, Flags | null> => {
  const out: Mut<Map<number, Flags | null>> = new Map();
  for (const f of fs) if (f.k === "flags") out.set(f.at, f.flags);
  return out;
};
export type IxActionFacts = { readonly actionBodies: Set<number>; readonly inActionUses: IxUse[]; readonly stateProps: Set<number> };
// an in-action use is kept when its function was not an action body when the use was met
export const ixFoldActions = () => (fs: IxFact[]): IxActionFacts => {
  const bodies: Mut<Set<number>> = new Set(), props: Mut<Set<number>> = new Set(), uses: Mut<IxUse[]> = [];
  for (const f of fs) {
    if (f.k === "action") bodies.add(f.at);
    else if (f.k === "stateProp") props.add(f.at);
    else if (f.k === "use" && !bodies.has(f.fi)) uses.push({ fi: f.fi, at: f.at, rule: f.rule, msg: f.msg });
  }
  return { actionBodies: bodies, inActionUses: uses, stateProps: props };
};
export const ixFoldFacts = (ixFactList, ixFoldBindings, ixFoldCalls, ixFoldFlags, ixFoldActions) => (T: IxTypes, V: IxVars, log: IxFactLog | null): IxFacts => {
  const fs = ixFactList(log);
  const b = ixFoldBindings(V, fs), a = ixFoldActions(fs);
  return { ...a, types: new Map(T), bindingOf: b.bindingOf, bindings: b.bindings, calls: ixFoldCalls(fs), memberFlags: ixFoldFlags(fs) };
};
