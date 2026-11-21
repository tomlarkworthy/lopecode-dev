// ti-gate.ss.ts linked for bun (lite/link.ts)
import * as G from "./ti-gate.ss.ts";
import { link } from "../../lite/link.ts";
import * as prelude from "../../prelude.runtime.ts";
export const { tiSameDefs } = link(G, prelude);
