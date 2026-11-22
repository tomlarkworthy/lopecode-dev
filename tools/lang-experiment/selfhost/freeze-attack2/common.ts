export const W = "for (let i = 0; i < 300; i++) await null; ";
export const D = "const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; }; ";
export const C = "\nconst c = (a: () => Mut<number[]>) => { a().push(1); return 0; };";
export const B = (t: string) => `\nconst b = (a: ${t}) => ({ v: a });`;
export const callW = (p: any) => { p.value("w")(); };
export type Attack = { name: string; src: string; show?: string[]; drive?: (p: any) => unknown };
export const A = (name: string, src: string, show: string[] = [], drive?: (p: any) => unknown): Attack => ({ name, src, show, drive });
