const _lfstyle = function _feedStyle(htl){return(
htl.html`<style>
.lf-root{background:var(--theme-background);color:var(--theme-foreground);font-family:var(--sans-serif);min-height:100%;padding:44px 56px 56px}
.lf-wrap{max-width:860px;margin:0 auto;min-width:0}
.lf-root a{color:var(--theme-foreground-focus);text-decoration:none}
.lf-root a:hover{color:var(--theme-foreground);text-decoration:underline}
.lf-root .lf-title a{color:var(--theme-foreground);text-decoration:none}
.lf-root .lf-title a:hover{text-decoration:underline}
.lf-mono{font-family:var(--monospace);font-size:11px;letter-spacing:.02em;color:var(--theme-foreground-muted)}
.lf-alt{color:var(--theme-foreground-alt)}
.lf-mute{color:var(--theme-foreground-muted)}
.lf-faint{color:var(--theme-foreground-faint)}
.lf-fainter{color:var(--theme-foreground-fainter)}
.lf-focus{color:var(--theme-foreground-focus)}
.lf-xs{font-size:10.5px}
.lf-head{padding-bottom:26px;border-bottom:1px solid var(--theme-foreground-faintest)}
.lf-kicker{font-family:var(--monospace);font-size:10.5px;letter-spacing:.14em;color:var(--theme-foreground-fainter)}
.lf-h1{font-family:var(--serif);font-weight:600;font-size:54px;letter-spacing:-.03em;line-height:1;margin:10px 0 0;color:var(--theme-foreground)}
.lf-lede{font-family:var(--serif);font-size:17px;line-height:1.5;color:var(--theme-foreground-muted);margin:12px 0 0;max-width:560px;text-wrap:pretty}
.lf-count{display:block;margin-top:12px;font-family:var(--monospace);font-size:11px;color:var(--theme-foreground-faint)}
.lf-controls{display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;padding:16px 0;border-bottom:1px solid var(--theme-foreground-faintest)}
.lf-ctl{min-width:0;flex:0 1 300px}
.lf-ctl-sort{min-width:0;flex:0 1 220px}
.lf-ctl form,.lf-ctl-sort form{max-width:100%}
.lf-matchcount{margin-left:auto;padding-bottom:6px}
.lf-card{padding:26px 0;border-bottom:1px solid var(--theme-foreground-faintest);min-width:0}
.lf-card:last-of-type{border-bottom:none}
.lf-byline{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.lf-avatar{width:24px;height:24px;flex:0 0 24px;border-radius:50%;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background-alt);object-fit:cover;display:grid;place-items:center;font-family:var(--monospace);font-size:10px;color:var(--theme-foreground-alt)}
.lf-name{font-family:var(--serif);font-style:italic;font-size:13.5px;color:var(--theme-foreground-faint)}
.lf-byline-meta{margin-left:auto;display:flex;align-items:center;gap:10px}
.lf-title{font-family:var(--serif);font-weight:600;font-size:31px;line-height:1.14;letter-spacing:-.02em;margin:10px 0 0;color:var(--theme-foreground);text-wrap:pretty;max-width:700px}
.lf-title-id{word-break:break-word;max-width:100%}
.lf-idnote{display:block;margin-top:5px;font-family:var(--monospace);font-size:10px;color:var(--theme-foreground-fainter)}
.lf-summary{font-family:var(--serif);font-size:17px;line-height:1.55;color:var(--theme-foreground-muted);margin:10px 0 0;max-width:640px;text-wrap:pretty}
.lf-nosummary{margin:10px 0 0;display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}
.lf-nosummary-it{font-family:var(--serif);font-style:italic;font-size:13.5px;color:var(--theme-foreground-fainter)}
.lf-actions{display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
.lf-act{display:inline-flex;flex:0 0 auto}
.lf-act form{width:100%}
.lf-root .lf-act button{font-family:var(--monospace);font-size:13px}
.lf-busy{display:inline-flex;align-items:center;gap:7px}
.lf-spin{display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid var(--theme-foreground-fainter);border-top-color:var(--theme-foreground-focus);animation:lf-spin .8s linear infinite}
@keyframes lf-spin{to{transform:rotate(360deg)}}
.lf-err{font-family:var(--monospace);font-size:10.5px;color:var(--theme-foreground-focus)}
.lf-linkbtn{appearance:none;background:transparent;border:none;padding:3px 0;cursor:pointer;font-family:var(--monospace);font-size:11px;color:var(--theme-foreground-faint)}
.lf-linkbtn:hover{color:var(--theme-foreground)}
.lf-discs{display:flex;gap:20px;margin-top:14px;flex-wrap:wrap}
.lf-disc{appearance:none;background:transparent;border:none;padding:3px 0;cursor:pointer;font-family:var(--monospace);font-size:11px;letter-spacing:.04em;color:var(--theme-foreground-faint);display:inline-flex;align-items:center;gap:6px}
.lf-disc[aria-expanded=true]{color:var(--theme-foreground-focus)}
.lf-disc-caret{font-size:9px;opacity:.8}
.lf-disc-count{color:var(--theme-foreground-fainter)}
.lf-panel{margin-top:10px;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background-alt)}
.lf-record{margin-top:10px;padding:12px 14px;background:var(--theme-background-alt);border:1px solid var(--theme-foreground-faintest);display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:18px;row-gap:5px}
.lf-record dt{margin:0;font-family:var(--monospace);font-size:10.5px;color:var(--theme-foreground-fainter)}
.lf-record dd{margin:0;font-family:var(--monospace);font-size:11px;color:var(--theme-foreground-alt);word-break:break-all;min-width:0}
.lf-vrow{display:flex;align-items:center;gap:14px;padding:8px 14px;flex-wrap:wrap}
.lf-vrow+.lf-vrow{border-top:1px solid color-mix(in srgb, var(--theme-foreground) 8%, transparent)}
.lf-vcid{margin-left:auto}
.lf-modules{margin-top:10px;max-width:760px;overflow-x:auto}
.lf-preview{margin-top:12px;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background-alt)}
.lf-preview-bar{display:flex;align-items:center;gap:12px;padding:7px 12px;border-bottom:1px solid color-mix(in srgb, var(--theme-foreground) 8%, transparent);flex-wrap:wrap}
.lf-preview-bar>:first-child{flex:1 1 auto;min-width:0}
.lf-preview iframe{display:block;width:100%;height:260px;border:none;background:var(--theme-background)}
.lf-thread{margin-top:14px;padding-left:14px;border-left:2px solid color-mix(in srgb, var(--theme-foreground-focus) 45%, transparent)}
.lf-replies{margin-top:8px;display:flex;flex-direction:column;gap:10px}
.lf-reply-body{font-family:var(--serif);font-size:14.5px;line-height:1.5;color:var(--theme-foreground-muted);margin-top:2px;max-width:620px}
.lf-reply-meta{display:block;margin-top:3px;font-size:10px}
.lf-foot{display:flex;align-items:center;gap:16px;padding-top:24px;flex-wrap:wrap}
.lf-empty{margin-top:40px;padding:34px 30px;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background-alt);text-align:center}
.lf-empty-h{font-family:var(--serif);font-size:22px;color:var(--theme-foreground-alt)}
.lf-empty-p{font-family:var(--serif);font-size:16px;line-height:1.55;color:var(--theme-foreground-muted);max-width:440px;margin:10px auto 0;text-wrap:pretty}
.lf-empty-act{margin-top:20px;display:flex;gap:10px;justify-content:center}
@media (max-width:600px){
.lf-root{padding:26px 20px 40px}
.lf-head{padding-bottom:18px}
.lf-h1{font-size:38px}
.lf-lede{font-size:15px}
.lf-card{padding:22px 0}
.lf-avatar{width:20px;height:20px;flex:0 0 20px;font-size:9px}
.lf-title{font-size:24px}
.lf-summary{font-size:15.5px}
.lf-byline-meta{margin-left:0}
.lf-modules{max-width:100%}
.lf-ctl,.lf-ctl-sort{flex:1 1 100%}
.lf-matchcount{margin-left:0}
}
</style>`
)};
const _lffmtb = function _fmtBytes(){return(
function fmtBytes(b) {
    const n = Number(b) || 0;
    return n >= 1000000 ? `${ (n / 1000000).toFixed(1) }MB` : `${ Math.round(n / 1000) }KB`;
}
)};
const _lffmtr = function _fmtRel(){return(
function fmtRel(d) {
    const t = d instanceof Date ? d : new Date(d);
    if (!t || isNaN(t.getTime()))
        return '';
    const m = Math.round((Date.now() - t.getTime()) / 60000);
    if (m < 1)
        return 'just now';
    if (m < 60)
        return `${ m }m`;
    const h = Math.round(m / 60);
    if (h < 24)
        return `${ h }h`;
    const days = Math.round(h / 24);
    if (days < 7)
        return `${ days }d`;
    return t.toISOString().slice(0, 10);
}
)};
const _lffirst = async function _feedFirstPage()
{
    const url = new URL('https://contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords');
    url.searchParams.set('limit', '50');
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`contrail listRecords ${ r.status }: ${ await r.text() }`);
    const data = await r.json();
    return {
        records: data.records || [],
        cursor: data.cursor || null
    };
};
const _lfmore = function _viewof_morePages(Inputs){return(
Inputs.input([])
)};
const _lfmorev = (G, _) => G.input(_);
const _lfrecs = function _feedRecords(feedFirstPage,morePages){return(
[
    ...feedFirstPage.records,
    ...morePages.flatMap(p => p.records || [])
].sort((a, b) => (b.value?.createdAt || '').localeCompare(a.value?.createdAt || ''))
)};
const _lfcur = function _feedCursor(morePages,feedFirstPage){return(
morePages.length ? morePages[morePages.length - 1].cursor || null : feedFirstPage.cursor || null
)};
const _lfload = function _loadMorePage($0,feedCursor)
{
    // Server-side pagination: Contrail's listRecords returns a cursor, so Load more
    // appends a real next page rather than revealing already-fetched rows.
    return async function loadMorePage() {
        if (!feedCursor)
            return 0;
        const url = new URL('https://contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords');
        url.searchParams.set('limit', '50');
        url.searchParams.set('cursor', feedCursor);
        const r = await fetch(url);
        if (!r.ok)
            throw new Error(`contrail listRecords ${ r.status }`);
        const data = await r.json();
        const page = {
            records: data.records || [],
            cursor: data.cursor || null
        };
        $0.value = [
            ...$0.value,
            page
        ];
        $0.dispatchEvent(new Event('input', { bubbles: true }));
        return page.records.length;
    };
};
const _lfrows = function _rows(feedRecords,handles){return(
feedRecords.map(b => {
    const did = b.uri.split('/')[2];
    const rkey = b.uri.split('/').pop();
    const v = b.value || {};
    const files = v.files || [];
    const moduleList = files.map(f => ({
        id: f.id,
        size: f.blob?.size || 0,
        mime: f.blob?.mimeType || ''
    }));
    const moduleNames = moduleList.filter(m => /^@[^/]+\/[^/]+$/.test(m.id) && m.mime === 'application/javascript').map(m => m.id);
    const profile = handles.get(did);
    const title = v.title || '(untitled)';
    return {
        rkey,
        did,
        handle: profile?.handle || null,
        displayName: profile?.displayName || null,
        avatar: profile?.avatar || null,
        title,
        idShaped: /^@[^/]+\/[^/]+$/.test(title),
        // Records in the wild carry `description`; `summary` is the newer field name.
        summary: v.summary || v.description || '',
        when: new Date(v.createdAt || 0),
        createdAt: String(v.createdAt || '').slice(0, 10),
        files: files.length,
        size: moduleList.reduce((n, m) => n + m.size, 0),
        modules: moduleNames,
        moduleList,
        moduleText: moduleList.map(m => m.id).join(' '),
        bskyPostUri: v.bskyPostUri || null,
        previousVersion: v.previousVersion || null,
        cid: b.cid,
        uri: b.uri,
        webUrl: `https://${ did.replace(/:/g, '-') }.lopecode.com/r/${ rkey }`
    };
})
)};
const _lfsearch = function _viewof_search(Inputs,rows){return(
Inputs.search(rows, {
    columns: [
        'title',
        'handle',
        'moduleText'
    ],
    placeholder: 'Search title, author, module…',
    width: 300
})
)};
const _lfsearchv = (G, _) => G.input(_);
const _lfsort = function _viewof_sort(Inputs){return(
Inputs.select([
    'newest',
    'largest',
    'most modules'
], {
    label: 'Sort',
    width: 220
})
)};
const _lfsortv = (G, _) => G.input(_);
const _lflimit = function _viewof_limit(Inputs){return(
Inputs.input(12)
)};
const _lflimitv = (G, _) => G.input(_);
const _lfmatch = function _matches(search,sort){return(
search.slice().sort(sort === 'largest' ? (x, y) => y.size - x.size : sort === 'most modules' ? (x, y) => y.moduleList.length - x.moduleList.length : (x, y) => y.when - x.when)
)};
const _lflist = function _list(matches,limit){return(
matches.slice(0, limit)
)};
const _lfmodt = function _modulesTable(Inputs,htl,fmtBytes,downloadHelpers)
{
    const {downloadFile} = downloadHelpers;
    return function modulesTable(b) {
        return Inputs.table(b.moduleList, {
            columns: [
                'id',
                'size',
                'mime'
            ],
            header: {
                id: 'Module',
                size: 'Size',
                mime: 'Type'
            },
            format: {
                size: fmtBytes,
                // Each id downloads that one blob from the author's PDS.
                id: id => {
                    const a = htl.html`<a href="#" title=${ `download ${ id }` }>${ id }</a>`;
                    a.onclick = e => {
                        e.preventDefault();
                        a.textContent = `${ id } …`;
                        downloadFile(b.did, b.rkey, id).catch(err => {
                            a.textContent = `${ id } — ${ err.message }`;
                        }).then(() => {
                            a.textContent = id;
                        });
                    };
                    return a;
                }
            },
            rows: 8,
            width: {
                size: 90,
                mime: 170
            },
            select: false
        });
    };
};
const _lfvers = function _versionsFor(resolvePds,idb)
{
    // Walks previousVersion up the chain, at most 4 hops, straight off the author's
    // PDS. Each snapshot is cached in the idb store the download path already uses.
    return async function versionsFor(b) {
        const chain = [{
                rkey: b.rkey,
                cid: b.cid,
                createdAt: b.createdAt,
                did: b.did
            }];
        let uri = b.previousVersion;
        for (let hop = 0; hop < 4 && uri; hop++) {
            const key = `version:${ uri }`;
            let snap = await idb.get('records', key).catch(() => null);
            if (!snap) {
                const parts = String(uri).split('/');
                const did = parts[2];
                const collection = parts[3] || 'com.lopecode.bundle';
                const rkey = parts[4];
                if (!did || !rkey)
                    break;
                const pds = await resolvePds(did).then(r => r.pds || r);
                const res = await fetch(`${ pds }/xrpc/com.atproto.repo.getRecord?repo=${ encodeURIComponent(did) }&collection=${ encodeURIComponent(collection) }&rkey=${ encodeURIComponent(rkey) }`);
                if (!res.ok)
                    break;
                const j = await res.json();
                snap = {
                    rkey,
                    did,
                    cid: j.cid,
                    createdAt: String(j.value?.createdAt || '').slice(0, 10),
                    previousVersion: j.value?.previousVersion || null
                };
                await idb.put('records', key, snap).catch(() => {
                });
            }
            chain.push(snap);
            uri = snap.previousVersion;
        }
        return {
            chain,
            more: !!uri
        };
    };
};
const _lfthread = function _threadFor()
{
    return async function threadFor(b) {
        if (!b.bskyPostUri)
            return null;
        const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?depth=1&parentHeight=0&uri=${ encodeURIComponent(b.bskyPostUri) }`);
        if (!r.ok)
            return null;
        const t = (await r.json()).thread;
        const post = t?.post;
        if (!post)
            return null;
        const replies = (t.replies || []).filter(x => x?.post).slice(0, 3).map(x => ({
            handle: x.post.author?.handle || '',
            text: x.post.record?.text || '',
            likes: x.post.likeCount || 0,
            when: x.post.record?.createdAt || x.post.indexedAt
        }));
        return {
            replies,
            total: post.replyCount || replies.length,
            url: `https://bsky.app/profile/${ post.author?.handle || post.author?.did }/post/${ String(post.uri).split('/').pop() }`
        };
    };
};
const _lfcard = function _card(htl,Inputs,downloadHelpers,fmtBytes,fmtRel,modulesTable,versionsFor,threadFor,openLedger)
{
    const {downloadBundle} = downloadHelpers;
    const who = b => b.handle ? `@${ b.handle }` : b.did;
    const hueOf = s => {
        let h = 0;
        const t = String(s || '');
        for (let i = 0; i < t.length; i++)
            h = (h * 31 + t.charCodeAt(i)) % 360;
        return h;
    };
    const avatarOf = b => b.avatar ? htl.html`<img class="lf-avatar" src=${ b.avatar } alt="">` : htl.html`<div class="lf-avatar" style=${ `background:color-mix(in oklch, oklch(0.62 0.11 ${ hueOf(b.handle || b.did) }) 34%, var(--theme-background-alt))` }>${ (b.handle || b.did || '?').replace(/^@/, '').slice(0, 1).toLowerCase() }</div>`;
    // A real anchor, so middle-click and copy-link still work; the href is the
    // stacked form, which is legal at any width. The plain click is intercepted so
    // openLedger can pick the layout from the feed pane's measured width.
    const authorLink = b => {
        const a = htl.html`<a class="lf-mono lf-alt" title=${ `open @${ b.handle }'s ledger` } href=${ `#view=S100(@tomlarkworthy/lopefeed,@tomlarkworthy/ledger)&open=@tomlarkworthy/ledger&handle=${ encodeURIComponent(b.handle) }` }>@${ b.handle }</a>`;
        a.onclick = e => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
                return;
            e.preventDefault();
            openLedger(b.handle);
        };
        return a;
    };
    const panelNote = text => htl.html`<div class="lf-panel"><div class="lf-vrow"><span class="lf-mono lf-fainter">${ text }</span></div></div>`;
    const recordPanel = b => htl.html`<dl class="lf-record">
    ${ [
        [
            'rkey',
            b.rkey
        ],
        [
            'cid',
            b.cid
        ],
        [
            'did',
            b.did
        ],
        [
            'files',
            String(b.files)
        ],
        [
            'size',
            fmtBytes(b.size)
        ],
        [
            'collection',
            'com.lopecode.bundle'
        ]
    ].map(([k, v]) => htl.html`<dt>${ k }</dt><dd>${ v }</dd>`) }
  </dl>`;
    async function fillVersions(b, slot) {
        slot.replaceChildren(panelNote('reading the chain…'));
        let res;
        try {
            res = await versionsFor(b);
        } catch (err) {
            slot.replaceChildren(panelNote(`version chain unavailable — ${ err.message }`));
            return;
        }
        const n = res.chain.length;
        if (n < 2) {
            slot.replaceChildren(htl.html`<div class="lf-panel"><div class="lf-vrow">
        <span class="lf-mono lf-focus">v1</span>
        <span class="lf-mono lf-mute">${ b.createdAt }</span>
        <span class="lf-mono lf-fainter lf-vcid">no earlier snapshots on the chain</span>
      </div></div>`);
            return;
        }
        slot.replaceChildren(htl.html`<div class="lf-panel">
      ${ res.chain.map((s, i) => htl.html`<div class="lf-vrow">
        <span class=${ `lf-mono ${ i === 0 ? 'lf-focus' : 'lf-faint' }` }>v${ n - i }</span>
        <span class="lf-mono lf-mute">${ s.createdAt || '—' }</span>
        <span class="lf-mono lf-fainter lf-vcid">${ i === 0 ? 'current' : `${ String(s.cid || '').slice(0, 14) }…` }</span>
        ${ i === 0 ? '' : htl.html`<a class="lf-mono" target="_blank" rel="noopener" href=${ `https://${ String(s.did || b.did).replace(/:/g, '-') }.lopecode.com/r/${ s.rkey }` }>open</a>` }
      </div>`) }
      ${ res.more ? htl.html`<div class="lf-vrow"><span class="lf-mono lf-fainter">earlier snapshots continue on the chain</span></div>` : '' }
    </div>`);
    }
    async function fillThread(b, slot) {
        let t;
        try {
            t = await threadFor(b);
        } catch {
            return;
        }
        if (!t)
            return;
        slot.replaceChildren(htl.html`<div class="lf-thread">
      <span class="lf-mono lf-fainter lf-xs">companion thread · app.bsky.feed.post</span>
      <div class="lf-replies">
        ${ t.replies.map(r => htl.html`<div>
          <span class="lf-mono lf-focus lf-xs">@${ r.handle }</span>
          <div class="lf-reply-body">${ r.text }</div>
          <span class="lf-mono lf-fainter lf-reply-meta">${ fmtRel(r.when) } · ${ r.likes } like${ r.likes === 1 ? '' : 's' }</span>
        </div>`) }
      </div>
      <a class="lf-mono" style="display:inline-block;margin-top:10px" target="_blank" rel="noopener" href=${ t.url }>${ t.total > t.replies.length ? `view thread ↗ · ${ t.total } replies` : 'view thread ↗' }</a>
    </div>`);
    }
    return function card(b) {
        const previewSlot = htl.html`<div></div>`;
        const threadSlot = htl.html`<div></div>`;
        const errSlot = htl.html`<span class="lf-err"></span>`;
        const busy = htl.html`<span class="lf-busy" hidden></span>`;
        const openForm = Inputs.button('Open ↗', { width: 104 });
        openForm.querySelector('button').addEventListener('click', () => window.open(b.webUrl, '_blank', 'noopener'));
        const dlForm = Inputs.button('Download', { width: 124 });
        const dlBtn = dlForm.querySelector('button');
        dlBtn.addEventListener('click', () => {
            if (dlBtn.disabled)
                return;
            dlBtn.disabled = true;
            dlBtn.textContent = 'Downloading…';
            errSlot.textContent = '';
            busy.replaceChildren(htl.html`<span class="lf-spin"></span>`, htl.html`<span class="lf-mono lf-faint lf-xs">${ b.files } blobs · ${ fmtBytes(b.size) } from ${ who(b) }'s PDS</span>`);
            busy.hidden = false;
            downloadBundle(b.did, b.rkey).catch(err => {
                errSlot.textContent = `download failed — ${ err.message }`;
            }).then(() => {
                dlBtn.disabled = false;
                dlBtn.textContent = 'Download';
                busy.hidden = true;
                busy.replaceChildren();
            });
        });
        const previewBtn = htl.html`<button type="button" class="lf-linkbtn">▸ load preview <span class="lf-fainter">${ fmtBytes(b.size) }</span></button>`;
        previewBtn.onclick = () => {
            const closeBtn = htl.html`<button type="button" class="lf-linkbtn">× close</button>`;
            closeBtn.onclick = () => {
                previewSlot.replaceChildren();
                previewBtn.hidden = false;
            };
            previewSlot.replaceChildren(htl.html`<div class="lf-preview">
        <div class="lf-preview-bar">
          <span class="lf-mono lf-faint lf-xs">preview · ${ b.files } blobs from ${ who(b) }'s PDS</span>
          <a class="lf-mono" target="_blank" rel="noopener" href=${ b.webUrl }>↗ open</a>
          ${ closeBtn }
        </div>
        <iframe src=${ b.webUrl } loading="lazy" title=${ `preview of ${ b.title }` }></iframe>
      </div>`);
            previewBtn.hidden = true;
        };
        const bodies = {
            modules: htl.html`<div hidden></div>`,
            versions: htl.html`<div hidden></div>`,
            record: htl.html`<div hidden></div>`
        };
        const filled = {};
        const disc = (key, label, count) => {
            const btn = htl.html`<button type="button" class="lf-disc" aria-expanded="false">
        <span class="lf-disc-caret">▸</span>${ label }${ count == null ? '' : htl.html`<span class="lf-disc-count">${ count }</span>` }
      </button>`;
            btn.onclick = () => {
                const body = bodies[key];
                const open = body.hidden;
                body.hidden = !open;
                btn.setAttribute('aria-expanded', String(open));
                btn.querySelector('.lf-disc-caret').textContent = open ? '▾' : '▸';
                if (open && !filled[key]) {
                    filled[key] = true;
                    if (key === 'modules')
                        body.replaceChildren(htl.html`<div class="lf-modules">${ modulesTable(b) }</div>`);
                    if (key === 'record')
                        body.replaceChildren(recordPanel(b));
                    if (key === 'versions')
                        fillVersions(b, body);
                }
            };
            return btn;
        };
        if (b.bskyPostUri)
            fillThread(b, threadSlot);
        return htl.html`<article class="lf-card">
    <div class="lf-byline">
      ${ avatarOf(b) }
      ${ b.handle ? authorLink(b) : htl.html`<span class="lf-mono lf-alt">${ b.did }</span>` }
      ${ b.displayName ? htl.html`<span class="lf-name">${ b.displayName }</span>` : '' }
      <span class="lf-byline-meta">
        <span class="lf-mono lf-fainter lf-xs">${ b.createdAt }</span>
      </span>
    </div>
    ${ b.idShaped ? htl.html`<div>
      <h2 class="lf-title lf-title-id"><a target="_blank" rel="noopener" href=${ b.webUrl }>${ b.title }</a></h2>
      <span class="lf-idnote">no title on the record · showing the module id</span>
    </div>` : htl.html`<h2 class="lf-title"><a target="_blank" rel="noopener" href=${ b.webUrl }>${ b.title }</a></h2>` }
    ${ b.summary ? htl.html`<p class="lf-summary">${ b.summary }</p>` : htl.html`<p class="lf-nosummary">
      <span class="lf-mono lf-faint">${ b.modules.length } modules · ${ b.files } files · ${ fmtBytes(b.size) }</span>
      <span class="lf-nosummary-it">no summary written</span>
    </p>` }
    <div class="lf-actions">
      <span class="lf-act" style="width:104px">${ openForm }</span>
      <span class="lf-act" style="width:124px">${ dlForm }</span>
      ${ busy }
      ${ previewBtn }
      ${ errSlot }
    </div>
    ${ previewSlot }
    <div class="lf-discs">
      ${ disc('modules', 'MODULES', b.moduleList.length) }
      ${ disc('versions', 'VERSIONS', null) }
      ${ disc('record', 'RECORD', null) }
    </div>
    ${ bodies.modules }
    ${ bodies.versions }
    ${ bodies.record }
    ${ threadSlot }
  </article>`;
    };
};
const _lfopen = function _openLedger(feedView,location)
{
    const LEDGER = '@tomlarkworthy/ledger';
    return function openLedger(handle) {
        const current = (String(location.hash || '').match(/(?:^#|&)view=([^&]*)/) || [])[1] || '';
        // A ledger already on the page is re-targeted in place: keeping the layout
        // means a second author does not collapse an open side panel into tabs.
        // Otherwise the layout is chosen from the feed pane's own width, not the
        // window's — inside a split the window says nothing about the room the list has.
        const view = current.includes(LEDGER) ? current : feedView.getBoundingClientRect().width >= 1000 ? `R100(S60(@tomlarkworthy/lopefeed),S40(${ LEDGER }))` : `S100(@tomlarkworthy/lopefeed,${ LEDGER })`;
        // open= is lopepage-2's one-shot intent: it makes the ledger the active tab of
        // whichever stack holds it, and lopepage-2 strips it from the hash once applied.
        location.hash = `#view=${ view }&open=${ LEDGER }&handle=${ encodeURIComponent(handle) }`;
    };
};
const _lfview = function _feedView(htl,feedStyle,$0,$1)
{
    // Built ONCE. renderList mutates the parts below in place, so the viewof
    // search element is never re-appended — re-appending it blurs it, which is
    // why typing in the box used to lose focus after every keystroke.
    const count = htl.html`<span class="lf-count"></span>`;
    const matchCount = htl.html`<span class="lf-mono lf-fainter lf-xs lf-matchcount"></span>`;
    const controls = htl.html`<div class="lf-controls">
      <div class="lf-ctl">${ $0 }</div>
      <div class="lf-ctl-sort">${ $1 }</div>
      ${ matchCount }
    </div>`;
    const listEl = htl.html`<div class="lf-list"></div>`;
    const footEl = htl.html`<div class="lf-foot"></div>`;
    const root = htl.html`<div class="lf-root">${ feedStyle }<div class="lf-wrap">
    <header class="lf-head">
      <span class="lf-kicker">LOPECODE · FEED</span>
      <h1 class="lf-h1">The Lopefeed</h1>
      <p class="lf-lede">${ htl.html`<a target="_blank" rel="noopener" href="https://github.com/tomlarkworthy/lopecode">Lopecode</a>` } notebooks on the Atmosphere</p>
      ${ count }
    </header>
    ${ controls }
    ${ listEl }
    ${ footEl }
  </div></div>`;
    root.lfParts = {
        count,
        controls,
        matchCount,
        listEl,
        footEl,
        cards: new Map()
    };
    return root;
};
const _lfrender = function _renderList(htl,Inputs,feedView,rows,matches,list,limit,card,feedCursor,loadMorePage,$2)
{
    const p = feedView.lfParts;
    const {count, controls, matchCount, listEl, footEl, cards} = p;
    count.textContent = `${ rows.length } bundle${ rows.length === 1 ? '' : 's' } on the wire · ${ new Date().toISOString().slice(0, 10) }`;
    if (!rows.length) {
        controls.hidden = true;
        cards.clear();
        const publish = Inputs.button('Publish a notebook ↗', { width: 210 });
        publish.querySelector('button').addEventListener('click', () => window.open('https://did-plc-j7nm3lrd5h7fm3sfhcv3lhfv.lopecode.com/r/atproto', '_blank', 'noopener'));
        listEl.replaceChildren(htl.html`<div class="lf-empty">
      <div class="lf-empty-h">Nothing published yet.</div>
      <p class="lf-empty-p">The feed lists <span class="lf-mono" style="font-size:13.5px">com.lopecode.bundle</span> records as they appear on the network. Publish a notebook and it shows up here within a minute.</p>
      <div class="lf-empty-act"><span class="lf-act" style="width:210px">${ publish }</span></div>
      <span class="lf-mono lf-fainter lf-xs" style="display:block;margin-top:18px">0 records · listRecords returned an empty cursor</span>
    </div>`);
        footEl.replaceChildren();
        return 0;
    }
    controls.hidden = false;
    matchCount.textContent = matches.length === rows.length ? '' : `${ matches.length } of ${ rows.length } match`;
    for (const uri of [...cards.keys()])
        if (!rows.some(r => r.uri === uri))
            cards.delete(uri);
    // Keyed by uri and reconciled in place: a card already on the page is MOVED
    // at worst, never rebuilt, so open disclosures and a loaded preview iframe
    // survive a filter change. replaceChildren would detach every node, which
    // re-navigates any iframe inside it.
    const want = list.map(b => {
        let el = cards.get(b.uri);
        if (!el) {
            el = card(b);
            cards.set(b.uri, el);
        }
        return el;
    });
    want.forEach((node, i) => {
        if (listEl.children[i] !== node)
            listEl.insertBefore(node, listEl.children[i] || null);
    });
    while (listEl.children.length > want.length)
        listEl.lastElementChild.remove();
    const bumpLimit = () => {
        $2.value = limit + 12;
        $2.dispatchEvent(new Event('input', { bubbles: true }));
    };
    if (limit < matches.length || feedCursor) {
        const moreForm = Inputs.button('Load more', { width: 116 });
        const moreBtn = moreForm.querySelector('button');
        moreBtn.addEventListener('click', async () => {
            if (limit < matches.length)
                return bumpLimit();
            moreBtn.disabled = true;
            moreBtn.textContent = 'Loading…';
            try {
                await loadMorePage();
            } finally {
                bumpLimit();
            }
        });
        footEl.replaceChildren(htl.html`<span class="lf-act" style="width:116px">${ moreForm }</span>`, htl.html`<span class="lf-mono lf-fainter lf-xs">showing ${ list.length } of ${ matches.length }${ feedCursor ? ` · cursor ${ String(feedCursor).slice(0, 12) }…` : '' }</span>`);
    } else {
        footEl.replaceChildren(htl.html`<span class="lf-mono lf-fainter lf-xs">end of feed · ${ matches.length } record${ matches.length === 1 ? '' : 's' } · com.lopecode.bundle.listRecords</span>`);
    }
    return list.length;
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
  $def("_lfview", "feedView", ["htl","feedStyle","viewof search","viewof sort"], _lfview);
  $def("_lfrender", "renderList", ["htl","Inputs","feedView","rows","matches","list","limit","card","feedCursor","loadMorePage","viewof limit"], _lfrender);
  $def("_lfcard", "card", ["htl","Inputs","downloadHelpers","fmtBytes","fmtRel","modulesTable","versionsFor","threadFor","openLedger"], _lfcard);
  $def("_lfopen", "openLedger", ["feedView","location"], _lfopen);
  $def("_lfstyle", "feedStyle", ["htl"], _lfstyle);
  $def("_lfmodt", "modulesTable", ["Inputs","htl","fmtBytes","downloadHelpers"], _lfmodt);
  $def("_lfvers", "versionsFor", ["resolvePds","idb"], _lfvers);
  $def("_lfthread", "threadFor", [], _lfthread);
  $def("_lfsearch", "viewof search", ["Inputs","rows"], _lfsearch);
  $def("_lfsearchv", "search", ["Generators","viewof search"], _lfsearchv);
  $def("_lfsort", "viewof sort", ["Inputs"], _lfsort);
  $def("_lfsortv", "sort", ["Generators","viewof sort"], _lfsortv);
  $def("_lflimit", "viewof limit", ["Inputs"], _lflimit);
  $def("_lflimitv", "limit", ["Generators","viewof limit"], _lflimitv);
  $def("_lfmatch", "matches", ["search","sort"], _lfmatch);
  $def("_lflist", "list", ["matches","limit"], _lflist);
  $def("_lfrows", "rows", ["feedRecords","handles"], _lfrows);
  $def("_lfrecs", "feedRecords", ["feedFirstPage","morePages"], _lfrecs);
  $def("_lffirst", "feedFirstPage", [], _lffirst);
  $def("_lfcur", "feedCursor", ["morePages","feedFirstPage"], _lfcur);
  $def("_lfload", "loadMorePage", ["viewof morePages","feedCursor"], _lfload);
  $def("_lfmore", "viewof morePages", ["Inputs"], _lfmore);
  $def("_lfmorev", "morePages", ["Generators","viewof morePages"], _lfmorev);
  $def("_lffmtb", "fmtBytes", [], _lffmtb);
  $def("_lffmtr", "fmtRel", [], _lffmtr);
  $def("_1wfy6qv", "dids", ["feedRecords"], _1wfy6qv);
  $def("_h0jwk3", "handles", ["dids"], _h0jwk3);
  $def("_zt9qa4", "downloadHelpers", ["DecompressionStream","Response","idb","resolvePds","composeBundle"], _zt9qa4);
  main.define("resolvePds", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("resolvePds", _));
  main.define("idb", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("idb", _));
  main.define("composeBundle", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("composeBundle", _));
  return main;
}
