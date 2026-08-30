#!/usr/bin/env bun
/**
 * atproto-publish.ts — publish a notebook HTML as a NEW REVISION of an already
 * published atproto bundle (`com.lopecode.bundle`).
 *
 * The publish MECHANISM is not reimplemented here: at-write's `publishBundle`
 * (uploads + record + version snapshot), `extractFiles`, `extractCard`,
 * `knownCidsFromPds`, `listBundleVersions`, `notifyOfUpdate` and the
 * standard.site writers (`publishToStdSite` → `publishStdPub` + `publishStdDoc`,
 * `getStdDoc`) are loaded out of the publisher notebook HTML and run headlessly
 * via tools/notebook-import.ts; at-login's `createAppPasswordSession` + `xrpc`
 * supply the authenticated transport. This tool adds only CI policy: declared
 * rkeys, the idempotence gate, refuse-to-create, carry-forward defaults, and the
 * pre-write CAS check.
 *
 * Records written, in the browser widget's order (at-write `onPublish`):
 * `site.standard.publication` (upsert, TID) → `site.standard.document` (the TID
 * on the prior bundle's `stdDocUri`, else a fresh one) → `com.lopecode.bundle`
 * (+ version snapshot), so the bundle bakes in the document's URI and the
 * rendered page can emit `<link rel="site.standard.document">`. A sidecar
 * failure warns and still publishes the bundle. CI never writes an
 * `app.bsky.feed.post`: that record broadcasts into followers' feeds and stays a
 * deliberate human action.
 *
 * Identity comes from the notebook's sidecar `.json`, NOT from slugifying the
 * title — the shipped widget derives the rkey from the title, and 9 of the 10
 * live bundles have a title whose slug is not their rkey. Deriving would create
 * a second bundle and orphan the live one.
 *
 *   "publish": { "atproto": { "did": "did:plc:…", "rkey": "…", "auto": true } }
 *
 * Usage:
 *   bun tools/atproto-publish.ts --file <notebook.html> --publisher <atproto.html> [opts]
 *   bun tools/atproto-publish.ts --changed <paths.txt> --repo-root <dir> --publisher <atproto.html> [opts]
 *
 * Options:
 *   --repo-root <dir>   Content repo root (holds notebooks/); required for --changed
 *   --dry-run           Read everything, write nothing. Works with NO credentials.
 *   --json              Machine-readable result on stdout
 *   --allow-new         Permit creating a bundle that does not exist yet
 *   --bump-created-at   Set createdAt to now (shipped widget always does; CI preserves)
 *   --no-blob-cache     Re-upload every block instead of trusting listBlobs
 *
 * Credentials (not needed for --dry-run): ATPROTO_IDENTIFIER, ATPROTO_APP_PASSWORD
 *
 * Exit codes: 0 ok / no-change / skipped · 1 failure
 */

import { readFileSync, existsSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { DOMParser } from "linkedom";
import { importNotebookModule } from "./notebook-import.ts";
import { extractModuleContent } from "./channel/sync-module.ts";

const MAX_BLOCK_BYTES = 1_000_000;
const MAX_COVER_BYTES = 1_000_000;

type Decl = { did: string; rkey: string; auto?: boolean; title?: string };

// ---------------------------------------------------------------- args

type Opts = {
  file?: string;
  changed?: string;
  publisher?: string;
  repoRoot?: string;
  dryRun: boolean;
  json: boolean;
  allowNew: boolean;
  bumpCreatedAt: boolean;
  blobCache: boolean;
};

function parseArgs(argv: string[]): Opts {
  const o: Opts = { dryRun: false, json: false, allowNew: false, bumpCreatedAt: false, blobCache: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") o.file = argv[++i];
    else if (a === "--changed") o.changed = argv[++i];
    else if (a === "--publisher") o.publisher = argv[++i];
    else if (a === "--repo-root") o.repoRoot = argv[++i];
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--json") o.json = true;
    else if (a === "--allow-new") o.allowNew = true;
    else if (a === "--bump-created-at") o.bumpCreatedAt = true;
    else if (a === "--no-blob-cache") o.blobCache = false;
    else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
    else die(`unknown argument: ${a}`);
  }
  if (!o.publisher) die("--publisher <atproto.html> is required");
  if (!o.file && !o.changed) die("one of --file or --changed is required");
  if (o.file && o.changed) die("--file and --changed are mutually exclusive");
  if (o.changed && !o.repoRoot) die("--changed requires --repo-root");
  return o;
}

function usage() {
  console.log(`usage:
  bun tools/atproto-publish.ts --file <notebook.html> --publisher <atproto.html> [opts]
  bun tools/atproto-publish.ts --changed <paths.txt> --repo-root <dir> --publisher <atproto.html> [opts]

opts: --repo-root <dir> --dry-run --json --allow-new --bump-created-at --no-blob-cache
env:  ATPROTO_IDENTIFIER, ATPROTO_APP_PASSWORD (not needed for --dry-run)`);
}

function die(msg: string): never {
  console.error(`atproto-publish: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------- module loading

async function loadPublisher(publisherPath: string) {
  const html = readFileSync(publisherPath, "utf8");
  const dir = mkdtempSync(join(tmpdir(), "atpub-"));
  const write = (id: string, file: string) => {
    const src = extractModuleContent(html, id);
    if (src === null) throw new Error(`publisher HTML has no module block id="${id}"`);
    const p = join(dir, file);
    writeFileSync(p, src);
    return p;
  };
  const atPath = write("@tomlarkworthy/atproto", "atproto.js");
  const awPath = write("@tomlarkworthy/at-write", "at-write.js");
  const alPath = write("@tomlarkworthy/at-login", "at-login.js");

  const at = await importNotebookModule(atPath);
  const decodeBase64 = await at.value("decodeBase64");
  const textBytes = await at.value("textBytes");
  const resolvePds = await at.value("resolvePds");

  const inertStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const aw = await importNotebookModule(awPath, {
    overrides: { DOMParser, decodeBase64, textBytes, safeStorage: inertStorage, fetch, atob, Blob, Uint8Array, URLSearchParams },
  });

  // at-login's xrpc refresh path calls storage.save/clear; back it with memory so a
  // token refresh mid-run does not throw (there is no browser localStorage here).
  const mem = new Map<string, string>();
  const al = await importNotebookModule(alPath, {
    overrides: {
      safeStorage: {
        getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
      },
      indexedDB: {},
      resolvePds,
      fetch,
    },
  });

  return {
    resolvePds,
    extractFiles: (await aw.value("extractFiles")) as (h: string) => Promise<any[]>,
    extractCard: await aw.value("extractCard"),
    utils: await aw.value("utils"),
    publishBundle: await aw.value("publishBundle"),
    listBundleVersions: await aw.value("listBundleVersions"),
    knownCidsFromPds: await aw.value("knownCidsFromPds"),
    notifyOfUpdate: await aw.value("notifyOfUpdate"),
    resolveImageBytes: await aw.value("resolveImageBytes"),
    publishToStdSite: await aw.value("publishToStdSite"),
    publishStdPub: await aw.value("publishStdPub"),
    publishStdDoc: await aw.value("publishStdDoc"),
    getStdDoc: await aw.value("getStdDoc"),
    xrpc: await al.value("xrpc"),
    createAppPasswordSession: await al.value("createAppPasswordSession"),
    dispose: () => { at.dispose(); aw.dispose(); al.dispose(); },
  };
}

// ----------------------------------------------------------- declarations

function readDeclaration(sidecarPath: string): { decl: Decl | null; armed: boolean } {
  if (!existsSync(sidecarPath)) return { decl: null, armed: false };
  let spec: any;
  try { spec = JSON.parse(readFileSync(sidecarPath, "utf8")); }
  catch (e: any) { die(`${sidecarPath}: invalid JSON (${e.message})`); }
  const a = spec?.publish?.atproto;
  if (!a) return { decl: null, armed: false };
  if (a.auto !== true) return { decl: a, armed: false };
  if (!a.did || !a.rkey) die(`${sidecarPath}: publish.atproto is armed but missing did/rkey`);
  return { decl: a as Decl, armed: true };
}

// Two notebooks pointing at one bundle would silently overwrite each other.
function assertNoDuplicateTargets(repoRoot: string) {
  const dir = join(repoRoot, "notebooks");
  if (!existsSync(dir)) return;
  const seen = new Map<string, string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let spec: any;
    try { spec = JSON.parse(readFileSync(join(dir, f), "utf8")); } catch { continue; }
    const a = spec?.publish?.atproto;
    if (!a?.did || !a?.rkey) continue;
    const key = `${a.did}/${a.rkey}`;
    if (seen.has(key)) die(`two sidecars declare the same bundle ${key}: ${seen.get(key)} and ${f}`);
    seen.set(key, f);
  }
}

// -------------------------------------------------------------- pds reads

async function getJson(url: string): Promise<{ status: number; body: any }> {
  const r = await fetch(url);
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

async function getBundle(pds: string, did: string, rkey: string) {
  const u = `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=com.lopecode.bundle&rkey=${encodeURIComponent(rkey)}`;
  const { status, body } = await getJson(u);
  // A missing record is a 400 RecordNotFound here; any other 400 is a real fault
  // (bad repo, bad collection) and must not be mistaken for "publish me fresh".
  if (status === 404 || (status === 400 && body?.error === "RecordNotFound")) return null;
  if (status !== 200) throw new Error(`getRecord ${rkey} → ${status} ${body?.error ?? ""}`);
  return { cid: body.cid as string, value: body.value as any };
}

// The document's bskyPostRef, so a republish preserves it: prefer the live
// document's own ref, else resolve the bundle's bskyPostUri to a strongRef.
// CI never creates a post, so this is carry-forward only.
async function carriedBskyPostRef(
  pub: any, session: any, pds: string, did: string,
  priorDocUri: string | null, priorPostUri: string | null,
) {
  if (priorDocUri) {
    try {
      const got = await pub.getStdDoc({ session, xrpc: pub.xrpc, rkey: priorDocUri.split("/").pop() });
      if (got?.value?.bskyPostRef) return got.value.bskyPostRef;
    } catch { /* a missing/unreadable doc is not a reason to fail the publish */ }
  }
  if (priorPostUri) {
    const rk = priorPostUri.split("/").pop()!;
    const u = `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=app.bsky.feed.post&rkey=${encodeURIComponent(rk)}`;
    const { status, body } = await getJson(u);
    if (status === 200 && body?.cid) return { $type: "com.atproto.repo.strongRef", uri: priorPostUri, cid: body.cid };
  }
  return null;
}

function readCard(pub: any, html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || null;
  const { description, coverSrc } = pub.extractCard(html);
  return { title, description, coverSrc };
}

// ---------------------------------------------------------------- session

async function makeSession(createAppPasswordSession: any) {
  const identifier = process.env.ATPROTO_IDENTIFIER;
  const password = process.env.ATPROTO_APP_PASSWORD;
  if (!identifier || !password) die("ATPROTO_IDENTIFIER and ATPROTO_APP_PASSWORD are required (or pass --dry-run)");
  return createAppPasswordSession({ identifier, password });
}

// ---------------------------------------------------------------- publish

type Result = Record<string, any>;

async function publishNotebook(
  pub: Awaited<ReturnType<typeof loadPublisher>>,
  htmlPath: string,
  decl: Decl,
  opts: Opts,
  session: any | null,
): Promise<Result> {
  const log = (s: string) => { if (!opts.json) console.log(s); };
  const html = readFileSync(htmlPath, "utf8");

  const files = await pub.extractFiles(html);
  if (files.length === 0) throw new Error(`${htmlPath}: no <script id data-mime> blocks found`);
  for (const f of files) {
    if (f.size > MAX_BLOCK_BYTES) throw new Error(`${htmlPath}: block ${f.id} is ${f.size}B, over the ${MAX_BLOCK_BYTES}B blob limit`);
  }

  const { did, rkey } = decl;
  if (session && session.did !== did) throw new Error(`declaration targets ${did} but the session is ${session.did}`);

  const { pds } = await pub.resolvePds(did);
  const prior = await getBundle(pds, did, rkey);
  if (!prior && !opts.allowNew) {
    throw new Error(
      `no com.lopecode.bundle/${rkey} on ${did}. Refusing to create it: if the rkey is a typo a silent create ` +
      `leaves the live bundle orphaned and unreachable. Verify the declaration, then pass --allow-new.`,
    );
  }

  const card = readCard(pub, html);
  // decl.title pins presentation the way decl.rkey pins identity — the HTML <title>
  // of a tool notebook is often its module id, not the published display name.
  const title = decl.title || card.title || prior?.value?.title;
  if (!title) throw new Error(`${htmlPath}: no <title> and no prior record to inherit one from`);
  const description = card.description ?? prior?.value?.description ?? null;

  // Idempotence gate. publishBundleVersion snapshots the prior value on EVERY call, so an
  // unguarded re-run (a push touching an unrelated file) grows the DAG with identical copies.
  const localCids = new Map<string, string>(files.map((f: any) => [f.id, f.cid]));
  const priorCids = new Map<string, string>((prior?.value?.files || []).map((f: any) => [f.id, f.blob?.ref?.$link]));
  const sameFiles =
    localCids.size === priorCids.size && [...localCids].every(([id, cid]) => priorCids.get(id) === cid);
  const identical = [...localCids].filter(([id, cid]) => priorCids.get(id) === cid).length;
  const changed = [...localCids].filter(([id, cid]) => priorCids.has(id) && priorCids.get(id) !== cid).length;
  const added = [...localCids].filter(([id]) => !priorCids.has(id)).length;
  const removed = [...priorCids].filter(([id]) => !localCids.has(id)).length;

  const unchanged =
    !!prior && sameFiles && title === prior.value.title && (description ?? null) === (prior.value.description ?? null);
  // …except when the bundle carries no stdDocUri: it then has no standard.site
  // document, so /r/<rkey> emits no <link rel="site.standard.document"> and no
  // indexer can verify it. Write the document and republish to record its URI —
  // the backfill path for bundles published before sidecars were written here.
  const backfill = unchanged && !prior!.value.stdDocUri;
  if (unchanged && !backfill) {
    log(`${basename(htmlPath)}: no change (${files.length} blocks identical, title and description unchanged) — not publishing`);
    return { notebook: htmlPath, rkey, did, status: "unchanged", blocks: files.length };
  }
  if (backfill) {
    log(`${basename(htmlPath)}: content unchanged but the bundle has no stdDocUri — writing the standard.site records and republishing to bind them`);
  }

  const known: Set<string> = opts.blobCache ? await pub.knownCidsFromPds({ pds, did }) : new Set<string>();

  // coverImage: project the local og:image to a PDS blob (not a bundle file), else carry the
  // prior one. Oversized covers are dropped, not fatal (at-write:507).
  let coverImage: any = prior?.value?.coverImage ?? null;
  let coverPlan = coverImage ? "carried" : "none";
  if (card.coverSrc) {
    const blob = await pub.resolveImageBytes(card.coverSrc);
    if (blob?.size && blob.size <= MAX_COVER_BYTES) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const cid = await pub.utils.computeCid(bytes);
      const mimeType = blob.type || "image/png";
      if (known.has(cid)) {
        coverImage = { $type: "blob", ref: { $link: cid }, mimeType, size: bytes.length };
        coverPlan = "local (already on PDS)";
      } else if (opts.dryRun) {
        coverPlan = `local (would upload ${bytes.length} B)`;
      } else {
        const r = await pub.xrpc(session, "com.atproto.repo.uploadBlob", {
          method: "POST", headers: { "content-type": mimeType }, body: bytes,
        });
        if (r.ok) { coverImage = (await r.json()).blob; known.add(cid); coverPlan = "local (uploaded)"; }
        else coverPlan = `upload failed ${r.status}, ${coverImage ? "kept prior" : "none"}`;
      }
    } else if (blob) {
      coverPlan = `dropped (${blob.size} B over the ${MAX_COVER_BYTES} B cap)`;
    } else {
      coverPlan = `${coverImage ? "carried" : "none"} (og:image unresolvable)`;
    }
  }

  const uploadCandidates = files.filter((f: any) => !known.has(f.cid));
  const uploadBytes = uploadCandidates.reduce((a: number, f: any) => a + f.size, 0);

  const publicXrpc = (_s: any, path: string) => fetch(`${pds}/xrpc/${path}`);
  const snapshots = await pub.listBundleVersions({ did, xrpc: publicXrpc, rkey });
  const trueTip = snapshots.length ? snapshots[0].uri : null;
  const wouldVersionRkey = `${rkey}--${pub.utils.genTid()}`;
  const createdAt = opts.bumpCreatedAt || !prior?.value?.createdAt ? new Date().toISOString() : prior.value.createdAt;
  const bskyPostUri = prior?.value?.bskyPostUri ?? null;
  const stdDocUri = prior?.value?.stdDocUri ?? null;

  if (!opts.json) {
    console.log(`notebook  ${htmlPath}`);
    console.log(`identity  ${did}`);
    console.log(`          pds ${pds}`);
    console.log(`rkey      ${rkey}  ${prior ? `EXISTS (cid ${prior.cid})` : "NEW"}`);
    console.log(`title     ${JSON.stringify(title)}${decl.title ? " (declared)" : card.title ? " (local)" : " (carried from prior)"}`);
    console.log(`blocks    ${files.length} local · ${known.size} blobs already on the PDS`);
    console.log(`          ${identical} identical · ${changed} changed · ${added} added · ${removed} removed`);
    console.log(`uploads   ${uploadCandidates.length} pending (${(uploadBytes / 1024).toFixed(0)} KB)`);
    for (const f of uploadCandidates.slice(0, 6)) console.log(`            ${f.id} (${f.size} B)`);
    if (uploadCandidates.length > 6) console.log(`            … ${uploadCandidates.length - 6} more`);
    console.log(
      `record    description: ${card.description ? "local" : description ? "carried" : "none"}` +
      ` · coverImage: ${coverPlan}` +
      ` · bskyPostUri: ${bskyPostUri ? "carried" : "none"}` +
      ` · stdDocUri: ${stdDocUri ? "carried" : "none"}`,
    );
    console.log(`          createdAt: ${createdAt}${opts.bumpCreatedAt ? " (bumped)" : " (preserved)"}`);
    console.log(
      `sidecars  site.standard.publication upsert · site.standard.document ` +
      `${stdDocUri ? `update ${stdDocUri}` : "create (new TID)"} · no app.bsky.feed.post from CI`,
    );
    console.log(`version   would create com.lopecode.bundle.version/${wouldVersionRkey}`);
    console.log(`          ${snapshots.length} existing snapshot(s); previousVersion ${trueTip || "(none)"}`);
  }

  const base = {
    notebook: htmlPath, did, rkey, pds, title,
    exists: !!prior, blocks: files.length,
    identical, changed, added, removed,
    uploads: uploadCandidates.length, uploadBytes,
    versionRkey: wouldVersionRkey, trueTip,
    uri: `at://${did}/com.lopecode.bundle/${rkey}`,
    webUri: `https://${did.replace(/:/g, "-")}.lopecode.com/r/${rkey}`,
  };

  if (opts.dryRun) {
    if (!opts.json) console.log(`writes    SKIPPED (--dry-run)`);
    return { ...base, status: "dry-run" };
  }

  // CAS. applyWrites has no per-op swapRecord (at-write:1501-1506), so re-reading the
  // record immediately before the write is the only guard against clobbering a human
  // who published between our first getRecord and now.
  const fresh = await getBundle(pds, did, rkey);
  if ((fresh?.cid ?? null) !== (prior?.cid ?? null)) {
    throw new Error(`bundle ${rkey} changed under us (${prior?.cid} → ${fresh?.cid}); re-run against the new revision`);
  }

  const ensureScopes = async () => session; // app-password sessions have blanket repo access (at-login:568-570)

  // R7: a cache-hit synthesizes the blob ref from local bytes; disagree with the
  // prior record's entry for the same CID and something is lying.
  const priorByCid = new Map<string, any>((prior?.value?.files || []).map((f: any) => [f.blob?.ref?.$link, f.blob]));
  for (const f of files) {
    const was = priorByCid.get(f.cid);
    if (known.has(f.cid) && was && (was.size !== f.size || was.mimeType !== f.mime)) {
      console.warn(`warning: ${f.id} reuses ${f.cid} but prior record had ${was.mimeType}/${was.size}B, local is ${f.mime}/${f.size}B`);
    }
  }

  // standard.site sidecars, written BEFORE the bundle exactly as the widget does
  // (at-write onPublish): the publication is upserted at its TID, the document is
  // updated in place at the prior bundle's stdDocUri (or created), and the URI it
  // returns is baked into the bundle record below. App-password sessions have
  // unrestricted repo write — scopes exist only for OAuth, and at-login's
  // ensureScopes returns the session untouched for authType !== 'oauth'
  // (at-login:562-570) — so there is nothing here the CI session cannot write.
  // A sidecar failure warns and still publishes the bundle: the bundle is the
  // canonical artifact and a missing document is recoverable on the next run.
  // No app.bsky.feed.post: that is the one record that broadcasts.
  const baseUrl = `https://${did.replace(/:/g, "-")}.lopecode.com`;
  let newStdDocUri: string | null = stdDocUri;
  let stdPubUri: string | null = null;
  let sidecarWarning: string | null = null;
  try {
    const std = await pub.publishToStdSite(
      {
        session, xrpc: pub.xrpc, ensureScopes,
        rkey, priorDocUri: stdDocUri ?? undefined,
        title, baseUrl,
        description: description ?? undefined,
        coverImage: coverImage ?? undefined,
        // publishStdDoc rewrites the record whole, so an existing bskyPostRef is
        // dropped unless handed back.
        bskyPostRef: (await carriedBskyPostRef(pub, session, pds, did, stdDocUri, bskyPostUri)) ?? undefined,
        pubName: `@${session.handle || did}`,
        pubUrl: baseUrl,
      },
      { publishStdPub: pub.publishStdPub, publishStdDoc: pub.publishStdDoc },
    );
    stdPubUri = std.publication?.uri ?? null;
    if (!opts.json) {
      console.log(`sidecars  document ${stdDocUri && std.uri === stdDocUri ? "updated" : "created"} ${std.uri}`);
      console.log(`          publication ${stdPubUri}${std.publication?.skipped ? " (unchanged)" : ""}`);
    }
    newStdDocUri = std.uri;
  } catch (e: any) {
    sidecarWarning = e.message || String(e);
    console.warn(`warning: standard.site sidecars failed for ${rkey}: ${sidecarWarning} — publishing the bundle anyway`);
  }

  const result = await pub.publishBundle({
    session, xrpc: pub.xrpc, ensureScopes,
    files, title, rkey, prior,
    knownCids: known,
    createdAt, description, coverImage,
    stdDocUri: newStdDocUri,
  });
  const uploaded = result.uploaded, skipped = result.skipped;

  const notified = (await pub.notifyOfUpdate(base.uri)) ?? "failed";

  if (!opts.json) {
    console.log(`published ${base.uri}`);
    console.log(`          ${base.webUri}`);
    console.log(`          ${uploaded} uploaded · ${skipped} reused · version ${result?.versionRkey || "(first publish)"} · notify ${notified}`);
  }
  return {
    ...base, status: "published", uploaded, skipped,
    versionRkey: result?.versionRkey ?? null, notify: notified,
    stdDocUri: newStdDocUri, stdPubUri, sidecarWarning,
  };
}

// ------------------------------------------------------------ changed mode

function stemsFromChangedFile(path: string): string[] {
  const lines = readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  const stems: string[] = [];
  for (const l of lines) {
    const m = /^notebooks\/(.+)\.(html|json)$/.exec(l);
    if (!m) continue;
    if (!stems.includes(m[1])) stems.push(m[1]);
  }
  return stems;
}

export { loadPublisher, publishNotebook, readDeclaration, stemsFromChangedFile };
export type { Decl, Opts };

// --------------------------------------------------------------------- main

// Guarded so the module can be imported by tests without running the CLI.
if (import.meta.main) {

  const opts = parseArgs(process.argv.slice(2));

  if (opts.repoRoot) assertNoDuplicateTargets(resolve(opts.repoRoot));

  type Job = { html: string; sidecar: string };
  const jobs: Job[] = [];

  if (opts.file) {
    const html = resolve(opts.file);
    if (!existsSync(html)) die(`${opts.file}: not found`);
    jobs.push({ html, sidecar: html.replace(/\.html$/, ".json") });
  } else {
    const root = resolve(opts.repoRoot!);
    for (const stem of stemsFromChangedFile(resolve(opts.changed!))) {
      const html = join(root, "notebooks", `${stem}.html`);
      const sidecar = join(root, "notebooks", `${stem}.json`);
      if (!existsSync(html)) { console.error(`skip ${stem}: .html not on disk (unpublish is manual)`); continue; }
      jobs.push({ html, sidecar });
    }
  }

  const targets: { job: Job; decl: Decl }[] = [];
  for (const job of jobs) {
    const { decl, armed } = readDeclaration(job.sidecar);
    if (!decl) { if (opts.changed) continue; die(`${job.sidecar}: no publish.atproto declaration`); }
    if (!armed) { console.error(`skip ${basename(job.html)}: declared but not armed (publish.atproto.auto !== true)`); continue; }
    targets.push({ job, decl });
  }

  if (targets.length === 0) {
    if (!opts.json) console.log("nothing to publish");
    else console.log(JSON.stringify({ results: [] }, null, 2));
    process.exit(0);
  }

  const pub = await loadPublisher(resolve(opts.publisher!));
  const session = opts.dryRun ? null : await makeSession(pub.createAppPasswordSession);

  const results: Result[] = [];
  let failed = 0;
  for (const { job, decl } of targets) {
    try {
      results.push(await publishNotebook(pub, job.html, decl, opts, session));
    } catch (e: any) {
      failed++;
      results.push({ notebook: job.html, rkey: decl.rkey, status: "error", error: e.message });
      console.error(`FAIL ${basename(job.html)}: ${e.message}`);
    }
  }

  if (opts.json) console.log(JSON.stringify({ results }, null, 2));
  pub.dispose();
  process.exit(failed ? 1 : 0);
}
