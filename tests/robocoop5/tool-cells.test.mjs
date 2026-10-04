// One cell per tool (spec step 13): every tool the page registers is a `tool_<id>` cell of robocoop-5-srctools,
// and valueTools / fileTools are lists of those cells.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(fileURLToPath(new URL("../../modules/@tomlarkworthy/robocoop-5-srctools.js", import.meta.url)), "utf8");
const defs = [...src.matchAll(/\$def\("([^"]+)", "([^"]+)", \[([^\]]*)\]/g)].map((m) => ({ pid: m[1], name: m[2], deps: m[3].split(",").filter(Boolean).map((d) => d.slice(1, -1)) }));
const IDS = { valueTools: ["inspect_value", "list_values", "eval_js", "try_control", "watch_variable", "unwatch_variable"],
  fileTools: ["read_file", "write_file", "edit_file", "glob", "grep", "view_image", "attach_file", "request_files"] };

describe("tool cells", () => {
  for (const [list, ids] of Object.entries(IDS)) {
    it(`${list} is the ${ids.length} tool_<id> cells, in the order the model is offered them`, () => {
      const d = defs.find((x) => x.name === list);
      assert.deepEqual(d.deps, ids.map((id) => "tool_" + id));
    });
    for (const id of ids)
      it(`tool_${id} defines the tool with that id`, () => {
        const d = defs.find((x) => x.name === "tool_" + id);
        assert.ok(d, "no cell");
        const at = src.indexOf(`const ${d.pid} = `);
        const body = src.slice(at, src.indexOf("\nconst _", at + 10));
        assert.match(body, new RegExp(`id: ['"]${id}['"]`));
        assert.ok(body.split("\n").length < 160, "a tool cell over 160 lines: " + body.split("\n").length);
      });
  }
});
