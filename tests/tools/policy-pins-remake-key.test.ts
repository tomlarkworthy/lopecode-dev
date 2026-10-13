// tools/cloud-brain/policy-pins.ts remake and the key of the file it writes. issue.install answers a body whose key
// the record keeps as the install it was and writes nothing (tests/tools/issues-policy-v6.test.ts has that in a rig),
// so a file made with the key of the file it was made from is installed with no effect. Held here: the command as the
// tool's own line (COST) gives it names a key; a file it writes has that key and no policy file of plan/ has it; and
// it writes nothing for no key, the key of <from.json>, or the key of another policy file of plan/.
// Issue policy-pins-remake-keeps-the-key; tools/cloud-brain/records/policy-pins-remake-keeps-the-key.md.
//
//   bun test --timeout=30000 ./tests/tools/policy-pins-remake-key.test.ts
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as pp from "../../tools/cloud-brain/policy-pins.ts";

const root = resolve(import.meta.dir, "../.."), tool = join(root, "tools/cloud-brain/policy-pins.ts");
const run = (...a: string[]) => spawnSync("bun", [tool, ...a], { encoding: "utf8" });
const FILES = readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-issues-policy-.*\.json$/.test(f)).map((f) => "plan/" + f).sort();
const json = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));
const NEWEST = pp.newest(root)!, NEW = "policy-2099-01-01-a-key-no-file-has-v99";
const A = "a".repeat(40), B = "b".repeat(40);
const body = (key: string, reason = `his words. approver brief ${A} tool ${B}`) => JSON.stringify({ key, reason, policy: { kinds: {}, workflows: {} }, migrate: {} }, null, 1) + "\n";

test("the command as the tool's line gives it writes a file with a key no policy file of plan/ has, or writes none", () => {
  const said = /`(bun tools\/cloud-brain\/policy-pins\.ts remake [^`]*)`/.exec(pp.COST)![1];
  const words = said.split(" ").slice(2);
  expect(words.slice(0, 3)).toEqual(["remake", "<newest>", "plan/cloud-brain-issues-policy-v<n+1>.json"]);
  const dir = mkdtempSync(join(tmpdir(), "policy-pins-key-"));
  try {
    const to = join(dir, "out.json");
    // What the line has after the two files, with a key in the place it names for one.
    const rest = words.slice(3).map((w) => (/^<.*>$/.test(w) ? NEW : w));
    const made = run("remake", join(root, NEWEST), to, ...rest);
    const keys = FILES.map((f) => json(f).key);
    if (made.status === 0) {
      const out = JSON.parse(readFileSync(to, "utf8"));
      expect(keys).not.toContain(out.key);
      expect(out.key).toBe(NEW);
    } else expect(existsSync(to)).toBe(false);
    // And it is written: the line's command is one that makes the file.
    expect([made.status, existsSync(to)]).toEqual([0, true]);
    expect(pp.COST).toContain("--key");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the command writes nothing with no key, an empty one, the key of <from.json> or the key of another policy file", () => {
  const dir = mkdtempSync(join(tmpdir(), "policy-pins-key-"));
  try {
    const to = join(dir, "out.json"), from = join(root, NEWEST);
    const refused = (r: ReturnType<typeof run>, why: string) => {
      expect([r.status, r.stdout, existsSync(to)]).toEqual([1, "", false]);
      expect(r.stderr).toContain(why);
    };
    refused(run("remake", from, to), "--key");
    refused(run("remake", from, to, "--note", "a note."), "--key");
    refused(run("remake", from, to, "--key"), "--key");
    refused(run("remake", from, to, "--key", ""), "--key");
    refused(run("remake", from, to, "--key", "k".repeat(101)), "100");
    refused(run("remake", from, to, "--key", json(NEWEST).key), `is the key of ${NEWEST}`);
    // Each file of plan/ in turn: v4 and v5 have one key, and the line names both.
    expect(FILES.length).toBeGreaterThanOrEqual(5);
    for (const f of FILES) {
      const r = run("remake", from, to, "--key", json(f).key);
      refused(r, "is the key of ");
      expect(r.stderr).toContain(f);
    }
    // The key next to one that is taken is written, and so is a key of 100 characters.
    const near = run("remake", from, to, "--key", json(NEWEST).key + "x", "--note", "a note.");
    expect([near.status, JSON.parse(readFileSync(to, "utf8")).key]).toEqual([0, json(NEWEST).key + "x"]);
    expect(near.stdout).toContain(`the key ${json(NEWEST).key}x`);
    const to2 = join(dir, "out2.json"), long = run("remake", from, to2, "--note", "a note.", "--key", "k".repeat(100));
    expect([long.status, JSON.parse(readFileSync(to2, "utf8")).key]).toEqual([0, "k".repeat(100)]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("remake with a key changes the key, the two blobs and nothing else, and refuses the key the text has", () => {
  const from = body("k");
  expect(pp.remake(from, { brief: B, tool: A }, "", "k2")).toBe(body("k2", `his words. approver brief ${B} tool ${A}`));
  expect(pp.remake(from, { brief: B, tool: A }, "a note.", 'k "2"')).toBe(body('k "2"', `his words. a note. approver brief ${B} tool ${A}`));
  // Without a key it is as before: the key of the text, which the command does not ask for.
  expect(pp.remake(from, { brief: B, tool: A })).toBe(body("k", `his words. approver brief ${B} tool ${A}`));
  expect(() => pp.remake(from, { brief: B, tool: A }, "", "k")).toThrow("is the key of <from.json>");
  expect(() => pp.remake(from, { brief: B, tool: A }, "", "")).toThrow("--key");
  expect(() => pp.remake(from, { brief: B, tool: A }, "", 7 as any)).toThrow("--key");
  expect(() => pp.remake(from, { brief: B, tool: A }, "", "k".repeat(101))).toThrow("100");
  // A text whose key is also said in its reason, before the key's own place or after it: only the key changes.
  const twice = body("k", `the key "k" was his. approver brief ${A} tool ${B}`);
  expect(pp.remake(twice, { brief: A, tool: B }, "", "k2")).toBe(body("k2", `the key "k" was his. approver brief ${A} tool ${B}`));
  const first = JSON.stringify({ reason: `said "k". approver brief ${A} tool ${B}`, note: "k", key: "k" });
  expect(() => pp.remake(first, { brief: A, tool: B }, "", "k2")).toThrow("the key");
  expect(() => pp.remake(JSON.stringify({ reason: `approver brief ${A} tool ${B}` }), { brief: A, tool: B }, "", "k2")).toThrow("the key");
});

test("taken: the policy files of plan/ that have a key, by their paths", () => {
  expect(pp.taken("policy-2026-10-12-project-children-work-v4", root)).toEqual(["plan/cloud-brain-issues-policy-v4.json", "plan/cloud-brain-issues-policy-v5.json"]);
  expect(pp.taken(NEW, root)).toEqual([]);
  expect(pp.taken("", root)).toEqual([]);
});

test("the spec of the approver says the key is an argument, and no longer that remake keeps the key it reads", () => {
  const spec = readFileSync(join(root, "plan/cloud-brain-approver-persona.md"), "utf8").replace(/\s+/g, " ");
  expect(spec).not.toContain("`remake` keeps the key of the file it reads");
  expect(spec).toContain("`remake <from.json> <to.json> --key <key>`");
  expect(spec).toContain("`tests/tools/policy-pins-remake-key.test.ts`");
});
