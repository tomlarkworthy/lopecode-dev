// small questions met while porting
export type AB = { type: "A"; a: number } | { type: "B"; b: string } | { type: "C" };
// a switch that misses case "C": TypeScript reports the missing return
export const nonExhaustive = () => (n: AB): number => {
  switch (n.type) {
    case "A": return n.a;
    case "B": return n.b.length;
  }
};
export type F = (x: number) => string;
export const throwCtx = (): F => (x) => { throw new Error("stub"); };
export const throwAnnot = () => (x: number): string => { throw new Error("stub"); };
