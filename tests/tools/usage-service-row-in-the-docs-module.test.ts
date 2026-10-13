// The docs module names the usage service (issue usage-service-row-in-the-docs-module). Before it the table
// "Services outside the core" of cloud-brain-docs.ojs had no row for brain-usage, which cb4 has run since cu-2-usage-service.
// What the row says of the service is held to the text of its seed, brain-usage.ojs, not to a run of it.
//
//   bun test --timeout=30000 ./tests/tools/usage-service-row-in-the-docs-module.test.ts
// DOCS= reads another copy of the docs seed (the file before the change).
//
// Since fb-batch-docs-and-tools (entry seen-d1b8cc-docs-table-four-services) the file also holds the module to OWNED of
// build.ts, the modules a Worker owns: each is named in the docs module as a link, mod("NAME"), so the next service
// with no row and no mention fails here. And the rows of the four services that had none (snapshot, knowledge, git,
// fly) are held to their seeds' text, as the row of brain-usage is.
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

test("the table has one row for brain-usage, after brain-dashboard, and the module is one the build has and a Worker owns", () => {
  expect(rowsOf("brain-usage").length).toBe(1);
  expect(docs.split('${mod("brain-usage")}').length).toBe(2);
  const rows = table.slice(0, table.indexOf("\n// %%\n")).split("\n").filter((l) => l.startsWith("| ${mod("));
  const at = rows.findIndex((l) => l.startsWith('| ${mod("brain-usage")} |'));
  expect(rows[at - 1].startsWith('| ${mod("brain-dashboard")} |')).toBe(true);
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

test("the rows the table had are as they were: twelve, in their order, before this one; then the four of fb-batch-docs-and-tools", () => {
  const rows = table.slice(0, table.indexOf("\n// %%\n")).split("\n").filter((l) => l.startsWith("| ${mod("));
  expect(rows.map((l) => /mod\("([a-z-]+)"\)/.exec(l)![1])).toEqual(["brain-inbox", "brain-topic", "brain-issues", "brain-whatsapp", "brain-library", "brain-feed", "brain-browser", "brain-container", "brain-ai", "brain-proxy", "brain-logs", "brain-dashboard", "brain-usage", "brain-snapshot", "brain-knowledge", "brain-git", "brain-fly"]);
});

// ---- fb-batch-docs-and-tools: the module and OWNED of build.ts.
const owned: string[] = JSON.parse("[" + /const OWNED = \[([^\]]*)\]/.exec(build)![1] + "]");

test("every module a Worker owns (OWNED of build.ts) is named in the docs module as a link", () => {
  expect(owned.length).toBeGreaterThanOrEqual(26);
  for (const name of ["brain-snapshot", "brain-knowledge", "brain-git", "brain-fly", "brain-usage", "brain-core"]) expect(owned).toContain(name);
  expect(owned.filter((name) => !docs.includes('${mod("' + name + '")}'))).toEqual([]);
});

// What a row says, and the words of the service's seed it is cut from. A backtick of a seed's md cell is written \`.
const HELD: Record<string, { methods: string[]; said: [string, string][] }> = {
  "brain-snapshot": { methods: ["run", "sources"], said: [
    ["Once a day it fetches a list of public feeds and keeps what each one said as a public JSON file", "once a day it fetches a list of public feeds and keeps what each one said as a public JSON file."],
    ["under \\`/static/snapshot/<day>/\\`", "| \\`/static/snapshot/<day>/index.json\\` |"],
    ["It records: it makes no model call, ranks nothing and writes no summary.", "It records. It makes no model call, ranks nothing and writes no summary"],
    ["A run that kept items opens one task in the tracker, \\`digest-<day>\\`.", "A run that kept items opens one task in the Brain's tracker, \\`digest-<day>\\`"],
    ["\\`snapshot.run\\` fetches every source now, in the owner's own session.", "| \\`snapshot.run\\` | procedure, the owner's own session. Fetches every source now"],
    ["\\`snapshot.sources\\` answers the list in use to anyone.", "| \\`snapshot.sources\\` | query, anyone. \\`{ sources, default, keepDays }\\`: the list in use"],
  ] },
  "brain-knowledge": { methods: ["put", "search"], said: [
    ["What the Brain knows: one entry for each thing found, with where it was found and how it was entered.", "What a Cloud Brain knows: one entry for each thing found, with where it was found and how it was entered."],
    ["The entries are in a database of their own.", "The entries are in a database of their own."],
    ["An entry holds text to search, not a file.", "An entry holds text to search, not a file."],
    ["\\`knowledge.search\\` finds an entry by its words, and with \\`semantic=true\\` by its words and its meaning together.", "An entry is found by its words, or by its words and its meaning together"],
    ["with \\`semantic=true\\`", "\\`knowledge.search\\` with \\`semantic=true\\`"],
    ["\\`knowledge.put\\` enters one.", "| \\`knowledge.put\\` | procedure. One entry, or"],
  ] },
  "brain-git": { methods: ["create", "token"], said: [
    ["Git repositories, kept by Cloudflare Artifacts.", "Git repositories for a Cloud Brain, kept by [Cloudflare Artifacts]"],
    ["The service makes a repository (\\`git.create\\`) and hands out a token for it (\\`git.token\\`).", "The service makes a repository and hands out a token for it."],
    ["Cloning, fetching and pushing are plain \\`git\\` over HTTPS against Cloudflare's own address, with that token.", "Cloning, fetching and pushing are plain \\`git\\` over HTTPS against Cloudflare's own address, with that token"],
    ["Inside the Brain's namespace a name belongs to whoever made it.", "Inside the namespace a name belongs to whoever made it"],
    ["A repository the owner names in the setting \\`public\\` is cloned by anyone from \\`/git/NAME.git\\`.", "\\`/git/*\\` is for anyone and has no rule but the setting \\`public\\`."],
    ["cloned by anyone from \\`/git/NAME.git\\`", "\\`/git/NAME.git/info/refs?service=git-upload-pack\\`"],
  ] },
  "brain-fly": { methods: ["down", "status", "up"], said: [
    ["One machine of Fly.io that runs the issue loop.", "one machine of [Fly.io](https://fly.io/docs/machines/api/) that runs the issue loop"],
    ["The service starts it when the tracker has work and no loop holds the lock \\`loop\\`, and the machine is stopped by its own exit.", "started by this service when the tracker has work and no loop holds the lock \\`loop\\`, and stopped by its own exit"],
    ["\\`fly.status\\` answers the machine, its hours today and who holds the lock.", "\\`{ app, machine: { id, state, region, image, guest }, volume, hoursToday, maxHoursADay, loop, yield, work }\\`. \\`loop\\` is who holds the lock \\`loop\\`"],
    ["\\`fly.up\\` starts it.", "| \\`POST fly.up\\` | the same | Starts the machine when it is \\`stopped\\`"],
    ["\\`fly.down\\` asks the loop on it to yield.", "| \\`POST fly.down\\` | the same as \\`fly.up\\` | Asks the loop on the machine to yield"],
    ["The service holds one secret, \\`FLY_API_TOKEN\\`.", "The service holds one secret, \\`FLY_API_TOKEN\\`"],
  ] },
};

for (const [name, held] of Object.entries(HELD)) {
  test(`the row of ${name}: one row, the methods it names are of the seed's manifest, and each sentence is the seed's`, () => {
    const short = name.slice("brain-".length), text = read("SEED_" + short.toUpperCase(), `tools/cloud-brain/${name}.ojs`);
    expect(rowsOf(name).length).toBe(1);
    const row = rowsOf(name)[0] || "";
    // Each `short.NAME` the row names as code, and the methods the seed's manifest has.
    const named = [...new Set([...row.matchAll(new RegExp("`" + short + "\\.([a-zA-Z]+)\\b", "g"))].map((m) => m[1]))].sort();
    const manifest = [...new Set([...text.matchAll(new RegExp('"com\\.lopecode\\.brain\\.' + short + '\\.([a-zA-Z]+)": \\{ type: "(?:query|procedure)"', "g"))].map((m) => m[1]))];
    expect(named).toEqual(held.methods);
    for (const m of named) expect(manifest).toContain(m);
    for (const [said, from] of held.said) {
      expect(row).toContain(said);
      expect(text).toContain(from);
    }
    // Every sentence of the row is one of those held: nothing is said of the service that no line above rests on.
    const cell = row.slice(row.indexOf("} | ") + 4, row.lastIndexOf(" |"));
    let left = cell;
    for (const [said] of held.said) left = left.split(said).join("");
    expect(left.replace(/[\s.,]/g, "")).toBe("");
    expect(build).toContain(`{ name: "@tomlarkworthy/${name}", seed: "${name}.ojs"`);
  });
}
