#!/usr/bin/env bun
/**
 * check-content-index.ts — every catalogue entry points at a notebook that exists.
 *
 * `content.json` is the lopebooks catalogue (slug, url, title, size) that the my-lopebooks
 * index renders. Nothing generates it and nothing validated it, so deleting or renaming a
 * notebook left a dangling entry that only showed up as a 404 for a reader. Observed
 * 2026-09-08: collapsing five notebooks into one left `@tomlarkworthy/glpk-canonicalization`
 * pointing at a file that no longer existed, in BOTH copies.
 *
 * Two copies are checked because two exist and they are not identical: the root one is the
 * repo's own, `lopebooks/content.json` is the one that ships. Each entry's URL is mapped back
 * to a path under the repo it names, so this also catches a URL typo'd into the wrong repo.
 *
 * Usage:
 *   bun tools/check-content-index.ts            # check, exit 1 on a dangling entry
 *   bun tools/check-content-index.ts --list     # print every entry and its resolved path
 */
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const ROOT = resolve(import.meta.dir, "..");
const CATALOGUES = ["content.json", "lopebooks/content.json"];
const LIST = process.argv.includes("--list");
const URL_RE = /^https:\/\/tomlarkworthy\.github\.io\/([^/]+)\/notebooks\/(.+)$/;

let problems = 0;
let checked = 0;

for (const rel of CATALOGUES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;

  let doc: { entries?: Array<{ slug?: string; url?: string }> };
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`${rel}: not valid JSON — ${(e as Error).message}`);
    problems++;
    continue;
  }
  const entries = doc.entries ?? [];
  if (!entries.length) console.error(`${rel}: no entries`);

  const seen = new Map<string, number>();
  for (const e of entries) {
    checked++;
    const where = `${rel}  ${e.slug ?? "(no slug)"}`;
    if (!e.url) { console.error(`${where}: entry has no url`); problems++; continue; }

    seen.set(e.slug ?? e.url, (seen.get(e.slug ?? e.url) ?? 0) + 1);

    const m = URL_RE.exec(e.url);
    if (!m) { console.error(`${where}: url is not a notebook page — ${e.url}`); problems++; continue; }
    const target = join(ROOT, m[1], "notebooks", decodeURIComponent(m[2]));
    if (!existsSync(target)) {
      console.error(`${where}: points at a notebook that does not exist — ${m[1]}/notebooks/${m[2]}`);
      problems++;
    } else if (LIST) {
      console.log(`${where} -> ${m[1]}/notebooks/${m[2]}`);
    }
  }
  for (const [slug, n] of seen) if (n > 1) { console.error(`${rel}: ${slug} listed ${n} times`); problems++; }
}

if (problems) {
  console.error(`\n${problems} problem(s) across ${checked} catalogue entries.`);
  console.error(`A renamed or deleted notebook must be repointed or removed in: ${CATALOGUES.join(", ")}`);
  process.exit(1);
}
console.log(`content index ok: ${checked} entries, all resolve`);
