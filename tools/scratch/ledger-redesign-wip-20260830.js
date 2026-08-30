const _lgstyle = function _ledgerStyle(htl){return(
htl.html`<style>
.lg-root{background:var(--theme-background);color:var(--theme-foreground);font-family:var(--sans-serif);min-height:100%;padding:34px 40px}
.lg-wrap{max-width:1040px;margin:0 auto;min-width:0}
.lg-root [hidden]{display:none!important}
.lg-root a{color:var(--theme-foreground-focus);text-decoration:none}
.lg-root a:hover{text-decoration:underline}
.lg-mono{font-family:var(--monospace);font-size:11px;letter-spacing:.02em;color:var(--theme-foreground-muted)}
.lg-alt{color:var(--theme-foreground-alt)}
.lg-mute{color:var(--theme-foreground-muted)}
.lg-faint{color:var(--theme-foreground-faint)}
.lg-fainter{color:var(--theme-foreground-fainter)}
.lg-focus{color:var(--theme-foreground-focus)}
.lg-xs{font-size:10.5px}
.lg-xxs{font-size:10px}
.lg-eyebrow{font-family:var(--monospace);font-size:10.5px;letter-spacing:.12em;color:var(--theme-foreground-fainter)}
.lg-idhead{display:flex;gap:18px;align-items:flex-start}
.lg-avatar{width:64px;height:64px;flex:0 0 64px;border-radius:50%;border:1px solid var(--theme-foreground-faintest);object-fit:cover;background:var(--theme-background-alt);display:grid;place-items:center;font-family:var(--monospace);font-size:23px;color:var(--theme-foreground-alt)}
.lg-avatar>img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.lg-idbody{min-width:0;flex:1}
.lg-h1{font-family:var(--serif);font-weight:600;font-size:38px;letter-spacing:-.03em;line-height:1.05;margin:0;color:var(--theme-foreground);word-break:break-word}
.lg-handles{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-top:6px}
.lg-bio{font-family:var(--serif);font-size:17px;line-height:1.5;color:var(--theme-foreground-muted);margin:10px 0 0;max-width:520px;text-wrap:pretty}
.lg-stats{display:flex;gap:20px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--theme-foreground-faintest)}
.lg-stat{display:inline-flex;align-items:baseline;gap:5px}
.lg-statv{font-family:var(--monospace);font-size:13.5px;color:var(--theme-foreground)}
.lg-cadence{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}
.lg-bars{display:flex;align-items:flex-end;gap:3px;height:26px}
.lg-week{width:12px;background:color-mix(in srgb, var(--theme-foreground) 12%, transparent)}
.lg-week.lg-week-on{background:color-mix(in srgb, var(--theme-foreground) 34%, transparent)}
.lg-week.lg-week-now{background:var(--theme-foreground-focus)}
.lg-disc{appearance:none;background:transparent;border:none;padding:3px 0;cursor:pointer;font-family:var(--monospace);font-size:11px;letter-spacing:.04em;color:var(--theme-foreground-faint);display:inline-flex;align-items:center;gap:6px}
.lg-disc:hover{color:var(--theme-foreground)}
.lg-disc[aria-expanded=true]{color:var(--theme-foreground-focus)}
.lg-caret{font-size:9px;opacity:.8}
.lg-identity{margin-top:12px}
.lg-panel{margin-top:8px;padding:11px 13px;background:var(--theme-background-alt);border:1px solid var(--theme-foreground-faintest);display:grid;gap:5px;max-width:560px}
.lg-kv{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.lg-k{flex:0 0 30px}
.lg-v{word-break:break-all;flex:1 1 180px;min-width:0}
.lg-authrow{margin-top:18px;padding-top:14px;border-top:1px solid var(--theme-foreground-faintest);display:grid;gap:10px}
.lg-authline{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.lg-dot{width:6px;height:6px;border-radius:50%;flex:0 0 6px;display:inline-block;background:var(--theme-foreground-fainter)}
.lg-dot.lg-dot-on{background:var(--theme-foreground-focus)}
.lg-trigger{margin-left:auto;display:inline-flex;align-items:center;gap:8px}
.lg-loginhost>button{display:none!important}
.lg-viewer{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.lg-viewer-ctl{display:inline-flex;width:300px;max-width:100%}
.lg-act{display:inline-flex;flex:0 0 auto}
.lg-act form{width:100%}
.lg-root .lg-act button{font-family:var(--monospace);font-size:13px}
.lg-danger{display:inline-flex;padding:1px;border-radius:3px;background:color-mix(in srgb, var(--theme-foreground-focus) 55%, transparent)}
.lg-linkbtn{appearance:none;background:transparent;border:none;padding:0;cursor:pointer;font-family:var(--monospace);font-size:11px;color:var(--theme-foreground-faint)}
.lg-linkbtn:hover{color:var(--theme-foreground)}
.lg-tablesec{margin-top:22px}
.lg-tablehead{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding-bottom:8px}
.lg-hint{margin-left:auto}
.lg-tablewrap{min-width:0;overflow-x:auto}
.lg-tablewrap table{max-width:100%}
.lg-cards{display:none}
.lg-root:not(.lg-owner) .lg-tablewrap thead th:first-child,
.lg-root:not(.lg-owner) .lg-tablewrap tbody td:first-child{visibility:hidden;width:0;padding:0}
.lg-tablewrap tbody tr{cursor:pointer}
.lg-tablewrap tbody tr:hover{background:color-mix(in srgb, var(--theme-foreground) 6%, transparent)}
.lg-tablewrap tbody tr:has(input:checked){background:color-mix(in srgb, var(--theme-foreground-focus) 12%, transparent)}
.lg-tablewrap input[type=checkbox],.lg-tablewrap input[type=radio]{accent-color:var(--theme-foreground-focus)}
.lg-titlecell{display:block;padding:2px 0;max-width:300px}
.lg-titleline{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.lg-titlelink{font-family:var(--serif);font-size:14.5px;min-width:0;text-wrap:pretty}
.lg-titledesc{display:block;font-family:var(--serif);font-size:12.5px;line-height:1.4;color:var(--theme-foreground-faint);max-width:44ch;margin-top:2px}
.lg-root.lg-narrow .lg-titlecell{max-width:none}
.lg-rowlist{border-top:1px solid var(--theme-foreground-faintest)}
.lg-row{border-bottom:1px solid var(--theme-foreground-faintest);padding:11px 0 10px}
.lg-row.lg-row-sel{background:color-mix(in srgb, var(--theme-foreground-focus) 10%, transparent)}
.lg-rowhead{display:flex;gap:9px;align-items:flex-start}
.lg-rowbody{min-width:0;flex:1}
.lg-rowcheck{margin-top:3px;accent-color:var(--theme-foreground-focus);flex:0 0 auto}
.lg-rowtitle{font-family:var(--serif);font-size:15.5px;line-height:1.25}
.lg-rowdesc{font-family:var(--serif);font-size:13px;line-height:1.4;color:var(--theme-foreground-faint);margin-top:3px;text-wrap:pretty}
.lg-rowfacts{display:flex;gap:9px;flex-wrap:wrap;margin-top:6px;align-items:baseline}
.lg-recgrid{margin-top:2px;padding:9px 11px;background:var(--theme-background-alt);border:1px solid var(--theme-foreground-faintest);display:grid;gap:4px}
.lg-reck{flex:0 0 26px}
.lg-barwrap{position:sticky;bottom:0;margin-top:18px;background:var(--theme-background-alt);border:1px solid var(--theme-foreground-faintest);box-shadow:0 -10px 24px -18px color-mix(in srgb, var(--theme-foreground) 40%, transparent);z-index:5}
.lg-layer-a{padding:13px 16px;display:grid;gap:10px}
.lg-selline{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.lg-count{font-family:var(--monospace);font-size:15px;color:var(--theme-foreground)}
.lg-actionrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.lg-actionlabel{flex:1 1 200px;min-width:0}
.lg-confirmtext{flex:0 1 300px}
.lg-promote{border-top:1px solid var(--theme-foreground-faintest);padding:13px 16px;display:grid;gap:14px}
.lg-prow{display:grid;gap:8px;margin-top:8px;grid-template-columns:max-content minmax(0,1fr) max-content;align-items:end}
.lg-pbtns{display:flex;gap:8px;flex-wrap:wrap}
.lg-full{display:inline-flex;width:100%;min-width:0}
.lg-full form{width:100%}
.lg-stateline{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}
.lg-msg{display:flex;align-items:center;gap:7px;margin-top:7px}
.lg-spin{display:inline-block;width:10px;height:10px;border-radius:50%;border:1.5px solid var(--theme-foreground-fainter);border-top-color:var(--theme-foreground-focus);animation:lg-spin .8s linear infinite;flex:0 0 auto}
@keyframes lg-spin{to{transform:rotate(360deg)}}
.lg-stdform{margin-top:10px;padding:12px 14px;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background);display:grid;gap:10px}
.lg-stdaturi{display:block;margin-top:4px;word-break:break-all}
.lg-notice{margin-top:24px;padding:28px 26px;border:1px solid var(--theme-foreground-faintest);background:var(--theme-background-alt);text-align:center}
.lg-notice-h{font-family:var(--serif);font-size:21px;color:var(--theme-foreground-alt)}
.lg-notice-p{font-family:var(--serif);font-size:15.5px;line-height:1.55;color:var(--theme-foreground-muted);max-width:420px;margin:10px auto 0;text-wrap:pretty}
.lg-notice-act{margin-top:16px;display:flex;justify-content:center}
.lg-notice-foot{display:block;margin-top:14px}
.lg-steps{display:grid;gap:6px;margin-top:20px;padding-top:14px;border-top:1px solid var(--theme-foreground-faintest)}
.lg-step{display:flex;gap:8px;align-items:center}
.lg-skel{border-radius:2px;background:color-mix(in srgb, var(--theme-foreground) 6%, transparent)}
.lg-skelhead{display:flex;gap:18px;align-items:flex-start}
.lg-skelav{width:64px;height:64px;flex:0 0 64px;border-radius:50%;background:color-mix(in srgb, var(--theme-foreground) 7%, transparent)}
.lg-skelbody{display:grid;gap:9px;flex:1;min-width:0}
.lg-skeltable{margin-top:22px;display:grid;gap:9px}
.lg-skelrow{display:grid;grid-template-columns:minmax(0,1fr) 110px 70px;gap:12px;padding:8px 0;border-bottom:1px solid var(--theme-foreground-faintest)}
.lg-root.lg-narrow{padding:20px 16px 26px}
.lg-root.lg-narrow .lg-idhead{gap:12px}
.lg-root.lg-narrow .lg-avatar,.lg-root.lg-narrow .lg-skelav{width:44px;height:44px;flex:0 0 44px;font-size:16px}
.lg-root.lg-narrow .lg-h1{font-size:27px}
.lg-root.lg-narrow .lg-bio{font-size:15px}
.lg-root.lg-narrow .lg-stats{gap:12px}
.lg-root.lg-narrow .lg-week{width:9px}
.lg-root.lg-narrow .lg-tablewrap{display:none}
.lg-root.lg-narrow .lg-cards{display:block}
.lg-root.lg-narrow .lg-hint{margin-left:0}
.lg-root.lg-narrow .lg-trigger{margin-left:0}
.lg-root.lg-narrow .lg-viewer-ctl{width:100%}
.lg-root.lg-narrow .lg-barwrap{position:static}
.lg-root.lg-narrow .lg-layer-a,.lg-root.lg-narrow .lg-promote{padding:11px 12px}
.lg-root.lg-narrow .lg-prow{grid-template-columns:1fr}
.lg-root.lg-narrow .lg-actionlabel,.lg-root.lg-narrow .lg-confirmtext{flex:1 1 100%}
.lg-root.lg-narrow .lg-stdform{padding:10px 11px}
.lg-root.lg-narrow .lg-notice{padding:22px 18px}
.lg-root.lg-narrow .lg-notice-h{font-size:19px}
@media (max-width:600px){
.lg-root{padding:20px 16px 26px}
.lg-root .lg-h1{font-size:27px}
.lg-root .lg-bio{font-size:15px}
.lg-root .lg-avatar,.lg-root .lg-skelav{width:44px;height:44px;flex:0 0 44px;font-size:16px}
.lg-root .lg-week{width:9px}
.lg-root .lg-tablewrap{display:none}
.lg-root .lg-cards{display:block}
.lg-root .lg-hint,.lg-root .lg-trigger{margin-left:0}
.lg-root .lg-viewer-ctl{width:100%}
.lg-root .lg-barwrap{position:static}
.lg-root .lg-prow{grid-template-columns:1fr}
}
/* The host renders one cell node per variable; the ledger is an app, so the
   inspector rows for its data cells and import headers stay out of the page. */
.lp2-pane[data-module="@tomlarkworthy/ledger"] .observablehq:has(>.observablehq--inspect),
.lp2-pane[data-module="@tomlarkworthy/ledger"] .observablehq--import{display:none}
</style>`
)};
const _lgview = function _ledgerView(htl,ledgerStyle,ResizeObserver)
{
    // Built ONCE. `renderLedger` fills the slots in place, so the auth-strip
    // text field and the bulk bar's inputs are never re-appended (re-appending
    // blurs them mid-keystroke).
    const avatarSlot = htl.html`<div class="lg-avatar"></div>`;
    const nameEl = htl.html`<h1 class="lg-h1"></h1>`;
    const handlesEl = htl.html`<div class="lg-handles"></div>`;
    const bioSlot = htl.html`<div></div>`;
    const statsEl = htl.html`<div class="lg-stats"></div>`;
    const cadenceSlot = htl.html`<div></div>`;
    const identityPanel = htl.html`<div class="lg-panel" hidden></div>`;
    const identityDisc = htl.html`<button class="lg-disc" type="button" aria-expanded="false"><span class="lg-caret">▸</span>IDENTITY</button>`;
    identityDisc.addEventListener('click', () => {
        const open = identityDisc.getAttribute('aria-expanded') !== 'true';
        identityDisc.setAttribute('aria-expanded', String(open));
        identityDisc.firstElementChild.textContent = open ? '▾' : '▸';
        identityPanel.hidden = !open;
    });
    const header = htl.html`<header>
    <div class="lg-idhead">${ avatarSlot }<div class="lg-idbody">${ nameEl }${ handlesEl }${ bioSlot }</div></div>
    ${ statsEl }
    ${ cadenceSlot }
    <div class="lg-identity">${ identityDisc }${ identityPanel }</div>
  </header>`;
    const authSlot = htl.html`<div class="lg-authrow"></div>`;
    const recCount = htl.html`<span class="lg-eyebrow"></span>`;
    const hint = htl.html`<span class="lg-mono lg-fainter lg-xs lg-hint"></span>`;
    const tableSlot = htl.html`<div class="lg-tablewrap"></div>`;
    const cardsSlot = htl.html`<div class="lg-cards"></div>`;
    const tableSec = htl.html`<section class="lg-tablesec">
    <div class="lg-tablehead">${ recCount }${ hint }</div>
    <div class="lg-list">${ tableSlot }${ cardsSlot }</div>
  </section>`;
    const barSlot = htl.html`<div class="lg-bar"></div>`;
    const noticeSlot = htl.html`<div></div>`;
    const steps = [
        'resolve handle',
        'fetch DID document · PDS host',
        'load bsky profile',
        'listRecords com.lopecode.bundle',
        'crossRefs · bsky engagement'
    ];
    const skel = (w, h, o = 1) => htl.html`<div class="lg-skel" style=${ `width:${ w };height:${ h }px;background:color-mix(in srgb, var(--theme-foreground) ${ 6 * o }%, transparent)` }></div>`;
    const stepEls = steps.map(s => htl.html`<div class="lg-step"><span class="lg-mono lg-fainter">·</span><span class="lg-mono lg-fainter">${ s }</span></div>`);
    const loadingEl = htl.html`<div>
    <div class="lg-skelhead"><div class="lg-skelav"></div><div class="lg-skelbody">${ skel('40%', 26) }${ skel('26%', 11) }${ skel('56%', 11, 0.7) }</div></div>
    <div class="lg-steps">${ stepEls }</div>
    <div class="lg-skeltable">${ skel('30%', 10, 0.8) }${ [0, 1, 2, 3, 4].map(i => htl.html`<div class="lg-skelrow" style=${ `opacity:${ 1 - i * 0.16 }` }>${ skel('72%', 13) }${ skel('80%', 10, 0.7) }${ skel('60%', 10, 0.7) }</div>`) }</div>
  </div>`;
    const setStep = n => {
        stepEls.forEach((el, i) => {
            const [mark, label] = el.children;
            mark.className = i < n ? 'lg-mono lg-faint' : i === n ? 'lg-spin' : 'lg-mono lg-fainter';
            mark.textContent = i < n ? '✓' : i === n ? '' : '·';
            label.className = i === n ? 'lg-mono lg-alt' : i < n ? 'lg-mono lg-faint' : 'lg-mono lg-fainter';
        });
    };
    setStep(0);
    const content = htl.html`<div hidden>${ header }${ authSlot }${ tableSec }${ barSlot }${ noticeSlot }</div>`;
    const root = htl.html`<div class="lg-root">${ ledgerStyle }<div class="lg-wrap">${ loadingEl }${ content }</div></div>`;
    // The page runs inside a lopepage pane, so the narrow variant is a
    // CONTAINER width, not a viewport media query.
    const applyWidth = w => root.classList.toggle('lg-narrow', w > 0 && w < 600);
    try {
        new ResizeObserver(entries => applyWidth(entries[0].contentRect.width)).observe(root);
    } catch (e) {
    }
    root.lgParts = {
        header,
        avatarSlot,
        nameEl,
        handlesEl,
        bioSlot,
        statsEl,
        cadenceSlot,
        identityPanel,
        identityDisc,
        authSlot,
        recCount,
        hint,
        tableSlot,
        cardsSlot,
        tableSec,
        barSlot,
        noticeSlot,
        loadingEl,
        content,
        setStep,
        applyWidth
    };
    return root;
};
const _lgprog = function _loadProgress(ledgerView,did,pds,bskyProfile)
{
    // Steps 1–3 have landed by the time these three cells resolve; the spinner
    // moves to listRecords, and renderLedger removes the skeleton entirely.
    ledgerView.lgParts.setStep(3);
    return [
        did,
        pds,
        bskyProfile
    ].filter(Boolean).length;
};
const _lgcad = function _cadenceMark(htl,cadence,bundles)
{
    const max = Math.max(1, ...cadence.map(c => c.count));
    const total = cadence.reduce((a, c) => a + c.count, 0);
    const last = bundles.map(b => String(b.value?.createdAt || '')).filter(Boolean).sort().pop();
    const bars = cadence.map((c, i) => htl.html`<div class=${ `lg-week${ c.count ? ' lg-week-on' : '' }${ i === cadence.length - 1 ? ' lg-week-now' : '' }` }
    style=${ `height:${ Math.max(2, c.count / max * 26) }px` }
    title=${ `${ c.count } bundle(s) · week of ${ c.weekStart.toISOString().slice(0, 10) }` }></div>`);
    return htl.html`<div class="lg-cadence">
    <div class="lg-bars">${ bars }</div>
    <span class="lg-mono lg-fainter lg-xs">12 weeks · ${ cadence[cadence.length - 1].count } this week · ${ total } in the window · last ${ last ? last.slice(0, 10) : '—' }</span>
  </div>`;
};
const _lgauth = function _authStrip(htl,Inputs,currentSession,did,bskyProfile,location,loginWidget,isOwner)
{
    // Three states of one strip. The sign-in popover belongs to at-login: the
    // widget is mounted as-is and only its own trigger button is hidden, so the
    // page can offer a themed trigger without restyling the shared module.
    const prefill = currentSession?.did === did ? currentSession.handle || did : bskyProfile?.handle || did || '';
    const viewerCtl = Inputs.text({
        label: 'view',
        value: prefill,
        placeholder: 'did:plc:… or handle.bsky.social',
        width: 300
    });
    const viewerBtn = Inputs.button('View', { width: 78 });
    const go = () => {
        const v = String(viewerCtl.value || '').trim();
        if (!v)
            return;
        location.hash = `${ /^did:/.test(v) ? 'did' : 'handle' }=${ encodeURIComponent(v) }`;
    };
    viewerBtn.querySelector('button').addEventListener('click', go);
    viewerCtl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            go();
        }
    });
    const viewer = htl.html`<div class="lg-viewer"><span class="lg-viewer-ctl">${ viewerCtl }</span><span class="lg-act" style="width:78px">${ viewerBtn }</span></div>`;
    const widget = loginWidget();
    widget.classList.add('lg-loginhost');
    const handle = currentSession?.handle || currentSession?.did || '';
    const label = currentSession ? `@${ handle } · ${ currentSession.authType || 'session' } · pkce ▾` : '● sign in ▾';
    const width = currentSession ? Math.min(340, 30 + Math.round(label.length * 7.6)) : 104;
    const trigger = Inputs.button(label, { width });
    trigger.querySelector('button').addEventListener('click', () => widget.querySelector('button')?.click());
    const state = !currentSession ? 'out' : isOwner ? 'owner' : 'other';
    const line = state === 'out' ? 'sign in to manage records · or browse a ledger below' : state === 'owner' ? 'this is your ledger' : 'viewing another ledger';
    return htl.html`<div>
    <div class="lg-authline">
      <span style="display:inline-flex;gap:7px;align-items:center">
        <span class=${ `lg-dot${ state !== 'other' ? ' lg-dot-on' : '' }` }></span>
        <span class=${ `lg-mono ${ state === 'owner' ? 'lg-alt' : 'lg-faint' }` }>${ line }</span>
      </span>
      ${ state !== 'out' ? htl.html`<span class="lg-mono lg-faint lg-xs">session · @${ handle }</span>` : '' }
      ${ state !== 'out' ? htl.html`<span class="lg-mono lg-faint lg-xs">scope · bundle:write, bundle:delete</span>` : '' }
      ${ state === 'owner' ? htl.html`<span class="lg-mono lg-faint lg-xs">select rows below to delete in bulk</span>` : '' }
      <span class="lg-trigger"><span class="lg-act" style=${ `width:${ width }px` }>${ trigger }</span>${ widget }</span>
    </div>
    ${ viewer }
  </div>`;
};
const _lgrender = function _renderLedger(htl,Inputs,ledgerView,didError,bskyProfile,did,pds,stats,isOwner,rows,cadenceMark,authStrip,$0,narrowList,bulkBar)
{
    const p = ledgerView.lgParts;
    const fmtBytes = n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`;
    // Re-mounting a node that is already in the slot would detach and re-append
    // it, which blurs whatever is focused inside — only move it when it moved.
    const mount = (slot, node) => {
        if (slot.firstElementChild !== node)
            slot.replaceChildren(node);
    };
    const handle = bskyProfile?.handle || (didError ? didError.handle : '') || '';
    const display = bskyProfile?.displayName || handle || did || 'unknown';
    p.loadingEl.hidden = true;
    p.content.hidden = false;
    ledgerView.classList.toggle('lg-owner', !!isOwner);
    p.applyWidth(ledgerView.getBoundingClientRect().width);
    // Adopt every DOM-returning cell up front. A cell whose value is a node is
    // rendered in its own block until something moves it, so the notice states
    // below (which return early) would otherwise leave the cadence mark, the
    // table, the cards and the bar stranded under the page.
    mount(p.cadenceSlot, cadenceMark);
    mount(p.tableSlot, $0);
    mount(p.cardsSlot, narrowList);
    mount(p.barSlot, bulkBar);
    // No author in the URL — the auth strip's viewer form is the whole page.
    if (!did && !didError) {
        p.header.hidden = true;
        p.tableSec.hidden = true;
        p.barSlot.replaceChildren();
        mount(p.authSlot, authStrip);
        p.noticeSlot.replaceChildren(htl.html`<div class="lg-notice">
      <div class="lg-notice-h">No ledger selected.</div>
      <p class="lg-notice-p">Paste a handle or a DID above to browse what that author has published, or open a ledger from <a href="https://lopecode.com/" target="_blank" rel="noopener">the feed</a>.</p>
      <span class="lg-mono lg-fainter lg-xs lg-notice-foot">no did= or handle= in the URL</span>
    </div>`);
        return 0;
    }
    p.header.hidden = false;
    // identity
    if (bskyProfile?.avatar) {
        mount(p.avatarSlot, htl.html`<img src=${ bskyProfile.avatar } alt=${ `${ display } avatar` }>`);
    } else {
        let h = 0;
        for (const c of String(did || handle || '?'))
            h = (h * 31 + c.charCodeAt(0)) % 360;
        p.avatarSlot.style.background = `color-mix(in oklch, oklch(0.62 0.11 ${ h }) 34%, var(--theme-background-alt))`;
        p.avatarSlot.textContent = String(display).slice(0, 1).toLowerCase();
    }
    p.nameEl.textContent = display;
    p.handlesEl.replaceChildren(...handle ? [
        htl.html`<span class="lg-mono lg-alt" style="font-size:11.5px">@${ handle }</span>`,
        htl.html`<a class="lg-mono" href=${ `https://bsky.app/profile/${ handle }` } target="_blank" rel="noopener">bsky.app ↗</a>`
    ] : []);
    p.bioSlot.replaceChildren(...bskyProfile?.description ? [htl.html`<p class="lg-bio">${ bskyProfile.description }</p>`] : []);
    const statPairs = [
        [
            stats.bundles,
            'bundles'
        ],
        [
            stats.modules,
            'modules'
        ],
        [
            stats.files.toLocaleString(),
            'files'
        ],
        [
            fmtBytes(stats.bytes),
            'payload'
        ],
        ...bskyProfile ? [[
                bskyProfile.followersCount ?? 0,
                'bsky.followers'
            ]] : []
    ];
    p.statsEl.replaceChildren(...statPairs.map(([v, l]) => htl.html`<span class="lg-stat"><span class="lg-statv">${ v }</span><span class="lg-mono lg-fainter lg-xs">${ l }</span></span>`));
    const kv = (k, v) => htl.html`<div class="lg-kv"><span class="lg-mono lg-fainter lg-xs lg-k">${ k }</span><span class="lg-mono lg-alt lg-v">${ v }</span></div>`;
    p.identityPanel.replaceChildren(kv('did', did || '— unresolved'), kv('pds', pds || '— none advertised'), kv('lex', 'com.lopecode.bundle'), htl.html`<span class="lg-mono lg-fainter lg-xxs">select to copy · plumbing, kept out of the first read</span>`);
    mount(p.authSlot, authStrip);
    // table / cards / notices
    if (didError) {
        p.tableSec.hidden = true;
        p.barSlot.replaceChildren();
        p.noticeSlot.replaceChildren(htl.html`<div class="lg-notice">
      <div class="lg-notice-h">That handle does not resolve.</div>
      <p class="lg-notice-p">No atproto identity answers for <span class="lg-mono" style="font-size:13.5px">@${ didError.handle || '' }</span>. Check the spelling, or paste a DID instead.</p>
      <span class="lg-mono lg-fainter lg-xs lg-notice-foot">com.atproto.identity.resolveHandle · ${ didError.message }</span>
    </div>`);
        return 0;
    }
    if (rows.length === 0) {
        p.tableSec.hidden = true;
        p.barSlot.replaceChildren();
        const publish = Inputs.button('Publish a notebook ↗', { width: 200 });
        publish.querySelector('button').addEventListener('click', () => window.open('https://lopecode.com/atproto', '_blank', 'noopener'));
        p.noticeSlot.replaceChildren(htl.html`<div class="lg-notice">
      <div class="lg-notice-h">No bundles published yet.</div>
      <p class="lg-notice-p">Everything this author publishes as a <span class="lg-mono" style="font-size:13.5px">com.lopecode.bundle</span> record appears here, newest first.</p>
      <div class="lg-notice-act"><span class="lg-act" style="width:200px">${ publish }</span></div>
      <span class="lg-mono lg-fainter lg-xs lg-notice-foot">listRecords · 0 records · cap 100, no paging</span>
    </div>`);
        return 0;
    }
    p.noticeSlot.replaceChildren();
    p.tableSec.hidden = false;
    p.recCount.textContent = `COM.LOPECODE.BUNDLE · ${ rows.length } RECORDS`;
    p.hint.textContent = isOwner ? 'check rows to select · delete in bulk' : 'click any header to sort';
    mount(p.tableSlot, $0);
    mount(p.cardsSlot, narrowList);
    mount(p.barSlot, bulkBar);
    return rows.length;
};
const _bi69bn = function _ledgerTable(Inputs,rows,htl,isOwner,MutationObserver)
{
    const view = Inputs.table(rows, {
        columns: [
            'title',
            'when',
            'bskyLikes',
            'files',
            'size',
            'modules',
            'rkey',
            'cid'
        ],
        header: { bskyLikes: 'bsky' },
        format: {
            title: (s, i) => {
                const r = rows[i];
                const line = htl.html`<span class="lg-titleline">
          <a class="lg-titlelink" href=${ r?.webUrl } target="_blank" rel="noopener" style=${ r?.title === '(untitled)' ? 'color:var(--theme-foreground-faint)' : '' }>${ s }</a>
          ${ r?.version > 1 ? htl.html`<span class="lg-mono lg-fainter lg-xxs">v${ r.version }</span>` : '' }
          ${ r?.standard ? htl.html`<span class="lg-mono lg-faint lg-xxs">std.site</span>` : '' }
        </span>`;
                return htl.html`<span class="lg-titlecell">${ line }${ r?.description ? htl.html`<span class="lg-titledesc">${ r.description }</span>` : '' }</span>`;
            },
            when: d => d.toISOString().slice(0, 16).replace('T', ' '),
            size: n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`,
            rkey: s => htl.html`<span class="lg-mono lg-alt" data-rkey=${ s }>${ s }</span>`,
            cid: s => s ? `${ s.slice(0, 11) }…` : '',
            bskyLikes: (_, i) => {
                const r = rows[i];
                if (!r)
                    return '';
                if (!r.bsky) {
                    return htl.html`<span class="lg-mono lg-fainter lg-xs" title="not posted to Bluesky"><span class="lg-fainter">● </span>not posted</span>`;
                }
                const s = r.bskyStats;
                const label = s ? `♥${ s.likeCount } ↻${ s.repostCount }` : '…';
                return htl.html`<a class="lg-mono" href=${ r.bsky.url } target="_blank" rel="noopener" title="Bluesky post">${ label }</a>`;
            }
        },
        width: {
            title: 260,
            when: 116,
            bskyLikes: 82,
            files: 50,
            size: 54,
            modules: 68,
            rkey: 180,
            cid: 104
        },
        multiple: isOwner,
        required: false,
        layout: 'auto',
        rows: 30
    });
    // Whole-row click toggles the row's checkbox; the table re-renders its tbody
    // on sort, so re-wire on every mutation.
    const wireRows = () => {
        for (const tr of view.querySelectorAll('tbody tr')) {
            const tag = tr.querySelector('[data-rkey]');
            if (tag)
                tr.dataset.rkey = tag.dataset.rkey;
            if (tr.dataset.clickWired === '1')
                continue;
            tr.dataset.clickWired = '1';
            tr.addEventListener('click', e => {
                if (e.target.closest('a, button, input, label'))
                    return;
                tr.querySelector('input[type="checkbox"], input[type="radio"]')?.click();
            });
        }
    };
    wireRows();
    const tbody = view.querySelector('tbody');
    if (tbody)
        new MutationObserver(wireRows).observe(tbody, { childList: true });
    return view;
};
const _lgcards = function _narrowList(htl,rows,isOwner,$0)
{
    // Card-per-row fallback under 600px: an 8-column table cannot reflow, and a
    // horizontal scroller hides seven columns behind a gesture. Selection is NOT
    // duplicated here — the checkbox drives the table's own input, which stays
    // the single source of truth for `selectedRows`.
    const fmtBytes = n => n >= 1000000 ? `${ (n / 1000000).toFixed(1) }M` : `${ (n / 1000).toFixed(0) }K`;
    const trFor = rkey => [...$0.querySelectorAll('tbody tr')].find(tr => tr.dataset.rkey === rkey);
    const cards = rows.map(r => {
        const box = isOwner ? htl.html`<input class="lg-rowcheck" type="checkbox" aria-label=${ `select ${ r.rkey }` }>` : '';
        if (box)
            box.addEventListener('change', () => {
                trFor(r.rkey)?.querySelector('input[type="checkbox"], input[type="radio"]')?.click();
            });
        const panel = htl.html`<div class="lg-recgrid" hidden></div>`;
        const kv = (k, v) => htl.html`<div style="display:flex;gap:8px"><span class="lg-mono lg-fainter lg-xxs lg-reck">${ k }</span><span class="lg-mono lg-alt lg-xs" style="word-break:break-all">${ v }</span></div>`;
        panel.append(kv('rkey', r.rkey), kv('cid', r.cid || ''), kv('url', r.webUrl), kv('std', r.standard?.url || '— not published'));
        const disc = htl.html`<button class="lg-disc" type="button" aria-expanded="false"><span class="lg-caret">▸</span>RECORD</button>`;
        disc.addEventListener('click', () => {
            const open = disc.getAttribute('aria-expanded') !== 'true';
            disc.setAttribute('aria-expanded', String(open));
            disc.firstElementChild.textContent = open ? '▾' : '▸';
            panel.hidden = !open;
        });
        const el = htl.html`<div class="lg-row">
      <div class="lg-rowhead">${ box }<div class="lg-rowbody">
        <a class="lg-rowtitle" href=${ r.webUrl } target="_blank" rel="noopener" style=${ r.title === '(untitled)' ? 'color:var(--theme-foreground-faint)' : '' }>${ r.title }</a>
        ${ r.description ? htl.html`<div class="lg-rowdesc">${ r.description }</div>` : '' }
        <div class="lg-rowfacts">
          <span class="lg-mono lg-mute lg-xs">${ r.when.toISOString().slice(0, 10) }</span>
          <span class="lg-mono lg-fainter lg-xs">${ r.files } files · ${ fmtBytes(r.size) } · ${ r.modules } modules${ r.version > 1 ? ` · v${ r.version }` : '' }${ r.standard ? ' · std.site' : '' }</span>
          ${ r.bsky ? htl.html`<a class="lg-mono lg-xs" href=${ r.bsky.url } target="_blank" rel="noopener">♥${ r.bskyStats?.likeCount ?? '…' } ↻${ r.bskyStats?.repostCount ?? '…' }</a>` : htl.html`<span class="lg-mono lg-fainter lg-xxs">● not posted</span>` }
        </div>
        ${ disc }${ panel }
      </div></div>
    </div>`;
        return {
            el,
            box,
            rkey: r.rkey
        };
    });
    const root = htl.html`<div class="lg-rowlist"></div>`;
    root.append(...cards.map(c => c.el));
    const sync = () => {
        const v = $0.value;
        const chosen = new Set((Array.isArray(v) ? v : v ? [v] : []).map(r => r.rkey));
        for (const c of cards) {
            const on = chosen.has(c.rkey);
            c.el.classList.toggle('lg-row-sel', on);
            if (c.box)
                c.box.checked = on;
        }
    };
    $0.addEventListener('input', sync);
    sync();
    return root;
};
const _petrr0 = function _bulkBar(isOwner,htl,Inputs,selectedRows,$0,bundlesRefresh,deleteBundle,currentSession,xrpc,localStorage,bskyHelpers,writeCrossRef,$1,crossRefsRefresh,did,pds,getStdDoc,ensureScopes,bskyProfile,publishToStdSite,publishStdPub,publishStdDoc,unpublishStdDoc,$2)
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
    const act = (node, w) => htl.html`<span class="lg-act" style=${ `width:${ w }px` }>${ node }</span>`;
    const danger = node => htl.html`<span class="lg-danger">${ node }</span>`;
    const link = (label, fn) => {
        const b = htl.html`<button class="lg-linkbtn" type="button">${ label }</button>`;
        b.addEventListener('click', fn);
        return b;
    };
    const setMsg = (box, kind, text) => {
        const cls = kind === 'error' ? 'lg-mono lg-focus lg-xs' : kind === 'ok' ? 'lg-mono lg-alt lg-xs' : 'lg-mono lg-faint lg-xs';
        box.replaceChildren(...kind === 'busy' ? [htl.html`<span class="lg-spin"></span>`] : [], htl.html`<span class=${ cls }>${ text }</span>`);
    };
    const clearSelection = () => {
        for (const inp of $2.querySelectorAll('tbody input:checked'))
            inp.click();
    };
    // ---------- layer A: selection summary + delete ----------
    const actionRow = htl.html`<div class="lg-actionrow"></div>`;
    const actionLabel = () => htl.html`<span class="lg-mono lg-fainter lg-xs lg-actionlabel">action ${ count } × com.atproto.repo.deleteRecord${ single ? ` · promote ${ single.title }` : '' }</span>`;
    let outcome = null;
    const renderPhase = phase => {
        if (phase === 'idle') {
            const del = Inputs.button(`Delete ${ count } record${ count === 1 ? '' : 's' }`, { width: 168 });
            del.querySelector('button').addEventListener('click', () => renderPhase('confirm'));
            actionRow.replaceChildren(actionLabel(), link('cancel', clearSelection), danger(act(del, 168)));
        } else if (phase === 'confirm') {
            const yes = Inputs.button('Yes, delete', { width: 140 });
            yes.querySelector('button').addEventListener('click', () => renderPhase('deleting'));
            actionRow.replaceChildren(htl.html`<span class="lg-mono lg-focus lg-xs lg-confirmtext">Delete ${ count } bundle${ count === 1 ? '' : 's' } from your atproto repo? This cannot be undone.</span>`, link('keep them', () => renderPhase('idle')), danger(act(yes, 140)));
        } else if (phase === 'deleting') {
            const busy = Inputs.button('Deleting…', { width: 112 });
            busy.querySelector('button').disabled = true;
            actionRow.replaceChildren(act(busy, 112), htl.html`<span style="display:inline-flex;gap:7px;align-items:center"><span class="lg-spin"></span><span class="lg-mono lg-faint lg-xs">writing ${ count } deleteRecord calls to ${ pds || 'your PDS' }</span></span>`);
            (async () => {
                let ok = 0, fail = 0, lastError = '';
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
                        lastError = e.message;
                        fail++;
                    }
                }
                outcome = {
                    ok,
                    fail,
                    lastError
                };
                $0.value = (bundlesRefresh || 0) + 1;
                renderPhase('done');
            })();
        } else if (phase === 'done') {
            const {ok, fail, lastError} = outcome || {
                ok: 0,
                fail: 0
            };
            actionRow.replaceChildren(htl.html`<span class="lg-mono lg-alt">${ fail ? `${ ok } deleted · ${ fail } failed` : `${ ok } deleted` }</span>`, ...fail ? [htl.html`<span class="lg-mono lg-focus lg-xs">ledger · ${ lastError } — list refreshed</span>`] : [], htl.html`<span style="margin-left:auto">${ link('dismiss', clearSelection) }</span>`);
        }
    };
    renderPhase('idle');
    const layerA = htl.html`<div class="lg-layer-a">
    <div class="lg-selline">
      <span class="lg-count">${ String(count).padStart(2, '0') }</span>
      <span class="lg-eyebrow">SELECTED</span>
      <span class="lg-mono lg-faint lg-xs">payload ${ fmtBytes(totalBytes) } · collection com.lopecode.bundle</span>
    </div>
    ${ actionRow }
  </div>`;
    if (!single)
        return htl.html`<div class="lg-barwrap">${ layerA }</div>`;
    // ---------- layer B: promote (exactly one row selected) ----------
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
    // ---- B1: Bluesky companion post ----
    const bskyMsg = htl.html`<div class="lg-msg"></div>`;
    const bskyCtl = Inputs.text({
        label: 'bsky',
        value: bsky?.url || '',
        placeholder: 'https://bsky.app/profile/…/post/…'
    });
    const composeBtn = Inputs.button('Compose ↗', { width: 116 });
    const linkBtn = Inputs.button(bsky ? 'Change' : 'Link', { width: 96 });
    const unlinkBtn = bsky ? Inputs.button('Unlink', { width: 92 }) : null;
    const bskyBtns = htl.html`<span class="lg-pbtns"></span>`;
    const bskyBtnsIdle = () => bskyBtns.replaceChildren(act(linkBtn, 96), ...unlinkBtn ? [danger(act(unlinkBtn, 92))] : []);
    bskyBtnsIdle();
    composeBtn.querySelector('button').addEventListener('click', () => {
        window.open(bskyHelpers.composeIntentUrl(single.title, single.webUrl), '_blank', 'noopener');
        bskyCtl.querySelector('input')?.focus();
        setMsg(bskyMsg, 'idle', 'Composer opened — paste the resulting Bluesky URL.');
    });
    linkBtn.querySelector('button').addEventListener('click', async () => {
        const pasted = String(bskyCtl.value || '').trim();
        if (!pasted) {
            setMsg(bskyMsg, 'error', 'paste a https://bsky.app/profile/…/post/… URL first');
            return;
        }
        const popup = needsCrossRefScope() ? window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1') : null;
        setMsg(bskyMsg, 'busy', 'resolving…');
        linkBtn.querySelector('button').disabled = true;
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
            setMsg(bskyMsg, 'ok', '✓ linked');
            $1.value = (crossRefsRefresh || 0) + 1;
        } catch (e) {
            setMsg(bskyMsg, 'error', `error: ${ e.message }`);
        } finally {
            linkBtn.querySelector('button').disabled = false;
            if (popup && !popup.closed) {
                try {
                    popup.close();
                } catch {
                }
            }
        }
    });
    if (unlinkBtn) {
        unlinkBtn.querySelector('button').addEventListener('click', () => {
            const yes = Inputs.button('Yes, unlink', { width: 118 });
            yes.querySelector('button').addEventListener('click', async () => {
                bskyBtnsIdle();
                setMsg(bskyMsg, 'busy', 'unlinking…');
                try {
                    await writeCrossRef(single.rkey, { bsky: null });
                    setMsg(bskyMsg, 'ok', '✓ unlinked');
                    $1.value = (crossRefsRefresh || 0) + 1;
                } catch (e) {
                    setMsg(bskyMsg, 'error', `error: ${ e.message }`);
                }
            });
            bskyBtns.replaceChildren(htl.html`<span class="lg-mono lg-focus lg-xs">Unlink Bluesky post from "${ single.title }"?</span>`, link('keep it', bskyBtnsIdle), danger(act(yes, 118)));
        });
    }
    const bskyPanel = htl.html`<div>
    <span class="lg-eyebrow">BLUESKY COMPANION POST</span>
    <div class="lg-stateline">
      <span class=${ `lg-dot${ bsky ? ' lg-dot-on' : '' }` }></span>
      <span class=${ `lg-mono lg-xs ${ bsky ? 'lg-faint' : 'lg-fainter' }` } style="word-break:break-all">${ bsky ? htl.html`linked · <a href=${ bsky.url } target="_blank" rel="noopener">${ bsky.url }</a>` : 'not posted' }</span>
    </div>
    <div class="lg-prow">${ act(composeBtn, 116) }<span class="lg-full">${ bskyCtl }</span>${ bskyBtns }</div>
    ${ bskyMsg }
  </div>`;
    setMsg(bskyMsg, bsky ? 'ok' : 'idle', bsky ? `✓ linked${ single.bskyStats ? ` · ♥${ single.bskyStats.likeCount } ↻${ single.bskyStats.repostCount } 💬${ single.bskyStats.replyCount }` : '' }` : 'Compose opens Bluesky prefilled; paste the resulting URL here, then Link.');
    // ---- B2: standard.site publication + vanity URL ----
    // The URL is BOTH the ledger's display URL (via com.lopecode.bundle.crossRef)
    // AND the URL claimed by the user's site.standard.publication record.
    const stdMsg = htl.html`<div class="lg-msg"></div>`;
    const stdCtl = Inputs.text({
        label: 'url',
        value: standard?.url || single.defaultWebUrl,
        placeholder: 'https://…'
    });
    const stdTitleCtl = Inputs.text({
        label: 'title',
        value: single.title === '(untitled)' ? '' : single.title,
        placeholder: 'shown in feeds'
    });
    const stdDescCtl = Inputs.textarea({
        label: 'desc',
        rows: 3,
        value: single.description || '',
        placeholder: 'description (shown in feeds)'
    });
    const stdSubmit = Inputs.button('Publish', { width: 104 });
    const stdForm = htl.html`<div class="lg-stdform" hidden>
    <span class="lg-full">${ stdTitleCtl }</span>
    <span class="lg-full">${ stdDescCtl }</span>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${ act(stdSubmit, 104) }<span class="lg-mono lg-fainter lg-xs">one OAuth popup, three scopes, first time only</span></div>
  </div>`;
    const stdToggle = Inputs.button('▸ Publish…', { width: 116 });
    const unpublishBtn = Inputs.button('Unpublish', { width: 110 });
    const stdBtns = htl.html`<span class="lg-pbtns"></span>`;
    let published = !!standard;
    const stdBtnsIdle = () => {
        stdToggle.querySelector('button').textContent = stdForm.hidden ? published ? '▸ Update…' : '▸ Publish…' : '▾ Cancel';
        stdBtns.replaceChildren(act(stdToggle, 116), ...published ? [danger(act(unpublishBtn, 110))] : []);
    };
    stdToggle.querySelector('button').addEventListener('click', () => {
        stdForm.hidden = !stdForm.hidden;
        stdBtnsIdle();
    });
    const stdAtUri = htl.html`<a class="lg-mono lg-xs lg-stdaturi" target="_blank" rel="noopener" hidden></a>`;
    const stdDocAtUriFor = rkey => `at://${ currentSession?.did || did }/site.standard.document/${ rkey }`;
    const setPublishedView = on => {
        published = on;
        if (on) {
            stdAtUri.hidden = false;
            stdAtUri.textContent = stdDocAtUriFor(single.rkey);
            stdAtUri.setAttribute('href', `https://pdsls.dev/${ stdDocAtUriFor(single.rkey) }`);
        } else {
            stdAtUri.hidden = true;
            stdAtUri.textContent = '';
        }
        stdBtnsIdle();
    };
    setPublishedView(published);
    // Lazy state probe — only meaningful on your own ledger. Prefills the form
    // from the existing record so republishing is non-destructive.
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
                    stdTitleCtl.value = got.value.title;
                if (got.value.description)
                    stdDescCtl.value = got.value.description;
            }
            setPublishedView(!!got);
            if (got)
                setMsg(stdMsg, 'ok', '✓ published · indexers can discover this bundle');
        } catch (e) {
            setMsg(stdMsg, 'error', `state check failed: ${ e.message }`);
        }
    })();
    stdSubmit.querySelector('button').addEventListener('click', async () => {
        const pasted = String(stdCtl.value || '').trim();
        if (!pasted || !/^https?:\/\//i.test(pasted)) {
            setMsg(stdMsg, 'error', 'paste an absolute URL (https://…)');
            return;
        }
        let pubUrl;
        try {
            pubUrl = new URL(pasted).origin;
        } catch {
            setMsg(stdMsg, 'error', 'invalid URL');
            return;
        }
        // One popup for the union of scopes — ensureScopes inside writeCrossRef
        // / publishToStdSite is idempotent, so later calls are no-ops.
        const popup = needsAnyStdScope() ? window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1') : null;
        setMsg(stdMsg, 'busy', 'publishing…');
        stdSubmit.querySelector('button').disabled = true;
        try {
            await ensureScopes([
                'repo:com.lopecode.bundle.crossRef',
                'repo:site.standard.publication',
                'repo:site.standard.document'
            ], popup ? { popup } : {});
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
            const pubName = bskyProfile?.displayName || currentSession?.handle || did;
            // The page favicon (a data: URI SVG in <link rel=icon>) doubles as the
            // std.site coverImage. It is fill="white" for a dark browser tab; feed
            // thumbnails sit on light backgrounds, so recolour before upload.
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
            const titleVal = String(stdTitleCtl.value || '').trim() || single.title;
            const descVal = String(stdDescCtl.value || '').trim() || titleVal;
            await publishToStdSite({
                session: currentSession,
                xrpc,
                ensureScopes,
                rkey: single.rkey,
                title: titleVal,
                description: descVal,
                coverImage,
                // publishedAt omitted on purpose — publishStdDoc defaults to "now"
                // on first publish and preserves it on republish, anchoring
                // discovery-feed ordering to the first write.
                updatedAt: new Date().toISOString(),
                pubUrl,
                pubName,
                pubDescription: bskyProfile?.description || undefined,
                bskyPostRef: single.bsky?.uri ? { uri: single.bsky.uri } : undefined
            }, {
                publishStdPub,
                publishStdDoc
            });
            setMsg(stdMsg, 'ok', '✓ published · indexers can discover this bundle');
            stdForm.hidden = true;
            setPublishedView(true);
        } catch (e) {
            setMsg(stdMsg, 'error', `error: ${ e.message }`);
        } finally {
            stdSubmit.querySelector('button').disabled = false;
            if (popup && !popup.closed) {
                try {
                    popup.close();
                } catch {
                }
            }
        }
    });
    unpublishBtn.querySelector('button').addEventListener('click', () => {
        const yes = Inputs.button('Yes, unpublish', { width: 138 });
        yes.querySelector('button').addEventListener('click', async () => {
            stdBtnsIdle();
            setMsg(stdMsg, 'busy', 'unpublishing…');
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
                setMsg(stdMsg, 'ok', '✓ unpublished');
                setPublishedView(false);
            } catch (e) {
                setMsg(stdMsg, 'error', `error: ${ e.message }`);
            }
        });
        stdBtns.replaceChildren(htl.html`<span class="lg-mono lg-focus lg-xs">Unpublish "${ single.title }" from standard.site discovery? The bundle itself stays on your PDS — only the site.standard.document is deleted.</span>`, link('keep it', stdBtnsIdle), danger(act(yes, 138)));
    });
    const stdPanel = htl.html`<div>
    <span class="lg-eyebrow">STANDARD.SITE PUBLICATION</span>
    <div class="lg-prow">
      <a class="lg-mono lg-xs" href="https://standard.site" target="_blank" rel="noopener" style="padding-bottom:7px">std.site ↗</a>
      <span class="lg-full">${ stdCtl }</span>
      ${ stdBtns }
    </div>
    ${ stdForm }
    ${ stdMsg }
    ${ stdAtUri }
  </div>`;
    return htl.html`<div class="lg-barwrap">${ layerA }<div class="lg-promote">${ bskyPanel }${ stdPanel }</div></div>`;
};
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
    if (!did)
        return null;
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
    if (!did || !did.startsWith('did:plc:'))
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
const _d7fzf = function _selectedRows(Generators,$0){return(
Generators.input($0)
)};
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
const _lgresolve = async function _resolvedDid(params)
{
    if (params.did)
        return {
            did: params.did,
            handle: params.handle || null,
            error: null
        };
    if (params.handle) {
        try {
            const r = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${ encodeURIComponent(params.handle) }`);
            if (!r.ok)
                throw new Error(`${ r.status } ${ r.statusText || '' }`.trim());
            const did = (await r.json()).did;
            if (!did)
                throw new Error('no did in response');
            return {
                did,
                handle: params.handle,
                error: null
            };
        } catch (e) {
            // Surfaced as the unresolved state rather than failing every cell
            // downstream of `did`.
            return {
                did: null,
                handle: params.handle,
                error: e.message
            };
        }
    }
    // No did=/handle= in the URL: there is no author to show. Every cell
    // downstream guards on a null did, so nothing fetches until one arrives.
    // (This module boots inside lopefeed's `mains` for the aside pane, where a
    // fallback DID meant 8 requests per feed load for an author nobody asked for.)
    return {
        did: null,
        handle: null,
        error: null
    };
};
const _cei7u8 = function _did(resolvedDid){return(
resolvedDid.did
)};
const _lgdiderr = function _didError(resolvedDid){return(
resolvedDid.error ? {
    message: resolvedDid.error,
    handle: resolvedDid.handle
} : null
)};
const _1legbqg = async function _bundles(did,bundlesRefresh)
{
    if (!did)
        return [];
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
const _lgvers = async function _versionCounts(pds,did)
{
    // One paged listRecords over com.lopecode.bundle.version. Snapshot rkeys are
    // `<bundleRkey>--<tid>` (at-write `listBundleVersions`), and a snapshot is
    // written per REpublish, so a bundle with n snapshots is on version n+1.
    const out = new Map();
    if (!pds || !did)
        return out;
    let cursor;
    for (let page = 0; page < 5; page++) {
        const url = new URL(`https://${ pds }/xrpc/com.atproto.repo.listRecords`);
        url.searchParams.set('repo', did);
        url.searchParams.set('collection', 'com.lopecode.bundle.version');
        url.searchParams.set('limit', '100');
        if (cursor)
            url.searchParams.set('cursor', cursor);
        let data;
        try {
            const r = await fetch(url);
            if (!r.ok)
                return out;
            data = await r.json();
        } catch (e) {
            return out;
        }
        for (const rec of data.records || []) {
            const rk = String(rec.uri).split('/').pop();
            const i = rk.indexOf('--');
            if (i <= 0)
                continue;
            const bundleRkey = rk.slice(0, i);
            out.set(bundleRkey, (out.get(bundleRkey) || 0) + 1);
        }
        cursor = data.cursor;
        if (!cursor || (data.records || []).length === 0)
            break;
    }
    return out;
};
const _zruzfy = function _rows(bundles,did,crossRefs,bskyEngagement,versionCounts){return(
bundles.map(b => {
    const files = b.value?.files || [];
    const moduleCount = files.filter(f => typeof f.id === 'string' && /^@[^/]+\/[^/]+$/.test(f.id) && f.blob?.mimeType === 'application/javascript').length;
    const totalBytes = files.reduce((n, f) => n + (f.blob?.size || 0), 0);
    const rkey = b.uri.split('/').pop();
    const didSubdomain = String(did || '').replace(/:/g, '-');
    const defaultWebUrl = `https://${ didSubdomain }.lopecode.com/r/${ rkey }`;
    const crossRef = crossRefs.get(rkey);
    const bsky = crossRef?.value?.bsky || null;
    const standard = crossRef?.value?.standard || null;
    const bskyStats = bsky?.uri ? bskyEngagement.get(bsky.uri) || null : null;
    return {
        rkey,
        title: b.value?.title || '(untitled)',
        description: b.value?.description || '',
        version: (versionCounts.get(rkey) || 0) + 1,
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
        bskyLikes: bskyStats ? bskyStats.likeCount : bsky ? 0 : -1,
        standard
    };
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/at-login", async () => runtime.module((await import("/@tomlarkworthy/at-login.js?v=4")).default));  
  main.define("module @tomlarkworthy/at-write", async () => runtime.module((await import("/@tomlarkworthy/at-write.js?v=4")).default));  
  $def("_lgview", "ledgerView", ["htl","ledgerStyle","ResizeObserver"], _lgview);  
  $def("_lgrender", "renderLedger", ["htl","Inputs","ledgerView","didError","bskyProfile","did","pds","stats","isOwner","rows","cadenceMark","authStrip","viewof ledgerTable","narrowList","bulkBar"], _lgrender);  
  $def("_lgprog", "loadProgress", ["ledgerView","did","pds","bskyProfile"], _lgprog);  
  $def("_lgstyle", "ledgerStyle", ["htl"], _lgstyle);  
  $def("_lgcad", "cadenceMark", ["htl","cadence","bundles"], _lgcad);  
  $def("_lgauth", "authStrip", ["htl","Inputs","currentSession","did","bskyProfile","location","loginWidget","isOwner"], _lgauth);  
  $def("_bi69bn", "viewof ledgerTable", ["Inputs","rows","htl","isOwner","MutationObserver"], _bi69bn);  
  $def("_1pj7469", "ledgerTable", ["Generators","viewof ledgerTable"], _1pj7469);  
  $def("_d7fzf", "selectedRows", ["Generators","viewof ledgerTable"], _d7fzf);  
  $def("_lgcards", "narrowList", ["htl","rows","isOwner","viewof ledgerTable"], _lgcards);  
  $def("_petrr0", "bulkBar", ["isOwner","htl","Inputs","selectedRows","mutable bundlesRefresh","bundlesRefresh","deleteBundle","currentSession","xrpc","localStorage","bskyHelpers","writeCrossRef","mutable crossRefsRefresh","crossRefsRefresh","did","pds","getStdDoc","ensureScopes","bskyProfile","publishToStdSite","publishStdPub","publishStdDoc","unpublishStdDoc","viewof ledgerTable"], _petrr0);  
  $def("_1vqkma0", "stats", ["bundles"], _1vqkma0);  
  $def("_1tdjwl2", "cadence", ["bundles"], _1tdjwl2);  
  $def("_b6rinw", "bskyProfile", ["did"], _b6rinw);  
  $def("_b2zk1s", "pds", ["did"], _b2zk1s);  
  $def("_lgvers", "versionCounts", ["pds","did"], _lgvers);  
  $def("_zruzfy", "rows", ["bundles","did","crossRefs","bskyEngagement","versionCounts"], _zruzfy);  
  $def("_1legbqg", "bundles", ["did","bundlesRefresh"], _1legbqg);  
  $def("_lgresolve", "resolvedDid", ["params"], _lgresolve);  
  $def("_cei7u8", "did", ["resolvedDid"], _cei7u8);  
  $def("_lgdiderr", "didError", ["resolvedDid"], _lgdiderr);  
  $def("_e6jvwf", "params", ["Generators","location"], _e6jvwf);  
  $def("_17w2ygi", "isOwner", ["currentSession","did"], _17w2ygi);  
  $def("_1082244", "initial bundlesRefresh", [], _1082244);  
  $def("_sv5k2u", "mutable bundlesRefresh", ["Mutable","initial bundlesRefresh"], _sv5k2u);  
  $def("_luyplb", "bundlesRefresh", ["mutable bundlesRefresh"], _luyplb);  
  $def("_stlrph", "bskyHelpers", [], _stlrph);  
  $def("_19jqka4", "initial crossRefsRefresh", [], _19jqka4);  
  $def("_1vpbprv", "mutable crossRefsRefresh", ["Mutable","initial crossRefsRefresh"], _1vpbprv);  
  $def("_1i6bv6i", "crossRefsRefresh", ["mutable crossRefsRefresh"], _1i6bv6i);  
  $def("_51iie8", "crossRefs", ["pds","did","crossRefsRefresh"], _51iie8);  
  $def("_1jjqzln", "bskyEngagement", ["crossRefs"], _1jjqzln);  
  $def("_1xg591i", "writeCrossRef", ["currentSession","ensureScopes","xrpc"], _1xg591i);  
  $def("_15y75gl", "deleteCrossRef", ["currentSession","xrpc"], _15y75gl);  
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
