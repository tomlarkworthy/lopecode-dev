// The registry's reports, its gap, the peek and trial bracket (Registry.peek, trial) and its fresh-name counter.

export const rgFreshCtl = () => (strict: boolean): RgCtl => ({
  mode: "keep", loud: false, peeks: 0, undo: null, log: null, strict, fresh: 0, gap: null, building: null, aliases: null,
});
// onErr / onUnsup as the handler in force sees them
export const rgReport = () => (Q: RgCtls, at: AstNode, rule: string, msg: string): void => {
  if (Q.mode === "keep") Q.log = { r: { start: at.start, end: at.end, line: at.line, rule, msg }, next: Q.log };
  else if (Q.mode === "loud") Q.loud = true;
};
export const rgUnsup = (rgReport, ERR) => (Q: RgCtls, at: AstNode, what: string): Ty => {
  rgReport(Q, at, "unsupported", what);
  return ERR;
};
// the port does not read this node as registry.ts does: the result is NOT COVERED, never a silent answer
export const rgGap = (ERR) => (Q: RgCtls, what: string): Ty => {
  if (Q.gap === null) Q.gap = what;
  return ERR;
};
// the reports since the last call, oldest first
export const rgTake = () => (Q: RgCtls): RgReport[] => {
  const out: Mut<RgReport[]> = mut([]);
  for (let x = Q.log; x !== null; x = x.next) out.unshift(x.r);
  Q.log = null;
  return freeze(out);
};
export const rgUndoPush = () => (Q: RgCtls, memo: "expand" | "iface", key: string): void => {
  if (Q.peeks > 0) Q.undo = { memo, key, n: (Q.undo?.n ?? 0) + 1, next: Q.undo };
};
export const rgPeekOpen = () => (Q: RgCtls): RgPeek => {
  const was: RgPeek = { mode: Q.mode, loud: Q.loud, peeks: Q.peeks, undo: Q.undo };
  Q.mode = "mute";
  Q.peeks += 1;
  return was;
};
// the memo entries the peek added go, the handlers in force before it come back
export const rgPeekClose = () => (E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, was: RgPeek): void => {
  const floor = was.undo?.n ?? 0;
  for (let u = Q.undo; u !== null && u.n > floor; u = u.next) {
    if (u.memo === "expand") E.delete(u.key);
    else I.delete(u.key);
  }
  Q.mode = was.mode;
  Q.loud = was.loud;
  Q.peeks = was.peeks;
  Q.undo = was.undo;
};
// t expanded with nothing kept: its expansion, or null when expanding it reports a problem
export const rgTrial = (rgPeekOpen, rgPeekClose) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, t: Ty): Ty | null => {
  const was = rgPeekOpen(Q);
  Q.mode = "loud";
  Q.loud = false;
  let e: Ty = t;
  try {
    e = G.expand(G, Y, E, I, Q, t);
  } catch (x) {
    rgPeekClose(E, I, Q, was);
    throw x;
  }
  const loud = Q.loud;
  rgPeekClose(E, I, Q, was);
  return loud ? null : e;
};
// RegOps.fresh: one counter per registry, as long-lived as the memo its names reach
export const rgFresh = () => (Q: RgCtls): number => {
  Q.fresh += 1;
  return Q.fresh;
};
