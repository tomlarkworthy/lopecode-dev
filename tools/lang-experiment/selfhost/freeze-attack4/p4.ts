import { cands } from "./b2.ts";
export const srcs = cands.filter((c: any) => /^fr-|lp-const-of|it-for-of|t-union-cond|t-param-optional|rr-state-consumer|gn-ternary/.test(c.name)).map((c: any) => [c.name, c.src]);
