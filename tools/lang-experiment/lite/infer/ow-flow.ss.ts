// The flow check (lite/own.ts flowCheck): no use of a Mut after freeze, no use of a Borrowed (or of an async
// function's loaned Mut) after an await or a yield. A state is the set of bindings used up so far; loops run to a
// fixpoint; a call of a helper uses every Mut it captures.

export const owUnion = () => (a: OwSt, b: Iterable<number>): OwSt => new Set([...a, ...b]);
export const owJoin = (owUnion) => (ss: (OwSt | null)[]): OwSt | null => {
  let out: OwSt | null = null;
  for (const s of ss) if (s !== null) out = out === null ? s : owUnion(out, s);
  return out;
};
// inside a try block every state met is one the handler may start from
export const owSeen = (owUnion) => (X: OwX, st: OwSt): void => {
  const acc = X.acc;
  if (acc !== null) X.acc = owUnion(acc, st);
};
