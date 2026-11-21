// complete.ts's member lists (membersOf, memberNames) and the names in scope (scopeNames), from the types the
// module check found at the placeholder.

// the placeholder identifier the checked copy of the cell has at the cursor
export const cpPH = () => "__ss_complete__";
// types whose members a cell may not read: handles and actions are used whole
export const CP_NO_MEMBERS = () => new Set(["Action", "StateCell", "Events", "Listener", "Compile"]);
// a declared interface's property names; Iterable and ArrayLike offer none
export const cpIfaceNames = () => (reg: CpReg, n: string): string[] => (n === "Iterable" || n === "ArrayLike" ? [] : reg.ifaceKeys(n) ?? []);
// memberNames: the names a value of type x has, before the read rules
export const cpMemberNames = (cpIfaceNames) => (reg: CpReg, x: Ty): string[] => {
  switch (x.k) {
    case "rec": return [...x.props.keys()];
    case "named": return cpIfaceNames(reg, x.n);
    case "arr": case "tup": return cpIfaceNames(reg, "Array");
    case "str": return cpIfaceNames(reg, "String");
    case "num": return cpIfaceNames(reg, "Number");
    case "lit": return cpIfaceNames(reg, typeof x.v === "string" ? "String" : typeof x.v === "number" ? "Number" : "Boolean");
    case "union": return x.ts.every((y) => y.k === "lit" && typeof y.v === "boolean") ? cpIfaceNames(reg, "Boolean") : [];
    default: return [];
  }
};
// kindOf: a member that can be called is a method
export const cpKindOf = () => (reg: CpReg, t: Ty): string => (reg.callSigs(t).length > 0 ? "method" : "property");
// the members one union member m offers: banned ones never, mutating ones only on a Mut receiver
export const cpOwnMembers = (cpMemberNames, cpKindOf, show, propT) => (reg: CpReg, m: Ty, x: Ty, onMut: boolean): Map<string, CpOption> => {
  const own: Mut<Map<string, CpOption>> = mut(new Map());
  for (const name of cpMemberNames(reg, x)) {
    const p = reg.member(m, name);
    if (p === undefined || p.flags?.banned === true || (p.flags?.mutates === true && !onMut)) continue;
    own.set(name, { label: name, type: cpKindOf(reg, p.t), detail: show(propT(p)) });
  }
  return freeze(own);
};
// membersOf: the members every member of t's union offers, by label; null when t has no members to offer
export const cpMembersOf = (cpOwnMembers, CP_NO_MEMBERS, members, isNamed) => (reg: CpReg, t: Ty): CpOption[] | null => {
  const ms = members(reg.expand(t)).filter((m) => m.k !== "null" && m.k !== "undef" && m.k !== "void");
  if (ms.length === 0) return null;
  let common: Map<string, CpOption> | null = null;
  for (const m of ms) {
    if (m.k === "err" || m.k === "unknown" || m.k === "tv") return null;
    const onMut = isNamed(m, "Mut");
    const inner = m.k === "named" && (m.n === "Mut" || m.n === "Borrowed") ? m.args[0] ?? m : m;
    const x = reg.expand(inner);
    if (x.k === "named" && CP_NO_MEMBERS.has(x.n)) return [];
    const own: Map<string, CpOption> = cpOwnMembers(reg, m, x, onMut);
    common = common === null ? own : new Map([...common].filter(([k]) => own.has(k)));
  }
  return [...(common ?? new Map<string, CpOption>()).values()].toSorted((a, b) => a.label.localeCompare(b.label));
};
// scopeNames: the bindings in scope at the placeholder; read only inside an action body, the one place it is legal
export const cpScopeNames = (cpPH, show) => (reg: CpReg, names: IxScopeName[], inAction: boolean): CpOption[] => {
  const out: Mut<CpOption[]> = mut([]);
  for (const b of names) {
    const name = b.name, kind = b.kind;
    if (name === cpPH) continue;
    if (kind === "prelude") {
      if (name !== "read" || inAction) out.push({ label: name, type: "function", detail: name === "read" ? "prelude: a state cell's value inside an action" : "prelude" });
      continue;
    }
    const calls = reg.callSigs(b.t).length > 0;
    const type = kind === "global" ? (calls ? "function" : "namespace") : kind === "fn" || calls ? "function" : "variable";
    out.push({ label: name, type, detail: kind === "global" ? "intrinsic" : show(b.t) });
  }
  return freeze(out);
};
