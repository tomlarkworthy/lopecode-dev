// uses: ast, types
// passing a Mut substitution to subst (typed Map) while the Mut is still written later
export const viaBorrow = (subst) => (t: Ty): Ty => {
  const m: Mut<Map<string, Ty>> = mut(new Map());
  const a = subst(t, borrow(m));
  m.set("T", a);
  return subst(t, borrow(m));
};
export const viaCopy = (subst) => (t: Ty): Ty => {
  const m: Mut<Map<string, Ty>> = mut(new Map());
  const a = subst(t, new Map(m));
  m.set("T", a);
  return subst(t, new Map(m));
};
