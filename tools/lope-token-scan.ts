/**
 * lope-token-scan.ts — refuse to commit a notebook whose default hash carries a
 * pairing token.
 *
 * The exporter captures `location.hash` into bootconf.json's `hash` when no hash
 * is given (exporter-3: `if (!options.hash) options.hash = location.hash`). A tab
 * paired with Claude Code carries `&cc=LOPE-<port>-<id>` in that hash, so the
 * export inherits it. On load, claude-code-pairing auto-connects from that param
 * and opens `ws://localhost:<port>/ws` — from a public origin Chrome shows the
 * Local Network Access prompt to every reader (seen 2026-08-29 on the published
 * newsletter-001, hash `...&cc=LOPE-60980-SJCZ`).
 *
 * Checks the parseable bootconf block of each HTML given, and the `bootconf.hash`
 * of a sibling .json spec (spec-sync copies the block there). Exit 1 on a hit.
 *
 *   bun tools/lope-token-scan.ts <notebook.html|spec.json>...
 */
import { readFileSync, existsSync } from "fs";
import { bootconfIn } from "./lope-sync.ts";

const TOKEN = /[&?#]cc=LOPE-\d+-[A-Z0-9]+/;

function hashOf(path: string): string | null {
  const text = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    try { return String(JSON.parse(text)?.bootconf?.hash ?? ""); } catch { return null; }
  }
  const bc = bootconfIn(text);
  return bc ? String(bc.hash ?? "") : null;
}

const files = process.argv.slice(2).filter(existsSync);
let bad = 0;
for (const f of files) {
  const h = hashOf(f);
  const m = h && h.match(TOKEN);
  if (!m) continue;
  bad++;
  console.error(`${f}: bootconf hash carries a pairing token (${m[0].slice(1)}) — strip it before committing`);
}
if (bad) {
  console.error(`\n${bad} notebook(s) would auto-connect to localhost on load. Remove '&cc=...' from the bootconf hash and the sibling spec, or re-export from a tab without a pairing token.`);
  process.exit(1);
}
