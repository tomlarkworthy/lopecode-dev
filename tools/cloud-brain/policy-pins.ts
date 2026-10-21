#!/usr/bin/env bun
// The pin a policy file's reason ends with. The approver makes no `approve` unless the reason of the policy in force
// ends with the pin it reads (its R7). Two forms:
//   `approver from <sha>`                 cloud-brain-dev's approver.ts and policy-check.ts (event 15036 on): a commit
//                                         of cloud-brain-dev's origin/main at the install.
//   `approver brief <blob> tool <blob>`   this checkout's approver.ts, v5 to v9: the blobs of its brief and its tool.
// Issue policy-v5-names-the-approver-as-it-is; tools/cloud-brain/records/policy-v5-names-the-approver-as-it-is.md.
//
//   bun tools/cloud-brain/policy-pins.ts check
//   bun tools/cloud-brain/policy-pins.ts remake <from.json> <to.json> --key <key> [--note "<a sentence>"]
//
// check    The newest plan/cloud-brain-issues-policy-v<n>.json. Exit 0: its `from` sha is an ancestor of
//          cloud-brain-dev's origin/main, or its two blobs are those of this checkout's files. Exit 1: not, with why.
// remake   Writes <to.json>: the text of <from.json> with the pin of its reason replaced by `approver from` the
//          origin/main of cloud-brain-dev, the note, when one is given, put before it, and <key> for its key.
//          Every other byte is as <from.json> has it: the policy and the migrate are not read. Exit 1, nothing written:
//          <to.json> exists, <from.json> has no such ending or has it more than once, the reason would pass 2,000
//          characters, or the key is not given, begins `--`, has a space at either end, is longer than 100
//          characters, or is the key of <from.json> or of a
//          plan/cloud-brain-issues-policy-*.json of this checkout. issue.install answers a body whose key the record
//          keeps as the install it was and writes nothing, so a file under the key of the one before it would be
//          installed with no effect (issue policy-pins-remake-keeps-the-key). A key installed on cb4 from no file of
//          plan/ is not seen here.
// Neither calls the tracker. Whether <from.json> is the policy cb4 has in force is read by whoever installs.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BRIEF, TOOL } from "./approver.ts";

export const ROOT = resolve(import.meta.dir, "../..");
const ENDS = /approver (?:brief ([0-9a-f]{40}) tool ([0-9a-f]{40})|from ([0-9a-f]{40}))$/, LIMIT = 2000, KEY = 100;
export type Pins = { brief: string; tool: string } | { from: string };
const PIN = "`approver from <sha>` or `approver brief <blob> tool <blob>`";

export const pinsOf = (reason: string): any => { const m = ENDS.exec(reason || ""); return !m ? null : m[3] ? { from: m[3] } : { brief: m[1], tool: m[2] }; };
const ending = (p: Pins) => ("from" in p ? `approver from ${p.from}` : `approver brief ${p.brief} tool ${p.tool}`);
const cbd = (root: string) => join(root, "cloud-brain-dev");
const git = (dir: string, ...a: string[]) => { try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
// The pin a new file carries: cloud-brain-dev's origin/main, the commit the approver that runs is judged against.
export const current = (root = ROOT): Pins => {
  const sha = git(cbd(root), "rev-parse", "origin/main");
  if (!sha) throw new Error(`cloud-brain-dev's origin/main is not read in ${cbd(root)}`);
  return { from: sha };
};
// The blobs of the two files as the checkout has them on disk: what a commit of them as they are would have.
export const blobs = (root = ROOT): Pins => {
  const hash = (f: string) => execFileSync("git", ["-C", root, "hash-object", f], { encoding: "utf8" }).trim();
  return { brief: hash(BRIEF), tool: hash(TOOL) };
};
// The policy file of the highest number, by its path from the root.
export const newest = (root = ROOT): string | null => {
  const n = (f: string) => Number(/^cloud-brain-issues-policy-v(\d+)\.json$/.exec(f)?.[1] ?? -1);
  const f = readdirSync(join(root, "plan")).filter((x) => n(x) >= 0).sort((a, b) => n(b) - n(a))[0];
  return f ? "plan/" + f : null;
};
export const COST = "A change to the approver's pin is one more policy file and one more install by the owner: " +
  "`bun tools/cloud-brain/policy-pins.ts remake <newest> plan/cloud-brain-issues-policy-v<n+1>.json --key <key>`, with a key no policy file has " +
  "(an install under a key the record keeps writes nothing), a test of the new file, and his issue.install. " +
  "Until he installs it, approver.ts makes no approve (R7).";

const NEEDS = "remake needs --key <key>, the key of the new file: issue.install answers a key the record keeps as the install it was, and writes nothing";
// The policy files of plan/ that have this key, by their paths from the root.
export const taken = (key: string, root = ROOT): string[] =>
  readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-issues-policy-.*\.json$/.test(f)).sort()
    .filter((f) => { try { return JSON.parse(readFileSync(join(root, "plan", f), "utf8")).key === key; } catch { return false; } }).map((f) => "plan/" + f);

// The text of a policy file with its two blobs replaced, a note put before them and, when one is given, another key;
// throws with why when it cannot.
export function remake(text: string, pins: Pins, note = "", key?: string): string {
  const was = pinsOf(JSON.parse(text).reason);
  if (!was) throw new Error(`the reason does not end ${PIN}`);
  const old = ending(was);
  if (text.split(old).length !== 2) throw new Error("the file has that ending more than once, or not as plain text");
  const told = note.trim() ? JSON.stringify(note.trim() + " ").slice(1, -1) : "";
  const blobbed = text.replace(old, () => told + ending(pins));
  const reason = JSON.parse(blobbed).reason as string;
  if (reason.length > LIMIT) throw new Error(`the reason would be ${reason.length} characters, and an install takes ${LIMIT}`);
  if (key === undefined) return blobbed;
  if (typeof key !== "string" || !key.trim() || key !== key.trim() || key.startsWith("--")) throw new Error(NEEDS);
  if (key.length > KEY) throw new Error(`the key is ${key.length} characters, and an install takes ${KEY}`);
  const had = JSON.parse(blobbed), was0 = had.key;
  if (typeof was0 !== "string") throw new Error("the key of <from.json> is not a text");
  if (was0 === key) throw new Error(`${key} is the key of <from.json>, and an install under it is answered as the install before`);
  // The first place the old key stands as a JSON text is taken for the key's own; the parse says whether it was.
  const out = blobbed.replace(JSON.stringify(was0), () => JSON.stringify(key)), now = JSON.parse(out);
  if (now.key !== key || JSON.stringify({ ...now, key: was0 }) !== JSON.stringify(had)) throw new Error("the key of <from.json> is not the first place its text stands in the file");
  return out;
}

// What `check` answers for a checkout: the exit and its one line.
export function check(root = ROOT): { exit: number; line: string } {
  const f = newest(root), has = f && pinsOf(JSON.parse(readFileSync(join(root, f), "utf8")).reason);
  if (!f || !has) return { exit: 1, line: `policy-pins.ts: ${f ?? "no policy file"} has no ${PIN} at the end of its reason` };
  if ("from" in has) {
    if (git(cbd(root), "merge-base", "--is-ancestor", has.from, "origin/main") !== null) return { exit: 0, line: `${f} names approver from ${has.from}, an ancestor of origin/main of cloud-brain-dev` };
    return { exit: 1, line: `${f} names approver from ${has.from}, which is no ancestor of origin/main of ${cbd(root)} (fetch it first). ${COST}` };
  }
  const now = blobs(root);
  if (has.brief === now.brief && has.tool === now.tool) return { exit: 0, line: `${f} names the brief ${now.brief} and the tool ${now.tool}, as the checkout has them` };
  return { exit: 1, line: `${f} names the brief ${has.brief} and the tool ${has.tool}; the checkout has ${now.brief} and ${now.tool}. ${COST}` };
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2), stop = (exit: number, line: string) => { (exit ? console.error : console.log)(line); process.exit(exit); };
  if (cmd === "check") { const c = check(); stop(c.exit, c.line); }
  if (cmd === "remake") {
    const said: Record<string, string> = {}, files: string[] = [];
    for (let i = 0; i < rest.length; i++) if (rest[i] === "--note" || rest[i] === "--key") said[rest[i]] = rest[++i] ?? ""; else files.push(rest[i]);
    const [from, to] = files, note = said["--note"] ?? "", key = said["--key"] ?? "";
    if (!from || !to) stop(1, "policy-pins.ts: remake <from.json> <to.json> --key <key> [--note \"<a sentence>\"]");
    if (existsSync(resolve(to))) stop(1, `policy-pins.ts: ${to} exists, and is not written over`);
    const has = key.trim() ? taken(key) : [];
    if (has.length) stop(1, `policy-pins.ts: ${key} is the key of ${has.join(" and ")}, and an install under it is answered as the install before`);
    try {
      const pins = current(), out = remake(readFileSync(resolve(from), "utf8"), pins, note, key);
      writeFileSync(resolve(to), out);
      stop(0, `${to}: the key ${key}, ${ending(pins)}, a reason of ${JSON.parse(out).reason.length} characters`);
    } catch (e: any) { stop(1, `policy-pins.ts: ${e.message}`); }
  }
  stop(1, "policy-pins.ts: check | remake <from.json> <to.json> --key <key> [--note \"<a sentence>\"]");
}
