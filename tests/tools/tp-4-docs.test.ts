// The docs name the topic service (task 4 of plan/cloud-brain-topics-service.md, issue tp-4-docs). Before the task the
// modules table of cloud-brain-docs.ojs had no row for brain-topic, the knowledge page listed no service `topic` and
// called the proposal the only document, and the proposal's head said "not built" with no word of the spec.
// What the lines say of the service is held to the text of its module, not to a run of it: until 2026-10-14 its seed,
// brain-topic.ojs; since then what cb4 runs, from cloud-brain-dev/deploy after `bun sync.ts` (the seed was deleted that day).
//
//   bun test ./tests/tools/tp-4-docs.test.ts
// DOCS=, HUB=, PROPOSAL=, BACKLOG= each read another copy of that file (the file before the change).
import { expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { running, runningCells, testNeedingRunning } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const read = (env: string, path: string) => readFileSync(process.env[env] || resolve(root, path), "utf8");
const docs = readFileSync(process.env.DOCS || running("cloud-brain-docs"), "utf8");
const hub = read("HUB", "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
const proposal = read("PROPOSAL", "plan/cloud-brain-topics.md");
const build = read("BUILD", "tools/cloud-brain/build.ts");
// The first md cell of what cb4 runs, its method reference.
const { test, module } = testNeedingRunning("tp-4-docs.test.ts", "brain-topic", [running("cloudflare-iac")]);
const reference = module ? (await runningCells("brain-topic"))[0]._definition : "";
const TASKS = ["tp-1-topics-append-read", "tp-2-push-to-receive", "tp-3-take-and-done", "tp-3b-take-is-one-transaction-test", "tp-4-docs"];
// Each `topic.NAME` a text names as code.
const methods = (text: string) => [...new Set([...text.matchAll(/`topic\.([a-z]+)\b/g)].map((m) => m[1]))].sort();
// The methods the module's reference has a row for: a row of the first table says procedure or query.
const rows = [...reference.matchAll(/^\| \\`topic\.([a-z]+)\\` \| (?:procedure|query)\./gm)].map((m) => m[1]).sort();

test("the module's reference has a row for each of the eleven methods", () => {
  expect(rows).toEqual(["append", "create", "delete", "done", "list", "read", "receive", "subs", "subscribe", "take", "unsubscribe"]);
});

test("the modules table of the docs has one row for brain-topic, after brain-inbox, and each method it names is in the reference", () => {
  const table = docs.slice(docs.indexOf("md`## Services outside the core"));
  const lines = table.split("\n").filter((l) => l.startsWith('| ${mod("brain-topic")} |'));
  expect(lines.length).toBe(1);
  expect(docs.split('${mod("brain-topic")}').length).toBe(2);
  expect(table.indexOf('| ${mod("brain-topic")} |')).toBeGreaterThan(table.indexOf('| ${mod("brain-inbox")} |'));
  const row = lines[0];
  for (const said of ["Named, ordered logs", "a rule for who appends and a rule for who reads", "NAME.receive", "as the subscriber", "one taker"]) expect(row).toContain(said);
  expect(methods(row)).toEqual(["append", "done", "read", "subscribe", "take"]);
  for (const m of methods(row)) expect(rows).toContain(m);
  // The module the row links to is one the build has, and one a Worker owns.
  expect(build).toContain('{ name: "@tomlarkworthy/brain-topic", running: "brain-x-topic", main: true');
  expect(/const OWNED = \[([^\]]*)\]/.exec(build)![1]).toContain('"brain-topic"');
});

test("the row says of the service what the first sentences of its module say", () => {
  expect(reference).toContain("Named, ordered logs kept by a Cloud Brain. Each topic has a rule for who appends and a rule for who reads");
  expect(reference).toContain("hands each entry of a subscription to take from to one taker");
  expect(reference).toContain("\\`target\\` is a method named \\`NAME.receive\\`");
  expect(reference).toContain("The reader keeps \\`next\\` and sends it as \\`after\\`");
});

test("the knowledge page lists topic among the services, with its reads, its method reference and its spec", async () => {
  const services = hub.slice(hub.indexOf("- **Services**"), hub.indexOf("- **Database**"));
  expect(services.slice(0, services.indexOf("`<base>-x-page` is built from"))).toContain("topic (since 2026-10-12");
  const said = services.slice(services.indexOf("topic (since 2026-10-12"), services.indexOf("`<base>-x-page` is built from"));
  for (const part of ["topic.append { topic, key, body }", "topic.read?topic=&after=&limit=", "NAME.receive", "brain-x-topic", "topic.take", "topic.done", "loop-topic", "plan/cloud-brain-topics-service.md", "getSource?worker=brain-x-topic&part=reference"]) expect(said).toContain(part);
  for (const m of methods(said)) expect(rows).toContain(m);
  // The page says a member is not let in without the owner's grant: the member's list cb4 runs names no topic method
  // (cloudflare-iac's MEMBER; from its seed until 2026-10-18).
  expect(said).toContain("grant");
  const member = (await runningCells("cloudflare-iac")).find((v) => v._name === "MEMBER")!._definition;
  expect(member).toContain('"member.whoami"');
  expect(member).not.toContain("topic.");
});

test("the knowledge page's table of documents names the spec as what was built from, and the proposal as what it replaced", () => {
  const table = hub.slice(hub.indexOf("## Where the documents are"), hub.indexOf("## The shape, in six lines"));
  const row = table.split("\n").find((l) => l.includes("`plan/cloud-brain-topics-service.md`")) || "";
  expect(row).toContain("`plan/cloud-brain-topics.md`");
  expect(row).toContain("brain-x-topic");
  expect(table).not.toContain("Proposal: topics (read, take, push) in place of one inbox; its step 2 is the design above");
  expect(table.split("`plan/cloud-brain-topics.md`").length).toBe(2);
});

test("the backlog no longer says the topics are not started", () => {
  const backlog = read("BACKLOG", "plan/cloud-brain-backlog.md");
  const line = backlog.split("\n").find((l) => l.startsWith("- `plan/cloud-brain-topics.md`:")) || "";
  expect(line).not.toContain("topics in place of one inbox. Not started.");
  expect(line).toContain("`plan/cloud-brain-topics-service.md`");
  expect(line).toContain("brain-x-topic");
});

test("the proposal has one line at its head that names the spec and the five tasks, and its text is as it was", () => {
  const lines = proposal.split("\n");
  expect(lines[0]).toBe("# Cloud Brain: topics, for messages between agents and Workers");
  expect(lines[1]).toBe("");
  const head = lines[2];
  expect(lines[3]).toBe("");
  expect(head).toContain("`plan/cloud-brain-topics-service.md`");
  expect(head).toContain("brain-x-topic");
  for (const id of TASKS) expect(head).toContain("`" + id + "`");
  expect(lines[4]).toBe("A proposal, not built. Written 2026-10-10 09:28 CEST for Tom to review. Nothing here has been");
  // Each task the line names has a record but this one, whose record is written with it.
  for (const id of TASKS) expect(() => readFileSync(resolve(root, "tools/cloud-brain/records", id + ".md"))).not.toThrow();
});
