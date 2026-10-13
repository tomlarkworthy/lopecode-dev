// rules.md, "The approver", "Its own files", said the tool refuses a commit that touches a policy cell of
// brain-issues.ojs. Since approver-policy-mark-takes-every-route the tool reads two of those cells, issuesApp and
// issuesLimits, by their policy parts. The item says which parts, and this file holds each beside the tool: the parts
// are those `appParts` cuts the seed of the checkout into, and each sentence is a case of `policyCells` on that seed.
// Issue rules-md-own-files-says-policy-cell.
//
//   bun test --timeout=30000 ./tests/tools/rules-md-own-files-policy-parts.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const { policyCells, appParts, marks, own: owned, JUDGE, ROUTES } = await import(join(root, "tools/cloud-brain/approver.ts"));
const rules = readFileSync(join(root, ".claude/skills/brain-maintenance/rules.md"), "utf8");
const brief = readFileSync(join(root, ".claude/skills/brain-maintenance/agents/approver.md"), "utf8");
const SEED = "tools/cloud-brain/brain-issues.ojs";
const seed = readFileSync(join(root, SEED), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
const section = rules.slice(rules.indexOf("\n## The approver\n"), rules.indexOf("\n## What the owner is asked to decide\n"));
const own = flat(section.split(/\n(?=- )/).find((p) => p.startsWith("- **Its own files.**")) ?? "");
// The item with no backticks: the tool's names of the parts have none.
const plain = own.replace(/`/g, "");

// Each change is of text that stands once in the seed: a change that changed nothing would pass a test of [].
const swap = (from: string, to: string, text = seed) => { expect(text.split(from).length, from).toBe(2); return text.replace(from, () => to); };
const diff = (from: string, to: string) => policyCells(seed, swap(from, to));
const HELD = '"InvalidRequest", "seconds: a call is held with an id, for the waits of one issue")';
const END = "  return app;\n}";

test("the item is found, and still names the files and the refusal", () => {
  expect(section.length).toBeGreaterThan(0);
  for (const f of ["`agents/approver.md`", "`tools/cloud-brain/approver.ts`", "`tests/tools/approver.test.ts`", "`plan/cloud-brain-issues-policy-*.json`", "a policy cell of `brain-issues.ojs`"]) expect(own).toContain(f);
  expect(own).toContain("the tool refuses an issue of which a commit touches one, and such an issue is the owner's");
  expect(own).toContain("`approver brief <blob> tool <blob>`");
});

test("the item says two cells are read by their policy parts, since which issue", () => {
  expect(own).toContain("Of two of those cells, `issuesApp` and `issuesLimits`, a commit touches a policy part or it does not touch the cell");
  expect(own).toContain("since `approver-policy-mark-takes-every-route`, 2026-10-13");
  // The two are cells the tool names or walks to: a change of a policy part of each is named with its part.
  expect(Object.keys(ROUTES)).toContain("issuesApp");
  expect(Object.keys(JUDGE)).not.toContain("issuesLimits");
  expect(diff("title: 300, reason: 2000,", "title: 300, reason: 20000,")).toEqual(["issuesLimits (reason)"]);
});

test("the parts of issuesApp the item lists are the parts the tool cuts the seed into", () => {
  const chunks = seed.split(/^\/\/ %%.*$/m).filter((c) => /^issuesApp\s*=(?![=>])/m.test(c));
  expect(chunks.length).toBe(1);
  const cut = appParts(chunks[0].trim());
  expect(cut).not.toBeNull();
  const keys = [...cut!.parts.keys()] as string[];
  const routes = keys.filter((k) => k.startsWith("the route ")).map((k) => k.slice("the route ".length));
  const statements = keys.filter((k) => k.startsWith("a statement "));
  const declarations = keys.filter((k) => !k.startsWith("the route ") && !k.startsWith("a statement "));

  // "every declaration": the judge of the app is one, and each is a name with no space in it.
  expect(own).toContain("of `issuesApp` every declaration,");
  expect(declarations).toContain("judge");
  for (const d of declarations) expect(d).toMatch(/^[A-Za-z_$][\w$]*$/);

  // "every route that takes a POST, the routes `policy` and `sync`": a route that is a part whole is one or the other.
  expect(own).toContain("every route that takes a POST, the routes `policy` and `sync`,");
  for (const r of ["install", "rebuild", "resign", "policy", "sync"]) expect(routes).toContain(r);
  for (const r of routes) {
    const read = r === "policy" || r === "sync";
    expect(seed.includes(`app.post(NS + "${r}",`), r).toBe(!read);
    expect(seed.includes(`app.get(NS + "${r}",`), r).toBe(read);
  }

  // The three kinds of statement: each name the tool gives one is in the item, and the tool has no fourth.
  expect(statements.sort()).toEqual(["a statement that asks a guard", "a statement that is no declaration and no route", "a statement that names app or sets a declaration"]);
  for (const s of statements) expect(plain, s).toContain(s.replace(/^a statement/, "statement"));
  expect(own).toContain("in a route that is left, each a GET,");
});

test("each part of issuesApp, changed alone on the seed, is named by the tool", () => {
  // A declaration, a route that takes a POST (one the owner's C names and one it does not), and the two read routes.
  expect(diff('const invalid = (message) => refuse(400, "InvalidRequest", message);', 'const invalid = (message) => refuse(404, "InvalidRequest", message);')).toEqual(["issuesApp (invalid)"]);
  expect(diff('app.post(NS + "install", run(async (c', 'app.post(NS + "install", run(async (/* looser */ c')).toEqual(["issuesApp (the route install)"]);
  expect(diff("if (b.renew && b.release) throw invalid", "if (b.renew || b.release) throw invalid")).toEqual(["issuesApp (the route lock)"]);
  for (const r of ["policy", "sync"]) expect(diff(`app.get(NS + "${r}", run(async (c`, `app.get(NS + "${r}", run(async (/* looser */ c`), r).toEqual([`issuesApp (the route ${r})`]);
  // A statement that is no declaration and no route.
  expect(diff(END, "  app.use(async (c, next) => next());\n" + END)).toEqual(["issuesApp (a statement that is no declaration and no route)"]);
  // In a read route: a statement that asks a guard, one that names app, one that sets a declaration.
  const GUARD = 'if (id !== undefined && issueAllowed(view, by, { type: "read", id }).allow) await ahead(view, id);';
  expect(diff(GUARD, "await ahead(view, id);")).toEqual(["issuesApp (a statement that asks a guard)"]);
  expect(diff(HELD, HELD + ";\n    app.fetch = async () => new Response('{}')")).toEqual(["issuesApp (a statement that names app or sets a declaration)"]);
  expect(diff(HELD, HELD + ";\n    made = null")).toEqual(["issuesApp (a statement that names app or sets a declaration)"]);
});

test("of issuesLimits the entries a policy cell or a policy part of issuesApp reads", () => {
  expect(own).toContain("of `issuesLimits` the entries that a policy cell or such a part reads");
  // issueAllowed reads `reason`; `write`, a declaration of the app, reads `key`.
  expect(diff("title: 300, reason: 2000,", "title: 300, reason: 20000,")).toEqual(["issuesLimits (reason)"]);
  expect(diff("reason: 2000, key: 100,", "reason: 2000, key: 1000,")).toEqual(["issuesLimits (key)"]);
});

test("either cell is taken whole where the tool cannot cut it on both sides", () => {
  expect(own).toContain("Either cell is taken whole, as the other policy cells are, where the tool cannot cut it on both sides of the commit");
  expect(diff("const judge = (view, by, given) => {", "const judged = (view, by, given) => {")).toEqual(["issuesApp"]);
  expect(diff("wakeMs: 2000,", "wakeMs: 1000, ...{},")).toEqual(["issuesLimits"]);
  // Not cut on the two sides alike, with a read route changed beside its guard: whole still.
  const twice = swap(END, '  app.post(NS + "install", run(async () => ({})));\n' + END);
  expect(policyCells(twice, swap(HELD, '"InvalidRequest", "seconds: with an id")', twice))).toEqual(["issuesApp"]);
  // Another policy cell is one part: a space after its `=` is a change to it.
  expect(policyCells(seed, seed.replace(/^issueAllowed = /m, "issueAllowed =  "))).toEqual(["issueAllowed"]);
});

test("what is no policy part: a read route beside those statements, and an entry no policy reads; the mark is then tracker", () => {
  expect(own).toContain("A route that takes a GET and is neither `policy` nor `sync`, changed or added, is no policy part in what it does beside those statements");
  expect(own).toContain("an entry of `issuesLimits` that no policy cell and no such part reads is none");
  expect(own).toContain("a commit of the seed that touches no policy cell and no policy part is marked `tracker`, which is no refusal, and the approver reads its diff (`agents/approver.md`, step 6)");
  // The item does not say such a commit has no mark: the file is marked, and the mark refuses nothing.
  expect(own).not.toContain("no mark");
  expect([marks(SEED, []), owned(SEED, [])]).toEqual([["tracker"], false]);
  expect([marks(SEED, ["issuesApp (judge)"]), owned(SEED, ["issuesApp (judge)"])]).toEqual([["policy"], true]);
  expect(diff(HELD, '"InvalidRequest", "seconds: with an id")')).toEqual([]);
  expect(diff(END, '  app.get(NS + "count", run(async () => ({ n: (await load([S.all])).seq })));\n' + END)).toEqual([]);
  expect(diff("wakeMs: 2000", "wakeMs: 1000")).toEqual([]);
  expect(diff("wakeSeconds: 25,", "wakeSeconds: 25, wakeLate: 3,")).toEqual([]);
  // The item no longer reads as a leave for no change of the cell at all, or for every change of it.
  expect(own).not.toContain("or a policy cell of `brain-issues.ojs`: the tool refuses an issue of which a commit touches one, and such an issue is the owner's. The reason");
  // Step 6 of the approver's brief is where the item sends its reader, and has the parts.
  const six = flat(brief.slice(brief.indexOf("\n6. **Is it secure**"), brief.indexOf("\n7. **In keeping.**")));
  expect(six.length).toBeGreaterThan(0);
  expect(six).toContain("Of two cells it compared the policy parts alone (since 2026-10-13, `approver-policy-mark-takes-every-route`)");
  expect(six).toContain("read its diff");
  expect(six).toContain("`tracker` is `brain-issues.ojs` in a commit that changes no policy cell (`no policy cell` after the file), and is no refusal");
});
