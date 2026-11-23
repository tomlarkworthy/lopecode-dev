import { srcs } from "./proto.ts";
export const cands = srcs.slice(0, 3).map(([name, src]) => ({ name, src, show: ["c"] }));
