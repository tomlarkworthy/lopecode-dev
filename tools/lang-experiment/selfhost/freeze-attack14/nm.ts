// freeze-attack14: every verdict probe (q1 to q14 but q7, which act.ts drives), driven; each row's
// detector is g's written return type (byRet). Rows whose type the detector cannot read are verdict-only
import { tyRow, byRet, isNum, type Cand } from "./lib14.ts";
import { srcs as q1 } from "./q1.ts";
import { srcs as q2 } from "./q2.ts";
import { srcs as q3 } from "./q3.ts";
import { srcs as q4 } from "./q4.ts";
import { srcs as q5 } from "./q5.ts";
import { srcs as q6 } from "./q6.ts";
import { srcs as q8 } from "./q8.ts";
import { srcs as q9 } from "./q9.ts";
import { srcs as q10 } from "./q10.ts";
import { srcs as q11 } from "./q11.ts";
import { srcs as q12 } from "./q12.ts";
import { srcs as q13 } from "./q13.ts";
import { srcs as q14 } from "./q14.ts";
const R: Cand[] = [];
for (const [tag, set] of [["q1", q1], ["q2", q2], ["q3", q3], ["q4", q4], ["q5", q5], ["q6", q6], ["q8", q8], ["q9", q9], ["q10", q10], ["q11", q11], ["q12", q12], ["q13", q13], ["q14", q14]] as const)
  for (const [n, s] of set) R.push(tyRow(`${tag}-${n}`, s, byRet(s)));
R.push(tyRow("nm-ctl-num", `const g = (): number => "s";`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
