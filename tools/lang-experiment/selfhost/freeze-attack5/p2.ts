import { attacks as cands } from "../../lite/infer/attack/h9-attacks.ts";
export const srcs: [string, string][] = (cands as any[]).filter((c) => ["h9-r2-tuple", "h9-r2-inferred"].includes(c.name)).map((c) => [c.name, c.src]);
