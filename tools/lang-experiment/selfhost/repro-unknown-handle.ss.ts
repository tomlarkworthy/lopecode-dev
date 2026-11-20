// Hole 3 (2026-11-20, closed): a State reached through unknown and narrowed by typeof/in allows u.set(5) outside an
// action, bypassing [state-write] (S6.5); an Action reached through unknown is called outside an action body,
// bypassing [action-call] (S6.6).
// bun selfhost/rt/check.ts selfhost/repro-unknown-handle.ss.ts
export const n = (): StateCell<number> => state(0);
export const bump = (n: State<number>) => action(() => n.update((x) => x + 1));
export const setViaUnknown = (n: State<number>) => {
  const u: unknown = n;
  if (typeof u === "object" && u !== null && "set" in u && typeof u.set === "function") u.set(5);
  return 1;
};
export const actionViaUnknown = (bump: Action<[]>) => {
  const u: unknown = bump;
  if (typeof u === "function") u();
  return 1;
};
export const actionViaParam = (bump: Action<[]>) => {
  const go = (u: unknown) => (typeof u === "function" ? u() : 0);
  go(bump);
  return 1;
};
