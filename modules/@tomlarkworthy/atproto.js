const _1m8ei4l = function _1(md){return(
md`# atproto
Publish, discover and download Lopecode files on the atmosphere.
`
)};
const _1d0tb0 = function _2(publisher){return(
publisher()
)};
const _1v7gw34 = function _3(md){return(
md`---
## Format

A lopecode notebook is a single self-contained HTML file. The body is a flat sequence of \`<script id data-mime>\` blocks — each block is a module, an asset, or a config file. [\`@tomlarkworthy/exporter-3\`](https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_exporter-3.html) bundles a running runtime into that shape; atproto stores each block as a content-addressed PDS blob plus one record listing them.`
)};
const _18ggow4 = function _4(md){return(
md`---
## Schemas

A publish writes three records to the author's PDS, all sharing the same rkey so the sidecar URIs are derivable from the bundle URI.

### \`com.lopecode.bundle\` (canonical)

The published artifact. One record per published snapshot, at \`at://{did}/com.lopecode.bundle/{rkey}\`:

| field         | type     | meaning |
|---------------|----------|---------|
| \`$type\`     | string   | always \`"com.lopecode.bundle"\` |
| \`title\`     | string   | human title (defaults to exporter-3's \`notebook_title\`) |
| \`files\`     | array    | one entry per \`<script id data-mime>\` block |
| \`createdAt\` | datetime | ISO 8601 |

Each \`files[]\` entry:

| field       | type   | meaning |
|-------------|--------|---------|
| \`id\`      | string | script tag id, e.g. \`@user/module\`, \`@user/module/asset.png\`, \`bootconf.json\` |
| \`encoding\`| string | \`"text"\` or \`"base64"\` from \`data-encoding\` |
| \`blob\`    | blob   | atproto blob ref — carries CID (v1 raw + sha-256), \`mimeType\`, \`size\` |

### \`app.bsky.feed.post\` (companion, sidecar)

Standard Bluesky post with \`app.bsky.embed.external\` linking to the bundle's web-proxy URL. Drives Bluesky reach: timeline, replies, reposts, and native notifications all come for free. Replies on this post are the v1 comments surface.

### \`site.standard.document\` (editorial, sidecar)

Editorial wrapper that brings the bundle into the standard.site reader ecosystem. \`bskyPostRef\` links to the companion post; \`content\` carries a \`com.lopecode.runtime\` member with a strong-ref to the canonical bundle. standard.site clients render "document with unknown content" gracefully; lopecode-aware clients dereference the bundle and render the runnable thing.

The bundle is canonical; the other two are reach. If the sidecars fail at-write retries them out-of-band against the known rkey — the bundle still lands.`
)};
const _4ad3t1 = function _5(md){return(
md`---
## Publish

1. \`exportToHTML\` from \`@tomlarkworthy/exporter-3\` serializes the running runtime.
2. \`DOMParser\` extracts every \`<script id data-mime>\` block.
3. Compute CID v1 (raw codec, sha-256) per block, client-side.
4. Compare against the per-DID set of CIDs known to be on the repo (\`localStorage\`); \`uploadBlob\` only the new ones.
5. \`createRecord\` writes the bundle. Existing CIDs re-reference for free — edits touching one module typically upload one or two blobs.`
)};
const _1t7z3uf = function _6(md){return(
md`---
## Fetch

1. Resolve DID → PDS via \`plc.directory\`.
2. \`com.atproto.repo.getRecord\` for the bundle. Cached by URI in IndexedDB.
3. \`com.atproto.sync.getBlob\` per \`files[]\` entry. Cached by CID in IndexedDB; content-addressing means blobs shared across bundles dedupe automatically.
4. Compose the iframe HTML from \`networking_script\` (imported from \`@tomlarkworthy/exporter-3\`) and the same \`<script id="main">\` template exporter-3 emits; inject the bundle blobs as \`<script[data-mime][id]>\` blocks; render via Blob URL.`
)};
const _69mwde = function _7(md){return(
md`---
## Modules

- \`@tomlarkworthy/at-write\` — \`publisher\` factory; the widget above.
- \`@tomlarkworthy/at-read\` — \`reader\` factory; fetch a bundle by \`at://\` URI and render it.

[lopecode-dev on GitHub](https://github.com/tomlarkworthy/lopecode-dev) for design notes.`
)};
const _1teiro8 = function _encodeBase64(){return(
bytes => {
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
)};
const _15fd3ns = function _decodeBase64(){return(
b64 => {
    const bin = atob(String(b64).replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return bytes;
}
)};
const _1ikhit0 = function _bytesToText(){return(
bytes => new TextDecoder().decode(bytes)
)};
const _yvdbou = function _textBytes(){return(
s => new TextEncoder().encode(s)
)};
const _1n2xlor = function _resolvePds(){return(
async handleOrDid => {
    let did = handleOrDid;
    if (!did.startsWith('did:')) {
        const r = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${ encodeURIComponent(handleOrDid) }`);
        if (!r.ok)
            throw new Error(`resolveHandle ${ r.status }`);
        did = (await r.json()).did;
    }
    let doc;
    if (did.startsWith('did:plc:')) {
        const r = await fetch(`https://plc.directory/${ did }`);
        if (!r.ok)
            throw new Error(`plc.directory ${ r.status }`);
        doc = await r.json();
    } else if (did.startsWith('did:web:')) {
        const host = did.slice('did:web:'.length).replace(/:/g, '/');
        const r = await fetch(`https://${ host }/.well-known/did.json`);
        if (!r.ok)
            throw new Error(`did:web ${ r.status }`);
        doc = await r.json();
    } else {
        throw new Error(`unsupported DID method: ${ did }`);
    }
    const svc = (doc.service || []).find(s => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
    if (!svc)
        throw new Error(`no PDS service for ${ did }`);
    return {
        did,
        pds: svc.serviceEndpoint
    };
}
)};
const _12gr10u = function _composeBundle(encodeBase64,bytesToText,lopebook){return(
(record, blobs) => {
    const escapeAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const escapeScriptBody = s => s.replace(/<\/script/gi, '<\\/script');
    const blocks = blobs.map(f => {
        const mime = f.blob?.mimeType ?? f.mime;
        const body = f.encoding === 'base64' ? encodeBase64(f.bytes) : bytesToText(f.bytes);
        return `<script id="${ escapeAttr(f.id) }" type="text/plain" data-mime="${ escapeAttr(mime) }" data-encoding="${ escapeAttr(f.encoding) }">${ escapeScriptBody(body) }</scr\ipt>`;
    }).join('\n');
    const cssUrls = blobs.filter(f => (f.blob?.mimeType ?? f.mime) === 'text/css').map(f => f.id);
    return lopebook({
        blocks,
        cssUrls,
        title: record.title || 'lopebook'
    });
}
)};
const _1nw79le = function _idb(indexedDB){return(
(async () => {
    const noop = {
        get: async () => undefined,
        put: async () => {
        }
    };
    try {
        const db = await new Promise((res, rej) => {
            const req = indexedDB.open('lopejack-cache', 1);
            req.onupgradeneeded = e => {
                const d = e.target.result;
                if (!d.objectStoreNames.contains('blobs'))
                    d.createObjectStore('blobs');
                if (!d.objectStoreNames.contains('records'))
                    d.createObjectStore('records');
            };
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        return {
            get: (store, key) => new Promise((res, rej) => {
                const r = db.transaction(store, 'readonly').objectStore(store).get(key);
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            }),
            put: (store, key, value) => new Promise((res, rej) => {
                const r = db.transaction(store, 'readwrite').objectStore(store).put(value, key);
                r.onsuccess = () => res();
                r.onerror = () => rej(r.error);
            })
        };
    } catch {
        return noop;
    }
})()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/at-write", async () => runtime.module((await import("/@tomlarkworthy/at-write.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  $def("_1m8ei4l", null, ["md"], _1m8ei4l);  
  $def("_1d0tb0", null, ["publisher"], _1d0tb0);  
  $def("_1v7gw34", null, ["md"], _1v7gw34);  
  $def("_18ggow4", null, ["md"], _18ggow4);  
  $def("_4ad3t1", null, ["md"], _4ad3t1);  
  $def("_1t7z3uf", null, ["md"], _1t7z3uf);  
  $def("_69mwde", null, ["md"], _69mwde);  
  $def("_1teiro8", "encodeBase64", [], _1teiro8);  
  $def("_15fd3ns", "decodeBase64", [], _15fd3ns);  
  $def("_1ikhit0", "bytesToText", [], _1ikhit0);  
  $def("_yvdbou", "textBytes", [], _yvdbou);  
  $def("_1n2xlor", "resolvePds", [], _1n2xlor);  
  $def("_12gr10u", "composeBundle", ["encodeBase64","bytesToText","lopebook"], _12gr10u);  
  $def("_1nw79le", "idb", ["indexedDB"], _1nw79le);  
  main.define("publisher", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("publisher", _));  
  main.define("lopebook", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("lopebook", _));
  return main;
}