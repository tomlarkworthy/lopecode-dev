const _cpi709 = function _1(md){return(
md`# at-read`
)};
const _a6rfc4 = function _2(reader){return(
reader()
)};
const _1chkurg = function _3(md){return(
md`---
## About

\`at-read\` fetches a \`com.lopecode.bundle\` by \`at://\` URI and renders it inline. No login required — DID resolution goes through \`plc.directory\` to find the publishing user's PDS.

The widget is exposed as a \`reader\` factory:

\`\`\`js
import {reader} from "@tomlarkworthy/at-read"
reader()
reader({defaultUri: "at://did:plc:.../com.lopecode.bundle/3kxabc"})
\`\`\``
)};
const _kw77zo = function _4(md){return(
md`---
## How it works

1. Resolve DID → PDS via \`plc.directory\`.
2. \`com.atproto.repo.getRecord\` for the bundle. Cached by URI in IndexedDB.
3. \`com.atproto.sync.getBlob\` per \`files[]\` entry. Cached by CID in IndexedDB; blobs shared across bundles dedupe automatically.
4. Compose the iframe HTML: import \`networking_script\` from \`@tomlarkworthy/exporter-3\` and emit the same \`<script id="main">\` template exporter-3 uses; inject the bundle blobs as \`<script[data-mime][id]>\` blocks; render via Blob URL (a real origin is needed so es-module-shims can dynamic-import wrapped modules).

See \`@tomlarkworthy/at-write\` for the lexicon definition.`
)};
const _193ckpx = function _reader(location,idb,resolvePds,composeBundle,bytesToText)
{
    return ({
        defaultUri = ''
    } = {}) => {
        // If no explicit URI, look for `at=` in the page hash
        // (lopepage convention: #view=…&at=at://…&cc=…). Lets a deployed
        // at-read serve as a one-click embed-card target — share a URL like
        // /atproto.html#at=at://did/com.lopecode.bundle/rkey and the reader
        // auto-loads the bundle.
        if (!defaultUri && typeof location !== 'undefined') {
            const m = (location.hash || '').match(/[&#?]at=([^&]+)/);
            if (m)
                defaultUri = decodeURIComponent(m[1]);
        }
        const root = document.createElement('div');
        root.style.cssText = 'font-family:system-ui;font-size:14px';
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const uriInput = document.createElement('input');
        uriInput.type = 'text';
        uriInput.placeholder = 'at://did:plc:.../com.lopecode.bundle/3kxabc';
        uriInput.value = defaultUri;
        uriInput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-family:inherit;margin-bottom:8px';
        const status = document.createElement('div');
        status.style.cssText = 'margin-bottom:8px';
        const iframe = document.createElement('iframe');
        // Untrusted content: unique opaque origin, no storage / cookies / forms /
        // popups / top-level navigation. Scripts run normally; cross-origin fetch
        // still works (the bundle's networking_script intercepts most fetches
        // anyway). If a bundle needs persistent storage, that's a "trust this
        // bundle" UI to land later — see specs/atproto.md v1 ideas.
        iframe.sandbox = 'allow-scripts';
        // sandboxed: bundle is untrusted
        iframe.style.cssText = 'width:100%;height:600px;border:1px solid #ccc;border-radius:4px;background:#fff;display:none';
        let lastReq = 0;
        const load = async () => {
            const reqId = ++lastReq;
            const uri = uriInput.value.trim();
            if (!uri) {
                status.innerHTML = `<small style="color:#888">Paste an at:// URI and press Enter.</small>`;
                iframe.style.display = 'none';
                return;
            }
            const m = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/?#]+)$/);
            if (!m) {
                status.innerHTML = `<div style="color:#b71c1c">Bad at:// URI.</div>`;
                iframe.style.display = 'none';
                return;
            }
            const [, did, collection, rkey] = m;
            if (collection !== 'com.lopecode.bundle' && collection !== 'dev.lopecode.bundle') {
                status.innerHTML = `<div style="color:#b71c1c">Expected <code>com.lopecode.bundle</code>, got <code>${ esc(collection) }</code></div>`;
                iframe.style.display = 'none';
                return;
            }
            try {
                let pds, record;
                const cached = await idb.get('records', uri);
                if (cached) {
                    ({pds, record} = cached);
                } else {
                    status.innerHTML = `<div style="color:#666">Resolving PDS…</div>`;
                    ({pds} = await resolvePds(did));
                    if (reqId !== lastReq)
                        return;
                    status.innerHTML = `<div style="color:#666">Fetching record…</div>`;
                    const r = await fetch(`${ pds }/xrpc/com.atproto.repo.getRecord?repo=${ encodeURIComponent(did) }&collection=${ encodeURIComponent(collection) }&rkey=${ encodeURIComponent(rkey) }`);
                    if (!r.ok)
                        throw new Error(`getRecord ${ r.status }`);
                    record = (await r.json()).value;
                    await idb.put('records', uri, {
                        pds,
                        record
                    });
                }
                if (reqId !== lastReq)
                    return;
                let fetched = 0, hits = 0;
                const blobs = await Promise.all(record.files.map(async f => {
                    const cid = f.blob?.ref?.$link;
                    if (!cid)
                        throw new Error(`file ${ f.id } has no blob CID`);
                    let bytes = await idb.get('blobs', cid);
                    if (bytes) {
                        hits++;
                    } else {
                        const r = await fetch(`${ pds }/xrpc/com.atproto.sync.getBlob?did=${ encodeURIComponent(did) }&cid=${ encodeURIComponent(cid) }`);
                        if (!r.ok)
                            throw new Error(`getBlob ${ cid }: ${ r.status }`);
                        bytes = new Uint8Array(await r.arrayBuffer());
                        await idb.put('blobs', cid, bytes);
                        fetched++;
                    }
                    if (reqId === lastReq) {
                        status.innerHTML = `<div style="color:#666">Loaded ${ fetched + hits }/${ record.files.length } (${ hits } cached, ${ fetched } fetched)…</div>`;
                    }
                    return {
                        ...f,
                        bytes
                    };
                }));
                if (reqId !== lastReq)
                    return;
                const html = composeBundle(record, blobs);
                // Use a Blob URL not srcdoc: srcdoc has null origin and esms in shim
                // mode can't dynamic-import from blob:null/... in that origin. Blob
                // URLs give the iframe a real (opaque) origin where esms works.
                // Append the bundle's bootconf hash so lopepage knows what to render.
                let bundleHash = '';
                const bootconfFile = blobs.find(f => f.id === 'bootconf.json');
                if (bootconfFile) {
                    try {
                        const bc = JSON.parse(bytesToText(bootconfFile.bytes));
                        bundleHash = bc.hash || '';
                    } catch {
                    }
                }
                const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                iframe.removeAttribute('srcdoc');
                iframe.src = blobUrl + bundleHash;
                iframe.style.display = 'block';
                const safeTitle = (record.title || rkey).replace(/[^a-z0-9._-]+/gi, '_');
                const downloadHref = blobUrl;
                status.innerHTML = `<div style="padding:6px 10px;border-radius:4px;background:#e3f2fd;color:#0d47a1"><b>📥 ${ esc(record.title || rkey) }</b> — ${ record.files.length } files (${ hits } cached, ${ fetched } fetched), ${ (html.length / 1024).toFixed(1) } KB · <a href="${ downloadHref }" download="${ esc(safeTitle) }.html" style="color:#0d47a1;font-size:0.9em">⬇ download</a></div>`;
            } catch (err) {
                if (reqId !== lastReq)
                    return;
                status.innerHTML = `<div style="padding:6px 10px;border-radius:4px;background:#ffebee;color:#b71c1c">Failed: ${ esc(err.message) }</div>`;
                iframe.style.display = 'none';
            }
        };
        // React on Enter or blur. Don't fire on every keystroke (paste-and-Enter is the main flow).
        uriInput.addEventListener('change', load);
        uriInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                load();
            }
        });
        root.append(uriInput, status, iframe);
        if (defaultUri)
            load();
        return root;
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/atproto", async () => runtime.module((await import("/@tomlarkworthy/atproto.js?v=4")).default));  
  $def("_cpi709", null, ["md"], _cpi709);  
  $def("_a6rfc4", null, ["reader"], _a6rfc4);  
  $def("_1chkurg", null, ["md"], _1chkurg);  
  $def("_kw77zo", null, ["md"], _kw77zo);  
  $def("_193ckpx", "reader", ["location","idb","resolvePds","composeBundle","bytesToText"], _193ckpx);  
  main.define("encodeBase64", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("encodeBase64", _));  
  main.define("bytesToText", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("bytesToText", _));  
  main.define("resolvePds", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("resolvePds", _));  
  main.define("composeBundle", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("composeBundle", _));  
  main.define("idb", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("idb", _));
  return main;
}