// What is pushed: the notebooks at origin/main of a content repo, and whether a file is one of them byte for byte.
// Run `git fetch` in the repo first. Used by library-backfill.ts and library-homes.ts: a notebook is public in a
// Brain's library only when the bytes it keeps are bytes anyone can already read on GitHub.
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname), "..", "..");
export const git = (repo: string, ...a: string[]) => Bun.spawnSync(["git", "-C", join(root, repo), ...a], { maxBuffer: 1 << 28 }).stdout;
// path -> git's id of the blob at origin/main, for every notebooks/*.html.
export const pushed = (repo: string) =>
  new Map(String(git(repo, "ls-tree", "-r", "origin/main", "notebooks/")).split("\n").map((l) => /^\d+ blob ([0-9a-f]{40})\t(.+\.html)$/.exec(l)).filter(Boolean).map((m) => [m![2], m![1]] as [string, string]));
// Git's id of these bytes as a blob.
export const blobId = (bytes: Uint8Array) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
