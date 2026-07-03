const _mhr6o6 = function _publishWidget(publisher,currentSession,xrpc,notebook_title,loginWidget){return(
publisher({
    session: currentSession,
    xrpc,
    defaultTitle: notebook_title,
    loginWidget
})
)};
const _11omwb6 = function _2(md){return(
md`---
## About

\`at-write\` publishes Lopecode documents to the atmosphere. You have several options to choose from:

1. From a Lopecode HTML file, which you might have downloaded earlier and modified locally.
2. From this runtime — the one serving what you are reading now.
3. From another at:// address, but we will open it in a new browser tab first so you can customize it before publishing.
4. From this runtime, but with the option of adding a new module.

Lopecode documents are collections of modules. Everything you see — e.g. the DOM renderer, the multi-notebook interface, the editor — is implemented in userspace. So there is no "blank notebook" template inherent to Lopecode; the experience you're seeing is achieved through many modules collaborating on a reactive substrate. Thus it usually makes sense to start from a working runtime first.`
)};
const _1iduepw = function _publisher(lopeTokens,notebook_title,DOMParser,exportToHTML,globalThis,utils,extractFiles,publishBundleVersion,ensureScopes,currentSession,xrpc,loginWidget)
{
    return ((cs, xrpcRef, lwRef) => ({
        session = cs,
        xrpc = xrpcRef,
        defaultTitle,
        loginWidget: loginWidgetFn = lwRef
    } = {}) => {
        const T = lopeTokens;
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const css = (...rules) => rules.filter(Boolean).join(';');
        const fmtSize = b => b < 1024 ? `${ b } B` : b < 1024 * 1024 ? `${ (b / 1024).toFixed(1) } KB` : `${ (b / 1024 / 1024).toFixed(2) } MB`;
        const monoLabel = text => `<div style="font-family:${ T.mono };font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:${ T.inkMute }">${ esc(text) }</div>`;
        const signedIn = !!(session && typeof xrpc === 'function');
        const state = {
            stage: 'pick',
            source: null,
            sourceFileName: null,
            files: null,
            knownCids: null,
            title: defaultTitle ?? notebook_title ?? '',
            publishStatus: '',
            error: null,
            result: null,
            forkUri: '',
            forkError: null,
            liveForkSlug: '',
            liveForkError: null
        };
        const root = document.createElement('div');
        root.style.cssText = css(`width:100%;max-width:720px;background:${ T.paper }`, `border:1px solid ${ T.rule };font-family:${ T.sans };color:${ T.ink }`, `display:flex;flex-direction:column;box-sizing:border-box;position:relative`, `box-shadow:0 1px 3px rgba(0,0,0,0.04)`);
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.html,text/html';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', () => {
            const f = fileInput.files?.[0];
            if (f)
                handleDroppedFile(f);
            fileInput.value = '';
        });
        root.append(fileInput);
        const dropOverlay = document.createElement('div');
        dropOverlay.style.cssText = css(`position:absolute;inset:0;background:${ T.accent }1a`, `border:2px dashed ${ T.accent };display:none`, `align-items:center;justify-content:center;pointer-events:none;z-index:5`, `font-family:${ T.serif };font-size:18px;color:${ T.accent }`);
        dropOverlay.textContent = 'Drop the .html lopebook to publish';
        root.append(dropOverlay);
        let dragDepth = 0;
        root.addEventListener('dragenter', e => {
            if (![...e.dataTransfer?.types || []].includes('Files'))
                return;
            if (!signedIn)
                return;
            e.preventDefault();
            dragDepth++;
            dropOverlay.style.display = 'flex';
        });
        root.addEventListener('dragover', e => {
            if (![...e.dataTransfer?.types || []].includes('Files'))
                return;
            if (!signedIn)
                return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        root.addEventListener('dragleave', () => {
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0)
                dropOverlay.style.display = 'none';
        });
        root.addEventListener('drop', e => {
            if (!signedIn)
                return;
            e.preventDefault();
            dragDepth = 0;
            dropOverlay.style.display = 'none';
            const f = e.dataTransfer?.files?.[0];
            if (f)
                handleDroppedFile(f);
        });
        const header = document.createElement('div');
        header.style.cssText = `padding:22px 26px 14px;border-bottom:1px solid ${ T.rule }`;
        const identity = document.createElement('div');
        identity.style.cssText = css(`padding:10px 26px;background:${ T.paperWarm }`, `border-bottom:1px solid ${ T.rule }`, `display:flex;align-items:center;gap:14px;flex-wrap:wrap`, `font-family:${ T.mono };font-size:11px`);
        const meta = document.createElement('div');
        meta.style.cssText = `display:flex;align-items:center;gap:14px;flex-wrap:wrap;min-width:0;flex:1`;
        if (signedIn) {
            const authBadge = session.authType === 'oauth' ? 'OAuth' : 'app pw';
            meta.innerHTML = `
      <span style="color:${ T.ok }">●</span>
      <span style="color:${ T.ink }">@${ esc(session.handle) }</span>
      <span style="color:${ T.inkFaint }">·</span>
      <span style="color:${ T.inkMute };overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ esc(session.did) }</span>
      <span style="color:${ T.inkFaint }">·</span>
      <span style="color:${ T.inkMute }">${ esc(authBadge) }</span>`;
        } else {
            meta.style.color = T.warn;
            meta.innerHTML = `<span style="color:${ T.warn }">●</span> Sign in to publish`;
        }
        identity.append(meta);
        if (typeof loginWidgetFn === 'function') {
            const lw = loginWidgetFn();
            if (lw && typeof lw.nodeType === 'number') {
                const slot = document.createElement('div');
                slot.style.cssText = `margin-left:auto;flex:0 0 auto`;
                slot.append(lw);
                identity.append(slot);
            }
        }
        const body = document.createElement('div');
        body.style.cssText = `padding:20px 26px;display:flex;flex-direction:column;gap:18px`;
        const sourceSection = document.createElement('div');
        const diffSection = document.createElement('div');
        const metaSection = document.createElement('div');
        const footer = document.createElement('div');
        footer.style.cssText = css(`padding:12px 26px;border-top:1px solid ${ T.rule }`, `background:${ T.paperDeep };display:flex;align-items:center;gap:14px`);
        const stepLabel = () => state.stage === 'pick' || state.stage === 'computing' ? 'step 1/3' : state.stage === 'done' ? 'step 3/3' : 'step 2/3';
        const renderHeader = () => {
            header.innerHTML = `
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <h2 style="${ css(`font-family:${ T.serif };font-weight:600;font-size:28px`, `margin:0;letter-spacing:-0.018em`) }">Publish a lopebook</h2>
        <span style="${ css(`font-family:${ T.mono };font-size:10px;letter-spacing:0.04em`, `text-transform:uppercase;color:${ T.inkFaint }`) }">${ esc(stepLabel()) }</span>
      </div>
      <p style="${ css(`font-family:${ T.serif };font-size:14px;color:${ T.inkSoft }`, `margin:4px 0 0;line-height:1.45`) }">Writes one <span style="font-family:${ T.mono };color:${ T.accent }">com.lopecode.bundle</span> record to your PDS.</p>`;
        };
        const renderSourceSection = () => {
            const card = (icon, title, sub, source, enabled, requiresAuth = true) => {
                const active = state.source === source;
                const authOk = !requiresAuth || signedIn;
                const dim = !enabled || !authOk;
                const subText = active && state.sourceFileName && source === 'drop-file' ? state.sourceFileName : sub;
                return `<div data-source="${ esc(source) }" style="${ css(`padding:12px 14px;border:${ active ? 1.5 : 1 }px solid ${ active ? T.accent : T.rule }`, `background:${ active ? T.paper : T.paperWarm }`, `cursor:${ enabled && authOk ? 'pointer' : 'not-allowed' }`, `display:flex;gap:12px;align-items:flex-start;position:relative`, dim ? 'opacity:0.5' : '') }"><span style="font-family:${ T.mono };font-size:22px;color:${ active ? T.accent : T.inkMute };line-height:1;margin-top:1px">${ icon }</span><div style="min-width:0"><div style="font-family:${ T.serif };font-weight:600;font-size:15px;color:${ T.ink };line-height:1.2">${ esc(title) }</div><div style="font-family:${ T.sans };font-size:11px;color:${ T.inkMute };margin-top:3px;line-height:1.4">${ esc(subText) }</div></div>${ active ? `<span style="position:absolute;top:6px;right:8px;font-family:${ T.mono };font-size:9px;color:${ T.accent }">● selected</span>` : '' }${ !enabled && authOk ? `<span style="position:absolute;top:6px;right:8px;font-family:${ T.mono };font-size:9px;color:${ T.inkFaint }">soon</span>` : '' }</div>`;
            };
            const forkPanel = state.source === 'fork' ? `<div style="margin-top:10px;padding:12px 14px;border:1px solid ${ T.rule };background:${ T.paperWarm };display:flex;flex-direction:column;gap:8px"><div style="font-family:${ T.mono };font-size:10px;color:${ T.inkMute };letter-spacing:0.04em;text-transform:uppercase">paste at:// URI or lopecode.com URL</div><div style="display:flex;gap:8px"><input data-fork-input value="${ esc(state.forkUri) }" placeholder="at://did:plc:…/com.lopecode.bundle/{rkey}  —  or  https://did-….lopecode.com/r/{rkey}" style="flex:1;padding:7px 10px;background:${ T.paper };border:1px solid ${ T.rule };font-family:${ T.mono };font-size:12px;color:${ T.ink };box-sizing:border-box" /><button data-fork-open style="font-family:${ T.sans };font-size:12px;font-weight:600;padding:7px 14px;background:${ T.accent };color:#fff;border:none;cursor:pointer">Open in new tab ↗</button></div><div style="font-family:${ T.sans };font-size:11px;color:${ state.forkError ? T.accent : T.inkMute };line-height:1.4">${ state.forkError ? esc(state.forkError) : 'Opens the bundle in a new tab where you can edit and re-publish under your own DID.' }</div></div>` : '';
            const liveForkPanel = state.source === 'live-fork' ? `<div style="margin-top:10px;padding:12px 14px;border:1px solid ${ T.rule };background:${ T.paperWarm };display:flex;flex-direction:column;gap:10px"><div style="font-family:${ T.mono };font-size:10px;color:${ T.inkMute };letter-spacing:0.04em;text-transform:uppercase">name your new module</div><div style="font-family:${ T.sans };font-size:12px;color:${ T.inkMute };line-height:1.45">Forks this runtime and adds a fresh blank module under the id you choose below. You'll edit its cells in a new tab, then publish from there.</div><div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center"><label style="font-family:${ T.mono };font-size:11px;color:${ T.inkMute }">new module id</label><input data-live-fork-slug value="${ esc(state.liveForkSlug) }" placeholder="@${ esc(session?.handle?.split('.')[0] || 'you') }/my-thing" style="padding:7px 10px;background:${ T.paper };border:1px solid ${ T.rule };font-family:${ T.mono };font-size:12px;color:${ T.ink };box-sizing:border-box" /></div><div style="display:flex;align-items:center;gap:10px"><button data-live-fork-go style="font-family:${ T.sans };font-size:12px;font-weight:600;padding:7px 14px;background:${ T.accent };color:#fff;border:none;cursor:pointer">Open in new tab \u2197</button>${ state.liveForkError ? `<div style="font-family:${ T.sans };font-size:11px;color:${ T.accent };line-height:1.4">${ esc(state.liveForkError) }</div>` : '' }</div></div>` : '';
            sourceSection.innerHTML = `${ monoLabel('source \xB7 pick one') }<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px">${ card('\u2913', 'Drop a .html file', 'A Lopecode document from disk', 'drop-file', true) }${ card('\u2336', 'From your live editor', 'A snapshot of the current runtime', 'live-editor', true) }${ card('\u2197', 'Fork an at:// URI', 'Fork an ATProto hosted document', 'fork', true, false) }${ card('\u2387', 'Live Fork', 'Add new module to edit before publishing', 'live-fork', true, false) }</div>${ forkPanel }${ liveForkPanel }`;
            if (signedIn) {
                sourceSection.querySelectorAll('[data-source="live-editor"]').forEach(el => {
                    el.addEventListener('click', () => onPickSource('live-editor'));
                });
                sourceSection.querySelectorAll('[data-source="drop-file"]').forEach(el => {
                    el.addEventListener('click', () => fileInput.click());
                });
            }
            sourceSection.querySelectorAll('[data-source="fork"]').forEach(el => {
                el.addEventListener('click', () => {
                    state.source = state.source === 'fork' ? null : 'fork';
                    state.forkError = null;
                    renderSourceSection();
                    const inp = sourceSection.querySelector('[data-fork-input]');
                    if (inp)
                        inp.focus();
                });
            });
            const forkInput = sourceSection.querySelector('[data-fork-input]');
            if (forkInput) {
                forkInput.addEventListener('input', e => {
                    state.forkUri = e.target.value;
                });
                forkInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onForkOpen();
                    }
                });
            }
            const forkBtn = sourceSection.querySelector('[data-fork-open]');
            if (forkBtn)
                forkBtn.addEventListener('click', onForkOpen);
            sourceSection.querySelectorAll('[data-source="live-fork"]').forEach(el => {
                el.addEventListener('click', () => {
                    state.source = state.source === 'live-fork' ? null : 'live-fork';
                    state.liveForkError = null;
                    renderSourceSection();
                    const inp = sourceSection.querySelector('[data-live-fork-slug]');
                    if (inp)
                        inp.focus();
                });
            });
            const liveForkSlugInput = sourceSection.querySelector('[data-live-fork-slug]');
            if (liveForkSlugInput) {
                liveForkSlugInput.addEventListener('input', e => {
                    state.liveForkSlug = e.target.value;
                });
                liveForkSlugInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onOpenLiveFork();
                    }
                });
            }
            const liveForkGo = sourceSection.querySelector('[data-live-fork-go]');
            if (liveForkGo)
                liveForkGo.addEventListener('click', onOpenLiveFork);
        };
        const onForkOpen = () => {
            const input = String(state.forkUri || '').trim();
            let webUrl;
            const atMatch = input.match(/^at:\/\/(did:[a-z]+:[^/]+)\/com\.lopecode\.bundle\/([^/?#]+)$/);
            if (atMatch) {
                const [, did, rkey] = atMatch;
                const subdomain = did.replace(/^did:/, '').replace(/:/g, '-');
                webUrl = `https://${ subdomain }.lopecode.com/r/${ rkey }`;
            } else if (/^https?:\/\/[^/]*lopecode\.com\/r\//.test(input)) {
                webUrl = input;
            } else {
                state.forkError = 'expected at://did:.../com.lopecode.bundle/{rkey} or https://did-\u2026.lopecode.com/r/{rkey}';
                renderSourceSection();
                return;
            }
            window.open(webUrl, '_blank', 'noopener');
        };
        const blankModuleSource = title => {
            const pid = '_lf_' + Math.random().toString(36).slice(2, 8);
            const safe = String(title).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
            return `\nconst ${ pid } = function _intro(md){return (md\`# ${ safe }\n\nA blank lopebook. Use the editor to write cells.\`);};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer()).define(null, ["md"], ${ pid });\n  return main;\n}\n`;
        };
        const forgeLiveForkHtml = (html, slug, title) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let titleEl = doc.querySelector('title');
            if (!titleEl) {
                titleEl = doc.createElement('title');
                doc.head.appendChild(titleEl);
            }
            titleEl.textContent = title;
            const bootconfEl = [...doc.querySelectorAll('script[id="bootconf.json"]')].find(s => (s.textContent || '').length < 4000);
            if (!bootconfEl)
                throw new Error('bootconf.json script not found in exported HTML');
            const conf = JSON.parse(bootconfEl.textContent.trim());
            if (!Array.isArray(conf.mains))
                conf.mains = [];
            const liveForkMains = [
                slug,
                '@tomlarkworthy/at-write',
                '@tomlarkworthy/exporter-3',
                '@tomlarkworthy/module-selection'
            ];
            for (const m of liveForkMains) {
                if (!conf.mains.includes(m))
                    conf.mains = [
                        ...conf.mains,
                        m
                    ];
            }
            conf.hash = `#view=S100(${ liveForkMains.join(',') })&open=${ slug }`;
            bootconfEl.textContent = '\n' + JSON.stringify(conf, null, 2) + '\n';
            const existing = [...doc.querySelectorAll('script[type="text/plain"][id]')].find(s => s.id === slug);
            if (!existing) {
                const script = doc.createElement('script');
                script.setAttribute('id', slug);
                script.setAttribute('type', 'text/plain');
                script.setAttribute('data-mime', 'application/javascript');
                script.textContent = blankModuleSource(title);
                doc.body.appendChild(script);
            } else {
                existing.textContent = blankModuleSource(title);
            }
            return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        };
        const onOpenLiveFork = async () => {
            if (state.stage === 'computing' || state.stage === 'publishing')
                return;
            const slug = String(state.liveForkSlug || '').trim();
            if (!/^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(slug)) {
                state.liveForkError = 'module id must look like @handle/slug \u2014 lowercase, hyphens';
                renderSourceSection();
                return;
            }
            const title = slug.split('/')[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            state.liveForkError = null;
            renderSourceSection();
            try {
                const {source: html} = await exportToHTML({ mains: globalThis.__ojs_runtime?.mains });
                const forged = forgeLiveForkHtml(html, slug, title);
                const blob = new Blob([forged], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const hash = `#view=S100(${ slug },@tomlarkworthy/at-write,@tomlarkworthy/exporter-3,@tomlarkworthy/module-selection)&open=${ slug }`;
                window.open(url + hash, '_blank', 'noopener');
            } catch (err) {
                state.liveForkError = err.message;
                renderSourceSection();
            }
        };
        const renderDiff = () => {
            if (!state.files) {
                diffSection.innerHTML = '';
                return;
            }
            const known = state.knownCids;
            const totalSize = state.files.reduce((a, f) => a + f.size, 0);
            const newFiles = state.files.filter(f => !known.has(f.cid));
            const cachedFiles = state.files.filter(f => known.has(f.cid));
            const newSize = newFiles.reduce((a, f) => a + f.size, 0);
            const all = [
                ...newFiles,
                ...cachedFiles
            ];
            const rows = all.map((f, i) => {
                const isNew = !known.has(f.cid);
                const color = isNew ? T.accent : T.ok;
                const tag = isNew ? 'NEW' : 'CACHED';
                return `<div style="display:grid;grid-template-columns:70px 1fr 60px;padding:4px 12px;gap:10px;${ i < all.length - 1 ? `border-bottom:1px dashed ${ T.ruleSoft }` : '' }"><span style="color:${ color };font-size:9px;letter-spacing:0.05em">${ tag }</span><span style="color:${ T.inkSoft };overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ esc(f.id) }</span><span style="color:${ T.inkMute };text-align:right">${ esc(fmtSize(f.size)) }</span></div>`;
            }).join('');
            diffSection.innerHTML = `${ monoLabel('file table \xB7 diffed against your repo') }<div style="margin-top:8px;border:1px solid ${ T.rule };background:${ T.paperWarm };font-family:${ T.mono };font-size:11px"><div style="padding:8px 12px;border-bottom:1px solid ${ T.rule };display:flex;align-items:baseline;gap:14px;color:${ T.inkMute };flex-wrap:wrap"><span><span style="color:${ T.ink };font-size:14px">${ state.files.length }</span> files total</span><span><span style="color:${ T.ok };font-size:14px">${ cachedFiles.length }</span> already pinned</span><span><span style="color:${ T.accent };font-size:14px">${ newFiles.length }</span> new uploads</span><span style="margin-left:auto;color:${ T.inkSoft }">${ fmtSize(totalSize) } → ${ fmtSize(newSize) } to upload</span></div><div style="max-height:180px;overflow:auto">${ rows }</div></div>`;
        };
        const renderMeta = () => {
            if (state.stage === 'pick' || state.stage === 'computing') {
                metaSection.innerHTML = '';
                return;
            }
            let rkeyPreview;
            try {
                rkeyPreview = state.title ? utils.slugifyTitle(state.title) : '(generated on publish)';
            } catch {
                rkeyPreview = '(invalid title)';
            }
            metaSection.innerHTML = `${ monoLabel('bundle metadata') }<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px"><div style="display:grid;grid-template-columns:80px 1fr;gap:12px;align-items:baseline">${ monoLabel('title') }<input data-field="title" value="${ esc(state.title) }" style="padding:6px 10px;background:${ T.paper };border:1px solid ${ T.rule };font-family:${ T.sans };font-size:13px;color:${ T.ink };box-sizing:border-box;width:100%" /></div><div style="display:grid;grid-template-columns:80px 1fr;gap:12px;align-items:baseline">${ monoLabel('rkey') }<div data-field="rkey" style="padding:6px 10px;background:${ T.paperWarm };border:1px solid ${ T.rule };font-family:${ T.mono };font-size:11px;color:${ T.inkMute }">${ esc(rkeyPreview) }</div></div></div>`;
            const titleInput = metaSection.querySelector('[data-field="title"]');
            titleInput.addEventListener('input', e => {
                state.title = e.target.value;
                const rkeyEl = metaSection.querySelector('[data-field="rkey"]');
                try {
                    rkeyEl.textContent = state.title ? utils.slugifyTitle(state.title) : '(generated on publish)';
                } catch {
                    rkeyEl.textContent = '(invalid title)';
                }
            });
        };
        const renderFooter = () => {
            let summaryText;
            if (!signedIn)
                summaryText = 'sign in to continue';
            else if (state.stage === 'pick')
                summaryText = 'pick a source to continue';
            else if (state.stage === 'computing')
                summaryText = 'computing diff\u2026';
            else if (state.stage === 'publishing')
                summaryText = state.publishStatus || 'publishing\u2026';
            else if (state.stage === 'error')
                summaryText = `error: ${ state.error }`;
            else if (state.stage === 'done')
                summaryText = 'published';
            else {
                const known = state.knownCids;
                const newFiles = state.files.filter(f => !known.has(f.cid));
                const newSize = newFiles.reduce((a, f) => a + f.size, 0);
                summaryText = `${ newFiles.length } blob${ newFiles.length === 1 ? '' : 's' } · ${ fmtSize(newSize) } to upload`;
            }
            const canPublish = signedIn && state.stage === 'diff';
            const isBusy = state.stage === 'publishing';
            footer.innerHTML = `<span style="font-family:${ T.mono };font-size:10px;color:${ state.stage === 'error' ? T.accent : T.inkMute }">${ esc(summaryText) }</span><span style="margin-left:auto"></span><button data-btn="publish" ${ canPublish ? '' : 'disabled' } style="${ css(`font-family:${ T.sans };font-size:13px;font-weight:600`, `padding:7px 16px`, `background:${ canPublish ? T.accent : T.paperWarm }`, `color:${ canPublish ? '#fff' : T.inkFaint }`, `border:${ canPublish ? 'none' : `1px solid ${ T.rule }` }`, `cursor:${ canPublish ? 'pointer' : 'not-allowed' }`) }">${ state.stage === 'pick' || state.stage === 'computing' ? 'Publish \u2192' : isBusy ? 'Publishing\u2026' : state.stage === 'done' ? 'Done' : 'Upload + createRecord \u2192' }</button>`;
            const btn = footer.querySelector('[data-btn="publish"]');
            if (btn && canPublish)
                btn.addEventListener('click', onPublish);
        };
        const renderDone = () => {
            body.innerHTML = '';
            const r = state.result;
            const card = document.createElement('div');
            card.style.cssText = css(`padding:14px 18px;border:1px solid ${ T.rule }`, `background:${ T.paperWarm };font-family:${ T.sans };font-size:13px;color:${ T.ink }`, `display:flex;flex-direction:column;gap:10px`);
            card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:${ T.ok };font-family:${ T.mono }">●</span>
        <strong style="font-family:${ T.serif };font-size:18px">Published</strong>
        <span style="color:${ T.inkMute };font-family:${ T.mono };font-size:11px">${ r.uploaded } uploaded · ${ r.skipped } cached</span>
      </div>
      <a href="${ esc(r.webUri) }" target="_blank" style="color:${ T.link };word-break:break-all;font-family:${ T.mono };font-size:12px">${ esc(r.webUri) }</a>
      <code style="background:${ T.paper };padding:6px 8px;font-family:${ T.mono };font-size:11px;color:${ T.inkSoft };user-select:all;border:1px solid ${ T.rule };word-break:break-all">${ esc(r.bundleUri) }</code>
      <button data-btn="another" style="${ css(`align-self:flex-start;font-family:${ T.sans };font-size:12px;padding:5px 10px`, `background:transparent;border:1px solid ${ T.rule };color:${ T.inkSoft };cursor:pointer`) }">Publish another</button>`;
            body.append(card);
            body.querySelector('[data-btn="another"]').addEventListener('click', () => {
                state.stage = 'pick';
                state.source = null;
                state.sourceFileName = null;
                state.files = null;
                state.knownCids = null;
                state.error = null;
                state.result = null;
                renderAll();
            });
        };
        const renderAll = () => {
            renderHeader();
            if (state.stage === 'done') {
                renderDone();
            } else {
                body.innerHTML = '';
                body.append(sourceSection, diffSection, metaSection);
                renderSourceSection();
                renderDiff();
                renderMeta();
            }
            renderFooter();
        };
        const computeDiff = async html => {
            const files = await extractFiles(html);
            if (files.length === 0)
                throw new Error('no <script id data-mime> blocks found');
            state.files = files;
            state.knownCids = utils.knownCids(session.did);
            state.stage = 'diff';
            renderAll();
        };
        const onPickSource = async source => {
            if (!signedIn)
                return;
            if (state.stage !== 'pick' && state.stage !== 'error' && state.stage !== 'diff')
                return;
            state.source = source;
            state.stage = 'computing';
            state.error = null;
            renderAll();
            try {
                const {source: html} = await exportToHTML({ mains: globalThis.__ojs_runtime?.mains });
                await computeDiff(html);
            } catch (err) {
                state.error = err.message;
                state.stage = 'error';
                renderAll();
            }
        };
        const handleDroppedFile = async file => {
            if (!signedIn)
                return;
            if (state.stage === 'computing' || state.stage === 'publishing')
                return;
            if (!/\.html?$/i.test(file.name) && file.type && !file.type.includes('html')) {
                state.error = `expected an .html file (got ${ file.type || 'unknown type' })`;
                state.stage = 'error';
                renderAll();
                return;
            }
            state.source = 'drop-file';
            state.sourceFileName = file.name;
            state.stage = 'computing';
            state.error = null;
            renderAll();
            try {
                const html = await file.text();
                const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
                if (titleMatch && titleMatch[1].trim())
                    state.title = titleMatch[1].trim();
                await computeDiff(html);
            } catch (err) {
                state.error = err.message;
                state.stage = 'error';
                renderAll();
            }
        };
        const onPublish = async () => {
            if (!signedIn || state.stage !== 'diff')
                return;
            // Pre-open a popup synchronously if the OAuth session might need
            // a scope upgrade \u2014 by the time we reach applyWrites later we
            // may have lost user-gesture context (blob uploads can take
            // seconds). The popup is only used if ensureScopes needs it;
            // otherwise we close it before the async work runs.
            let pendingScopePopup = null;
            if (session?.authType === 'oauth') {
                const have = new Set(session.scopes || []);
                if (!have.has('repo:com.lopecode.bundle.version')) {
                    try {
                        pendingScopePopup = window.open('', '_blank', 'width=480,height=640');
                    } catch {
                    }
                }
            }
            state.stage = 'publishing';
            state.publishStatus = 'starting\u2026';
            renderFooter();
            try {
                const title = (state.title || '').trim() || document.title || 'untitled';
                const rkey = utils.slugifyTitle(title);
                const known = state.knownCids;
                state.publishStatus = 'checking existing record\u2026';
                renderFooter();
                // Fetch the prior live bundle (if any). Capture both the
                // CID (for CAS via swapRecord) AND the full value (so we
                // can snapshot it into com.lopecode.bundle.version before
                // overwriting). The snapshot inlines the prior value so
                // its blob refs remain reachable from the current MST and
                // the PDS doesn't GC them.
                let priorBundle = null;
                const gr = await xrpc(session, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(session.did) }&collection=com.lopecode.bundle&rkey=${ encodeURIComponent(rkey) }`, { method: 'GET' });
                if (gr.ok) {
                    const got = await gr.json();
                    priorBundle = {
                        cid: got.cid,
                        value: got.value
                    };
                }
                // The local CID cache is best-effort: a blob can be uploaded
                // (and cached) but never referenced by a successful putRecord,
                // and the PDS later GCs it. So try once trusting the cache; on
                // BlobNotFound, force-reupload every file this publish needs and
                // retry. Persist the cache only after the record exists.
                const force = new Set();
                let uploaded = 0, skipped = 0;
                let filesTable;
                let r2;
                for (let attempt = 0; attempt < 2; attempt++) {
                    uploaded = 0;
                    skipped = 0;
                    filesTable = [];
                    for (let i = 0; i < state.files.length; i++) {
                        const f = state.files[i];
                        state.publishStatus = `uploading ${ i + 1 }/${ state.files.length } \u00b7 ${ f.id }`;
                        renderFooter();
                        let blobRef;
                        if (!force.has(f.cid) && known.has(f.cid)) {
                            blobRef = {
                                $type: 'blob',
                                ref: { $link: f.cid },
                                mimeType: f.mime,
                                size: f.size
                            };
                            skipped++;
                        } else {
                            const r = await xrpc(session, 'com.atproto.repo.uploadBlob', {
                                method: 'POST',
                                headers: { 'content-type': f.mime },
                                body: f.bytes
                            });
                            if (!r.ok)
                                throw new Error(`uploadBlob ${ f.id } \u2192 ${ r.status }: ${ await r.text() }`);
                            blobRef = (await r.json()).blob;
                            known.add(f.cid);
                            uploaded++;
                        }
                        filesTable.push({
                            id: f.id,
                            encoding: f.encoding,
                            blob: blobRef
                        });
                    }
                    state.publishStatus = priorBundle ? 'snapshot + update\u2026' : 'writing record\u2026';
                    renderFooter();
                    const record = {
                        $type: 'com.lopecode.bundle',
                        title,
                        files: filesTable,
                        createdAt: new Date().toISOString()
                    };
                    // First publish \u2192 plain putRecord. Republish \u2192 atomic
                    // snapshot+update via publishBundleVersion. The helper
                    // chooses internally based on whether `prior` is set,
                    // and surfaces both the new bundle CID and the version
                    // snapshot URI in its result.
                    try {
                        state.publishResult = await publishBundleVersion({
                            session,
                            xrpc,
                            rkey,
                            newRecord: record,
                            prior: priorBundle,
                            ensureScopes,
                            popup: pendingScopePopup
                        });
                        if (pendingScopePopup && !pendingScopePopup.closed) {
                            try {
                                pendingScopePopup.close();
                            } catch {
                            }
                            pendingScopePopup = null;
                        }
                        r2 = { ok: true };
                        break;
                    } catch (e) {
                        const errText = e.message || String(e);
                        if (attempt === 0 && /BlobNotFound|Could not find blob/i.test(errText)) {
                            state.publishStatus = 'PDS lost a blob \u2014 re-uploading\u2026';
                            renderFooter();
                            for (const f of state.files) {
                                known.delete(f.cid);
                                force.add(f.cid);
                            }
                            continue;
                        }
                        throw e;
                    }
                }
                utils.saveKnownCids(session.did, known);
                const bundleUri = state.publishResult?.uri || `at://${ session.did }/com.lopecode.bundle/${ rkey }`;
                fetch('https://contrail.lopecode.com/xrpc/com.lopecode.notifyOfUpdate', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ uri: bundleUri })
                }).catch(() => {
                });
                const didSubdomain = session.did.replace(/:/g, '-');
                const webUri = `https://${ didSubdomain }.lopecode.com/r/${ rkey }`;
                state.result = {
                    uploaded,
                    skipped,
                    bundleUri,
                    webUri,
                    rkey,
                    versionUri: state.publishResult?.versionUri || null
                };
                state.stage = 'done';
                renderAll();
            } catch (err) {
                state.error = err.message;
                state.stage = 'error';
                renderFooter();
            } finally {
                if (pendingScopePopup && !pendingScopePopup.closed) {
                    try {
                        pendingScopePopup.close();
                    } catch {
                    }
                }
            }
        };
        root.append(header, identity, body, footer);
        renderAll();
        return root;
    })(currentSession, xrpc, loginWidget);
};
const _8igsoj = function _publishEntry(lopeTokens,MutationObserver)
{
    return ({session, onPublish} = {}) => {
        // Compact banner — slots into a feed/profile chrome.
        // Caller passes session (or null) and a click handler to open the dialog.
        // Caller is responsible for actually opening publisher() somewhere.
        const T = lopeTokens;
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const css = (...rules) => rules.filter(Boolean).join(';');
        const root = document.createElement('div');
        root.style.cssText = css(`width:100%;padding:24px 32px;background:${ T.paper }`, `font-family:${ T.sans };color:${ T.ink }`, `border-bottom:1px solid ${ T.rule }`, `display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;box-sizing:border-box`);
        const left = document.createElement('div');
        left.innerHTML = `
    <div style="font-family:${ T.mono };font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:${ T.inkMute }">lopefeed · publish</div>
    <h2 style="font-family:${ T.serif };font-weight:600;font-size:28px;margin:4px 0 6px;letter-spacing:-0.018em;line-height:1.1">Got a notebook? Publish it to your PDS.</h2>
    <p style="font-family:${ T.serif };font-size:15px;line-height:1.5;color:${ T.inkSoft };margin:0;max-width:640px">A lopebook is a single HTML file — drop one here, or paste an <span style="font-family:${ T.mono };color:${ T.accent }"> at:// </span> URI to fork. We'll diff blobs against your repo and only upload what's new.</p>
  `;
        const right = document.createElement('div');
        right.style.cssText = `display:flex;flex-direction:column;gap:8px;align-items:flex-end`;
        const status = document.createElement('div');
        if (session) {
            status.style.cssText = `font-family:${ T.mono };font-size:11px;color:${ T.inkMute };display:flex;align-items:center;gap:6px`;
            status.innerHTML = `<span style="color:${ T.ok }">●</span> signed in as <span style="color:${ T.ink }">@${ esc(session.handle) }</span>`;
        } else {
            status.style.cssText = `font-family:${ T.mono };font-size:11px;color:${ T.warn };display:flex;align-items:center;gap:6px`;
            status.innerHTML = `<span>●</span> not signed in`;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = css(`font-family:${ T.serif };font-size:18px;font-weight:600`, `padding:10px 20px`, `background:${ T.accent };color:#fff;border:none;cursor:pointer`, `letter-spacing:-0.005em`, `display:flex;align-items:center;gap:10px`);
        btn.innerHTML = `<span>+ Publish a lopebook</span><span style="font-family:${ T.mono };font-size:11px;opacity:0.8">⌘P</span>`;
        btn.addEventListener('click', () => {
            if (typeof onPublish === 'function')
                onPublish();
        });
        // Cmd/Ctrl-P shortcut. The widget owns the listener for as long as the
        // root is in the DOM; if the host wants different shortcut semantics
        // they can pass their own onPublish and rebind upstream.
        const onKey = e => {
            if (!root.isConnected)
                return;
            if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                btn.click();
            }
        };
        window.addEventListener('keydown', onKey);
        // Best-effort cleanup — fires when the host swaps in a new widget DOM.
        new MutationObserver(() => {
            if (!root.isConnected)
                window.removeEventListener('keydown', onKey);
        }).observe(document.body, {
            childList: true,
            subtree: true
        });
        const links = document.createElement('div');
        links.style.cssText = `display:flex;gap:14px;font-family:${ T.mono };font-size:11px;color:${ T.inkMute }`;
        links.innerHTML = `<a href="https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_at-write.html" target="_blank" style="color:${ T.link }">↗ open at-write</a><a href="https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_blank-notebook.html" target="_blank" style="color:${ T.link }">↗ blank template</a>`;
        right.append(status, btn, links);
        root.append(left, right);
        return root;
    };
};
const _1hpecn1 = function _5(md){return(
md`---
## How it works

### Lexicon: \`com.lopecode.bundle\`

A record at \`at://{did}/com.lopecode.bundle/{rkey}\`. One record per published snapshot. \`rkey\` is derived from the title via \`utils.slugifyTitle\`, so two publishes under the same title overwrite each other (CAS-protected via \`swapRecord\` once the record exists).

| field         | type     | meaning |
|---------------|----------|---------|
| \`$type\`     | string   | always \`"com.lopecode.bundle"\` |
| \`title\`     | string   | human title |
| \`files\`     | array    | one entry per \`<script id data-mime>\` block |
| \`createdAt\` | datetime | ISO 8601 |

Each \`files[]\` entry:

| field       | type   | meaning |
|-------------|--------|---------|
| \`id\`      | string | script tag id, e.g. \`@user/module\`, \`@user/module/asset.png\`, \`bootconf.json\` |
| \`encoding\`| string | \`"text"\` or \`"base64"\` from \`data-encoding\` |
| \`blob\`    | blob   | atproto blob ref — carries CID (v1 raw + sha-256), \`mimeType\`, \`size\` |

### Pipeline

1. **Source**: \`exportToHTML\` from \`@tomlarkworthy/exporter-3\` serializes the running runtime, *or* \`file.text()\` reads a dropped \`.html\` lopebook (and the \`<title>\` is pulled in to seed the bundle title field).
2. \`DOMParser\` extracts every \`<script id data-mime>\` block.
3. Compute CID v1 (raw codec, sha-256) per block client-side.
4. Diff against the per-DID set of CIDs cached in \`localStorage\`; the dialog renders \`NEW\` vs \`CACHED\` for each block before you click Publish.
5. \`uploadBlob\` only the new ones; \`putRecord\` writes the bundle (with \`swapRecord\` on republish). The CID cache in \`localStorage\` is **only persisted after \`putRecord\` succeeds** — otherwise an orphaned blob (uploaded, never referenced, then GC'd by the PDS) would leave the cache claiming success forever.
6. If \`putRecord\` returns \`BlobNotFound\` (cache thought a blob existed but the PDS had GC'd it), \`at-write\` clears the cache for this publish, re-uploads every block, and retries once.
7. Fire-and-forget \`POST https://contrail.lopecode.com/xrpc/com.lopecode.notifyOfUpdate\` so the contrail indexer picks up the new bundle without waiting for the next jetstream poll.

A first publish uploads every block (~80 for a typical notebook). Subsequent publishes touching one module upload one or two.

### Scope

Sign-in asks only for \`com.lopecode.bundle\` write — enough to publish and delete bundles, nothing else. Other lexicons (Bluesky post, standard.site document, …) are handled by \`@tomlarkworthy/ledger\` post-publish so the user can grant those scopes on demand rather than at sign-in.

### Roadmap

- **On-demand scope expansion.** \`at-write\` stays narrow; \`ledger\` requests additional OAuth scopes only when the user opts into a cross-post.
- **Version lineage.** Each \`putRecord\` will snapshot the prior version's blob refs into a \`prior\` field so old revisions don't decay (PDS blob GC is keyed on liveness across the whole repo), and the ledger UI can roll back to any prior snapshot.
- **Canonical cross-post URIs.** If the user opts into a Bluesky or standard.site cross-post via ledger, the resulting URI is recorded back into the \`com.lopecode.bundle\` record so consumers (at-read, third parties) can discover it without scanning the repo.

### See also

- \`@tomlarkworthy/at-read\` — fetch a bundle by \`at://\` URI and render it.
- \`@tomlarkworthy/ledger\` — manage published bundles; future home of cross-posting and lineage rollback.
- [\`@tomlarkworthy/exporter-3\`](https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_exporter-3.html) — the HTML serialization format.
- [lopecode-dev on GitHub](https://github.com/tomlarkworthy/lopecode-dev) — design notes.`
)};
const _1is17n9 = function _deleteBundle()
{
    return async ({session, xrpc, rkey} = {}) => {
        // Delete one com.lopecode.bundle record by rkey. Idempotent
        // server-side: deleting a non-existent record returns 200.
        // Caller owns auth — `session` and `xrpc` come from
        // @tomlarkworthy/at-login (passed in for the same stale-
        // promise reason `publisher` documents above).
        if (!session || typeof xrpc !== 'function') {
            throw new Error('deleteBundle requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        if (!rkey || typeof rkey !== 'string') {
            throw new Error('deleteBundle requires { rkey: string }');
        }
        const r = await xrpc(session, 'com.atproto.repo.deleteRecord', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: session.did,
                collection: 'com.lopecode.bundle',
                rkey
            })
        });
        if (!r.ok)
            throw new Error(`deleteRecord ${ r.status }: ${ await r.text() }`);
        return r.json();
    };
};
const _3i591w = function _getStdPub()
{
    return async ({session, xrpc} = {}) => {
        // Fetch the user's site.standard.publication record (rkey=self).
        // Returns the record value or null if absent. Caller owns auth.
        if (!session || typeof xrpc !== 'function') {
            throw new Error('getStdPub requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        const r = await xrpc(session, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(session.did) }&collection=site.standard.publication&rkey=self`, { method: 'GET' });
        if (!r.ok) {
            // Some PDSes (incl. bsky.social) return 400 RecordNotFound instead
            // of a clean 404 when the record is absent. Treat both as null.
            const errText = await r.text();
            if (r.status === 404 || /RecordNotFound/.test(errText))
                return null;
            throw new Error(`getRecord site.standard.publication ${ r.status }: ${ errText }`);
        }
        return r.json();
    };
};
const _17z95h0 = function _publishStdPub()
{
    return async ({session, xrpc, url, name, description, icon, showInDiscover = true} = {}) => {
        // Idempotent upsert of site.standard.publication at rkey=self.
        // Required: url, name. Reads existing record first; if values match,
        // skips the write. Otherwise putRecord with swapRecord on the prior CID.
        if (!session || typeof xrpc !== 'function') {
            throw new Error('publishStdPub requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        if (!url || !name) {
            throw new Error('publishStdPub requires { url, name }');
        }
        const gr = await xrpc(session, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(session.did) }&collection=site.standard.publication&rkey=self`, { method: 'GET' });
        let existingCid = null;
        let existingValue = null;
        if (gr.ok) {
            const got = await gr.json();
            existingCid = got.cid;
            existingValue = got.value;
        } else {
            const errText = await gr.text();
            if (gr.status !== 404 && !/RecordNotFound/.test(errText)) {
                throw new Error(`getRecord site.standard.publication ${ gr.status }: ${ errText }`);
            }
        }
        const record = {
            $type: 'site.standard.publication',
            url,
            name,
            ...description ? { description } : {},
            ...icon ? { icon } : {},
            preferences: { showInDiscover: !!showInDiscover }
        };
        if (existingValue && existingValue.url === record.url && existingValue.name === record.name && (existingValue.description || undefined) === record.description && JSON.stringify(existingValue.icon || null) === JSON.stringify(record.icon || null) && !!(existingValue.preferences && existingValue.preferences.showInDiscover) === record.preferences.showInDiscover) {
            return {
                uri: `at://${ session.did }/site.standard.publication/self`,
                cid: existingCid,
                skipped: true
            };
        }
        const r = await xrpc(session, 'com.atproto.repo.putRecord', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: session.did,
                collection: 'site.standard.publication',
                rkey: 'self',
                record,
                ...existingCid ? { swapRecord: existingCid } : {}
            })
        });
        if (!r.ok)
            throw new Error(`putRecord site.standard.publication ${ r.status }: ${ await r.text() }`);
        return r.json();
    };
};
const _1wmzsvv = function _getStdDoc()
{
    return async ({session, xrpc, rkey} = {}) => {
        // Fetch a site.standard.document by rkey for the signed-in user.
        // Returns the record value or null if absent.
        if (!session || typeof xrpc !== 'function') {
            throw new Error('getStdDoc requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        if (!rkey || typeof rkey !== 'string') {
            throw new Error('getStdDoc requires { rkey: string }');
        }
        const r = await xrpc(session, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(session.did) }&collection=site.standard.document&rkey=${ encodeURIComponent(rkey) }`, { method: 'GET' });
        if (!r.ok) {
            // Some PDSes (incl. bsky.social) return 400 RecordNotFound instead
            // of a clean 404 when the record is absent. Treat both as null.
            const errText = await r.text();
            if (r.status === 404 || /RecordNotFound/.test(errText))
                return null;
            throw new Error(`getRecord site.standard.document ${ r.status }: ${ errText }`);
        }
        return r.json();
    };
};
const _1erepsl = function _publishStdDoc()
{
    return async ({session, xrpc, rkey, title, baseUrl, publishedAt, updatedAt, description, textContent, coverImage, bskyPostRef, tags} = {}) => {
        // Idempotent upsert of site.standard.document at the same rkey as the
        // bundle, so one bundle ↔ one document. site is the AT-URI of the
        // user's publication (rkey=self). path is the bundle's URL relative
        // to publication.url, conventionally /r/<rkey>.
        //
        // publishedAt anchors a document to its discovery moment on standard.site:
        // indexers (docs.surf RSS, Tap consumers) sort feeds by this field. On
        // first publish we set it to "now" so the doc appears at the top of
        // discovery feeds; on republish we preserve whatever the existing record
        // had, so updates don't bump the doc back to the top (which would be
        // spammy). The caller's `publishedAt` argument is only used as a fallback
        // when there's no existing record AND the caller wants to override "now"
        // (e.g. backdating).
        if (!session || typeof xrpc !== 'function') {
            throw new Error('publishStdDoc requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        if (!rkey || typeof rkey !== 'string') {
            throw new Error('publishStdDoc requires { rkey: string }');
        }
        if (!title) {
            throw new Error('publishStdDoc requires { title }');
        }
        const gr = await xrpc(session, `com.atproto.repo.getRecord?repo=${ encodeURIComponent(session.did) }&collection=site.standard.document&rkey=${ encodeURIComponent(rkey) }`, { method: 'GET' });
        let existingCid = null;
        let existingPublishedAt = null;
        if (gr.ok) {
            const got = await gr.json();
            existingCid = got.cid;
            existingPublishedAt = got.value?.publishedAt || null;
        } else {
            const errText = await gr.text();
            if (gr.status !== 404 && !/RecordNotFound/.test(errText)) {
                throw new Error(`getRecord site.standard.document ${ gr.status }: ${ errText }`);
            }
        }
        const finalPublishedAt = existingPublishedAt || publishedAt || new Date().toISOString();
        const record = {
            $type: 'site.standard.document',
            site: `at://${ session.did }/site.standard.publication/self`,
            title,
            path: `/r/${ rkey }`,
            publishedAt: finalPublishedAt,
            ...updatedAt ? { updatedAt } : {},
            ...description ? { description } : {},
            ...textContent ? { textContent } : {},
            ...coverImage ? { coverImage } : {},
            ...bskyPostRef ? { bskyPostRef } : {},
            ...tags && tags.length ? { tags } : {}
        };
        const r = await xrpc(session, 'com.atproto.repo.putRecord', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: session.did,
                collection: 'site.standard.document',
                rkey,
                record,
                ...existingCid ? { swapRecord: existingCid } : {}
            })
        });
        if (!r.ok)
            throw new Error(`putRecord site.standard.document ${ r.status }: ${ await r.text() }`);
        return r.json();
    };
};
const _87a353 = function _unpublishStdDoc()
{
    return async ({session, xrpc, rkey} = {}) => {
        // Delete one site.standard.document by rkey. Idempotent server-side.
        // Does NOT delete the underlying com.lopecode.bundle — only the
        // discoverability record. Caller decides whether to also delete the
        // publication when the last document is removed (we don't, by default).
        if (!session || typeof xrpc !== 'function') {
            throw new Error('unpublishStdDoc requires { session, xrpc } from @tomlarkworthy/at-login');
        }
        if (!rkey || typeof rkey !== 'string') {
            throw new Error('unpublishStdDoc requires { rkey: string }');
        }
        const r = await xrpc(session, 'com.atproto.repo.deleteRecord', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: session.did,
                collection: 'site.standard.document',
                rkey
            })
        });
        if (!r.ok)
            throw new Error(`deleteRecord site.standard.document ${ r.status }: ${ await r.text() }`);
        return r.json();
    };
};
const _a509v3 = function _publishToStdSite()
{
    return async ({session, xrpc, ensureScopes, rkey, title, baseUrl, publishedAt, updatedAt, description, textContent, coverImage, bskyPostRef, tags, pubName, pubUrl, pubDescription, popup} = {}, deps = {}) => {
        // High-level orchestrator. Single entry point for the ledger UI:
        //  1. ensureScopes upgrades the OAuth session if the two NSIDs are absent
        //  2. ensure a site.standard.publication exists at rkey=self
        //  3. write the site.standard.document for this bundle
        // Caller passes ensureScopes + the publishStd* helpers as `deps` to keep
        // this self-contained (the helpers are sibling cells in the same module).
        if (!session || typeof xrpc !== 'function' || typeof ensureScopes !== 'function') {
            throw new Error('publishToStdSite requires { session, xrpc, ensureScopes }');
        }
        if (!rkey || !title || !pubUrl || !pubName) {
            // publishedAt is optional — publishStdDoc defaults to "now" on first
            // publish and preserves the existing value on republish.
            throw new Error('publishToStdSite requires { rkey, title, pubUrl, pubName }');
        }
        const {publishStdPub, publishStdDoc} = deps;
        if (typeof publishStdPub !== 'function' || typeof publishStdDoc !== 'function') {
            throw new Error('publishToStdSite requires deps.publishStdPub and deps.publishStdDoc');
        }
        const fresh = await ensureScopes([
            'repo:site.standard.publication',
            'repo:site.standard.document'
        ], { popup });
        const s = fresh || session;
        await publishStdPub({
            session: s,
            xrpc,
            url: pubUrl,
            name: pubName,
            description: pubDescription
        });
        return publishStdDoc({
            session: s,
            xrpc,
            rkey,
            title,
            baseUrl,
            publishedAt,
            updatedAt,
            description,
            textContent,
            coverImage,
            bskyPostRef,
            tags
        });
    };
};
const _5b8msq = function _utils(safeStorage)
{
    return {
        // at-write-specific helpers: CID computation + per-DID seen-CIDs in
        // localStorage. Generic byte utilities live in @tomlarkworthy/atproto.
        //
        // Storage is accessed via `safeStorage`, imported from
        // @mbostock/safe-local-storage. Renaming on import (`localStorage as
        // safeStorage`) is required because Observable collapses imports whose
        // name matches a JS global with the implicit-global auto-binding —
        // bare `localStorage` references would still resolve to
        // `window.localStorage` and throw in sandboxed iframes.
        _b32: 'abcdefghijklmnopqrstuvwxyz234567',
        encodeBase32(bytes) {
            let bits = 0, value = 0, out = '';
            for (let i = 0; i < bytes.length; i++) {
                value = value << 8 | bytes[i];
                bits += 8;
                while (bits >= 5) {
                    out += this._b32[value >>> bits - 5 & 31];
                    bits -= 5;
                }
            }
            if (bits > 0)
                out += this._b32[value << 5 - bits & 31];
            return out;
        },
        async sha256(bytes) {
            const buf = await crypto.subtle.digest('SHA-256', bytes);
            return new Uint8Array(buf);
        },
        // CID v1, raw codec (0x55), sha256 multihash (0x12, len 0x20)
        async computeCid(bytes) {
            const hash = await this.sha256(bytes);
            const cid = new Uint8Array(4 + hash.length);
            cid[0] = 1;
            cid[1] = 85;
            cid[2] = 18;
            cid[3] = 32;
            cid.set(hash, 4);
            return 'b' + this.encodeBase32(cid);
        },
        knownCids(did) {
            const raw = safeStorage.getItem(`lopejack.cids.${ did }`);
            try {
                return new Set(raw ? JSON.parse(raw) : []);
            } catch {
                return new Set();
            }
        },
        saveKnownCids(did, set) {
            safeStorage.setItem(`lopejack.cids.${ did }`, JSON.stringify([...set]));
        },
        // atproto TID — 13-char base32-sortable timestamp identifier.
        // Top bit 0, 53-bit microseconds since epoch, 10-bit random clock.
        // Used as the snapshot suffix in com.lopecode.bundle.version rkeys
        // (`<bundleRkey>--<tid>`). TIDs are globally unique even under
        // concurrent writes from multiple devices and sort lexicographically
        // by creation time, so a per-bundle rkey-range listRecords returns
        // snapshots in chronological order without a server-side index.
        _tidAlpha: '234567abcdefghijklmnopqrstuvwxyz',
        _tidLastUs: 0n,
        genTid() {
            let us = BigInt(Date.now()) * 1000n;
            if (us <= this._tidLastUs)
                us = this._tidLastUs + 1n;
            this._tidLastUs = us;
            const clock = BigInt(Math.floor(Math.random() * 1024));
            let v = us << 10n | clock;
            let s = '';
            for (let i = 0; i < 13; i++) {
                s = this._tidAlpha[Number(v & 31n)] + s;
                v >>= 5n;
            }
            return s;
        },
        // Slugify a human title into the atproto rkey alphabet
        // [a-zA-Z0-9_.-]. The bundle's identity is its title, not its main
        // module — composing the same modules under a different title is a
        // different work, and renaming a title is creating a new work
        // (cleanup the old via deleteBundle). NFKD-strip non-ASCII so emojis
        // don't survive; cap length so titles can't push the URI long.
        //   "Hello, world!"  → "hello-world"
        //   "atproto"        → "atproto"
        //   "✨ Notebook v2"  → "notebook-v2"
        slugifyTitle(title) {
            const slug = String(title).normalize('NFKD').replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').toLowerCase().slice(0, 64);
            if (!slug)
                throw new Error(`Cannot slugify title: ${ JSON.stringify(title) }`);
            return slug;
        }
    };
};
const _oivp5h = function _publishBundleVersion(URLSearchParams,utils)
{
    return async ({session, xrpc, rkey, newRecord, prior, ensureScopes, popup} = {}) => {
        // Atomically (a) snapshot the prior live bundle into
        // com.lopecode.bundle.version/<rkey>--<tid> and (b) overwrite the
        // live com.lopecode.bundle/<rkey> with newRecord. Both writes happen
        // inside one com.atproto.repo.applyWrites call so the snapshot can
        // never be missing for a live record that was overwritten.
        //
        // The snapshot's `record` field is a verbatim copy of the prior
        // value (NOT enumerated field by field), so future bundle schema
        // additions don't need code changes here. The snapshot's
        // `previousVersion` field links to the most-recent prior snapshot
        // (if any) so the version DAG can be reconstructed by walking back
        // from each snapshot without re-listing the whole collection.
        //
        // Caller passes:
        //   prior = { cid, value }  // result of getRecord on the live bundle
        //   newRecord                // the new bundle value to write
        //
        // If `prior` is null/undefined the helper does a plain putRecord
        // (first publish — nothing to snapshot).
        if (!session || typeof xrpc !== 'function') {
            throw new Error('publishBundleVersion requires { session, xrpc }');
        }
        if (!rkey || typeof rkey !== 'string') {
            throw new Error('publishBundleVersion requires { rkey: string }');
        }
        if (!newRecord) {
            throw new Error('publishBundleVersion requires { newRecord }');
        }
        if (!prior) {
            // First publish — no snapshot to take, just write.
            const r = await xrpc(session, 'com.atproto.repo.putRecord', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    repo: session.did,
                    collection: 'com.lopecode.bundle',
                    rkey,
                    record: newRecord
                })
            });
            if (!r.ok)
                throw new Error(`putRecord com.lopecode.bundle ${ r.status }: ${ await r.text() }`);
            const out = await r.json();
            return {
                ...out,
                versionUri: null,
                versionRkey: null
            };
        }
        // Find the most recent prior snapshot to chain `previousVersion`
        // from. One listRecords with reverse=true&limit=1 is enough — we
        // only need the tip of the chain, not the whole history.
        let previousVersion = null;
        try {
            const tipR = await xrpc(session, `com.atproto.repo.listRecords?${ new URLSearchParams({
                repo: session.did,
                collection: 'com.lopecode.bundle.version',
                limit: '1',
                rkeyStart: `${ rkey }--`,
                rkeyEnd: `${ rkey }-.`,
                reverse: 'true'
            }) }`, { method: 'GET' });
            if (tipR.ok) {
                const data = await tipR.json();
                if (data.records?.length)
                    previousVersion = data.records[0].uri;
            }
        } catch {
        }
        const snapshotRkey = `${ rkey }--${ utils.genTid() }`;
        const snapshotValue = {
            $type: 'com.lopecode.bundle.version',
            versionOf: `at://${ session.did }/com.lopecode.bundle/${ rkey }`,
            ...previousVersion ? { previousVersion } : {},
            record: { ...prior.value }
        };
        // Upgrade the OAuth session in-place if it lacks scope for the
        // bundle.version collection. Sessions issued before this lexicon
        // existed have only `repo:com.lopecode.bundle`; calling
        // ensureScopes is idempotent and a no-op for app-password sessions.
        if (typeof ensureScopes === 'function') {
            const fresh = await ensureScopes(['repo:com.lopecode.bundle.version'], popup ? { popup } : undefined);
            if (fresh)
                session = fresh;
        }
        // applyWrites is atomic — either both ops succeed or neither, so
        // we can never produce an orphan snapshot or an un-snapshotted
        // overwrite. atproto's applyWrites doesn't support per-op
        // swapRecord; the race window between the caller's getRecord and
        // this write is tiny (sub-second within one click handler) and a
        // missed concurrent snapshot is recoverable from later writes.
        const r = await xrpc(session, 'com.atproto.repo.applyWrites', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                repo: session.did,
                writes: [
                    {
                        '$type': 'com.atproto.repo.applyWrites#create',
                        collection: 'com.lopecode.bundle.version',
                        rkey: snapshotRkey,
                        value: snapshotValue
                    },
                    {
                        '$type': 'com.atproto.repo.applyWrites#update',
                        collection: 'com.lopecode.bundle',
                        rkey,
                        value: newRecord
                    }
                ]
            })
        });
        if (!r.ok)
            throw new Error(`applyWrites com.lopecode.bundle.version+bundle ${ r.status }: ${ await r.text() }`);
        const out = await r.json();
        // applyWrites returns results[] in the same order as writes[]; the
        // create result carries the snapshot CID, the update result carries
        // the new bundle CID. Surface both so the caller can update local
        // state with what was actually written.
        const versionResult = out.results?.[0] || {};
        const updateResult = out.results?.[1] || {};
        return {
            uri: `at://${ session.did }/com.lopecode.bundle/${ rkey }`,
            cid: updateResult.cid || null,
            versionUri: `at://${ session.did }/com.lopecode.bundle.version/${ snapshotRkey }`,
            versionRkey: snapshotRkey,
            versionCid: versionResult.cid || null,
            previousVersion
        };
    };
};
const _1d3t3j = function _listBundleVersions(URLSearchParams)
{
    return async ({session, xrpc, did, rkey, limit = 100, reverse = true} = {}) => {
        // List com.lopecode.bundle.version snapshots for one bundle by
        // rkey-prefix range query. Snapshots use rkey `<bundleRkey>--<tid>`
        // and atproto's listRecords supports rkeyStart/rkeyEnd to scope to
        // a lex range, so a single roundtrip returns just this bundle's
        // history rather than the whole collection. reverse=true (default)
        // returns newest first.
        //
        // session is optional — pass `did` to view another user's history;
        // pass `session` to read your own without exposing the did.
        const repo = did || session?.did;
        if (!repo)
            throw new Error('listBundleVersions requires { did } or { session }');
        if (!rkey || typeof rkey !== 'string')
            throw new Error('listBundleVersions requires { rkey: string }');
        if (typeof xrpc !== 'function')
            throw new Error('listBundleVersions requires { xrpc }');
        // Range is [`<rkey>--`, `<rkey>-.`) — `.` (0x2E) is the next valid
        // rkey char after `-` (0x2D), so any string starting with `<rkey>--`
        // is strictly less than `<rkey>-.`. This is half-open on rkeyEnd,
        // which is exactly what we want.
        const q = new URLSearchParams({
            repo,
            collection: 'com.lopecode.bundle.version',
            limit: String(limit),
            rkeyStart: `${ rkey }--`,
            rkeyEnd: `${ rkey }-.`,
            reverse: String(reverse)
        });
        const r = await xrpc(session, `com.atproto.repo.listRecords?${ q }`, { method: 'GET' });
        if (!r.ok)
            throw new Error(`listRecords com.lopecode.bundle.version ${ r.status }: ${ await r.text() }`);
        const data = await r.json();
        return data.records || [];
    };
};
const _1ajlyxt = function _extractFiles(DOMParser,decodeBase64,textBytes,utils){return(
async html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script[data-mime][id]');
    const files = [];
    for (const el of scripts) {
        const id = el.getAttribute('id');
        const mime = el.getAttribute('data-mime');
        const encoding = (el.getAttribute('data-encoding') || 'text').toLowerCase();
        const body = el.textContent || '';
        const bytes = encoding === 'base64' ? decodeBase64(body) : textBytes(body);
        const cid = await utils.computeCid(bytes);
        files.push({
            id,
            mime,
            encoding,
            bytes,
            size: bytes.length,
            cid
        });
    }
    return files;
}
)};
const _11hp8p6 = function _lopeTokens(){return(
{
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
    accentBg: '#f5d9cc',
    ok: '#3f7a3a',
    warn: '#b88017',
    link: '#1f4fb0',
    serif: '"Source Serif 4", "Source Serif Pro", "Iowan Old Style", Georgia, serif',
    sans: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", "Berkeley Mono", "IBM Plex Mono", ui-monospace, "SF Mono", monospace'
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/at-login", async () => runtime.module((await import("/@tomlarkworthy/at-login.js?v=4")).default));  
  main.define("module @tomlarkworthy/atproto", async () => runtime.module((await import("/@tomlarkworthy/atproto.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @mbostock/safe-local-storage", async () => runtime.module((await import("/@mbostock/safe-local-storage.js?v=4")).default));  
  $def("_mhr6o6", "publishWidget", ["publisher","currentSession","xrpc","notebook_title","loginWidget"], _mhr6o6);  
  $def("_11omwb6", null, ["md"], _11omwb6);  
  $def("_1iduepw", "publisher", ["lopeTokens","notebook_title","DOMParser","exportToHTML","globalThis","utils","extractFiles","publishBundleVersion","ensureScopes","currentSession","xrpc","loginWidget"], _1iduepw);  
  $def("_8igsoj", "publishEntry", ["lopeTokens","MutationObserver"], _8igsoj);  
  $def("_1hpecn1", null, ["md"], _1hpecn1);  
  $def("_1is17n9", "deleteBundle", [], _1is17n9);  
  $def("_3i591w", "getStdPub", [], _3i591w);  
  $def("_17z95h0", "publishStdPub", [], _17z95h0);  
  $def("_1wmzsvv", "getStdDoc", [], _1wmzsvv);  
  $def("_1erepsl", "publishStdDoc", [], _1erepsl);  
  $def("_87a353", "unpublishStdDoc", [], _87a353);  
  $def("_a509v3", "publishToStdSite", [], _a509v3);  
  $def("_5b8msq", "utils", ["safeStorage"], _5b8msq);  
  $def("_oivp5h", "publishBundleVersion", ["URLSearchParams","utils"], _oivp5h);  
  $def("_1d3t3j", "listBundleVersions", ["URLSearchParams"], _1d3t3j);  
  $def("_1ajlyxt", "extractFiles", ["DOMParser","decodeBase64","textBytes","utils"], _1ajlyxt);  
  $def("_11hp8p6", "lopeTokens", [], _11hp8p6);  
  main.define("loginWidget", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("loginWidget", _));  
  main.define("currentSession", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("currentSession", _));  
  main.define("xrpc", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("xrpc", _));  
  main.define("ensureScopes", ["module @tomlarkworthy/at-login", "@variable"], (_, v) => v.import("ensureScopes", _));  
  main.define("decodeBase64", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("decodeBase64", _));  
  main.define("textBytes", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("textBytes", _));  
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportToHTML", _));  
  main.define("notebook_title", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("notebook_title", _));  
  main.define("safeStorage", ["module @mbostock/safe-local-storage", "@variable"], (_, v) => v.import("localStorage", "safeStorage", _));
  return main;
}