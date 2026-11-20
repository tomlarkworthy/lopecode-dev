// cellStates (what the notebook shows) for a file: bun selfhost/rt/states.ts <file>
import { readFileSync } from "node:fs";
import { splitCells, cellStates } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";
const { result } = checkCells(splitCells(readFileSync(process.argv[2], "utf8"), false), false);
for (const [k, s] of cellStates(result) as Map<string, { state: string; blockedBy?: string[] }>) console.log(`${k}: ${s.state}${s.blockedBy?.length ? " by " + s.blockedBy.join(",") : ""}`);
