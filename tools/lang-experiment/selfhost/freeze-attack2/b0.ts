const A = (name: string, src: string, show: string[] = [], drive?: (p: any) => unknown) => ({ name, src, show, drive });
export const attacks = [
  A("s0-closure", "const a = () => { const xs = [0]; return () => xs.length; };\nconst b = (a: () => number) => ({ v: a });"),
];
