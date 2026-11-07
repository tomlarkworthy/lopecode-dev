#!/usr/bin/env bun
/**
 * atproto-publish-lexicons.ts — publish lexicon JSON files as `com.atproto.lexicon.schema`
 * records, the form atproto lexicon resolution reads: the record's rkey is the NSID, the repo
 * is the DID that the TXT record `_lexicon.<authority>` names (for `com.lopecode.module`,
 * `_lexicon.lopecode.com`). The value is the lexicon document with `$type` added.
 *
 * A file whose record already holds the same document is left (no-change). A changed one is
 * written with putRecord, swapRecord set to the CID read, so a write in between fails it.
 * The session's DID must be the one DNS names, or nothing is written. A file whose authority has
 * no `_lexicon` TXT record is skipped with a warning (exit 0): no resolver could reach its record.
 *
 * Usage:
 *   bun tools/atproto-publish-lexicons.ts --publisher <atproto.html> [--dry-run] <lexicon.json>…
 *   bun tools/atproto-publish-lexicons.ts --publisher <atproto.html> --changed <paths.txt> --repo-root <dir> [--dry-run]
 *
 * With --changed, only paths under lexicons/ ending .json are taken.
 * Credentials (not needed for --dry-run): ATPROTO_IDENTIFIER, ATPROTO_APP_PASSWORD
 * Exit codes: 0 ok / no-change / nothing to do · 1 failure
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPublisher } from "./atproto-publish.ts";

const COLLECTION = "com.atproto.lexicon.schema";

function die(msg: string): never {
  console.error(`atproto-publish-lexicons: ${msg}`);
  process.exit(1);
}

// The NSID's authority is its segments but the last, reversed: com.lopecode.module -> lopecode.com.
export const authorityOf = (nsid: string) => nsid.split(".").slice(0, -1).reverse().join(".");

export const sameDoc = (a: any, b: any) => {
  const canon = (v: any): any =>
    Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).filter((k) => k !== "$type").sort().map((k) => [k, canon(v[k])]))
      : v;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
};

// DNS over HTTPS, so it runs where the resolver is blocked.
async function lexiconDid(authority: string): Promise<string | null> {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=_lexicon.${authority}&type=TXT`, { headers: { accept: "application/dns-json" } });
  if (!r.ok) throw new Error(`DNS _lexicon.${authority} -> ${r.status}`);
  const dids = ((await r.json()).Answer || []).map((a: any) => String(a.data).replace(/"/g, "")).filter((t: string) => t.startsWith("did=")).map((t: string) => t.slice(4));
  if (dids.length > 1) throw new Error(`_lexicon.${authority} names ${dids.length} DIDs, not 1`);
  return dids[0] ?? null;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
  const dryRun = argv.includes("--dry-run") && !!argv.splice(argv.indexOf("--dry-run"), 1);
  const publisher = flag("--publisher") || die("--publisher <atproto.html> is required");
  const changed = flag("--changed"), repoRoot = flag("--repo-root") || ".";
  const files = changed
    ? readFileSync(changed, "utf8").split("\n").map((s) => s.trim()).filter((p) => /^lexicons\/.+\.json$/.test(p)).map((p) => join(repoRoot, p)).filter(existsSync)
    : argv.map((p) => resolve(p));
  if (!files.length) { console.log("no lexicons to publish"); return; }

  const pub = await loadPublisher(resolve(publisher));
  let session: any = null;
  if (!dryRun) {
    const identifier = process.env.ATPROTO_IDENTIFIER, password = process.env.ATPROTO_APP_PASSWORD;
    if (!identifier || !password) die("ATPROTO_IDENTIFIER and ATPROTO_APP_PASSWORD are required (or pass --dry-run)");
    session = await pub.createAppPasswordSession({ identifier, password });
  }

  let failed = 0;
  for (const file of files) {
    try {
      const doc = JSON.parse(readFileSync(file, "utf8"));
      if (doc.lexicon !== 1 || typeof doc.id !== "string") throw new Error("not a lexicon document (lexicon: 1, id)");
      const did = await lexiconDid(authorityOf(doc.id));
      // No resolver can reach a record without the TXT record, so it is not written; a warning, not a failure.
      if (!did) { console.log(`::warning::skip ${doc.id}: no _lexicon.${authorityOf(doc.id)} TXT record names a DID`); continue; }
      if (session && session.did !== did) throw new Error(`the session is ${session.did}; _lexicon.${authorityOf(doc.id)} names ${did}`);
      const { pds } = await pub.resolvePds(did);
      const g = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${COLLECTION}&rkey=${encodeURIComponent(doc.id)}`);
      const got = await g.json().catch(() => ({}));
      if (!g.ok && got.error !== "RecordNotFound") throw new Error(`getRecord -> ${g.status} ${got.error ?? ""}`);
      const prior = g.ok ? got : null;
      const uri = `at://${did}/${COLLECTION}/${doc.id}`;
      if (prior && sameDoc(prior.value, doc)) { console.log(`no-change ${uri} ${prior.cid}`); continue; }
      if (dryRun) { console.log(`would ${prior ? "update" : "create"} ${uri}${prior ? ` (over ${prior.cid})` : ""}`); continue; }
      const body: any = { repo: did, collection: COLLECTION, rkey: doc.id, record: { $type: COLLECTION, ...doc } };
      if (prior) body.swapRecord = prior.cid;
      const r = await pub.xrpc(session, "com.atproto.repo.putRecord", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`putRecord -> ${r.status} ${await r.text()}`);
      console.log(`${prior ? "updated" : "created"} ${uri} ${(await r.json()).cid}`);
    } catch (e: any) {
      failed++;
      console.error(`FAIL ${file}: ${e.message}`);
    }
  }
  pub.dispose();
  process.exit(failed ? 1 : 0);
}

if (import.meta.main) main();
