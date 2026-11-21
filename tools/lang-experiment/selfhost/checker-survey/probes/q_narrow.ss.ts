// narrowing questions met while porting (cellsOf)
export type A = { type: "A"; a: number };
export type B = { type: "B"; b: string };
export type C = { type: "C" | "D"; c: boolean };
export type U = A | B | C;
export const optChainNarrow = () => (d: U | null): number => (d?.type === "A" ? d.a : 0);
export const andNarrow = () => (d: U | null): number => (d && d.type === "A" ? d.a : 0);
export const multiLitNarrow = () => (d: U): boolean => (d.type === "D" ? d.c : false);
export const condNarrow = () => (st: U, inner: U | null): number => { const d = st.type === "B" ? inner : st; return d && d.type === "A" ? d.a : 0; };
export const regexIndex = () => (s: string): string => { const m = /a(b)/.exec(s); return m ? m[1] ?? "" : ""; };
