#!/usr/bin/env bun
// The two blobs a policy file's reason ends with, `approver brief <blob> tool <blob>`: the approver's brief and its
// tool. approver.ts makes no `approve` unless the reason of the policy in force ends with the blobs origin/main has
// (its R7), so a change to either file is one more file and one more install by the owner. Issue
// policy-v5-names-the-approver-as-it-is; tools/cloud-brain/records/policy-v5-names-the-approver-as-it-is.md.
//
//   bun tools/cloud-brain/policy-pins.ts check
//   bun tools/cloud-brain/policy-pins.ts remake <from.json> <to.json> --key <key> [--note "<a sentence>"]
//
// check    The newest plan/cloud-brain-issues-policy-v<n>.json against the two files of this checkout. Exit 0: its
//          reason ends with their blobs. Exit 1: it does not, with both pairs and the cost. Nothing is written.
// remake   Writes <to.json>: the text of <from.json> with the two blobs of its reason replaced by those of the two
//          files of this checkout, the note, when one is given, put before `approver brief`, and <key> for its key.
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
const ENDS = /approver brief ([0-9a-f]{40}) tool ([0-9a-f]{40})$/, LIMIT = 2000, KEY = 100;
export type Pins = { brief: string; tool: string };

export const pinsOf = (reason: string): Pins | null => { const m = ENDS.exec(reason || ""); return m ? { brief: m[1], tool: m[2] } : null; };
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
export const COST = "A change to the approver's brief or its tool is one more policy file and one more install by the owner: " +
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
  if (!was) throw new Error("the reason does not end `approver brief <blob> tool <blob>`");
  const old = `approver brief ${was.brief} tool ${was.tool}`;
  if (text.split(old).length !== 2) throw new Error("the file has that ending more than once, or not as plain text");
  const said = note.trim() ? JSON.stringify(note.trim() + " ").slice(1, -1) : "";
  const blobbed = text.replace(old, () => `${said}approver brief ${pins.brief} tool ${pins.tool}`);
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
  const f = newest(root), has = f && pinsOf(JSON.parse(readFileSync(join(root, f), "utf8")).reason), now = blobs(root);
  if (!f || !has) return { exit: 1, line: `policy-pins.ts: ${f ?? "no policy file"} has no \`approver brief <blob> tool <blob>\` at the end of its reason` };
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
      const pins = blobs(), out = remake(readFileSync(resolve(from), "utf8"), pins, note, key);
      writeFileSync(resolve(to), out);
      stop(0, `${to}: the key ${key}, the brief ${pins.brief}, the tool ${pins.tool}, a reason of ${JSON.parse(out).reason.length} characters`);
    } catch (e: any) { stop(1, `policy-pins.ts: ${e.message}`); }
  }
  stop(1, "policy-pins.ts: check | remake <from.json> <to.json> --key <key> [--note \"<a sentence>\"]");
}
