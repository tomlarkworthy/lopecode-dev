import { readFileSync } from "node:fs";
import { checkSources } from "../../lite/core.ts";
const cells = readFileSync(new URL("./cells.tsx", import.meta.url), "utf8");
const outside = [{ name: "cell_list" }, { name: "cell_source" }, { name: "save_result" }, { name: "draft", view: true }, { name: "save_request", view: true }];
const r = checkSources({ cells, tsx: true, outside });
for (const e of r.module) console.log(`module [${e.rule}] ${e.msg}`);
for (const c of r.cells as any[]) console.log(`${c.name}: ${c.status}${c.errors.map((e: any) => ` [${e.rule}] line ${e.line} ${e.msg}`).join(";")}${c.blockedBy?.length ? " blocked by " + c.blockedBy.join(",") : ""}`);
