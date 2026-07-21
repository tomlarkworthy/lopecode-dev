const _lu8wfl = function _ledgerView(htl,bskyProfile,did,pds,stats,authStrip,cadenceChart,isOwner,$0,bulkBar)
{
    const fmtBytes = n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`;
    const stat = (v, label) => htl.html`<div style="display:flex;align-items:baseline;gap:6px">
    <span style="font-family:'Source Serif 4',Georgia,serif;font-size:18px;color:#1a1814">${ v }</span>
    <span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e">${ label }</span>
  </div>`;
    const handle = bskyProfile?.handle || '';
    const display = bskyProfile?.displayName || handle || did;
    const bio = bskyProfile?.description || '';
    return htl.html`<div style="
    background:#f5efe5; color:#1a1814;
    font-family:'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif;
    padding:0 0 40px;
  ">
    <h1 style="display:none">Ledger</h1>
    <header style="
      padding:20px 32px;
      border-bottom:2px solid #1a1814;
      background:#efe7d8;
      display:flex; align-items:center; gap:18px;
    ">
      ${ bskyProfile?.avatar ? htl.html`<img src=${ bskyProfile.avatar } style="width:64px;height:64px;border:1px solid #d8cdb4;background:#f5efe5;object-fit:cover">` : htl.html`<div style="width:64px;height:64px;border:1px solid #d8cdb4;background:#f5efe5"></div>` }
      <div>
        <div style="font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:26px;letter-spacing:-0.015em">${ display }</div>
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;margin-top:2px">
          <span style="color:#1a1814;font-weight:500">@${ handle }</span>
          ${ handle ? htl.html` <span style="color:#b6aa92"> ⇄ <a href=${ `https://bsky.app/profile/${ handle }` } target="_blank" style="color:#1f4fb0;text-decoration:none">${ handle }</a></span>` : '' }
        </div>
      </div>
      <div style="
        margin-left:auto; text-align:right;
        font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px;
        color:#7a6f5e; line-height:1.6;
      ">
        <div title=${ did }>${ did }</div>
        <div>${ pds || '' }</div>
      </div>
    </header>

    <div style="
      padding:12px 32px; border-bottom:1px solid #d8cdb4;
      display:flex; gap:32px; flex-wrap:wrap;
    ">
      ${ stat(stats.bundles, 'bundles') }
      ${ stat(stats.modules, 'modules') }
      ${ stat(stats.files.toLocaleString(), 'files') }
      ${ stat(fmtBytes(stats.bytes), 'payload') }
      ${ bskyProfile ? stat(bskyProfile.followersCount ?? 0, 'bsky.followers') : '' }
    </div>

    ${ bio ? htl.html`<p style="
      font-family:'Source Serif 4',Georgia,serif;
      font-size:17px; line-height:1.55; color:#3a342b;
      margin:24px 32px 0; max-width:700px;
    ">${ bio }</p>` : '' }

    ${ authStrip }

    <div style="padding:24px 32px 0">
      <div style="
        font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px;
        color:#7a6f5e; letter-spacing:0.04em; text-transform:uppercase;
      ">publish cadence · last 12 weeks</div>
      <div style="
        margin-top:8px; padding:12px 16px;
        background:#efe7d8; border:1px solid #d8cdb4;
      ">${ cadenceChart }</div>
    </div>

    <div style="padding:24px 32px 0">
      <div style="
        display:flex; align-items:baseline; justify-content:space-between;
        margin-bottom:8px;
      ">
        <span style="
          font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px;
          color:#7a6f5e; letter-spacing:0.04em; text-transform:uppercase;
        ">com.lopecode.bundle · ${ stats.bundles } records</span>
        <span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e">
          ${ isOwner ? 'check rows to select \xB7 delete in bulk' : 'click any header to sort' }
        </span>
      </div>
      ${ $0 }
    </div>

    ${ bulkBar }
  </div>`;
};
const _kaf0fx = function _cadenceChart(Plot,cadence){return(
Plot.plot({
    height: 70,
    width: 720,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 4,
    marginBottom: 16,
    x: {
        type: 'band',
        label: null,
        ticks: []
    },
    y: { axis: null },
    marks: [
        Plot.rectY(cadence, {
            x: d => `w${ d.weekIdx }`,
            y: 'count',
            fill: d => d.weekIdx === 0 ? '#c54f2b' : '#e8a991',
            title: d => `${ d.count } bundle(s) · week of ${ d.weekStart.toISOString().slice(0, 10) }`
        }),
        Plot.text(cadence, {
            x: d => `w${ d.weekIdx }`,
            y: 0,
            text: d => d.count > 0 ? d.count : '',
            dy: 12,
            fill: '#7a6f5e',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace'
        })
    ]
})
)};
const _1vqkma0 = function _stats(bundles)
{
    const seenCids = new Map();
    // cid → size (first-seen wins)
    const uniqueModules = new Set();
    for (const b of bundles) {
        for (const f of b.value?.files || []) {
            const cid = f.blob?.ref?.$link;
            const size = f.blob?.size || 0;
            if (cid && !seenCids.has(cid))
                seenCids.set(cid, size);
            if (typeof f.id === 'string' && /^@[^/]+\/[^/]+$/.test(f.id) && f.blob?.mimeType === 'application/javascript') {
                uniqueModules.add(f.id);
            }
        }
    }
    let bytes = 0;
    for (const s of seenCids.values())
        bytes += s;
    return {
        bundles: bundles.length,
        modules: uniqueModules.size,
        files: seenCids.size,
        // unique blob count
        bytes
    };
};
const _1tdjwl2 = function _cadence(bundles)
{
    const NOW = Date.now();
    const WEEK = 7 * 24 * 3600 * 1000;
    const buckets = new Array(12).fill(0).map((_, i) => ({
        weekIdx: 11 - i,
        // 0 = most recent
        weekStart: new Date(NOW - (12 - i) * WEEK),
        count: 0
    }));
    for (const b of bundles) {
        const t = new Date(b.value?.createdAt || 0).getTime();
        const ago = NOW - t;
        if (ago < 0 || ago > 12 * WEEK)
            continue;
        const idx = 11 - Math.floor(ago / WEEK);
        if (idx >= 0 && idx < 12)
            buckets[idx].count++;
    }
    return buckets;
};
const _b6rinw = async function _bskyProfile(did)
{
    try {
        const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ encodeURIComponent(did) }`);
        if (!r.ok)
            return null;
        return await r.json();
    } catch (e) {
        return null;
    }
};
const _b2zk1s = async function _pds(did)
{
    if (!did.startsWith('did:plc:'))
        return null;
    try {
        const r = await fetch(`https://plc.directory/${ did }`);
        if (!r.ok)
            return null;
        const data = await r.json();
        const svc = (data.service || []).find(s => s.type === 'AtprotoPersonalDataServer');
        return svc?.serviceEndpoint?.replace(/^https?:\/\//, '') || null;
    } catch (e) {
        return null;
    }
};
const _zruzfy = function _rows(bundles,did,crossRefs,bskyEngagement){return(
bundles.map(b => {
    const files = b.value?.files || [];
    const moduleCount = files.filter(f => typeof f.id === 'string' && /^@[^/]+\/[^/]+$/.test(f.id) && f.blob?.mimeType === 'application/javascript').length;
    const totalBytes = files.reduce((n, f) => n + (f.blob?.size || 0), 0);
    const rkey = b.uri.split('/').pop();
    const didSubdomain = did.replace(/:/g, '-');
    const defaultWebUrl = `https://${ didSubdomain }.lopecode.com/r/${ rkey }`;
    const crossRef = crossRefs.get(rkey);
    const bsky = crossRef?.value?.bsky || null;
    const standard = crossRef?.value?.standard || null;
    const bskyStats = bsky?.uri ? bskyEngagement.get(bsky.uri) || null : null;
    return {
        rkey,
        title: b.value?.title || '(untitled)',
        when: new Date(b.value?.createdAt || 0),
        files: files.length,
        size: totalBytes,
        modules: moduleCount,
        cid: b.cid,
        uri: b.uri,
        defaultWebUrl,
        webUrl: standard?.url || defaultWebUrl,
        bsky,
        bskyStats,
        standard
    };
})
)};
const _1legbqg = async function _bundles(did,bundlesRefresh)
{
    const url = new URL('https://contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords');
    url.searchParams.set('did', did);
    url.searchParams.set('limit', '100');
    // bundlesRefresh is a tick; bumping it post-delete forces a refetch.
    // contrail isn't read-after-write consistent for ~1s, so a small delay
    // smooths the round-trip when refreshing.
    if (bundlesRefresh > 0)
        await new Promise(r => setTimeout(r, 800));
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`contrail listRecords ${ r.status }: ${ await r.text() }`);
    const data = await r.json();
    return (data.records || []).slice().sort((a, b) => (b.value?.createdAt || '').localeCompare(a.value?.createdAt || ''));
};
const _cei7u8 = async function _did(params)
{
    if (params.did)
        return params.did;
    if (params.handle) {
        const r = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${ encodeURIComponent(params.handle) }`);
        if (!r.ok)
            throw new Error(`resolveHandle ${ params.handle } → ${ r.status }`);
        return (await r.json()).did;
    }
    return 'did:plc:j7nm3lrd5h7fm3sfhcv3lhfv';    // dev fallback (tomlarkworthy)
};
const _e6jvwf = function _params(Generators,location){return(
Generators.observe(notify => {
    const parsePath = () => {
        const m = (location.pathname || '').match(/^\/@([^/?#]+)/);
        return m ? decodeURIComponent(m[1]) : null;
    };
    const parseHost = () => {
        const m = (location.hostname || '').match(/^did-([a-z]+)-([a-z0-9]+)\.lopecode\.com$/i);
        return m ? `did:${ m[1].toLowerCase() }:${ m[2].toLowerCase() }` : null;
    };
    const parseHash = () => {
        const hash = (location.hash || '').replace(/^#/, '');
        const out = {};
        for (const part of hash.split('&')) {
            if (!part)
                continue;
            const eq = part.indexOf('=');
            const k = eq < 0 ? part : part.slice(0, eq);
            const v = eq < 0 ? '' : part.slice(eq + 1);
            try {
                out[decodeURIComponent(k)] = decodeURIComponent(v);
            } catch {
                out[k] = v;
            }
        }
        return out;
    };
    const compute = () => {
        const h = parseHash();
        return {
            did: h.did || parseHost() || null,
            handle: h.handle || parsePath() || null
        };
    };
    notify(compute());
    const handler = () => notify(compute());
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    return () => {
        window.removeEventListener('hashchange', handler);
        window.removeEventListener('popstate', handler);
    };
})
)};
const _17w2ygi = function _isOwner(currentSession,did){return(
!!(currentSession && currentSession.did === did)
)};
const _1082244 = function _bundlesRefresh(){return(
0
)};
const _sv5k2u = (M, _) => new M(_);
const _luyplb = _ => _.generator;
const _petrr0 = function _bulkBar(isOwner,htl,selectedRows,$0,bundlesRefresh,confirm,deleteBundle,currentSession,xrpc,localStorage,bskyHelpers,writeCrossRef,$1,crossRefsRefresh,did,getStdDoc,ensureScopes,bskyProfile,publishToStdSite,publishStdPub,publishStdDoc,unpublishStdDoc)
{
    if (!isOwner)
        return htl.html`<span></span>`;
    const sel = Array.isArray(selectedRows) ? selectedRows : [];
    if (sel.length === 0)
        return htl.html`<span></span>`;
    const fmtBytes = n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`;
    const count = sel.length;
    const totalBytes = sel.reduce((s, r) => s + (r.size || 0), 0);
    const single = count === 1 ? sel[0] : null;
    const bsky = single?.bsky || null;
    const standard = single?.standard || null;
    const cancel = htl.html`<button style="
    font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px;
    background:transparent; color:#7a6f5e;
    border:none; border-right:1px solid #d8cdb4;
    padding:0 16px; cursor:pointer;
    letter-spacing:0.04em; text-transform:uppercase;
  ">cancel</button>`;
    const status = htl.html`<span style="
    font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#1f4fb0;
    margin-left:auto;
  "></span>`;
    const delBtn = htl.html`<button style="
    font-family:'Inter Tight',sans-serif; font-size:13px; font-weight:500;
    background:#c54f2b; color:#f5efe5; border:none;
    padding:14px 20px; cursor:pointer;
    display:flex; align-items:center; gap:8px;
  "><span>Delete ${ count } record${ count === 1 ? '' : 's' }</span></button>`;
    cancel.addEventListener('click', () => {
        $0.value = (bundlesRefresh || 0) + 1;
    });
    delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete ${ count } bundle${ count === 1 ? '' : 's' } from your atproto repo?\n\nThis cannot be undone.`))
            return;
        delBtn.disabled = true;
        cancel.disabled = true;
        delBtn.textContent = `Deleting…`;
        let ok = 0, fail = 0;
        for (const row of sel) {
            try {
                await deleteBundle({
                    session: currentSession,
                    xrpc,
                    rkey: row.rkey
                });
                ok++;
            } catch (e) {
                console.error('deleteBundle failed', row.rkey, e);
                fail++;
            }
        }
        status.textContent = fail ? `${ ok } deleted · ${ fail } failed` : `${ ok } deleted`;
        $0.value = (bundlesRefresh || 0) + 1;
    });
    let promoteBlock = '';
    if (single) {
        const inputStyle = `
      font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px;
      padding:6px 10px; flex:1; min-width:200px;
      border:1px solid #d6c8b0; border-radius:2px; background:#fff; color:#1a1814;
    `;
        const ghostBtnStyle = `
      font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px;
      letter-spacing:0.04em; padding:6px 12px; cursor:pointer;
      background:#fff; color:#1a1814; border:1px solid #c54f2b; border-radius:2px;
    `;
        const muteBtnStyle = `${ ghostBtnStyle };border-color:#7a6f5e;color:#7a6f5e`;
        const labelStyle = `
      font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px;
      letter-spacing:0.06em; text-transform:uppercase; color:#7a6f5e;
      width:50px; flex:0 0 auto;
    `;
        const needsCrossRefScope = () => {
            try {
                const s = JSON.parse(localStorage.getItem('atproto.session.v1') || 'null');
                if (!s || s.authType !== 'oauth')
                    return false;
                return !(Array.isArray(s.scopes) && s.scopes.includes('repo:com.lopecode.bundle.crossRef'));
            } catch {
                return true;
            }
        };
        // ---- bsky sub-panel ----
        const bskyMsg = htl.html`<span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e"></span>`;
        const bskyInput = htl.html`<input type="text" placeholder="https://bsky.app/profile/…/post/…" value=${ bsky?.url || '' } style=${ inputStyle }/>`;
        const composeBtn = htl.html`<button style=${ ghostBtnStyle }>Compose ↗</button>`;
        const linkBskyBtn = htl.html`<button style=${ ghostBtnStyle }>${ bsky ? 'Change' : 'Link' }</button>`;
        const unlinkBskyBtn = bsky ? htl.html`<button style=${ muteBtnStyle }>Unlink</button>` : '';
        composeBtn.addEventListener('click', () => {
            window.open(bskyHelpers.composeIntentUrl(single.title, single.webUrl), '_blank', 'noopener');
            bskyInput.focus();
            bskyMsg.textContent = 'Composer opened \u2014 paste the resulting Bluesky URL.';
            bskyMsg.style.color = '#7a6f5e';
        });
        linkBskyBtn.addEventListener('click', async () => {
            const pasted = bskyInput.value.trim();
            if (!pasted) {
                bskyMsg.textContent = 'paste a https://bsky.app/profile/\u2026/post/\u2026 URL first';
                bskyMsg.style.color = '#c54f2b';
                return;
            }
            const popup = needsCrossRefScope() ? window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1') : null;
            bskyMsg.textContent = 'resolving\u2026';
            bskyMsg.style.color = '#7a6f5e';
            linkBskyBtn.disabled = true;
            try {
                const atUri = await bskyHelpers.bskyUrlToAtUri(pasted);
                await writeCrossRef(single.rkey, {
                    bsky: {
                        uri: atUri,
                        url: pasted,
                        linkedAt: new Date().toISOString(),
                        source: 'linked'
                    }
                }, popup ? { popup } : {});
                bskyMsg.textContent = '\u2713 linked';
                bskyMsg.style.color = '#1a7a3a';
                $1.value = (crossRefsRefresh || 0) + 1;
            } catch (e) {
                bskyMsg.textContent = `error: ${ e.message }`;
                bskyMsg.style.color = '#c54f2b';
            } finally {
                linkBskyBtn.disabled = false;
                if (popup && !popup.closed) {
                    try {
                        popup.close();
                    } catch {
                    }
                }
            }
        });
        if (unlinkBskyBtn) {
            unlinkBskyBtn.addEventListener('click', async () => {
                if (!confirm(`Unlink Bluesky post from "${ single.title }"?`))
                    return;
                bskyMsg.textContent = 'unlinking\u2026';
                bskyMsg.style.color = '#7a6f5e';
                unlinkBskyBtn.disabled = true;
                try {
                    await writeCrossRef(single.rkey, { bsky: null });
                    bskyMsg.textContent = '\u2713 unlinked';
                    bskyMsg.style.color = '#1a7a3a';
                    $1.value = (crossRefsRefresh || 0) + 1;
                } catch (e) {
                    bskyMsg.textContent = `error: ${ e.message }`;
                    bskyMsg.style.color = '#c54f2b';
                } finally {
                    unlinkBskyBtn.disabled = false;
                }
            });
        }
        // ---- std sub-panel: vanity URL + standard.site federation ----
        // The "std" URL is BOTH the local display URL (resolved into
        // the std column) AND the publication URL claimed by the
        // user's site.standard.publication record. Publishing writes
        // both: a com.lopecode.bundle.crossRef (so the ledger UI uses
        // the URL) and the standard.site records (so indexers can
        // discover the bundle). Lazy state probe via getStdDoc shows
        // whether this rkey is currently published.
        const stdMsg = htl.html`<span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e"></span>`;
        const stdInput = htl.html`<input type="text" placeholder="https://your-vanity-url.example/\u2026" value=${ standard?.url || single.defaultWebUrl } style=${ inputStyle }/>`;
        const stdTitleInput = htl.html`<input type="text" placeholder="title" value=${ single.title || '' } style=${ inputStyle }/>`;
        const stdDescTextarea = htl.html`<textarea placeholder="description (shown in feeds)" rows="3" style=${ inputStyle + ';resize:vertical;font-family:inherit;line-height:1.4' }>${ single.title || '' }</textarea>`;
        const publishStdBtn = htl.html`<button style=${ ghostBtnStyle }>\u25b8 Publish\u2026</button>`;
        const stdSubmitBtn = htl.html`<button type="submit" style=${ ghostBtnStyle }>Publish</button>`;
        const unpublishStdBtn = htl.html`<button style=${ ghostBtnStyle } hidden>Unpublish</button>`;
        const stdForm = htl.html`<form style="display:none; margin-top:8px; flex-direction:column; gap:8px; padding:10px; background:#fff7e6; border:1px solid #e8d8b8; border-radius:4px">
          <div style="display:flex; gap:8px; align-items:center"><span style=${ labelStyle }>title</span>${ stdTitleInput }</div>
          <div style="display:flex; gap:8px; align-items:flex-start"><span style=${ labelStyle + ';padding-top:4px' }>desc</span>${ stdDescTextarea }</div>
          <div>${ stdSubmitBtn }</div>
        </form>`;
        const isStdFormOpen = () => stdForm.style.display !== 'none';
        const setStdFormOpen = open => {
            stdForm.style.display = open ? 'flex' : 'none';
            publishStdBtn.textContent = open ? '\u25BE Cancel' : unpublishStdBtn.hidden ? '\u25B8 Publish\u2026' : '\u25B8 Update\u2026';
        };
        publishStdBtn.addEventListener('click', e => {
            e.preventDefault();
            setStdFormOpen(!isStdFormOpen());
        });
        const stdAtUri = htl.html`<a href="" target="_blank" rel="noopener" style="color:#1f4fb0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px" hidden></a>`;
        const stdDocAtUriFor = rkey => `at://${ currentSession?.did || did }/site.standard.document/${ rkey }`;
        const setStdPublishedView = published => {
            if (published) {
                stdAtUri.hidden = false;
                stdAtUri.textContent = stdDocAtUriFor(single.rkey);
                stdAtUri.setAttribute('href', `https://pdsls.dev/${ stdDocAtUriFor(single.rkey) }`);
                publishStdBtn.textContent = isStdFormOpen() ? '\u25BE Cancel' : '\u25B8 Update\u2026';
                unpublishStdBtn.hidden = false;
            } else {
                stdAtUri.hidden = true;
                stdAtUri.textContent = '';
                publishStdBtn.textContent = isStdFormOpen() ? '\u25BE Cancel' : '\u25B8 Publish\u2026';
                unpublishStdBtn.hidden = true;
            }
        };
        // Lazy state probe \u2014 only meaningful when viewing your own ledger.
        // Also prefills the form inputs from the existing record so editing
        // is non-destructive (user can republish without retyping).
        (async () => {
            if (!currentSession || currentSession.did !== did)
                return;
            try {
                const got = await getStdDoc({
                    session: currentSession,
                    xrpc,
                    rkey: single.rkey
                });
                if (got?.value) {
                    if (got.value.title)
                        stdTitleInput.value = got.value.title;
                    if (got.value.description)
                        stdDescTextarea.value = got.value.description;
                }
                setStdPublishedView(!!got);
            } catch (e) {
                stdMsg.textContent = `state check failed: ${ e.message }`;
                stdMsg.style.color = '#c54f2b';
            }
        })();
        const needsAnyStdScope = () => {
            try {
                const s = JSON.parse(localStorage.getItem('atproto.session.v1') || 'null');
                if (!s || s.authType !== 'oauth')
                    return false;
                const have = new Set(s.scopes || []);
                return !(have.has('repo:com.lopecode.bundle.crossRef') && have.has('repo:site.standard.publication') && have.has('repo:site.standard.document'));
            } catch {
                return true;
            }
        };
        stdForm.addEventListener('submit', async e => {
            e.preventDefault();
            const pasted = stdInput.value.trim();
            if (!pasted || !/^https?:\/\//i.test(pasted)) {
                stdMsg.textContent = 'paste an absolute URL (https://\u2026)';
                stdMsg.style.color = '#c54f2b';
                return;
            }
            let pubUrl;
            try {
                pubUrl = new URL(pasted).origin;
            } catch {
                stdMsg.textContent = 'invalid URL';
                stdMsg.style.color = '#c54f2b';
                return;
            }
            // Single popup for the union of scopes \u2014 ensureScopes
            // called inside writeCrossRef / publishToStdSite is
            // idempotent, so subsequent calls are no-ops.
            const popup = needsAnyStdScope() ? window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1') : null;
            stdMsg.textContent = 'publishing\u2026';
            stdMsg.style.color = '#7a6f5e';
            stdSubmitBtn.disabled = true;
            try {
                await ensureScopes([
                    'repo:com.lopecode.bundle.crossRef',
                    'repo:site.standard.publication',
                    'repo:site.standard.document'
                ], popup ? { popup } : {});
                // 1. local crossRef \u2014 only if user picked
                // something other than defaultWebUrl (otherwise the std
                // column already resolves to it without a crossRef).
                if (pasted !== single.defaultWebUrl) {
                    await writeCrossRef(single.rkey, {
                        standard: {
                            url: pasted,
                            linkedAt: new Date().toISOString()
                        }
                    });
                } else if (standard) {
                    await writeCrossRef(single.rkey, { standard: null });
                }
                $1.value = (crossRefsRefresh || 0) + 1;
                // 2. federation records on the user's PDS
                const pubName = bskyProfile?.displayName || currentSession?.handle || did;
                // Upload the ledger page's favicon (lopecode disk icon, a
                // data: URI SVG baked into <link rel="icon">) as a blob
                // and use it as coverImage. Same icon for every published
                // notebook — uploadBlob is content-addressed, so the PDS
                // dedupes by CID across publishes.
                //
                // The favicon is fill="white" because it's designed for the
                // browser tab on a dark UI background. For a feed thumbnail
                // we need the opposite contrast — swap white → dark before
                // upload so it's visible on indexers' light backgrounds.
                let coverImage;
                try {
                    const iconHref = document.querySelector('link[rel*="icon"]')?.href;
                    const m = iconHref && /^data:image\/svg\+xml;base64,(.+)$/.exec(iconHref);
                    if (m) {
                        let svg = new TextDecoder().decode(Uint8Array.from(atob(m[1]), c => c.charCodeAt(0)));
                        svg = svg.replace(/fill="white"/gi, 'fill="#1a1814"').replace(/fill="#fff(?:fff)?"/gi, 'fill="#1a1814"');
                        const bytes = new TextEncoder().encode(svg);
                        const ub = await xrpc(currentSession, 'com.atproto.repo.uploadBlob', {
                            method: 'POST',
                            headers: { 'content-type': 'image/svg+xml' },
                            body: bytes
                        });
                        if (ub.ok)
                            coverImage = (await ub.json()).blob;
                    }
                } catch {
                }
                const titleVal = stdTitleInput.value.trim() || single.title;
                const descVal = stdDescTextarea.value.trim() || titleVal;
                await publishToStdSite({
                    session: currentSession,
                    xrpc,
                    ensureScopes,
                    rkey: single.rkey,
                    title: titleVal,
                    description: descVal,
                    coverImage,
                    // publishedAt omitted on purpose — publishStdDoc defaults
                    // to "now" on first publish and preserves the existing
                    // value on republish, anchoring discovery feed ordering
                    // to the moment the doc record was first written.
                    updatedAt: new Date().toISOString(),
                    pubUrl,
                    pubName,
                    pubDescription: bskyProfile?.description || undefined,
                    bskyPostRef: single.bsky?.uri ? { uri: single.bsky.uri } : undefined
                }, {
                    publishStdPub,
                    publishStdDoc
                });
                stdMsg.textContent = '\u2713 published \xB7 indexers can discover this bundle';
                stdMsg.style.color = '#1a7a3a';
                setStdFormOpen(false);
                setStdPublishedView(true);
            } catch (e) {
                stdMsg.textContent = `error: ${ e.message }`;
                stdMsg.style.color = '#c54f2b';
            } finally {
                stdSubmitBtn.disabled = false;
                if (popup && !popup.closed) {
                    try {
                        popup.close();
                    } catch {
                    }
                }
            }
        });
        unpublishStdBtn.addEventListener('click', async () => {
            if (!confirm(`Unpublish "${ single.title }" from standard.site discovery? The bundle itself stays on your PDS \u2014 only the site.standard.document is deleted.`))
                return;
            stdMsg.textContent = 'unpublishing\u2026';
            stdMsg.style.color = '#7a6f5e';
            unpublishStdBtn.disabled = true;
            try {
                await unpublishStdDoc({
                    session: currentSession,
                    xrpc,
                    rkey: single.rkey
                });
                if (standard) {
                    await writeCrossRef(single.rkey, { standard: null });
                    $1.value = (crossRefsRefresh || 0) + 1;
                }
                stdMsg.textContent = '\u2713 unpublished';
                stdMsg.style.color = '#1a7a3a';
                setStdPublishedView(false);
            } catch (e) {
                stdMsg.textContent = `error: ${ e.message }`;
                stdMsg.style.color = '#c54f2b';
            } finally {
                unpublishStdBtn.disabled = false;
            }
        });
        const bskyState = bsky ? htl.html`<span>linked · <a href=${ bsky.url } target="_blank" rel="noopener" style="color:#1f4fb0">${ bsky.url }</a></span>` : htl.html`<span style="color:#c54f2b">● not posted</span>`;
        promoteBlock = htl.html`<div style="
      padding:10px 18px; border-top:1px solid #e8d8b8; background:#fcf6ec;
      display:flex; flex-direction:column; gap:12px;
    ">
      <div>
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e;margin-bottom:4px">${ bskyState }</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          <span style=${ labelStyle }>bsky</span>
          ${ composeBtn }${ bskyInput }${ linkBskyBtn }${ unlinkBskyBtn }
        </div>
        ${ bskyMsg }
      </div>
      <div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          <a href="https://standard.site" target="_blank" rel="noopener" title="standard.site" style=${ labelStyle + ';color:#1f4fb0;text-decoration:none' }>std.site ↗</a>
          ${ stdInput }${ publishStdBtn }${ unpublishStdBtn }
        </div>
        ${ stdForm }
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;margin-top:4px">${ stdAtUri }</div>
        ${ stdMsg }
      </div>
    </div>`;
    }
    return htl.html`<div style="
    position:sticky; bottom:0; margin:12px 32px 0;
    border:1px solid #1a1814; border-top:2px solid #c54f2b;
    background:#f5efe5;
    box-shadow:0 -4px 0 rgba(26,24,20,0.04);
    font-family:'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif;
    z-index:5;
  ">
    <div style="display:grid; grid-template-columns:1fr auto; align-items:center">
      <div style="padding:12px 18px; display:flex; align-items:center; gap:18px">
        <div style="display:flex; align-items:baseline; gap:6px">
          <span style="font-family:'Source Serif 4',Georgia,serif;font-size:24px;font-weight:600;color:#1a1814;line-height:1">${ String(count).padStart(2, '0') }</span>
          <span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e;letter-spacing:0.04em;text-transform:uppercase">selected</span>
        </div>
        <div style="width:1px;height:24px;background:#d8cdb4"></div>
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#7a6f5e;line-height:1.5">
          <div><span style="color:#b6aa92">payload</span> ${ fmtBytes(totalBytes) } · <span style="color:#b6aa92">collection</span> com.lopecode.bundle</div>
          <div><span style="color:#b6aa92">action</span> ${ count } × <span style="color:#c54f2b">com.atproto.repo.deleteRecord</span>${ single ? htl.html` · <span style="color:#b6aa92">promote</span> ${ single.title }` : '' }</div>
        </div>
        ${ status }
      </div>
      <div style="display:flex; align-items:stretch; border-left:1px solid #d8cdb4">
        ${ cancel }${ delBtn }
      </div>
    </div>
    ${ promoteBlock }
  </div>`;
};
const _1mas4kp = function _authStrip(htl,currentSession,did,location,loginWidget,isOwner)
{
    // Banner above the table that adapts to (signed-out) vs (signed-in own ledger) vs (signed-in viewing others).
    // The viewer form lets anyone browse another DID/handle's ledger by writing
    // to location.hash — picked up by the params observer that drives `did`.
    const inputStyle = 'padding:4px 8px; border:1px solid #b6aa92; background:#fcf6ec; font-family:\'JetBrains Mono\',ui-monospace,monospace; font-size:11px; min-width:280px; flex:1';
    const btnStyle = 'padding:4px 10px; border:1px solid #1a1814; background:transparent; font-family:\'JetBrains Mono\',ui-monospace,monospace; font-size:11px; cursor:pointer';
    const viewerInput = htl.html`<input type="text" placeholder="did:plc:… or handle.bsky.social" value=${ currentSession?.did === did ? currentSession.handle || did : did || '' } style=${ inputStyle }/>`;
    const viewerBtn = htl.html`<button type="submit" style=${ btnStyle }>View</button>`;
    const viewerForm = htl.html`<form style="display:flex; gap:8px; align-items:center; flex:1; min-width:280px">${ viewerInput }${ viewerBtn }</form>`;
    viewerForm.addEventListener('submit', e => {
        e.preventDefault();
        const v = viewerInput.value.trim();
        if (!v)
            return;
        const key = /^did:/.test(v) ? 'did' : 'handle';
        location.hash = `${ key }=${ encodeURIComponent(v) }`;
    });
    if (!currentSession) {
        return htl.html`<div style="
      margin: 20px 32px 0;
      max-width: 640px;
      display: flex; flex-direction: column; gap: 10px;
    ">
      <div style="
        display:flex; align-items:center; gap:8px;
        font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px;
        letter-spacing:0.06em; text-transform:uppercase; color:#c54f2b;
      "><span>●</span><span>sign in to manage records · or browse a ledger below</span></div>
      <div style="display:flex; gap:8px; align-items:center; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px">
        <span style="color:#7a6f5e">view</span>${ viewerForm }
      </div>
      ${ loginWidget() }
    </div>`;
    }
    // Signed-in
    const ownLabel = isOwner ? 'this is your ledger' : 'viewing another ledger';
    const ownColor = isOwner ? '#2e7d32' : '#7a6f5e';
    return htl.html`<div style="
    margin:16px 32px 0;
    padding:8px 14px;
    background:#f5efe5;
    border:1px solid #d8cdb4;
    border-left:3px solid ${ ownColor };
    display:flex; flex-direction:column; gap:8px;
    font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; color:#3a342b;
  ">
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap">
      <span style="color:${ ownColor }">● ${ ownLabel }</span>
      <span style="color:#7a6f5e">session · ${ currentSession.handle || currentSession.did }</span>
      <span style="color:#b6aa92">·</span>
      <span style="color:#7a6f5e">scope · bundle:write, bundle:delete</span>
      ${ isOwner ? htl.html`<span style="color:#7a6f5e">· select rows below to delete in bulk</span>` : '' }
    </div>
    <div style="display:flex; gap:8px; align-items:center">
      <span style="color:#7a6f5e">view</span>${ viewerForm }
    </div>
  </div>`;
};
const _d7fzf = function _selectedRows(Generators,$0){return(
Generators.input($0)
)};
const _bi69bn = function _ledgerTable(Inputs,rows,htl,isOwner,MutationObserver)
{
    const view = Inputs.table(rows, {
        columns: [
            'title',
            'when',
            'bsky',
            'files',
            'size',
            'modules',
            'rkey',
            'cid'
        ],
        header: { bsky: 'bsky' },
        format: {
            title: (s, i) => {
                // The title already links to the live URL (webUrl resolves
                // to the standard.site vanity URL when set, else lopecode.com).
                // Removed the separate "std" column because the link in the
                // title made it redundant.
                const url = rows[i]?.webUrl;
                return url ? htl.html`<a href=${ url } target="_blank" rel="noopener" style="color:#1f4fb0">${ s }</a>` : s;
            },
            when: d => d.toISOString().slice(0, 16).replace('T', ' '),
            size: n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`,
            rkey: s => htl.html`<span style="color:#c54f2b;font-family:'JetBrains Mono',ui-monospace,monospace">${ s }</span>`,
            cid: s => s ? `${ s.slice(0, 10) }…` : '',
            bsky: (_, i) => {
                const r = rows[i];
                if (!r)
                    return '';
                if (!r.bsky) {
                    return htl.html`<span title="not posted to Bluesky" style="color:#c54f2b">●</span>`;
                }
                const stats = r.bskyStats;
                const label = stats ? `♥${ stats.likeCount }${ stats.repostCount ? ` ↻${ stats.repostCount }` : '' }` : '\u2026';
                return htl.html`<a href=${ r.bsky.url } target="_blank" rel="noopener" title="Bluesky post" style="color:#1f4fb0;text-decoration:none;font-family:'JetBrains Mono',ui-monospace,monospace">${ label }</a>`;
            }
        },
        width: '100%',
        multiple: isOwner,
        required: false,
        layout: 'auto',
        rows: 30
    });
    const t = view.querySelector('table');
    if (t) {
        t.style.maxWidth = 'none';
        const cls = 'ledger-table-' + Math.random().toString(36).slice(2, 8);
        t.classList.add(cls);
        const style = document.createElement('style');
        style.textContent = `
      table.${ cls } tbody tr { cursor: pointer; }
      table.${ cls } tbody tr:hover { background:#fcf6ec; }
      table.${ cls } tbody tr:has(input:checked) { background:#f5e9d0; }
    `;
        view.prepend(style);
    }
    const wireRows = () => {
        for (const tr of view.querySelectorAll('tbody tr')) {
            if (tr.dataset.clickWired === '1')
                continue;
            tr.dataset.clickWired = '1';
            tr.addEventListener('click', e => {
                if (e.target.closest('a, button, input, label'))
                    return;
                const cb = tr.querySelector('input[type="checkbox"], input[type="radio"]');
                if (cb)
                    cb.click();
            });
        }
    };
    wireRows();
    const tbody = view.querySelector('tbody');
    if (tbody)
        new MutationObserver(wireRows).observe(tbody, { childList: true });
    return view;
};
const _1pj7469 = (G, _) => G.input(_);
const _stlrph = function _bskyHelpers()
{
    return {
        parseBskyPostUrl(url) {
            // https://bsky.app/profile/<handleOrDid>/post/<rkey>
            try {
                const u = new URL(String(url || '').trim());
                if (u.hostname !== 'bsky.app')
                    return null;
                const m = u.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\/?$/);
                if (!m)
                    return null;
                return {
                    actor: decodeURIComponent(m[1]),
                    rkey: decodeURIComponent(m[2])
                };
            } catch {
                return null;
            }
        },
        async resolveActorToDid(actor) {
            if (actor.startsWith('did:'))
                return actor;
            const r = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${ encodeURIComponent(actor) }`);
            if (!r.ok)
                throw new Error(`resolveHandle ${ actor } → ${ r.status }`);
            return (await r.json()).did;
        },
        async bskyUrlToAtUri(url) {
            const parsed = this.parseBskyPostUrl(url);
            if (!parsed)
                throw new Error('Not a bsky.app post URL');
            const did = await this.resolveActorToDid(parsed.actor);
            return `at://${ did }/app.bsky.feed.post/${ parsed.rkey }`;
        },
        composeIntentUrl(title, lopecodeUrl) {
            const text = `${ title }\n\n${ lopecodeUrl }`;
            return `https://bsky.app/intent/compose?text=${ encodeURIComponent(text) }`;
        }
    };
};
const _19jqka4 = function _crossRefsRefresh(){return(
0
)};
const _1vpbprv = (M, _) => new M(_);
const _1i6bv6i = _ => _.generator;
const _51iie8 = function _crossRefs(pds,did,crossRefsRefresh){return(
async function (pds, did, crossRefsRefresh) {
    if (!pds || !did)
        return new Map();
    if (crossRefsRefresh > 0)
        await new Promise(r => setTimeout(r, 600));
    const all = new Map();
    let cursor;
    for (let page = 0; page < 5; page++) {
        const url = new URL(`https://${ pds }/xrpc/com.atproto.repo.listRecords`);
        url.searchParams.set('repo', did);
        url.searchParams.set('collection', 'com.lopecode.bundle.crossRef');
        url.searchParams.set('limit', '100');
        if (cursor)
            url.searchParams.set('cursor', cursor);
        const r = await fetch(url);
        if (!r.ok)
            return all;
        const data = await r.json();
        for (const rec of data.records || []) {
            const rkey = rec.uri.split('/').pop();
            all.set(rec.value?.bundleRkey || rkey, rec);
        }
        if (!data.cursor || (data.records || []).length === 0)
            break;
        cursor = data.cursor;
    }
    return all;
}(pds, did, crossRefsRefresh)
)};
const _1jjqzln = function _bskyEngagement(crossRefs)
{
    return async function (crossRefs) {
        const out = new Map();
        const uris = [];
        for (const rec of crossRefs.values()) {
            const uri = rec.value?.bsky?.uri;
            if (uri)
                uris.push(uri);
        }
        if (uris.length === 0)
            return out;
        // app.bsky.feed.getPosts accepts up to 25 URIs per call
        for (let i = 0; i < uris.length; i += 25) {
            const batch = uris.slice(i, i + 25);
            const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts');
            for (const u of batch)
                url.searchParams.append('uris', u);
            try {
                const r = await fetch(url);
                if (!r.ok)
                    continue;
                const data = await r.json();
                for (const p of data.posts || []) {
                    out.set(p.uri, {
                        likeCount: p.likeCount ?? 0,
                        repostCount: p.repostCount ?? 0,
                        replyCount: p.replyCount ?? 0
                    });
                }
            } catch {
            }
        }
        return out;
    }(crossRefs);
};
const _1xg591i = function _writeCrossRef(currentSession,ensureScopes,xrpc)
{
    return async function (bundleRkey, patch, opts = {}) {
        if (!currentSession)
            throw new Error('Not signed in');
        const sess = await ensureScopes(['repo:com.lopecode.bundle.crossRef'], opts) || currentSession;
        let existing = null, swapRecord;
        const gr = await xrpc(sess, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(sess.did) }&collection=com.lopecode.bundle.crossRef&rkey=${ encodeURIComponent(bundleRkey) }`, { method: 'GET' });
        if (gr.ok) {
            const g = await gr.json();
            existing = g.value;
            swapRecord = g.cid;
        }
        const merged = {
            $type: 'com.lopecode.bundle.crossRef',
            bundleRkey,
            ...existing || {},
            ...patch,
            updatedAt: new Date().toISOString()
        };
        for (const k of Object.keys(patch))
            if (patch[k] === null)
                delete merged[k];
        if (!merged.bsky && !merged.standard) {
            // No meaningful fields left — delete the record entirely.
            const r = await xrpc(sess, 'com.atproto.repo.deleteRecord', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    repo: sess.did,
                    collection: 'com.lopecode.bundle.crossRef',
                    rkey: bundleRkey
                })
            });
            if (!r.ok && r.status !== 404)
                throw new Error(`deleteRecord crossRef ${ r.status }: ${ await r.text() }`);
            return null;
        }
        const r = await xrpc(sess, 'com.atproto.repo.putRecord', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: sess.did,
                collection: 'com.lopecode.bundle.crossRef',
                rkey: bundleRkey,
                record: merged,
                ...swapRecord ? { swapRecord } : {}
            })
        });
        if (!r.ok)
            throw new Error(`putRecord crossRef ${ r.status }: ${ await r.text() }`);
        return await r.json();
    };
};
const _15y75gl = function _deleteCrossRef(currentSession,xrpc){return(
async function (bundleRkey) {
    if (!currentSession)
        throw new Error('Not signed in');
    const r = await xrpc(currentSession, 'com.atproto.repo.deleteRecord', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            repo: currentSession.did,
            collection: 'com.lopecode.bundle.crossRef',
            rkey: bundleRkey
        })
    });
    if (!r.ok)
        throw new Error(`deleteRecord crossRef ${ r.status }: ${ await r.text() }`);
}
)};
const _8adhjz = function _23(md){return(
md`
## Cross-posting & versioning

### Data model

**\`com.lopecode.bundle.crossRef\`** — one record per bundle rkey, ledger-owned.

\`\`\`
rkey: <same as bundle rkey>
{
  bundleRkey: string,
  bsky?:     { uri: at://, url: https://bsky.app/..., linkedAt: datetime, source: "intent" | "linked" },
  standard?: { url: string, linkedAt: datetime },  // vanity override only
  updatedAt: datetime
}
\`\`\`

The "default" web URL (\`<did-subdomain>.lopecode.com/r/<rkey>\`) is derived, never stored. \`standard.url\` overrides the link target in the ledger.

**\`com.lopecode.bundle.version\`** — append-only frozen snapshots, at-write-owned. Kept forever; no UI column yet.

\`\`\`
rkey: <bundleRkey>--<tid>            // atproto TID, 13 base32 chars (already encodes the snapshot moment)
{
  $type: "com.lopecode.bundle.version",
  versionOf:        at://{did}/com.lopecode.bundle/<bundleRkey>,
  previousVersion?: at://{did}/com.lopecode.bundle.version/<bundleRkey>--<priorTid>,
  record:           <verbatim copy of prior bundle value, blob refs inlined>
}
\`\`\`

The schema is **forward-compatible**: \`record\` is typed as \`unknown\` in the lexicon so future additions to \`com.lopecode.bundle\` need no changes here. The snapshot writer spreads the prior value (\`record: { ...prior.value }\`) and never enumerates fields.

The snapshot's \`record\` field inlines the prior file array (including \`blob\` refs). That keeps the prior blobs reachable from the current MST so the PDS does not GC them — the version record IS the liveness anchor for old blobs, not the historical commit log.

\`com.lopecode.bundle\` itself is **unchanged** — no \`previousVersion\` pointer added. Discovery is range-scan only (next paragraph), so the live bundle stays version-unaware.

### Discovery — \`listBundleVersions\`

Snapshots for one bundle share the rkey prefix \`<bundleRkey>--\`, so atproto's \`listRecords\` with \`rkeyStart\` / \`rkeyEnd\` returns just that bundle's history in one server-side range query:

\`\`\`
listRecords(
  collection = com.lopecode.bundle.version,
  rkeyStart  = "<bundleRkey>--",
  rkeyEnd    = "<bundleRkey>-.",        // "." (0x2E) > "-" (0x2D), excludes other bundles
  reverse    = true                     // newest first
)
\`\`\`

The \`previousVersion\` field on each snapshot lets a reader walk the DAG explicitly — supporting forks and merges without any schema change (multiple snapshots may share a \`previousVersion\` parent; a future merge snapshot could carry \`previousVersion: [...]\`).

### Republish flow (at-write, \`publishBundleVersion\`)

1. \`getRecord\` the live bundle → \`{ cid, value }\`
2. \`listRecords\` reverse to find the most-recent existing snapshot URI (chain tip) — set as \`previousVersion\` on the new snapshot
3. \`applyWrites\` atomically:
   - \`create\` \`com.lopecode.bundle.version/<bundleRkey>--<tid>\` with the prior value inlined
   - \`update\` \`com.lopecode.bundle/<bundleRkey>\` with the new value
4. First publish (no prior record) skips snapshotting and does a plain \`putRecord\`
5. Cross-refs untouched — separate record, separate lifetime

### Ledger columns

\`title · when · std · bsky · files · size · modules\`

- **std** — column header is a link to https://standard.site. Each cell links to \`<did-subdomain>.lopecode.com/r/<rkey>\` (or the vanity override) as "live".
- **bsky** — orange ● if no crossRef; otherwise the whole cell is a link showing \`♥N\` (and \`↻M\` when reposts > 0). Like/repost counts come from batched \`app.bsky.feed.getPosts\` against \`public.api.bsky.app\`, lazy after table mount.

### Promote panel (single row selected)

| State | Buttons |
|---|---|
| no crossRef | **Compose on Bluesky ↗** · **Link existing** (paste field) |
| has crossRef | (shows current bsky URL) · **Change** · **Unlink** |

- **Compose** opens \`https://bsky.app/intent/compose?text=<title>%0A%0A<lopecodeUrl>\` in a new tab. Title on first line; URL on a separate line so Bluesky generates the embed card.
- **Link / Change** — paste any \`https://bsky.app/profile/<x>/post/<y>\` URL; resolve handle → did, write \`com.lopecode.bundle.crossRef\` record.
- **Unlink** — clears the field via patch-merge; record is deleted entirely when neither bsky nor standard remain.

### Scopes

Adds two NSIDs to the OAuth scope set, deployed via \`ensureScopes\` on first crossRef write:

- \`repo:com.lopecode.bundle.crossRef\` (ledger)
- \`repo:com.lopecode.bundle.version\` (at-write, used by \`publishBundleVersion\`)

---

## Standard.site integration (proposed)

[Standard.site](https://standard.site) defines three atproto lexicons for long-form publishing where the **PDS holds metadata only** and content lives on the publisher's own domain. Lopecode already satisfies the hosting half — every bundle is served from \`<did-subdomain>.lopecode.com/r/<rkey>\` (or a vanity URL). Adding standard.site records turns each ledger into a discoverable publication.

### Mapping

| standard.site | lopecode |
|---|---|
| \`site.standard.publication\` (1 per user) | the ledger itself — a user's collection of bundles |
| \`site.standard.document\` (1 per bundle) | each \`com.lopecode.bundle\` record, by rkey |
| \`site.standard.graph.subscription\` | out of scope for ledger; reader-side feature |

### Record shapes

**\`site.standard.publication\`** — one per user, rkey \`self\` (singleton). Required: \`url\`, \`name\`. Optional: \`icon\`, \`description\`, \`basicTheme\`, \`preferences.showInDiscover\`.

\`\`\`
{
  $type: "site.standard.publication",
  url: "https://<did-subdomain>.lopecode.com",    // or user-chosen base domain
  name: bskyProfile.displayName || handle,
  description: bskyProfile.description,
  // icon: omitted in v0 — indexers fall back to <base-url>/favicon.ico (lopecode.com favicon)
  preferences: { showInDiscover: true }
}
\`\`\`

**\`site.standard.document\`** — one per bundle, same rkey as the bundle for 1:1 mapping. Required: \`site\`, \`title\`, \`publishedAt\`.

\`\`\`
{
  $type: "site.standard.document",
  site: "at://<did>/site.standard.publication/self",
  title: bundle.title,
  path: "/r/<bundleRkey>",                         // relative to publication.url
  publishedAt: bundle.createdAt,
  updatedAt: bundle.replacedAt || bundle.createdAt,
  description: <derived from first markdown cell, optional>,
  textContent: <plain-text summary, optional>,
  bskyPostRef: crossRef.bsky ? { uri: crossRef.bsky.uri, cid: ... } : undefined,
  tags: [...derived module names, optional]
}
\`\`\`

### Verification (lopecode.com side)

Two hosting changes — both on the contrail/router layer, not the notebook:

1. **\`/.well-known/site.standard.publication\`** on each user-facing host. Per-user resolution:
   - \`<did-subdomain>.lopecode.com/.well-known/site.standard.publication\` → response body is the AT-URI of that DID's publication record, i.e. \`at://<did>/site.standard.publication/self\`.
   - Standard 200 with the AT-URI as the body (plain text per spec; \`Content-Type: text/plain\` is safest).
   - For vanity domains, the *publisher* must serve their own well-known. Lopecode can't sign that on their behalf.

2. **HTML \`<link>\` tag in each \`/r/<rkey>\` response**:

\`\`\`
<link rel="site.standard.document"
      href="at://<did>/site.standard.document/<bundleRkey>">
\`\`\`

Easiest place: contrail injects it as it serves the bundle HTML (we already rewrite the head for OG cards). Alternative: bake into the notebook bootloader, but then vanity domains need to know their own AT-URI at build time — contrail injection is cleaner.

### Ledger UX additions

- **std column** stays as-is (link to live URL). The header link to standard.site is the discoverability hint.
- **Promote panel** gains a third sub-panel \`std.site\` with state:
  - *not published* → **Publish to standard.site** button. First click creates the \`site.standard.publication\` (if missing) AND the \`site.standard.document\`. Both go to the user's PDS.
  - *published* → shows the AT-URI; **Unpublish** deletes the document record.
- A single \`Publish all\` action in the bulk bar could batch-publish all bundles when selection > 1. Defer.

### Scope additions

OAuth scopes — append to the existing list and update \`lopecode.com/oauth/client.json\`:

- \`repo:site.standard.publication\`
- \`repo:site.standard.document\`
- (subscription scope deferred — not a ledger-side concern)

### Indexing

Standard.site indexers (Tap and downstream) consume relay traffic from \`bsky.network\`. Since user PDSes already federate there, **no push step is required from lopecode** — publishing the records is enough to be picked up. The \`/.well-known\` + \`<link>\` pair lets indexers verify that the hosted HTML really belongs to the claimed publication.

### Open questions

- **rkey for publication**: \`self\` (singleton, human-readable) vs TID (atproto-conventional). \`self\` matches \`app.bsky.actor.profile\` precedent.
- **Icon blob**: v0 skips per-user blob upload; indexers use the lopecode.com favicon served from \`<base-url>/favicon.ico\`. Revisit if users want branded publication icons.
- **\`textContent\` extraction**: cheap = first markdown cell. Better = stripped notebook prose. Defer to v1.
- **Vanity domains** can't be auto-served with \`/.well-known\` — UI should tell users to host the endpoint themselves before linking.

`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/at-login", async () => runtime.module((await import("/@tomlarkworthy/at-login.js?v=4")).default));  
  main.define("module @tomlarkworthy/at-write", async () => runtime.module((await import("/@tomlarkworthy/at-write.js?v=4")).default));  
  $def("_lu8wfl", "ledgerView", ["htl","bskyProfile","did","pds","stats","authStrip","cadenceChart","isOwner","viewof ledgerTable","bulkBar"], _lu8wfl);  
  $def("_kaf0fx", "cadenceChart", ["Plot","cadence"], _kaf0fx);  
  $def("_1vqkma0", "stats", ["bundles"], _1vqkma0);  
  $def("_1tdjwl2", "cadence", ["bundles"], _1tdjwl2);  
  $def("_b6rinw", "bskyProfile", ["did"], _b6rinw);  
  $def("_b2zk1s", "pds", ["did"], _b2zk1s);  
  $def("_zruzfy", "rows", ["bundles","did","crossRefs","bskyEngagement"], _zruzfy);  
  $def("_1legbqg", "bundles", ["did","bundlesRefresh"], _1legbqg);  
  $def("_cei7u8", "did", ["params"], _cei7u8);  
  $def("_e6jvwf", "params", ["Generators","location"], _e6jvwf);  
  $def("_17w2ygi", "isOwner", ["currentSession","did"], _17w2ygi);  
  $def("_1082244", "initial bundlesRefresh", [], _1082244);  
  $def("_sv5k2u", "mutable bundlesRefresh", ["Mutable","initial bundlesRefresh"], _sv5k2u);  
  $def("_luyplb", "bundlesRefresh", ["mutable bundlesRefresh"], _luyplb);  
  $def("_petrr0", "bulkBar", ["isOwner","htl","selectedRows","mutable bundlesRefresh","bundlesRefresh","confirm","deleteBundle","currentSession","xrpc","localStorage","bskyHelpers","writeCrossRef","mutable crossRefsRefresh","crossRefsRefresh","did","getStdDoc","ensureScopes","bskyProfile","publishToStdSite","publishStdPub","publishStdDoc","unpublishStdDoc"], _petrr0);  
  $def("_1mas4kp", "authStrip", ["htl","currentSession","did","location","loginWidget","isOwner"], _1mas4kp);  
  $def("_d7fzf", "selectedRows", ["Generators","viewof ledgerTable"], _d7fzf);  
  $def("_bi69bn", "viewof ledgerTable", ["Inputs","rows","htl","isOwner","MutationObserver"], _bi69bn);  
  $def("_1pj7469", "ledgerTable", ["Generators","viewof ledgerTable"], _1pj7469);  
  $def("_stlrph", "bskyHelpers", [], _stlrph);  
  $def("_19jqka4", "initial crossRefsRefresh", [], _19jqka4);  
  $def("_1vpbprv", "mutable crossRefsRefresh", ["Mutable","initial crossRefsRefresh"], _1vpbprv);  
  $def("_1i6bv6i", "crossRefsRefresh", ["mutable crossRefsRefresh"], _1i6bv6i);  
  $def("_51iie8", "crossRefs", ["pds","did","crossRefsRefresh"], _51iie8);  
  $def("_1jjqzln", "bskyEngagement", ["crossRefs"], _1jjqzln);  
  $def("_1xg591i", "writeCrossRef", ["currentSession","ensureScopes","xrpc"], _1xg591i);  
  $def("_15y75gl", "deleteCrossRef", ["currentSession","xrpc"], _15y75gl);  
  $def("_8adhjz", null, ["md"], _8adhjz);  
  main.define("currentSession", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("currentSession", _));  
  main.define("xrpc", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("xrpc", _));  
  main.define("loginWidget", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("loginWidget", _));  
  main.define("ensureScopes", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("ensureScopes", _));  
  main.define("deleteBundle", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("deleteBundle", _));  
  main.define("publishToStdSite", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("publishToStdSite", _));  
  main.define("publishStdPub", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("publishStdPub", _));  
  main.define("publishStdDoc", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("publishStdDoc", _));  
  main.define("unpublishStdDoc", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("unpublishStdDoc", _));  
  main.define("getStdDoc", ["module @tomlarkworthy/at-write", "@variable"], (_, v) => v.import("getStdDoc", _));
  return main;
}