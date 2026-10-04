// Spec R20: a limit on what a tool returns has an argument that lifts it, and the truncation text names the argument.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { engine, call, done } from "./lib/engine.mjs";

const mod = (n) => fileURLToPath(new URL(`../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
// a module holding one 900-line cell with a 6,000-character line (the spec's large cell)
const LONG = "x".repeat(6000);
const BIG = ["const _big = function _big(){return(", ...Array.from({ length: 897 }, (_, i) => "  // line " + i), "  '" + LONG + "'", ")};"].join("\n");
const files = { "/src/@user/big.js": BIG };
let core, read_file, grep;
before(async () => {
  core = await importNotebookModule(mod("-core"));
  const defineTool = await core.value("defineTool");
  const fileLib = { readPath: async (p) => files[p] ?? null, listPathsAsync: async () => Object.keys(files), isDisk: () => false, markSeen: () => {},
    MODULE_PATH: /^\/src\/(.+)\.js$/, WIKI: "/wiki/", globToRe: () => /./, inEmbedded: () => false, nearNames: () => [], didYouMean: () => "", notEmbeddedHint: () => "" };
  const m = await importNotebookModule(mod("-srctools"), { overrides: { fileLib, defineTool, localDisk: { mounted: false }, uncaughtLog: { text: () => "" } } });
  read_file = await m.value("tool_read_file");
  grep = await m.value("tool_grep");
});

describe("limits the agent can lift", () => {
  it("read_file: a line past 2000 characters is cut, and the cut names max_line_chars", async () => {
    const r = await read_file.execute({ file_path: "/src/@user/big.js", offset: 899, limit: 1 });
    assert.match(r.output, /\[line truncated at 2000 of 6004 chars; pass max_line_chars to read more\]/);
  });
  it("read_file: max_line_chars lifts it", async () => {
    const r = await read_file.execute({ file_path: "/src/@user/big.js", offset: 899, limit: 1, max_line_chars: 10000 });
    assert.ok(r.output.includes(LONG) && !r.output.includes("truncated"));
  });
  it("the loop's cap on a tool result: the marker names max_chars, and max_chars lifts it", async () => {
    const e = await engine({ script: [call("read_file", { file_path: "/src/@user/big.js" }), call("read_file", { file_path: "/src/@user/big.js", max_chars: 100000, max_line_chars: 10000 }), done("read")], tools: [read_file] });
    await e.makeSession({}).send("go");
    const results = e.requests.at(-1).messages.filter((m) => m.role === "tool").map((m) => m.content);
    assert.match(results[0], /bytes truncated — pass max_chars to get more, or offset and limit to page/);
    assert.ok(results[1].includes(LONG) && results[1].includes("// line 450") && !results[1].includes("truncated"), "the whole 900-line cell, in one result");
  });
  it("grep: a matching line past 250 characters is cut, and the cut names max_line_chars", async () => {
    const r = await grep.execute({ pattern: "xxxx", path: "/src" });
    assert.match(r.output, /^\/src\/@user\/big\.js:899:  'x{247}… \[cut at 250 of 6004 chars; pass max_line_chars\]$/);
  });
  it("grep: max_line_chars lifts it, and max_chars lifts the loop's cap", async () => {
    const r = await grep.execute({ pattern: "xxxx", path: "/src", max_line_chars: 10000, max_chars: 20000 });
    assert.ok(r.output.includes(LONG) && !r.output.includes("cut at"));
    assert.equal(r.outputLimit, 20000);
  });
  it("grep declares its limits and what lifts each", () => {
    assert.deepEqual(grep.limits.map((l) => l.override), ["max_results", "max_line_chars", "context", "max_chars", null]);
    for (const l of grep.limits) assert.ok(l.override || l.reason, l.limit);
  });
  it("read_file declares its limits and what lifts each", () => {
    assert.deepEqual(read_file.limits.map((l) => l.override), ["limit", "max_line_chars", "max_chars"]);
  });
});
