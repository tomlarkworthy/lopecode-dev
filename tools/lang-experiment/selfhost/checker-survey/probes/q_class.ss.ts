// the class and module-level let forms as written in infer.ts / registry.ts
export class Scope { vars = new Map<string, number>(); get(n: string): number | undefined { return this.vars.get(n); } }
let nextId = 0;
export const sideRecMut = () => (names: string[]): number => { const props: Mut<Record<string, number>> = mut({}); for (const n of names) props[n] = 1; return Object.keys(props).length; };
