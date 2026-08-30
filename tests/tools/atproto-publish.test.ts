// CI must write the standard.site sidecars on every publish, in the browser's
// order (publication → document → bundle) so the bundle bakes in `stdDocUri`.
// Before 2026-08-30 the tool skipped them, and 9 of the 10 live bundles carry no
// `stdDocUri` — so /r/<slug> emits no <link rel="site.standard.document"> and no
// indexer can verify them.
//
// The publisher cells are the REAL ones, extracted from lopecode/notebooks/atproto.html
// and run headlessly; only the PDS is faked. No credentials, no network.
//
//   bun test tests/tools/atproto-publish.test.ts
import { test, expect, beforeAll, afterAll } from "bun:test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadPublisher, publishNotebook, type Opts, type Decl } from "../../tools/atproto-publish.ts";

const DID = "did:plc:testauthor000000000000";
const PDS = "https://pds.test.invalid";
const RKEY = "test-bundle";
const session = { did: DID, handle: "tester.bsky.social", pds: PDS, accessJwt: "jwt", authType: "app-password" };

const notebookHtml = (body: string) =>
  `<html><head><title>Test Bundle</title>` +
  `<meta property="og:description" content="a test bundle"></head><body>\n` +
  `<script id="@t/a" type="text/plain" data-mime="application/javascript">${body}<` + `/script>\n` +
  `<script id="bootconf.json" type="text/plain" data-mime="application/json">{"mains":[]}<` + `/script>\n` +
  `</body></html>`;

// ------------------------------------------------------------- fake PDS

type Rec = { cid: string; value: any };
type Write = { op: string; collection: string; rkey: string };

class FakePds {
  repo = new Map<string, Map<string, Rec>>();
  writes: Write[] = [];
  refuse: string | null = null; // collection whose writes 403
  private n = 0;
  private cid() { return `cid${++this.n}`; }
  private tid() { return `3mtid${String(++this.n).padStart(8, "a")}`.slice(0, 13); }

  put(collection: string, rkey: string, value: any) {
    if (!this.repo.has(collection)) this.repo.set(collection, new Map());
    const rec = { cid: this.cid(), value };
    this.repo.get(collection)!.set(rkey, rec);
    return rec;
  }
  get(collection: string, rkey: string) { return this.repo.get(collection)?.get(rkey) ?? null; }
  all(collection: string) { return [...(this.repo.get(collection) ?? new Map()).entries()]; }

  private json(body: any, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }
  private uri(collection: string, rkey: string) { return `at://${DID}/${collection}/${rkey}`; }

  // The at-login `xrpc(session, path, init)` shape.
  xrpc = async (_s: any, path: string, init: any = {}) => {
    const [name, qs] = path.split("?");
    const q = new URLSearchParams(qs || "");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : {}; // uploadBlob posts raw bytes
    switch (name) {
      case "com.atproto.repo.getRecord": {
        const rec = this.get(q.get("collection")!, q.get("rkey")!);
        if (!rec) return this.json({ error: "RecordNotFound" }, 400);
        return this.json({ uri: this.uri(q.get("collection")!, q.get("rkey")!), cid: rec.cid, value: rec.value });
      }
      case "com.atproto.repo.listRecords": {
        const records = this.all(q.get("collection")!).map(([rkey, rec]) => ({
          uri: this.uri(q.get("collection")!, rkey), cid: rec.cid, value: rec.value,
        }));
        return this.json({ records });
      }
      case "com.atproto.repo.uploadBlob":
        return this.json({ blob: { $type: "blob", ref: { $link: this.cid() }, mimeType: "application/octet-stream", size: 1 } });
      case "com.atproto.repo.putRecord": {
        if (this.refuse === body.collection) return this.json({ error: "Forbidden" }, 403);
        const rec = this.put(body.collection, body.rkey, body.record);
        this.writes.push({ op: "put", collection: body.collection, rkey: body.rkey });
        return this.json({ uri: this.uri(body.collection, body.rkey), cid: rec.cid });
      }
      case "com.atproto.repo.createRecord": {
        if (this.refuse === body.collection) return this.json({ error: "Forbidden" }, 403);
        const rkey = this.tid();
        const rec = this.put(body.collection, rkey, body.record);
        this.writes.push({ op: "create", collection: body.collection, rkey });
        return this.json({ uri: this.uri(body.collection, rkey), cid: rec.cid });
      }
      case "com.atproto.repo.deleteRecord": {
        this.repo.get(body.collection)?.delete(body.rkey);
        return this.json({});
      }
      case "com.atproto.repo.applyWrites": {
        const results = body.writes.map((w: any) => {
          const rkey = w.rkey;
          const rec = this.put(w.collection, rkey, w.value);
          this.writes.push({ op: w.$type.split("#")[1], collection: w.collection, rkey });
          return { cid: rec.cid, uri: this.uri(w.collection, rkey) };
        });
        return this.json({ results });
      }
      default:
        throw new Error(`fake pds: unhandled ${name}`);
    }
  };

  // Public reads the tool does with bare fetch (getBundle, listBundleVersions, notify).
  fetch = async (url: any, init: any = {}) => {
    const u = String(url);
    if (u.startsWith("https://contrail.lopecode.com/")) return this.json({ ok: true });
    if (u.startsWith(`${PDS}/xrpc/`)) return this.xrpc(null, u.slice(`${PDS}/xrpc/`.length), init);
    throw new Error(`fake fetch: unexpected ${u}`);
  };

  collectionsWritten() { return this.writes.map((w) => w.collection); }
}

// ------------------------------------------------------------------ rig

let pubReal: Awaited<ReturnType<typeof loadPublisher>>;
let realFetch: typeof fetch;
const dir = mkdtempSync(join(tmpdir(), "atpub-test-"));

beforeAll(async () => {
  pubReal = await loadPublisher(resolve(import.meta.dir, "../../lopecode/notebooks/atproto.html"));
  realFetch = globalThis.fetch;
});
afterAll(() => { globalThis.fetch = realFetch; pubReal?.dispose(); });

const opts = (over: Partial<Opts> = {}): Opts => ({
  dryRun: false, json: true, allowNew: true, bumpCreatedAt: false, blobCache: false, ...over,
});
const decl: Decl = { did: DID, rkey: RKEY, auto: true };

function rig(html: string) {
  const pds = new FakePds();
  globalThis.fetch = pds.fetch as any;
  const pub = { ...pubReal, xrpc: pds.xrpc, resolvePds: async () => ({ pds: PDS }) };
  const file = join(dir, `nb-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  return { pds, pub, file };
}

// Build a prior bundle whose file table matches `html` byte for byte.
async function priorFiles(html: string) {
  const files = await pubReal.extractFiles(html);
  return files.map((f: any) => ({ id: f.id, encoding: f.encoding, blob: { $type: "blob", ref: { $link: f.cid }, mimeType: f.mime, size: f.size } }));
}

// ---------------------------------------------------------------- tests

test("new bundle: publication, then document, then bundle carrying stdDocUri", async () => {
  const { pds, pub, file } = rig(notebookHtml("const a=1;"));
  const res = await publishNotebook(pub as any, file, decl, opts(), session);

  expect(res.status).toBe("published");
  expect(pds.collectionsWritten()).toEqual([
    "site.standard.publication",
    "site.standard.document",
    "com.lopecode.bundle",
  ]);
  const [[docRkey, doc]] = pds.all("site.standard.document");
  expect(doc.value.path).toBe(`/r/${RKEY}`);
  expect(doc.value.title).toBe("Test Bundle");
  expect(doc.value.description).toBe("a test bundle");
  const [[pubRkey]] = pds.all("site.standard.publication");
  expect(doc.value.site).toBe(`at://${DID}/site.standard.publication/${pubRkey}`);
  const bundle = pds.get("com.lopecode.bundle", RKEY)!;
  expect(bundle.value.stdDocUri).toBe(`at://${DID}/site.standard.document/${docRkey}`);
  expect(res.stdDocUri).toBe(bundle.value.stdDocUri);
  expect(res.sidecarWarning).toBeNull();
  // CI never broadcasts.
  expect(pds.repo.has("app.bsky.feed.post")).toBe(false);
});

test("republish with a prior stdDocUri: same document TID, updated in place", async () => {
  const oldHtml = notebookHtml("const a=1;");
  const { pds, pub, file } = rig(notebookHtml("const a=2;"));
  const docRkey = "3mdocexisting";
  const pubRkey = "3mpubexisting";
  pds.put("site.standard.publication", pubRkey, {
    $type: "site.standard.publication", url: `https://${DID.replace(/:/g, "-")}.lopecode.com`,
    name: "@tester.bsky.social", preferences: { showInDiscover: true },
  });
  pds.put("site.standard.document", docRkey, {
    $type: "site.standard.document", site: `at://${DID}/site.standard.publication/${pubRkey}`,
    title: "Test Bundle", path: `/r/${RKEY}`, publishedAt: "2026-01-01T00:00:00.000Z",
    bskyPostRef: { $type: "com.atproto.repo.strongRef", uri: `at://${DID}/app.bsky.feed.post/3mpost`, cid: "postcid" },
  });
  pds.put("com.lopecode.bundle", RKEY, {
    $type: "com.lopecode.bundle", title: "Test Bundle", description: "a test bundle",
    files: await priorFiles(oldHtml), createdAt: "2026-01-01T00:00:00.000Z",
    stdDocUri: `at://${DID}/site.standard.document/${docRkey}`,
  });
  pds.writes = [];

  const res = await publishNotebook(pub as any, file, decl, opts(), session);

  expect(res.status).toBe("published");
  expect(pds.all("site.standard.document").length).toBe(1);
  expect(pds.writes.filter((w) => w.collection === "site.standard.document")).toEqual([
    { op: "put", collection: "site.standard.document", rkey: docRkey },
  ]);
  expect(res.stdDocUri).toBe(`at://${DID}/site.standard.document/${docRkey}`);
  const doc = pds.get("site.standard.document", docRkey)!;
  expect(doc.value.publishedAt).toBe("2026-01-01T00:00:00.000Z"); // not re-floated
  expect(doc.value.bskyPostRef.uri).toBe(`at://${DID}/app.bsky.feed.post/3mpost`); // carried, not dropped
  expect(pds.get("com.lopecode.bundle", RKEY)!.value.stdDocUri).toBe(res.stdDocUri);
});

test("prior without stdDocUri and identical files: not short-circuited, document created", async () => {
  const html = notebookHtml("const a=1;");
  const { pds, pub, file } = rig(html);
  pds.put("com.lopecode.bundle", RKEY, {
    $type: "com.lopecode.bundle", title: "Test Bundle", description: "a test bundle",
    files: await priorFiles(html), createdAt: "2026-01-01T00:00:00.000Z",
  });
  pds.writes = [];

  const res = await publishNotebook(pub as any, file, decl, opts(), session);

  expect(res.status).toBe("published"); // NOT "unchanged"
  expect(pds.collectionsWritten()).toEqual([
    "site.standard.publication",
    "site.standard.document",
    "com.lopecode.bundle.version", // the republish still snapshots
    "com.lopecode.bundle",
  ]);
  expect(pds.all("site.standard.document").length).toBe(1);
  const [[docRkey]] = pds.all("site.standard.document");
  expect(pds.get("com.lopecode.bundle", RKEY)!.value.stdDocUri).toBe(`at://${DID}/site.standard.document/${docRkey}`);
  expect(res.stdDocUri).toBe(`at://${DID}/site.standard.document/${docRkey}`);
  expect(pds.get("com.lopecode.bundle", RKEY)!.value.createdAt).toBe("2026-01-01T00:00:00.000Z");
});

test("identical files WITH a stdDocUri still short-circuits", async () => {
  const html = notebookHtml("const a=1;");
  const { pds, pub, file } = rig(html);
  pds.put("com.lopecode.bundle", RKEY, {
    $type: "com.lopecode.bundle", title: "Test Bundle", description: "a test bundle",
    files: await priorFiles(html), createdAt: "2026-01-01T00:00:00.000Z",
    stdDocUri: `at://${DID}/site.standard.document/3mdocexisting`,
  });
  pds.writes = [];

  const res = await publishNotebook(pub as any, file, decl, opts(), session);
  expect(res.status).toBe("unchanged");
  expect(pds.writes).toEqual([]);
});

test("a sidecar failure warns and still publishes the bundle", async () => {
  const { pds, pub, file } = rig(notebookHtml("const a=1;"));
  pds.refuse = "site.standard.publication";
  const warnings: string[] = [];
  const realWarn = console.warn;
  console.warn = (...a: any[]) => void warnings.push(a.join(" "));
  let res: any;
  try { res = await publishNotebook(pub as any, file, decl, opts(), session); }
  finally { console.warn = realWarn; }

  expect(res.status).toBe("published");
  expect(res.sidecarWarning).toContain("site.standard.publication 403");
  expect(warnings.join("\n")).toContain("publishing the bundle anyway");
  expect(pds.get("com.lopecode.bundle", RKEY)).not.toBeNull();
  expect(pds.get("com.lopecode.bundle", RKEY)!.value.stdDocUri).toBeUndefined();
  expect(pds.all("site.standard.document").length).toBe(0);
});
