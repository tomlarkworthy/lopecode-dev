import { checkSources } from "../../lite/core.ts";
const src = `export const xs = () => [3, 1, 2];
export const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);
`;
const r: any = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as any);
console.log(JSON.stringify({m: r.module, c: r.cells.map((c: any) => [c.name, c.status, c.errors, c.unsupported])}, null, 1));
