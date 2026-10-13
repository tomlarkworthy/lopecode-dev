// The docs module names the usage service (issue usage-service-row-in-the-docs-module). Before it the table
// "Services outside the core" of cloud-brain-docs.ojs had no row for brain-usage, which cb4 has run since cu-2-usage-service.
// What the row says of the service is held to the text of its seed, brain-usage.ojs, not to a run of it.
//
//   bun test --timeout=30000 ./tests/tools/usage-service-row-in-the-docs-module.test.ts
// DOCS= reads another copy of the docs seed (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (env: string, path: string) => readFileSync(process.env[env] || resolve(root, path), "utf8");
const docs = read("DOCS", "tools/cloud-brain/cloud-brain-docs.ojs");
const seed = read("SEED", "tools/cloud-brain/brain-usage.ojs");
const build = read("BUILD", "tools/cloud-brain/build.ts");
const reference = seed.split("\n// %%\n")[0];
// Each `usage.NAME` a text names as code.
const methods = (text: string) => [...new Set([...text.matchAll(/`usage\.([a-z]+)\b/g)].map((m) => m[1]))].sort();
const table = docs.slice(docs.indexOf("md`## Services outside the core"));
const rowsOf = (name: string) => table.split("\n").filter((l) => l.startsWith('| ${mod("' + name + '")} |'));

test("the table has one row for brain-usage, the last, and the module is one the build has and a Worker owns", () => {
  expect(rowsOf("brain-usage").length).toBe(1);
  expect(docs.split('${mod("brain-usage")}').length).toBe(2);
  const rows = table.slice(0, table.indexOf("\n// %%\n")).split("\n").filter((l) => l.startsWith("| ${mod("));
  expect(rows[rows.length - 1].startsWith('| ${mod("brain-usage")} |')).toBe(true);
  expect(rows[rows.length - 2].startsWith('| ${mod("brain-dashboard")} |')).toBe(true);
  expect(build).toContain('{ name: "@tomlarkworthy/brain-usage", seed: "brain-usage.ojs", main: true');
  expect(/const OWNED = \[([^\]]*)\]/.exec(build)![1]).toContain('"brain-usage"');
});

test("the row names the one method the seed serves, and its two parameters", () => {
  const row = rowsOf("brain-usage")[0] || "";
  expect(methods(row)).toEqual(["account"]);
  // The manifest of the seed has that method and no other.
  expect([...seed.matchAll(/"com\.lopecode\.brain\.usage\.([a-z]+)": \{ type: "(query|procedure)", allow: '([^']*)'/g)].map((m) => [m[1], m[2], m[3]])).toEqual([["account", "query", 'caller.id == "owner"']]);
  expect(methods(reference)).toEqual(["account"]);
  for (const said of ["\\`from\\`", "\\`to\\`"]) expect(row).toContain(said);
});

test("the row says of the service what its seed's first cell says", () => {
  const row = rowsOf("brain-usage")[0] || "";
  const held: [string, string][] = [
    ["What the Cloudflare account was billed for, by product, read from Cloudflare's billable usage.", "what the Cloudflare account was billed for, by product, read from Cloudflare's billable usage API"],
    ["a row of its answer is one product and one charge period", "A row is one product and one charge period."],
    ["with its quantity and cost", "| \\`unit\\`, \\`quantity\\` | \\`ConsumedUnit\\`, \\`ConsumedQuantity\\` |"],
    ["with its quantity and cost", "| \\`cost\\`, \\`cumulatedCost\\` | \\`ContractedCost\\`, \\`CumulatedContractedCost\\` |"],
    ["or neither for the current billing period", "With neither, Cloudflare answers the current billing period."],
    ["The figures are the whole Cloudflare account's, which holds more than this Brain.", "The figures are the whole Cloudflare account's, which holds more than this Brain."],
    ["It answers the owner, or a token of the owner that names the method.", "The owner, or a token of the owner that names the method (\\`caller.id == \"owner\"\\`)."],
    ["It keeps no rows.", "It keeps no rows and has one method."],
  ];
  for (const [said, from] of held) {
    expect(row).toContain(said);
    expect(reference).toContain(from);
  }
});

test("the rows the table had are as they were: twelve, in their order, before this one", () => {
  const rows = table.slice(0, table.indexOf("\n// %%\n")).split("\n").filter((l) => l.startsWith("| ${mod("));
  expect(rows.map((l) => /mod\("([a-z-]+)"\)/.exec(l)![1])).toEqual(["brain-inbox", "brain-topic", "brain-issues", "brain-whatsapp", "brain-library", "brain-feed", "brain-browser", "brain-container", "brain-ai", "brain-proxy", "brain-logs", "brain-dashboard", "brain-usage"]);
});
