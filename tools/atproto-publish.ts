#!/usr/bin/env bun
/**
 * atproto-publish.ts — publish a notebook HTML as a NEW REVISION of an already
 * published atproto bundle (`com.lopecode.bundle`).
 *
 * The publish MECHANISM is not reimplemented here: at-write's `extractFiles`,
 * `utils` (CID/TID) and `publishBundleVersion` are loaded out of the publisher
 * notebook HTML and run headlessly via tools/notebook-import.ts, and at-login's
 * `xrpc` supplies the authenticated transport. Only the ~90-line orchestration
 * that lives inside at-write's DOM widget (`onPublish`) is ported.
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
const NOTIFY_URL = "https://contrail.lopecode.com/xrpc/com.lopecode.notifyOfUpdate";

type Decl = { did: string; rkey: string; auto?: boolean };

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
    overrides: { DOMParser, decodeBase64, textBytes, safeStorage: inertStorage, fetch, atob, Blob, Uint8Array },
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
    },
  });

  return {
    resolvePds,
    extractFiles: (await aw.value("extractFiles")) as (h: string) => Promise<any[]>,
    utils: await aw.value("utils"),
    publishBundleVersion: await aw.value("publishBundleVersion"),
    resolveImageBytes: await aw.value("resolveImageBytes"),
    xrpc: await al.value("xrpc"),
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

async function listKnownBlobs(pds: string, did: string): Promise<Set<string>> {
  const known = new Set<string>();
  let cursor: string | undefined;
  do {
    const u = new URL(`${pds}/xrpc/com.atproto.sync.listBlobs`);
    u.searchParams.set("did", did);
    u.searchParams.set("limit", "1000");
    if (cursor) u.searchParams.set("cursor", cursor);
    const { status, body } = await getJson(u.toString());
    if (status !== 200) throw new Error(`listBlobs → ${status}`);
    for (const c of body.cids || []) known.add(c);
    cursor = body.cursor;
  } while (cursor);
  return known;
}

// publishBundleVersion's own tip lookup (at-write:1470-1484) scopes listRecords with
// rkeyStart/rkeyEnd, which bsky.network PDSes ignore — so the previousVersion it records
// can point at another bundle's snapshot. Compute the real tip here and warn on divergence.
// Fixing it belongs upstream in at-write, not in this tool.
async function versionTips(pds: string, did: string, rkey: string) {
  const prefix = `${rkey}--`;
  const mine: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const u = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    u.searchParams.set("repo", did);
    u.searchParams.set("collection", "com.lopecode.bundle.version");
    u.searchParams.set("limit", "100");
    if (cursor) u.searchParams.set("cursor", cursor);
    const { status, body } = await getJson(u.toString());
    if (status !== 200) break;
    for (const rec of body.records || []) {
      const rk = String(rec.uri).split("/").pop()!;
      if (rk.startsWith(prefix)) mine.push(rec.uri);
    }
    cursor = body.cursor;
    if (!cursor) break;
  }
  const trueTip = mine.length ? mine.slice().sort().pop()! : null;

  const s = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
  s.searchParams.set("repo", did);
  s.searchParams.set("collection", "com.lopecode.bundle.version");
  s.searchParams.set("limit", "1");
  s.searchParams.set("rkeyStart", `${rkey}--`);
  s.searchParams.set("rkeyEnd", `${rkey}-.`);
  s.searchParams.set("reverse", "true");
  const { status, body } = await getJson(s.toString());
  const shippedTip = status === 200 && body.records?.length ? (body.records[0].uri as string) : null;

  return { trueTip, shippedTip, snapshots: mine.length };
}

// ------------------------------------------------------------ card + title

function readCard(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || null;
  const d =
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="description"]')?.getAttribute("content");
  const img = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
  return {
    title,
    description: d && d.trim() ? d.trim().slice(0, 2000) : null,
    coverSrc: img && img.trim() ? img.trim() : null,
  };
}

// ---------------------------------------------------------------- session

async function makeSession(resolvePds: any) {
  const identifier = process.env.ATPROTO_IDENTIFIER;
  const password = process.env.ATPROTO_APP_PASSWORD;
  if (!identifier || !password) die("ATPROTO_IDENTIFIER and ATPROTO_APP_PASSWORD are required (or pass --dry-run)");
  const { pds } = await resolvePds(identifier);
  const r = await fetch(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!r.ok) throw new Error(`createSession ${r.status}`); // body may echo the password
  const d = await r.json();
  // authType is load-bearing: xrpc (at-login:333) branches to the DPoP path for "oauth".
  return { did: d.did, handle: d.handle, pds, accessJwt: d.accessJwt, refreshJwt: d.refreshJwt, authType: "app-password" };
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

  const card = readCard(html);
  const title = card.title || prior?.value?.title;
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

  if (prior && sameFiles && title === prior.value.title && (description ?? null) === (prior.value.description ?? null)) {
    log(`${basename(htmlPath)}: no change (${files.length} blocks identical, title and description unchanged) — not publishing`);
    return { notebook: htmlPath, rkey, did, status: "unchanged", blocks: files.length };
  }

  const known = opts.blobCache ? await listKnownBlobs(pds, did) : new Set<string>();
  const priorByCid = new Map<string, any>((prior?.value?.files || []).map((f: any) => [f.blob?.ref?.$link, f.blob]));

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

  const tips = await versionTips(pds, did, rkey);
  const wouldVersionRkey = `${rkey}--${pub.utils.genTid()}`;
  const createdAt = opts.bumpCreatedAt || !prior?.value?.createdAt ? new Date().toISOString() : prior.value.createdAt;
  const bskyPostUri = prior?.value?.bskyPostUri ?? null;
  const stdDocUri = prior?.value?.stdDocUri ?? null;

  if (!opts.json) {
    console.log(`notebook  ${htmlPath}`);
    console.log(`identity  ${did}`);
    console.log(`          pds ${pds}`);
    console.log(`rkey      ${rkey}  ${prior ? `EXISTS (cid ${prior.cid})` : "NEW"}`);
    console.log(`title     ${JSON.stringify(title)}${card.title ? " (local)" : " (carried from prior)"}`);
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
    console.log(`version   would create com.lopecode.bundle.version/${wouldVersionRkey}`);
    console.log(`          ${tips.snapshots} existing snapshot(s); previousVersion ${tips.trueTip || "(none)"} (client-side tip — PDS ignores rkeyStart/rkeyEnd)`);
    if (tips.shippedTip !== tips.trueTip) {
      console.log(`          note: browser at-write would have recorded ${tips.shippedTip || "(none)"}; the CI xrpc shim corrects this`);
    }
  }

  const base = {
    notebook: htmlPath, did, rkey, pds, title,
    exists: !!prior, blocks: files.length,
    identical, changed, added, removed,
    uploads: uploadCandidates.length, uploadBytes,
    versionRkey: wouldVersionRkey, trueTip: tips.trueTip, shippedTip: tips.shippedTip,
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
  const force = new Set<string>();
  let uploaded = 0, skipped = 0, result: any;

  for (let attempt = 0; attempt < 2; attempt++) {
    uploaded = 0; skipped = 0;
    const filesTable: any[] = [];
    for (const f of files) {
      let blob: any;
      if (!force.has(f.cid) && known.has(f.cid)) {
        blob = { $type: "blob", ref: { $link: f.cid }, mimeType: f.mime, size: f.size };
        const was = priorByCid.get(f.cid);
        if (was && (was.size !== f.size || was.mimeType !== f.mime)) {
          console.warn(`warning: ${f.id} reuses ${f.cid} but prior record had ${was.mimeType}/${was.size}B, local is ${f.mime}/${f.size}B`);
        }
        skipped++;
      } else {
        const r = await pub.xrpc(session, "com.atproto.repo.uploadBlob", {
          method: "POST", headers: { "content-type": f.mime }, body: f.bytes,
        });
        if (!r.ok) throw new Error(`uploadBlob ${f.id} → ${r.status}: ${await r.text()}`);
        blob = (await r.json()).blob;
        known.add(f.cid);
        uploaded++;
      }
      filesTable.push({ id: f.id, encoding: f.encoding, blob });
    }

    const record = {
      $type: "com.lopecode.bundle",
      title,
      files: filesTable,
      createdAt,
      ...(description ? { description } : {}),
      ...(coverImage ? { coverImage } : {}),
      ...(bskyPostUri ? { bskyPostUri } : {}),
      ...(stdDocUri ? { stdDocUri } : {}),
    };

    try {
      // at-write's previousVersion tip lookup sends rkeyStart/rkeyEnd, which this
      // PDS ignores (returns the whole-collection tip, cross-linking bundles).
      // Answer that one call from the true tip versionTips() computed; pass
      // everything else through untouched.
      const xrpcFixed = (sess: any, path: string, init?: any) => {
        if (typeof path === "string" && path.startsWith("com.atproto.repo.listRecords?")
            && path.includes("com.lopecode.bundle.version") && path.includes("rkeyStart=")) {
          const records = tips.trueTip ? [{ uri: tips.trueTip }] : [];
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ records }) } as any);
        }
        return pub.xrpc(sess, path, init);
      };
      result = await pub.publishBundleVersion({ session, xrpc: xrpcFixed, rkey, newRecord: record, prior, ensureScopes });
      break;
    } catch (e: any) {
      // A cached CID can name a blob the PDS has since GC'd. Force-reupload everything once.
      if (attempt === 0 && /BlobNotFound|Could not find blob/i.test(e.message || String(e))) {
        for (const f of files) { known.delete(f.cid); force.add(f.cid); }
        continue;
      }
      throw e;
    }
  }

  let notified: number | string = "skipped";
  try {
    const r = await fetch(NOTIFY_URL, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ uri: base.uri }),
    });
    notified = r.status;
  } catch (e: any) {
    notified = `failed: ${e.message}`;
  }

  // TODO(v1): no site.standard.publication/document and no app.bsky.feed.post sidecars.
  // The widget writes them, but their app-password compatibility is unproven; the bundle
  // (the canonical artifact) is written here and sidecars stay a manual, browser-side step.

  if (!opts.json) {
    console.log(`published ${base.uri}`);
    console.log(`          ${base.webUri}`);
    console.log(`          ${uploaded} uploaded · ${skipped} reused · version ${result?.versionRkey || "(first publish)"} · notify ${notified}`);
  }
  return { ...base, status: "published", uploaded, skipped, versionRkey: result?.versionRkey ?? null, notify: notified };
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

// --------------------------------------------------------------------- main

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
const session = opts.dryRun ? null : await makeSession(pub.resolvePds);

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
