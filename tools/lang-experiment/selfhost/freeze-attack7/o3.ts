// o3: o1's three S4.11 rejections run with the checker skipped: does the rejected program throw or change anything?
import { C } from "./lib.ts";
import { srcs } from "./o1.ts";
const call = (cell: string, ...args: unknown[]) => async (p: any) => { try { p.value(cell)(...args); } catch (e) { return `threw ${(e as Error).message.slice(0, 80)}`; } await p.settle(400); return "ran"; };
const S = new Map(srcs);
export const cands = [
  C("o3-form-validate-after", S.get("form-validate-after")!, { drive: call("submit"), ctl: true, show: ["form"] }),
  C("o3-undo-stack-local", S.get("undo-stack-local")!, { drive: call("push2", 1, 2), ctl: true, show: ["past"] }),
  C("o3-two-states-loop", S.get("two-states-loop")!, { drive: call("run"), ctl: true, show: ["a", "b"] }),
];
