// Criterion stamps for eval result JSONs (plan/rqgm-and-robocoop-5.md, U2).
//
// A score is only comparable to another score measured under the SAME utility function. Ours is
// defined by: the core modules under test, the runner protocol, the problem set, and the grader.
// Until 2026-08-17 none of that was recorded, so the July polyglot 0.776 (measured under a
// problems.json whose word-search export contract was empty) and the current 0.796 (measured under
// the fixed one) sit in the same ladder row as if they were one progression. The stamp makes that
// difference visible in metadata; `eval/ladder.mjs` refuses to pool rows whose stamps differ.
//
// The stamp is a PURE function of its inputs — no timestamps, no model. `model` is already a
// top-level field of every result JSON, and a date is a property of the run, not of the criterion.
//
// Missing inputs hash to null rather than throwing: a stamp must never be able to abort a sweep
// whose tokens are already spent.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** sha256, first 12 hex chars — collision-safe enough to name a version, short enough to read. */
export function sha12(data) {
  return createHash("sha256").update(data).digest("hex").slice(0, 12);
}

/** sha12 of a file's bytes, or null if it cannot be read. */
export function fileHash(path) {
  try { return sha12(readFileSync(path)); } catch { return null; }
}

const CORE_ID = /^@tomlarkworthy\/robocoop-5/;

/**
 * Hash every `<script type="text/plain" id="@tomlarkworthy/robocoop-5*">` block's text content.
 * Regex over the raw HTML — house rule: never load a 2-3MB notebook into a DOM. Attribute order
 * varies between exporter versions (`id` first in current exports), so match attributes, not a
 * fixed prefix. Returns a map id -> sha12, key-sorted so the stamp is byte-stable.
 */
export function coreModuleHashesFromHtml(html) {
  const out = {};
  const tag = /<script\b([^>]*)>/gi;
  let m;
  while ((m = tag.exec(html)) !== null) {
    const attrs = m[1];
    if (!/type\s*=\s*"text\/plain"/i.test(attrs)) continue;
    const id = /\bid\s*=\s*"([^"]*)"/i.exec(attrs)?.[1];
    if (!id || !CORE_ID.test(id)) continue;
    const start = m.index + m[0].length;
    const end = html.indexOf("</script>", start);
    if (end < 0) continue;
    out[id] = sha12(html.slice(start, end));
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

/** As above, from a notebook path. Returns null when the notebook cannot be read. */
export function coreModuleHashes(notebookPath) {
  let html;
  try { html = readFileSync(notebookPath, "utf8"); } catch { return null; }
  return coreModuleHashesFromHtml(html);
}

/**
 * criterionStamp({ notebookPath, extra }) -> the criterion identity for one eval run.
 *
 * `extra` is copied verbatim (per-benchmark fields: problemsJsonHash, graderHash, retailExportHash,
 * envHash, …) with one exception: `runnerPath` is consumed and replaced by `runnerHash`, so callers
 * pass `fileURLToPath(import.meta.url)` and never hash themselves.
 */
export function criterionStamp({ notebookPath = null, extra = {} } = {}) {
  const { runnerPath, ...rest } = extra;
  const stamp = {
    stampVersion: 1,
    notebookPath,
    coreModuleHashes: notebookPath ? coreModuleHashes(notebookPath) : null,
    runnerHash: runnerPath ? fileHash(runnerPath) : (rest.runnerHash ?? null),
    ...rest,
  };
  return stamp;
}
