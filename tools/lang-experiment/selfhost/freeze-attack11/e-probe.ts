import { cands } from "./e.ts";
export const srcs: [string, string][] = cands.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
