const _3bb0pl = function _feedView(downloadHelpers,htl,alert,rows)
{
    const {downloadFile, downloadBundle} = downloadHelpers;
    const LOPE = {
        paper: '#f5efe5',
        paperWarm: '#efe7d8',
        paperDeep: '#e8dec9',
        ink: '#1a1814',
        inkSoft: '#3a342b',
        inkMute: '#7a6f5e',
        inkFaint: '#b6aa92',
        rule: '#d8cdb4',
        ruleSoft: '#e3d9c3',
        accent: '#c54f2b',
        accentSoft: '#e8a991',
        link: '#1f4fb0',
        serif: '"Source Serif 4","Source Serif Pro","Iowan Old Style",Georgia,serif',
        sans: '"Inter Tight","Helvetica Neue",Helvetica,Arial,sans-serif',
        mono: '"JetBrains Mono","Berkeley Mono","IBM Plex Mono",ui-monospace,"SF Mono",monospace'
    };
    const fmtBytes = b => b >= 1000000 ? `${ (b / 1000000).toFixed(1) }MB` : `${ (b / 1000).toFixed(0) }KB`;
    const fmtRel = d => {
        const ms = Date.now() - d.getTime();
        const m = Math.round(ms / 60000);
        if (m < 1)
            return 'just now';
        if (m < 60)
            return `${ m }m ago`;
        const h = Math.round(m / 60);
        if (h < 24)
            return `${ h }h ago`;
        const days = Math.round(h / 24);
        if (days < 7)
            return `${ days }d ago`;
        return d.toISOString().slice(0, 10);
    };
    const article = (r, i, last) => htl.html`<article style="
    display:grid; grid-template-columns:110px 1fr; gap:18px;
    padding-bottom:32px;
    border-bottom:${ last ? 'none' : `1px solid ${ LOPE.rule }` };
    position:relative;
  ">
    <aside style="
      font-family:${ LOPE.mono }; font-size:9.5px; color:${ LOPE.inkMute };
      line-height:1.7; text-align:right; padding-top:8px;
      border-right:1px solid ${ LOPE.ruleSoft }; padding-right:14px;
    ">
      <div style="color:${ LOPE.accent }">№ ${ String(i + 1).padStart(3, '0') }</div>
      <div style="margin-top:8px;color:${ LOPE.inkFaint }">${ fmtRel(r.when) }</div>
      <div style="margin-top:12px;color:${ LOPE.inkFaint }">rkey</div>
      <div style="color:${ LOPE.inkSoft }">${ r.rkey.slice(0, 8) }</div>
      <div style="margin-top:8px;color:${ LOPE.inkFaint }">cid</div>
      <div style="color:${ LOPE.inkSoft };word-break:break-all">${ r.cid.slice(0, 10) }…</div>
      <div style="margin-top:8px;color:${ LOPE.inkFaint }">files</div>
      <div style="color:${ LOPE.ink }">${ r.files }</div>
      <div style="margin-top:6px;color:${ LOPE.inkFaint }">size</div>
      <div style="color:${ LOPE.ink }">${ fmtBytes(r.size) }</div>
    </aside>
    <div style="min-width:0">
      <div style="display:flex;align-items:center;gap:10px;font-family:${ LOPE.mono };font-size:11px;color:${ LOPE.inkSoft }">
        ${ r.avatar ? htl.html`<img src=${ r.avatar } style="width:22px;height:22px;border:1px solid ${ LOPE.rule };background:${ LOPE.paper };object-fit:cover">` : htl.html`<div style="width:22px;height:22px;border:1px solid ${ LOPE.rule };background:${ LOPE.paperDeep }"></div>` }
        ${ r.handle ? htl.html`<a href=${ `https://lopecode.com/@${ r.handle }` } style="color:${ LOPE.ink };font-weight:500;text-decoration:none">@${ r.handle }</a>
                     <span style="color:${ LOPE.inkFaint }">⇄</span>
                     <a href=${ `https://bsky.app/profile/${ r.handle }` } target="_blank" rel="noopener" style="color:${ LOPE.link };text-decoration:none">bsky</a>` : htl.html`<span style="color:${ LOPE.inkMute }">${ r.did }</span>` }
        ${ r.displayName ? htl.html`<span style="color:${ LOPE.inkMute };font-family:${ LOPE.serif };font-style:italic">· ${ r.displayName }</span>` : '' }
      </div>
      <h2 style="
        font-family:${ LOPE.serif }; font-weight:600; font-size:28px;
        margin:6px 0 10px; line-height:1.15; letter-spacing:-0.018em;
      "><a href=${ r.webUrl } target="_blank" rel="noopener" style="color:${ LOPE.ink };text-decoration:none">${ r.title }</a></h2>
      ${ r.summary ? htl.html`<p style="
        font-family:${ LOPE.serif }; font-size:16px; line-height:1.55;
        color:${ LOPE.inkSoft }; margin:0 0 14px; max-width:620px;
      ">${ r.summary }</p>` : '' }
      <div style="
        display:flex; align-items:stretch; gap:0;
        border:1px solid ${ LOPE.rule };
      ">
        <a href=${ r.webUrl } target="_blank" rel="noopener" style="
          flex:1; display:flex; align-items:center; gap:14px;
          background:repeating-linear-gradient(135deg, ${ LOPE.paperDeep } 0 8px, ${ LOPE.paperWarm } 8px 16px);
          padding:14px 16px; text-decoration:none;
          font-family:${ LOPE.mono }; font-size:11px; color:${ LOPE.inkSoft };
        ">
          <span style="font-family:${ LOPE.serif };font-size:16px;font-weight:600;color:${ LOPE.accent }">▸ open bundle</span>
          <span style="color:${ LOPE.inkMute }">${ r.files } blobs · ${ fmtBytes(r.size) }</span>
          <span style="margin-left:auto;color:${ LOPE.inkFaint }">↗ ${ r.webUrl.replace(/^https:\/\//, '') }</span>
        </a>
        <button type="button" class="lf-dl-bundle" title="download bundle as a self-contained .html file"
           onclick=${ e => {
        e.preventDefault();
        const t = e.currentTarget;
        const orig = t.innerHTML;
        t.disabled = true;
        t.innerHTML = '<span class="lf-dl-icon">\u23F3</span><span>downloading\u2026</span>';
        downloadBundle(r.did, r.rkey).catch(err => alert(`download failed: ${ err.message }`)).finally(() => {
            t.disabled = false;
            t.innerHTML = orig;
        });
    } }
           style="
          display:flex; align-items:center; gap:8px;
          padding:14px 18px; border:none; border-left:1px solid ${ LOPE.rule };
          background:${ LOPE.paper }; cursor:pointer;
          font-family:${ LOPE.mono }; font-size:11px; color:${ LOPE.inkSoft };
          letter-spacing:0.04em; text-transform:uppercase;
        ">
          <span class="lf-dl-icon" style="color:${ LOPE.accent };font-weight:600;font-size:14px;line-height:1">⬇</span>
          <span>download</span>
        </button>
      </div>
      ${ r.modules.length ? htl.html`<details style="margin-top:10px;font-family:${ LOPE.mono };font-size:10.5px;color:${ LOPE.inkMute }">
        <summary style="
          cursor:pointer; list-style:none;
          display:flex; align-items:center; gap:10px; flex-wrap:wrap;
        ">
          <span style="color:${ LOPE.inkFaint };letter-spacing:0.06em;text-transform:uppercase;font-size:9.5px">modules ↓</span>
          ${ r.modules.slice(0, 4).map(m => htl.html`<a href="#" class="lf-dl-mod"
            title=${ `download ${ m }` }
            onclick=${ e => {
        e.preventDefault();
        e.stopPropagation();
        downloadFile(r.did, r.rkey, m).catch(err => alert(`download failed: ${ err.message }`));
    } }
            >${ m }</a>`) }
          ${ r.modules.length > 4 ? htl.html`<span class="lf-dl-more">+${ r.modules.length - 4 } more ▾</span>` : '' }
        </summary>
        ${ r.modules.length > 4 ? htl.html`<div style="
          display:flex; align-items:center; gap:10px; flex-wrap:wrap;
          margin-top:10px; padding-left:16px; border-left:1px solid ${ LOPE.ruleSoft };
        ">
          ${ r.modules.slice(4).map(m => htl.html`<a href="#" class="lf-dl-mod"
            title=${ `download ${ m }` }
            onclick=${ e => {
        e.preventDefault();
        downloadFile(r.did, r.rkey, m).catch(err => alert(`download failed: ${ err.message }`));
    } }
            >${ m }</a>`) }
        </div>` : '' }
      </details>` : '' }
    </div>
  </article>`;
    return htl.html`<div style="
    background:${ LOPE.paper }; color:${ LOPE.ink };
    font-family:${ LOPE.sans };
    padding:0 0 60px;
  ">
    <style>
      .lf-dl-bundle { transition: background 120ms ease; }
      .lf-dl-bundle:hover:not([disabled]) { background: ${ LOPE.paperDeep }; }
      .lf-dl-bundle[disabled] { opacity: 0.6; cursor: progress; }
      .lf-dl-mod {
        color: ${ LOPE.inkSoft };
        text-decoration: underline;
        text-decoration-color: ${ LOPE.ruleSoft };
        text-underline-offset: 2px;
        padding: 2px 0;
        cursor: pointer;
      }
      .lf-dl-mod::before {
        content: "⬇ ";
        color: ${ LOPE.accent };
        font-size: 0.95em;
      }
      .lf-dl-mod:hover {
        color: ${ LOPE.accent };
        text-decoration-color: ${ LOPE.accent };
      }
      .lf-dl-more {
        color: ${ LOPE.accent };
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: ${ LOPE.accentSoft };
      }
    </style>
    <h1 style="display:none">lopefeed</h1>
    <header style="padding:32px 48px 28px;border-bottom:2px solid ${ LOPE.ink };background:${ LOPE.paperWarm }">
      <div style="font-family:${ LOPE.mono };font-size:10px;color:${ LOPE.inkMute };letter-spacing:0.08em;text-transform:uppercase">lopecode · feed</div>
      <h1 style="font-family:${ LOPE.serif };font-weight:600;font-size:48px;margin:6px 0 0;letter-spacing:-0.025em;line-height:1">The Lopefeed</h1>
      <div style="font-family:${ LOPE.serif };font-style:italic;font-size:15px;color:${ LOPE.inkSoft };margin-top:8px">
        vol. 1 · ${ new Date().toISOString().slice(0, 10) } · ${ rows.length } bundle${ rows.length === 1 ? '' : 's' } on the wire
      </div>
    </header>
    <main style="padding:32px 48px 0">
      <div style="display:flex;flex-direction:column;gap:36px">
        ${ rows.map((r, i) => article(r, i, i === rows.length - 1)) }
      </div>
    </main>
  </div>`;
};
const _2n9x98 = function _rows(feedRecords,handles){return(
feedRecords.map(b => {
    const did = b.uri.split('/')[2];
    const rkey = b.uri.split('/').pop();
    const files = b.value?.files || [];
    const moduleNames = files.filter(f => typeof f.id === 'string' && /^@[^/]+\/[^/]+$/.test(f.id) && f.blob?.mimeType === 'application/javascript').map(f => f.id);
    const totalBytes = files.reduce((n, f) => n + (f.blob?.size || 0), 0);
    const profile = handles.get(did);
    const didSubdomain = did.replace(/:/g, '-');
    return {
        rkey,
        did,
        handle: profile?.handle || null,
        displayName: profile?.displayName || null,
        avatar: profile?.avatar || null,
        title: b.value?.title || '(untitled)',
        summary: b.value?.summary || '',
        when: new Date(b.value?.createdAt || 0),
        files: files.length,
        size: totalBytes,
        modules: moduleNames,
        cid: b.cid,
        uri: b.uri,
        webUrl: `https://${ didSubdomain }.lopecode.com/r/${ rkey }`
    };
})
)};
const _3bsnn3 = async function _feedRecords()
{
    const url = new URL('https://contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords');
    url.searchParams.set('limit', '50');
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`contrail listRecords ${ r.status }: ${ await r.text() }`);
    const data = await r.json();
    // Records arrive newest-first by default; sort defensively to be sure.
    return (data.records || []).slice().sort((a, b) => (b.value?.createdAt || '').localeCompare(a.value?.createdAt || ''));
};
const _1wfy6qv = function _dids(feedRecords){return(
[...new Set(feedRecords.map(r => r.uri.split('/')[2]))]
)};
const _h0jwk3 = async function _handles(dids)
{
    const out = new Map();
    await Promise.all(dids.map(async did => {
        try {
            const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ encodeURIComponent(did) }`);
            if (!r.ok)
                return;
            const j = await r.json();
            out.set(did, {
                handle: j.handle,
                displayName: j.displayName,
                avatar: j.avatar
            });
        } catch {
        }
    }));
    return out;
};
const _zt9qa4 = function _downloadHelpers(DecompressionStream,Response,idb,resolvePds,composeBundle)
{
    // Client-side per-file and bundle download via the publishing PDS,
    // reusing atproto's composeBundle + idb cache. Records keyed by URI,
    // blobs by CID — peeks across the feed share the cache, and bundle
    // downloads reuse blobs already pulled by per-file download.
    function triggerSave(blob, filename) {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
    }
    function decodeFile(file, bytes) {
        if (file.encoding === 'base64+gzip') {
            const b64 = new TextDecoder().decode(bytes);
            const gz = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
            return new Response(stream).arrayBuffer();
        }
        return Promise.resolve(bytes);
    }
    function safeFilename(s, ext) {
        const base = String(s || '').replace(/^@/, '').replace(/[^A-Za-z0-9._@-]+/g, '_').replace(/^_+|_+$/g, '') || 'bundle';
        return ext ? `${ base }${ base.endsWith(ext) ? '' : ext }` : base;
    }
    async function loadRecord(did, rkey) {
        const uri = `at://${ did }/com.lopecode.bundle/${ rkey }`;
        const cached = await idb.get('records', uri);
        if (cached)
            return cached;
        const pds = await resolvePds(did).then(r => r.pds || r);
        const r = await fetch(`${ pds }/xrpc/com.atproto.repo.getRecord?repo=${ encodeURIComponent(did) }&collection=com.lopecode.bundle&rkey=${ encodeURIComponent(rkey) }`);
        if (!r.ok)
            throw new Error(`getRecord ${ r.status }`);
        const record = (await r.json()).value;
        const out = {
            pds,
            record
        };
        await idb.put('records', uri, out);
        return out;
    }
    async function loadBlob(pds, did, cid) {
        const cached = await idb.get('blobs', cid);
        if (cached)
            return cached;
        const r = await fetch(`${ pds }/xrpc/com.atproto.sync.getBlob?did=${ encodeURIComponent(did) }&cid=${ encodeURIComponent(cid) }`);
        if (!r.ok)
            throw new Error(`getBlob ${ cid }: ${ r.status }`);
        const bytes = new Uint8Array(await r.arrayBuffer());
        await idb.put('blobs', cid, bytes);
        return bytes;
    }
    return {
        downloadFile: async function downloadFile(did, rkey, fileId) {
            const {pds, record} = await loadRecord(did, rkey);
            const file = (record.files || []).find(f => f.id === fileId);
            if (!file)
                throw new Error(`file ${ fileId } not in bundle`);
            const bytes = await loadBlob(pds, did, file.blob?.ref?.$link);
            const body = await decodeFile(file, bytes);
            triggerSave(new Blob([body], { type: file.blob.mimeType }), safeFilename(fileId));
        },
        downloadBundle: async function downloadBundle(did, rkey) {
            const {pds, record} = await loadRecord(did, rkey);
            const blobs = await Promise.all((record.files || []).map(async f => {
                const bytes = await loadBlob(pds, did, f.blob?.ref?.$link);
                return {
                    ...f,
                    bytes
                };
            }));
            const html = composeBundle(record, blobs);
            triggerSave(new Blob([html], { type: 'text/html' }), safeFilename(record.title || rkey, '.html'));
        }
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/atproto", async () => runtime.module((await import("/@tomlarkworthy/atproto.js?v=4")).default));  
  $def("_3bb0pl", "feedView", ["downloadHelpers","htl","alert","rows"], _3bb0pl);  
  $def("_2n9x98", "rows", ["feedRecords","handles"], _2n9x98);  
  $def("_3bsnn3", "feedRecords", [], _3bsnn3);  
  $def("_1wfy6qv", "dids", ["feedRecords"], _1wfy6qv);  
  $def("_h0jwk3", "handles", ["dids"], _h0jwk3);  
  $def("_zt9qa4", "downloadHelpers", ["DecompressionStream","Response","idb","resolvePds","composeBundle"], _zt9qa4);  
  main.define("resolvePds", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("resolvePds", _));  
  main.define("idb", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("idb", _));  
  main.define("composeBundle", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("composeBundle", _));
  return main;
}