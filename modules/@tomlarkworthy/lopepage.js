const _1xyxga0 = function _page(htl,isOnObservableCom,lopeviz_handle_css,base_css,light_theme_css,commandPaletteStyles,commandPaletteOverlay,linkTo){return(
htl.html`<div id="lopepage" style="height: ${
  isOnObservableCom() ? "800px" : "100vh"
}">
  ${lopeviz_handle_css}
  ${base_css}
  ${light_theme_css}
  ${commandPaletteStyles}
${commandPaletteOverlay}
  <style>
    html body {
      max-width: 100vw;
    }
    html {
      padding: 0px !important;
      margin: 0px !important;
    }
    #lopepage:has(.observablehq-root) > .module-explorer {
      display: none;
    }
  </style>
  <h1 style="display:none;">Lopepage</h1>
  <div class="module-explorer">
    <p>Lost? Open the <a href="${linkTo("@tomlarkworthy/module-selection", {
      onObservable: false
    })}">module explorer</a> or press CMD + K to open the command palatte.
  </div>
</div>`
)};
const _1ujnhdh = function _append_to_body(page)
{
    // If exported in headless mode, this will attach the page
    if (!page.isConnected) {
        document.body.appendChild(page);
    }
};
const _1nv51s8 = function _testNavigation(htl,linkTo){return(
htl.html`<h2>Manual Testing links</h2>
<ul>
<li><a href="https://observablehq.com/@tomlarkworthy/lopepage#testNavigation">refresh page</a></li>
<li><a href="#testNavigation">reset view</a></li>
<li><a href="${ linkTo('@tomlarkworthy/stream-operators', { onObservable: false }) }">stream-operators</a> module</li>
<li><a href="${ linkTo('@tomlarkworthy/stream-operators#combineLatest', { onObservable: false }) }">stream-operators#combineLatest</a> 
<li><a href="${ linkTo('@tomlarkworthy/runtime-sdk#observe', { onObservable: false }) }">runtime-sdk#observe</a> cell</li>
</ul>`
)};
const _ydvyos = function _reload(Inputs){return(
Inputs.button('reload')
)};
const _1we0ggl = (G, _) => G.input(_);
const _plefwg = function _onLoadConfig(parseGoldenDSL,URLSearchParams,location)
{
    try {
        return parseGoldenDSL(new URLSearchParams(location.hash.substring(1)).get('view'));
    } catch (err) {
        return undefined;
    }
};
const _1nzpnqy = function _visualizer_cache(reload)
{
    reload;
    return new Map();
};
const _1ojown8 = function _modulePanel(appendScrollLog,currentModules,file_attachment_cache,renderFileAttachment,visualizer_cache,visualizer,runtime,isOnObservableCom,scrollKeyFor,fix_scroll,scroll_cache)
{
  return function (container, component) {
    appendScrollLog('modulePanel:enter', {
      title: container?.title ?? null,
      componentCell: component?.cell ?? null
    });
    const moduleInfo = [...currentModules.values()].find(m => m.name == container.title);
    if (!moduleInfo) {
      // Fall through to file attachment: titles like @user/notebook/path.ext
      // resolve via the lopecode bootloader's contentSync DOM lookup.
      const title = container?.title ?? null;
      if (title) {
        let node = file_attachment_cache.get(title);
        if (!node) {
          const r = window.lopecode?.contentSync?.(title);
          if (r && r.status === 200 && r.bytes) {
            node = renderFileAttachment(r.mime, r.bytes);
            file_attachment_cache.set(title, node);
            appendScrollLog('modulePanel:file_attachment_create', {
              title,
              mime: r.mime
            });
          }
        }
        if (node) {
          const c_element = container.getElement();
          if (node.parentNode !== c_element)
            c_element.appendChild(node);
          appendScrollLog('modulePanel:file_attachment_mount', { title });
          return;
        }
      }
      appendScrollLog('modulePanel:missing_moduleInfo', { title });
      return;
    }
    const module = moduleInfo.module;
    let node;
    if (!visualizer_cache.has(module)) {
      appendScrollLog('modulePanel:visualizer_create', { title: container?.title ?? null });
      node = visualizer(runtime, {
        invalidation: new Promise(r => {
        }),
        module,
        detachNodes: isOnObservableCom(),
        filter: (cell_name, variables) => {
          if (variables[0]._type !== 1)
            return false;
          if (typeof cell_name == 'string') {
            if (cell_name.startsWith('dynamic '))
              return false;
          }
          return true;
        }
      });
      visualizer_cache.set(module, node);
    } else {
      node = visualizer_cache.get(module);
      appendScrollLog('modulePanel:visualizer_reuse', { title: container?.title ?? null });
    }
    const cell = module._scope.get(component.cell);
    const scrollKey = scrollKeyFor(container);
    fix_scroll(container, node, cell, scrollKey);
    const el = container.getElement();
    if (!el.__lope_scroll_bound) {
      el.__lope_scroll_bound = true;
      appendScrollLog('modulePanel:bind_scroll_listener', { title: container?.title ?? null });
      const markUserScroll = () => {
        el.__lope_user_scroll_at = Date.now();
      };
      el.addEventListener('wheel', markUserScroll, { passive: true });
      el.addEventListener('touchmove', markUserScroll, { passive: true });
      el.addEventListener('keydown', markUserScroll, { passive: true });
      el.addEventListener('scroll', () => {
        if (Date.now() < (scroll_cache.__reflowUntil || 0)) {
          appendScrollLog('scroll:skip_reflow', { title: container?.title ?? null });
          return;
        }
        // Only cache scrolls following a genuine user gesture; reflow-induced
        // scroll events (e.g. closing an adjacent panel) carry stale scrollTops.
        if (Date.now() - (el.__lope_user_scroll_at || 0) > 400) {
          appendScrollLog('scroll:skip_nonuser', { title: container?.title ?? null });
          return;
        }
        const k = scrollKeyFor(container);
        const scrollTop = el.scrollTop;
        const scrollLeft = el.scrollLeft;
        if (scrollTop == 0) {
          appendScrollLog('modulePanel:skip 0 scroll', {
            title: container?.title ?? null,
            scrollKey
          });
          return;
        }
        scroll_cache.set(k, {
          scrollTop,
          scrollLeft,
          t: Date.now()
        });
        appendScrollLog('scroll:event', {
          k,
          title: container?.title ?? null,
          scrollTop,
          scrollLeft
        });
      }, { passive: true });
    }
    // Capture current scroll before this tab is destroyed/reflowed (e.g. when closing tabs)
    if (!container.__lope_destroy_bound) {
      container.__lope_destroy_bound = true;
      container.on('destroy', () => {
        try {
          if (Date.now() < (scroll_cache.__reflowUntil || 0)) {
            appendScrollLog('scroll:destroy_skip_reflow', { title: container?.title ?? null });
            return;
          }
          const k = scrollKeyFor(container);
          const scrollTop = el?.scrollTop;
          const scrollLeft = el?.scrollLeft;
          if (scrollTop == 0) {
            appendScrollLog('scroll:skip 0 scroll', {
              k,
              key: container?.title ?? null,
              scrollKey
            });
            return;
          }
          // do not skip 0 here: if the user is at top, preserve that state
          scroll_cache.set(k, {
            scrollTop,
            scrollLeft,
            t: Date.now()
          });
          appendScrollLog('scroll:destroy_capture', {
            k,
            title: container?.title ?? null,
            scrollTop,
            scrollLeft
          });
        } catch (e) {
          appendScrollLog('scroll:destroy_capture:error', {
            title: container?.title ?? null,
            error: String(e)
          });
        }
      });
    }
    // When GoldenLayout resizes this panel (e.g. an adjacent panel is closed) the
    // browser can shift scrollTop; re-apply the user's cached position after the reflow.
    if (!container.__lope_resize_bound) {
      container.__lope_resize_bound = true;
      container.on('resize', () => {
        const rk = scrollKeyFor(container);
        const cached = scroll_cache.get(rk);
        if (!cached || cached.scrollTop == null)
          return;
        const c_el = container.getElement();
        const at = Date.now();
        scroll_cache.__reflowUntil = at + 800;
        // The reflow can shift scrollTop in several passes (content relayout
        // settles ~300ms later), so re-apply over a window. Bail if the user scrolls.
        const apply = () => {
          if ((c_el.__lope_user_scroll_at || 0) > at)
            return;
          if (c_el.scrollTop !== cached.scrollTop)
            c_el.scrollTop = cached.scrollTop;
          if (cached.scrollLeft != null && c_el.scrollLeft !== cached.scrollLeft)
            c_el.scrollLeft = cached.scrollLeft;
        };
        requestAnimationFrame(apply);
        for (const d of [
            60,
            150,
            300,
            450,
            600
          ])
          setTimeout(apply, d);
        appendScrollLog('scroll:resize_restore', {
          k: rk,
          title: container?.title ?? null,
          scrollTop: cached.scrollTop
        });
      });
    }
    appendScrollLog('modulePanel:exit', {
      title: container?.title ?? null,
      scrollKey
    });
  };
};
const _1gm4gbf = function _blobPanel(){return(
function (container, component) {
    const node = document.createElement('iframe');
    node.src = component.url;
    const c_element = container.getElement();
    const element = c_element.appendChild(node);
}
)};
const _lxv2e2 = function _settings(){return(
{
    showMaximiseIcon: false,
    showPopoutIcon: false,
    showCloseIcon: true,
    hasHeaders: true
}
)};
const _lp1ggk = function _is_mobile(width){return(
width < 800
)};
const _qbghwu = function _config(onLoadConfig,settings)
{
    if (onLoadConfig) {
        return {
            settings: settings,
            content: [onLoadConfig]
        };
    }
    return { settings: settings };
};
const _15lk82w = (M, _) => new M(_);
const _1bki6eh = _ => _.generator;
const _14z0bay = function _resize(Generators,addEventListener,invalidation,removeEventListener){return(
Generators.observe(notify => {
    notify(undefined);
    addEventListener('resize', notify);
    invalidation.then(() => removeEventListener('resize', notify));
})
)};
const _18jv72h = function _layout(resize,gl,$0,page,modulePanel,blobPanel)
{
    // Removed resizing re-laying out because it causes problems with components that watch focus
    // when the the layout is redone, the components are killed and removed, damaging focus state.
    // mobile keyboards cause a resize, breaking the component that has focus
    resize;
    let layout = this;
    if (!layout) {
        layout = new gl.GoldenLayout($0.value, page);
        layout.registerComponent('module', modulePanel);
        layout.registerComponent('blob', blobPanel);
        layout.init();
    } else {
        layout.updateSize();
    }
    // TODO layout destroy is destructive
    // invalidation.then(() => {
    //   // avoid layouts stacking up
    //   layout.destroy();
    // });
    return layout;
};
const _tsjb2x = function _layout_state(appendScrollLog,layout,gl,$0)
{
    appendScrollLog('layout_state:bind', { hasLayout: !!layout });
    return layout.on('stateChanged', () => {
        appendScrollLog('layout:stateChanged', {});
        const state = gl.LayoutConfig.fromResolved(layout.toConfig());
        $0.value = state;
        appendScrollLog('layout:stateChanged:config_updated', { rootType: state?.root?.type ?? null });
    });
};
const _11nrwvj = function _lopepageModule(thisModule){return(
thisModule()
)};
const _r97569 = (G, _) => G.input(_);
const _1sp5wo4 = function _16(md){return(
md`## Scrolling

Scrolling has been a mess to develop. The thing that finally fixed it was \`scroll_fix_sync_layout\`. I suspect fix_scroll is over-complex.`
)};
const _1ts23ma = function _scrollDebug(Inputs){return(
Inputs.toggle({
    label: 'enable debug scroll?',
    value: true
})
)};
const _7jxivy = (G, _) => G.input(_);
const _1f2wuqm = function _appendScrollLog($0,$1){return(
(type, detail = {}) => {
    if (!$0.value)
        return null;
    const evt = {
        t: Date.now(),
        type: String(type),
        ...detail
    };
    $1.value = ($1.value || []).concat([evt]);
    return evt;
}
)};
const _1nbnzwx = function _scrollLog(scrollDebug){return(
scrollDebug ? [] : []
)};
const _1f7xtz1 = (M, _) => new M(_);
const _1dyz4o0 = _ => _.generator;
const _1d1nkw9 = function _scrollKeyFor(appendScrollLog)
{
    return container => {
        // can return undefined if the container is loading still
        const key = container?.title;
        appendScrollLog('scrollKeyFor:', { key });
        return key;
    };
};
const _tb217h = function _scroll_cache(){return(
new Map()
)};
const _12p8mg7 = function _fix_scroll(scroll_cache,scrollKeyFor,appendScrollLog)
{
  return function (container, node, cell_variable, key) {
    scroll_cache.__reflowUntil = Date.now() + 600;
    // suppress reflow-induced scroll events that clobber the cache
    const c_element = container.getElement();
    let k = scrollKeyFor(container);
    appendScrollLog('fix_scroll:enter', {
      title: container?.title ?? null,
      k,
      cell: cell_variable?._name ?? null
    });
    if (node && node.parentNode !== c_element) {
      c_element.appendChild(node);
      appendScrollLog('fix_scroll:append_node', {
        title: container?.title ?? null,
        k
      });
    }
    const writeCache = (scrollTop, scrollLeft, why) => {
      scroll_cache.set(k, {
        scrollTop,
        scrollLeft,
        t: Date.now()
      });
      appendScrollLog('scroll_cache:write', {
        k,
        scrollTop,
        scrollLeft,
        why
      });
    };
    const scrollToCellIfPossible = why => {
      if (!cell_variable)
        return false;
      const dom = cell_variable?._observer?._node ?? c_element.querySelector(`div[cell='${ cell_variable._name }']`);
      if (!dom) {
        appendScrollLog('scroll:cell_dom_not_found', {
          k,
          why,
          cell: cell_variable?._name ?? null
        });
        return false;
      }
      const top = dom.offsetTop - c_element.offsetTop;
      const left = c_element.scrollLeft;
      c_element.scrollTop = top;
      appendScrollLog('scroll:set', {
        k,
        why: `${ why }:cell`,
        scrollTop: top,
        scrollLeft: left,
        cell: cell_variable?._name ?? null
      });
      writeCache(top, left, `${ why }:cell`);
      return true;
    };
    const restoreFromCache = why => {
      k = scrollKeyFor(container);
      const cached = scroll_cache.get(k);
      appendScrollLog('scroll:restore_attempt', {
        k,
        why,
        cachedScrollTop: cached?.scrollTop ?? null,
        cachedScrollLeft: cached?.scrollLeft ?? null
      });
      if (!cached) {
        appendScrollLog('scroll:restore_no_scroll', {
          k,
          why
        });
        return;
      }
      if (cached.scrollTop != null)
        c_element.scrollTop = cached.scrollTop;
      if (cached.scrollLeft != null)
        c_element.scrollLeft = cached.scrollLeft;
      appendScrollLog('scroll:restore_applied', {
        k,
        why,
        scrollTop: cached.scrollTop ?? null,
        scrollLeft: cached.scrollLeft ?? null,
        scrollTopFinal: c_element.scrollTop,
        scrollLeftFinal: c_element.scrollLeft
      });
    };
    const setScroll = (why = 'setScroll') => {
      if (scrollToCellIfPossible(why))
        return;
      restoreFromCache(why);
    };
    const retryFrames = 6;
    for (let i = 0; i < retryFrames; i++) {
      requestAnimationFrame(() => {
        k = scrollKeyFor(container);
        appendScrollLog('fix_scroll:raf_retry', {
          i,
          k,
          title: container?.title ?? null
        });
        setScroll(`raf:${ i }`);
      });
    }
    appendScrollLog('fix_scroll:exit', {
      k,
      title: container?.title ?? null
    });
  };
};
const _arfw00 = function _scroll_fix_sync_layout(sync_layout_to_url,layout,appendScrollLog,modulePanel)
{
    sync_layout_to_url;
    let timeout = null;
    const listComponentItems = () => {
        const out = [];
        const walk = item => {
            if (!item)
                return;
            if (item.isComponent || item.type === 'component')
                out.push(item);
            const kids = item.contentItems || item.content || [];
            for (const k of kids)
                walk(k);
        };
        walk(layout.root);
        return out;
    };
    const items = listComponentItems();
    appendScrollLog('scroll:reapply_all:begin', { count: items.length });
    for (const it of items) {
        try {
            const container = it.container;
            const title = container?.title ?? it.title ?? null;
            if (!container || !title)
                continue;
            const st = it.componentState ?? it.config?.componentState ?? it._config?.componentState ?? it._state ?? {};
            modulePanel(container, { cell: st?.cell });
        } catch (e) {
            appendScrollLog('scroll:reapply_all:error', { error: String(e) });
        }
    }
    return true;
};
const _3nwpp4 = function _URLrouting(md){return(
md`## URL Sync

### Goals
1. **Non-destructive navigation:** mutate an existing GoldenLayout (GL) instance (add/remove/reorder items) rather than rebuilding.
2. **Refresh restores what you see:** the URL eventually contains the full serialized GL tree in **\`view=\`**.
3. **Links are “intents”:** in-app links should not rewrite \`view=\` at click time.

---

## State model

### Canonical, persistent state
- **\`view=<DSL>\`** is the canonical serialized GL layout (single source of truth after boot).

### One-shot intent params (cleared after commit)
- \`open=<moduleOrModule#cell>\`
- \`close=<...>\` (reserved)
- \`focus=<...>\` (reserved)
- \`from=<module>\` (optional placement hint)

---

## Dataflow

### 1) URL → desired layout (intent overlay)
- Parse \`view\` with \`parseGoldenDSL\` to get the desired root config.
- If \`open=\` exists, **overlay** it into the parsed config by inserting the target module into the *first stack* (and optional \`componentState.cell\`).

Implemented in: **\`sync_layout_from_url\`**.

### 2) Desired layout → live GL (non-destructive when possible)
- Try **\`treeSyncGolden(layout, desiredRoot)\`** to:
  - add missing module tabs
  - remove extra module tabs
  - reorder tabs to match the DSL
  - ensure container shapes (row/column/stack) match where possible
- If tree sync can’t reconcile safely, **fallback to \`layout.loadLayout(...)\`**.

Implemented in: **\`treeSyncGolden\`** + \`sync_layout_from_url\`.

### 3) Live GL → URL persistence (“commit then clear”)
- GL emits \`stateChanged\` → update \`mutable config\` from \`layout.toConfig()\`.
- Serialize \`config.root\` with \`serializeGoldenDSL\` and write it to **\`view=\`**.
- Clear one-shot intent params (\`open/close/focus/from\`) so they are not re-applied on refresh.

Implemented in: **\`sync_layout_to_url\`** via \`history.replaceState(...)\`.

---

## Unit test gate (safety check)
Before \`sync_layout_to_url\` is allowed to persist \`view=\`, a **roundtrip invariant** must hold:

- Compute an expected “pre” DSL:
  - normalize weights (e.g. S100/R100/C100)
  - apply the same \`open=\` overlay used by \`sync_layout_from_url\`
- Compare it to the “post” DSL obtained after applying the URL to the live layout and re-serializing.

If **\`test_url_roundtrip\`** throws or returns non-\`true\`, **\`sync_layout_to_url\`** exits early (no canonical \`view=\` writes). This prevents committing a drifting/incorrect \`view=\` during development and makes URL persistence self-checking.

Implemented in: **\`test_url_roundtrip\`** and enforced at the top of **\`sync_layout_to_url\`**.
`
)};
const _14te9pl = function _sync_layout_from_url(reload,resize,URLSearchParams,hash,appendScrollLog,parseGoldenDSL,gl,layout,serializeGoldenDSL,treeSyncGolden,invalidation)
{
  reload;
  resize;
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const view = params.get('view');
  const open = params.get('open');
  appendScrollLog('url:sync_from:begin', {
    hash: String(hash || ''),
    view,
    open
  });
  const diag = {
    preURL: view ?? null,
    postURL: null,
    method: null,
    status: 'skipped',
    reason: '',
    error: null,
    open: null,
    openApplied: false
  };
  let desiredRoot;
  try {
    desiredRoot = parseGoldenDSL(view);
  } catch (e) {
    diag.method = 'parse';
    diag.status = 'error';
    diag.reason = 'parseGoldenDSL failed';
    diag.error = String(e);
    appendScrollLog('url:sync_from:error', {
      where: 'parse',
      error: diag.error
    });
    return diag;
  }
  if (!view && open) {
    try {
      const resolved = gl.LayoutConfig.fromResolved(layout.toConfig());
      desiredRoot = resolved?.root ?? layout.toConfig()?.root ?? layout.toConfig()?.content?.[0];
      if (desiredRoot) {
        diag.preURL = serializeGoldenDSL(desiredRoot);
        appendScrollLog('url:sync_from:fallback_to_current_layout', {
          preURL: diag.preURL,
          open
        });
      }
    } catch (e) {
      appendScrollLog('url:sync_from:fallback_to_current_layout:error', { error: String(e) });
    }
    if (!desiredRoot) {
      // Lazily synthesize an empty stack so the open overlay below can populate it.
      desiredRoot = {
        type: 'stack',
        content: []
      };
      try {
        diag.preURL = serializeGoldenDSL(desiredRoot);
      } catch {
        diag.preURL = 'S100()';
      }
      appendScrollLog('url:sync_from:synthesize_empty_stack', {
        preURL: diag.preURL,
        open
      });
    }
  }
  if (!desiredRoot) {
    diag.method = 'parse';
    diag.status = 'error';
    diag.reason = 'parseGoldenDSL returned falsy';
    appendScrollLog('url:sync_from:error', {
      where: 'parse',
      error: diag.reason
    });
    return diag;
  }
  const findFirstStack = node => {
    if (!node)
      return null;
    if (node.type === 'stack')
      return node;
    for (const c of node.content || []) {
      const f = findFirstStack(c);
      if (f)
        return f;
    }
    return null;
  };
  const findExistingModule = (node, title) => {
    if (!node)
      return null;
    if (node.type === 'component' && (node.componentType === 'module' || node.componentName === 'module') && node.title === title) {
      return node;
    }
    for (const c of node.content || []) {
      const f = findExistingModule(c, title);
      if (f)
        return f;
    }
    return null;
  };
  if (open) {
    const [moduleTitleRaw, cellRaw] = String(open).split('#');
    const moduleTitle = (moduleTitleRaw || '').trim();
    const cell = (cellRaw || '').trim() || null;
    if (moduleTitle) {
      diag.open = {
        moduleTitle,
        cell
      };
      const existingAnywhere = findExistingModule(desiredRoot, moduleTitle);
      if (existingAnywhere) {
        existingAnywhere.componentState = existingAnywhere.componentState || {};
        if (cell)
          existingAnywhere.componentState.cell = cell;
        appendScrollLog('url:sync_from:overlay_open:update_existing', {
          moduleTitle,
          cell
        });
        diag.openApplied = true;
      } else {
        const stack = findFirstStack(desiredRoot);
        if (stack) {
          stack.content = stack.content || [];
          stack.content.push({
            type: 'component',
            title: moduleTitle,
            componentType: 'module',
            componentName: 'module',
            componentState: cell ? { cell } : {}
          });
          appendScrollLog('url:sync_from:overlay_open:add', {
            moduleTitle,
            cell
          });
          diag.openApplied = true;
        } else {
          appendScrollLog('url:sync_from:overlay_open:no_stack_found', {
            moduleTitle,
            cell
          });
        }
      }
    }
  }
  const doLoadLayout = () => {
    if (typeof layout?.loadLayout !== 'function')
      throw new Error('layout.loadLayout not available');
    appendScrollLog('layout:loadLayout:call', {
      desiredType: desiredRoot?.type ?? null,
      open: diag.open?.moduleTitle ?? null
    });
    layout.loadLayout({
      settings: {},
      content: [desiredRoot]
    });
  };
  try {
    const res = treeSyncGolden(layout, desiredRoot);
    if (res?.status === 'fallback') {
      diag.method = 'loadLayout';
      diag.status = 'fallback';
      diag.reason = res.reason || 'treeSync requested fallback';
      appendScrollLog('url:sync_from:treesync_fallback', { reason: diag.reason });
      try {
        doLoadLayout();
      } catch (e2) {
        diag.status = 'error';
        diag.reason = 'loadLayout failed after treeSync fallback';
        diag.error = String(e2);
        appendScrollLog('url:sync_from:error', {
          where: 'loadLayout_after_fallback',
          error: diag.error
        });
      }
    } else {
      diag.method = 'treeSync';
      diag.status = 'synced';
      appendScrollLog('url:sync_from:treesync_ok', {});
    }
  } catch (e) {
    diag.method = 'loadLayout';
    diag.status = 'fallback';
    diag.reason = 'exception during treeSync';
    diag.error = String(e);
    appendScrollLog('url:sync_from:treesync_exception', { error: diag.error });
    try {
      doLoadLayout();
    } catch (e2) {
      diag.status = 'error';
      diag.reason = 'loadLayout failed after treeSync exception';
      diag.error = `${ String(e) }; loadLayout: ${ String(e2) }`;
      appendScrollLog('url:sync_from:error', {
        where: 'loadLayout_after_exception',
        error: diag.error
      });
    }
  }
  try {
    const resolved = gl?.LayoutConfig?.fromResolved ? gl.LayoutConfig.fromResolved(layout.toConfig()) : null;
    const root = resolved?.root ?? layout.toConfig()?.root ?? layout.toConfig()?.content?.[0];
    diag.postURL = root ? serializeGoldenDSL(root) : null;
  } catch (e) {
    diag.postURL = null;
    if (!diag.error)
      diag.error = `serialize failed: ${ String(e) }`;
    appendScrollLog('url:sync_from:serialize_failed', { error: String(e) });
  }
  appendScrollLog('url:sync_from:end', {
    status: diag.status,
    method: diag.method,
    reason: diag.reason || null,
    preURL: diag.preURL,
    postURL: diag.postURL
  });
  invalidation.then(() => {
  });
  return diag;
};
const _1l50a0d = function _sync_layout_to_url(appendScrollLog,sync_layout_from_url,config,test_url_roundtrip,serializeGoldenDSL,location,setHashURL)
{
    appendScrollLog('url:sync_to:tick', {
        fromStatus: sync_layout_from_url?.status ?? null,
        hasRoot: !!config?.root
    });
    if (test_url_roundtrip !== true) {
        appendScrollLog('url:sync_to:blocked', { reason: 'test_url_roundtrip != true' });
        return;
    }
    if (sync_layout_from_url?.status === 'error') {
        appendScrollLog('url:sync_to:blocked', { reason: 'sync_layout_from_url status=error' });
        return;
    }
    if (!config?.root) {
        appendScrollLog('url:sync_to:blocked', { reason: 'config.root missing' });
        return;
    }
    let dsl;
    try {
        dsl = serializeGoldenDSL(config.root);
    } catch (e) {
        appendScrollLog('url:sync_to:serialize_failed', { error: String(e) });
        return;
    }
    // Parse hash manually to avoid URLSearchParams percent-encoding view= values
    // like R100(S50(@tomlarkworthy/lopepage)) → R100%28S50%28%40tomlarkworthy%2Flopepage%29%29
    const rawHash = String(location.hash || '').replace(/^#/, '');
    const knownIntents = new Set([
        'open',
        'close',
        'focus',
        'from'
    ]);
    // Split into key=value pairs, preserving original encoding
    const parts = rawHash.split('&').filter(Boolean);
    const extra = [];
    // unknown params to preserve (e.g. cc=TOKEN)
    let currentView = null;
    let hasIntent = false;
    for (const part of parts) {
        const eq = part.indexOf('=');
        const key = eq >= 0 ? part.slice(0, eq) : part;
        const val = eq >= 0 ? part.slice(eq + 1) : '';
        if (key === 'view') {
            currentView = decodeURIComponent(val);
        } else if (knownIntents.has(key)) {
            hasIntent = true;
        } else {
            extra.push(part);    // preserve verbatim
        }
    }
    if (currentView === dsl) {
        appendScrollLog('url:sync_to:no_change', { hasIntent });
        if (hasIntent) {
            // Rebuild without intents, keep view + extras
            const newHash = '#view=' + dsl + (extra.length ? '&' + extra.join('&') : '');
            const res = setHashURL(newHash);
            appendScrollLog('url:sync_to:clear_intents', { result: res });
        }
        return;
    }
    const newHash = '#view=' + dsl + (extra.length ? '&' + extra.join('&') : '');
    appendScrollLog('url:sync_to:write_view', {
        oldHash: String(location.hash || ''),
        newHash,
        dsl
    });
    if (newHash !== location.hash) {
        const res = setHashURL(newHash);
        appendScrollLog('url:sync_to:setHashURL_result', { result: res });
    }
};
const _jcy1xg = function _test_url_roundtrip(sync_layout_from_url)
{
    const d = sync_layout_from_url;
    if (!d || d.status === 'skipped')
        return true;
    if (d.status === 'error')
        throw new Error(d.error || d.reason || 'sync error');
    if (d.postURL == null)
        throw new Error(d.error || 'postURL missing');
    const normalize = dsl => {
        if (dsl == null)
            return dsl;
        let s = String(dsl);
        s = s.replace(/S\d+(?=\()/g, 'S100').replace(/R\d+(?=\()/g, 'R100').replace(/C\d+(?=\()/g, 'C100');
        s = s.replace(/S(?=\()/g, 'S100').replace(/R(?=\()/g, 'R100').replace(/C(?=\()/g, 'C100');
        return s;
    };
    const overlayOpen = (dsl, openTarget) => {
        if (!openTarget?.moduleTitle)
            return dsl;
        const title = String(openTarget.moduleTitle);
        if (dsl && dsl.includes(title))
            return dsl;
        const s = String(dsl ?? '');
        if (!/S100\(/.test(s)) {
            return `S100(${ title })`;
        }
        return s.replace(/S100\(([^)]*)\)/, (m, inner) => {
            const trimmed = String(inner || '').trim();
            const next = trimmed ? `${ trimmed },${ title }` : title;
            return `S100(${ next })`;
        });
    };
    const preRaw = d.preURL ?? 'S()';
    const preWithIntent = overlayOpen(normalize(preRaw), d.open);
    const post = normalize(d.postURL);
    if (preWithIntent !== post) {
        throw new Error(`view URL drift: preURL != postURL\n` + `preURL=${ String(preRaw) }\n` + `open=${ d.open?.moduleTitle || '' }\n` + `postURL=${ String(d.postURL) }\n` + `normalizedPreWithIntent=${ String(preWithIntent) }\n` + `normalizedPost=${ String(post) }\n` + `method=${ d.method } status=${ d.status } reason=${ d.reason || '' }`);
    }
    return true;
};
const _1yxu9kf = function _setHashURL(location,appendScrollLog,history){return(
function setHashURL(newHash) {
    const h = String(newHash ?? '');
    const hash = h.startsWith('#') ? h : `#${ h }`;
    const url = new URL(location.href);
    url.hash = hash;
    const href = url.toString();
    appendScrollLog('url:setHashURL:attempt', {
        hash,
        href
    });
    try {
        history.replaceState(null, '', href);
        const res = {
            ok: true,
            method: 'replaceState',
            href,
            hash
        };
        appendScrollLog('url:setHashURL:success', res);
        return res;
    } catch (e) {
        const a = document.createElement('a');
        a.href = href;
        a.rel = 'noreferrer';
        a.style.display = 'none';
        (document.body || document.documentElement).appendChild(a);
        a.click();
        a.remove();
        const res = {
            ok: false,
            method: 'synthetic-click',
            href,
            hash,
            error: String(e)
        };
        appendScrollLog('url:setHashURL:fallback', res);
        return res;
    }
}
)};
const _1zkl8r = function _treeSyncGolden(appendScrollLog,gl){return(
function treeSyncGoldenFactory(gl) {
    const isCompCfg = n => n && n.type === 'component';
    const isContCfg = n => n && (n.type === 'row' || n.type === 'column' || n.type === 'stack');
    const desiredModuleKey = cfg => isCompCfg(cfg) && (cfg.componentType === 'module' || cfg.componentName === 'module') && cfg.title ? `module:${ cfg.title }` : null;
    const liveModuleKey = item => {
        if (!item)
            return null;
        if (!(item.isComponent || item.type === 'component'))
            return null;
        const t = item.componentType || item.componentName;
        return t === 'module' && item.title ? `module:${ item.title }` : null;
    };
    const cloneCfg = cfg => {
        const c = JSON.parse(JSON.stringify(cfg));
        if (c.type === 'component' && (c.componentType === 'module' || c.componentName === 'module')) {
            c.componentType = 'module';
            c.componentName = 'module';
            c.componentState = c.componentState || {};
        }
        return c;
    };
    function indexLiveModules(stackLive) {
        const map = new Map();
        for (const child of stackLive?.contentItems || []) {
            const k = liveModuleKey(child);
            if (k)
                map.set(k, child);
        }
        return map;
    }
    function setLiveComponentStateCell(liveItem, cell) {
        if (!liveItem || !cell)
            return false;
        let changed = false;
        liveItem.componentState = liveItem.componentState || {};
        if (liveItem.componentState.cell !== cell) {
            liveItem.componentState.cell = cell;
            changed = true;
        }
        const configs = [
            liveItem.config,
            liveItem._config,
            liveItem._state
        ].filter(Boolean);
        for (const cfg of configs) {
            cfg.componentState = cfg.componentState || {};
            if (cfg.componentState.cell !== cell) {
                cfg.componentState.cell = cell;
                changed = true;
            }
        }
        return changed;
    }
    function syncStack(stackLive, desiredStackCfg) {
        appendScrollLog('treeSync:syncStack:enter', {
            title: stackLive?.parent?.title ?? stackLive?.title ?? null,
            desiredCount: (desiredStackCfg?.content || []).length,
            liveCount: (stackLive?.contentItems || []).length
        });
        const desiredComps = (desiredStackCfg.content || []).filter(isCompCfg);
        let liveByKey = indexLiveModules(stackLive);
        for (let i = 0; i < desiredComps.length; i++) {
            const d = desiredComps[i];
            const k = desiredModuleKey(d);
            if (!k)
                continue;
            if (!liveByKey.has(k)) {
                let before = null;
                for (let j = i + 1; j < desiredComps.length; j++) {
                    const k2 = desiredModuleKey(desiredComps[j]);
                    if (k2 && liveByKey.has(k2)) {
                        before = liveByKey.get(k2);
                        break;
                    }
                }
                const idx = before ? (stackLive.contentItems || []).indexOf(before) : (stackLive.contentItems || []).length;
                appendScrollLog('treeSync:stack:addItem', {
                    key: k,
                    title: d?.title ?? null,
                    idx,
                    beforeKey: before ? liveModuleKey(before) : null
                });
                if (typeof stackLive.addItem !== 'function')
                    return {
                        status: 'fallback',
                        reason: 'stack missing addItem'
                    };
                stackLive.addItem(cloneCfg(d), idx);
                liveByKey = indexLiveModules(stackLive);
            }
        }
        const desiredKeys = new Set(desiredComps.map(desiredModuleKey).filter(Boolean));
        for (const child of Array.from(stackLive?.contentItems || [])) {
            const k = liveModuleKey(child);
            if (k && !desiredKeys.has(k) && typeof child.remove === 'function') {
                appendScrollLog('treeSync:stack:remove', {
                    key: k,
                    title: child?.title ?? null
                });
                child.remove();
            }
        }
        const order = desiredComps.map(desiredModuleKey).filter(Boolean);
        const byKey = indexLiveModules(stackLive);
        for (let i = 0; i < order.length; i++) {
            const item = byKey.get(order[i]);
            if (!item)
                continue;
            const curIdx = (stackLive.contentItems || []).indexOf(item);
            if (curIdx !== i && typeof stackLive.removeChild === 'function' && typeof stackLive.addChild === 'function') {
                appendScrollLog('treeSync:stack:reorder', {
                    key: order[i],
                    from: curIdx,
                    to: i
                });
                stackLive.removeChild(item, true);
                stackLive.addChild(item, i, false);
            }
        }
        {
            const byKey2 = indexLiveModules(stackLive);
            for (const d of desiredComps) {
                const k = desiredModuleKey(d);
                const desiredCell = d?.componentState?.cell ?? null;
                if (!k || !desiredCell)
                    continue;
                const liveItem = byKey2.get(k);
                if (!liveItem)
                    continue;
                const changed = setLiveComponentStateCell(liveItem, desiredCell);
                if (changed) {
                    appendScrollLog('treeSync:stack:sync_componentState_cell', {
                        key: k,
                        title: liveItem?.title ?? null,
                        cell: desiredCell
                    });
                }
            }
        }
        appendScrollLog('treeSync:syncStack:exit', { liveCount: (stackLive?.contentItems || []).length });
        return { status: 'synced' };
    }
    function ensureContainerChild(parentLive, idx, desiredChildCfg) {
        const liveChild = parentLive?.contentItems?.[idx];
        if (liveChild && liveChild.type === desiredChildCfg.type)
            return liveChild;
        if (liveChild && typeof liveChild.remove === 'function') {
            appendScrollLog('treeSync:container:remove_child_for_type_mismatch', {
                idx,
                liveType: liveChild?.type ?? null,
                desiredType: desiredChildCfg?.type ?? null
            });
            liveChild.remove();
        }
        if (typeof parentLive?.addItem !== 'function')
            return null;
        appendScrollLog('treeSync:container:addItem', {
            idx,
            type: desiredChildCfg?.type ?? null
        });
        parentLive.addItem({
            type: desiredChildCfg.type,
            content: []
        }, idx);
        return parentLive?.contentItems?.[idx] || null;
    }
    function isContainerItem(item) {
        if (!item)
            return false;
        if (item.isComponent)
            return false;
        return item.type === 'row' || item.type === 'column' || item.type === 'stack';
    }
    function syncContainer(containerLive, desiredCfg) {
        if (!containerLive || !desiredCfg || !Array.isArray(desiredCfg.content))
            return { status: 'synced' };
        const desiredChildren = desiredCfg.content.filter(isContCfg);
        for (let i = 0; i < desiredChildren.length; i++)
            ensureContainerChild(containerLive, i, desiredChildren[i]);
        const liveContainers = (containerLive.contentItems || []).filter(isContainerItem);
        while (liveContainers.length > desiredChildren.length) {
            const last = (containerLive.contentItems || []).slice().reverse().find(isContainerItem);
            if (!last)
                break;
            appendScrollLog('treeSync:container:remove_extra_container', { type: last?.type ?? null });
            if (typeof last.remove === 'function')
                last.remove();
            liveContainers.pop();
        }
        for (let i = 0; i < desiredChildren.length; i++) {
            const d = desiredChildren[i];
            const l = containerLive.contentItems?.[i];
            if (!l)
                continue;
            if (l.type !== d.type)
                return {
                    status: 'fallback',
                    reason: `child type mismatch @${ i } live=${ l.type } desired=${ d.type }`
                };
            if (d.type === 'stack') {
                const r = syncStack(l, d);
                if (r?.status === 'fallback')
                    return r;
            } else {
                const r = syncContainer(l, d);
                if (r?.status === 'fallback')
                    return r;
            }
        }
        return { status: 'synced' };
    }
    return function treeSync(layout, desiredRootCfg) {
        appendScrollLog('treeSync:enter', {
            desiredType: desiredRootCfg?.type ?? null,
            hasRoot: !!layout?.root
        });
        if (!layout?.root || !desiredRootCfg)
            return { status: 'noop' };
        const liveTop = layout.root.contentItems?.[0];
        if (!liveTop)
            return {
                status: 'fallback',
                reason: 'no live top'
            };
        if (liveTop.type !== desiredRootCfg.type) {
            const out = {
                status: 'fallback',
                reason: `top type mismatch live=${ liveTop.type } desired=${ desiredRootCfg.type }`
            };
            appendScrollLog('treeSync:fallback', out);
            return out;
        }
        const out = desiredRootCfg.type === 'stack' ? syncStack(liveTop, desiredRootCfg) : syncContainer(liveTop, desiredRootCfg);
        if (out?.status === 'fallback')
            appendScrollLog('treeSync:fallback', out);
        else
            appendScrollLog('treeSync:synced', { status: out?.status ?? 'synced' });
        return out;
    };
}(gl)
)};
const _133ahw5 = function _background_jobs(onLoadConfig,layout_state,sync_layout_from_url,test_url_roundtrip,sync_layout_to_url,runtime,navigator_jobs,commandPaletteKeybinding,auto_attach,scroll_fix_sync_layout,commit_history,replay_git,change_listener,cc_chat)
{
  onLoadConfig;
  layout_state;
  sync_layout_from_url;
  test_url_roundtrip;
  sync_layout_to_url;
  runtime;
  navigator_jobs;
  commandPaletteKeybinding;
  auto_attach;
  scroll_fix_sync_layout;
  // history
  commit_history;
  replay_git;
  change_listener;
  cc_chat;
};
const _1n78po6 = function _imports(md){return(
md`## Imports`
)};
const _b2c0kp = function _32(exporter){return(
exporter()
)};
const _1ey5aow = function _dragOutGrips(layout,invalidation)
{
    function readModuleSource(name) {
        const r = window.lopecode?.contentSync?.(name);
        if (!r || r.status !== 200 || !r.bytes)
            return null;
        return new TextDecoder().decode(r.bytes);
    }
    function filenameFor(name) {
        let m = name.match(/^@([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)$/);
        if (m)
            return `at_${ m[1] }_${ m[2] }.js`;
        m = name.match(/^d\/([A-Za-z0-9]+)(@\d+)?$/);
        if (m)
            return `d_${ m[1] }${ m[2] ?? '' }.js`;
        return name.replace(/[/]/g, '_') + '.js';
    }
    function flashGrip(grip) {
        const prev = grip.style.opacity;
        grip.style.opacity = '1';
        setTimeout(() => {
            grip.style.opacity = prev;
        }, 350);
    }
    function hookTab(tabEl) {
        if (tabEl.__lopepageGripHooked)
            return;
        tabEl.__lopepageGripHooked = true;
        const grip = document.createElement('span');
        grip.className = 'lm_drag_out_grip';
        grip.title = 'Click to copy source \xB7 Drag out as .js';
        grip.setAttribute('draggable', 'true');
        grip.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="display:block"><rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/><path d="M2.5 10.5V3a.5.5 0 01.5-.5h7.5"/></svg>`;
        Object.assign(grip.style, {
            display: 'inline-block',
            width: '12px',
            height: '12px',
            verticalAlign: '3.5px',
            marginLeft: '-7px',
            marginRight: '2px',
            cursor: 'pointer',
            opacity: '0.55',
            userSelect: 'none',
            lineHeight: '0',
            color: 'currentColor'
        });
        [
            'pointerdown',
            'mousedown',
            'touchstart'
        ].forEach(ev => {
            grip.addEventListener(ev, e => e.stopPropagation(), { capture: true });
        });
        grip.addEventListener('click', e => {
            e.stopPropagation();
            const t = tabEl.querySelector('.lm_title')?.textContent || '';
            if (!t)
                return;
            const source = readModuleSource(t);
            if (!source) {
                console.warn('[grip click] no source for:', t);
                return;
            }
            navigator.clipboard?.writeText?.(source).then(() => {
                console.log('[grip click] copied source for:', t, `(${ source.length } chars)`);
                flashGrip(grip);
            }).catch(err => console.warn('[grip click] clipboard failed:', err));
        });
        grip.addEventListener('dragstart', e => {
            e.stopPropagation();
            const title = tabEl.querySelector('.lm_title')?.textContent || '';
            const source = readModuleSource(title);
            if (!source) {
                e.dataTransfer.setData('text/plain', `// no source for ${ title }`);
                return;
            }
            const filename = filenameFor(title);
            const dataUrl = 'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(source)));
            e.dataTransfer.setData('DownloadURL', `text/javascript:${ filename }:${ dataUrl }`);
            e.dataTransfer.setData('text/plain', source);
            e.dataTransfer.effectAllowed = 'copyMove';
        });
        const titleEl = tabEl.querySelector('.lm_title');
        if (titleEl?.parentNode === tabEl)
            tabEl.insertBefore(grip, titleEl);
        else
            tabEl.prepend(grip);
    }
    document.querySelectorAll('.lm_drag_out_grip').forEach(g => g.remove());
    document.querySelectorAll('.lm_tab').forEach(t => {
        t.__lopepageGripHooked = false;
    });
    document.querySelectorAll('.lm_tab').forEach(hookTab);
    const handler = tab => hookTab(tab.element);
    layout.on('tabCreated', handler);
    invalidation.then(() => {
        try {
            layout.off?.('tabCreated', handler);
        } catch (e) {
        }
    });
    return 'drag-out grips installed';
};
const _1gkn0mq = function _dropInHandler(location, setHashURL, runtime, page, invalidation) {
    const STYLE_ID = 'lopepage-dropzone-style';
    const oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle)
        oldStyle.remove();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `.lm_header.lopepage-drop-target { outline: 2px dashed currentColor; outline-offset: -2px; background: color-mix(in srgb, currentColor 14%, transparent); }`;
    document.head.appendChild(s);
    function parseModuleName(filename) {
        let m = filename.match(/^at_([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)_([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.js$/);
        if (m)
            return `@${ m[1] }/${ m[2] }`;
        m = filename.match(/^d_([A-Za-z0-9]+)(@\d+)?\.js$/);
        if (m)
            return `d/${ m[1] }${ m[2] ?? '' }`;
        return null;
    }
    function ensureDomScriptTag(name, source) {
        let el = document.getElementById(name);
        if (el?.tagName === 'SCRIPT' && el.getAttribute('type') === 'text/plain') {
            el.textContent = source;
            return el;
        }
        el = document.createElement('script');
        el.type = 'text/plain';
        el.id = name;
        el.setAttribute('data-mime', 'application/javascript');
        el.textContent = source;
        document.body.appendChild(el);
        return el;
    }
    function openModuleInHash(name) {
        let h = location.hash.replace(/^#/, '');
        if (/(^|&)open=[^&]*/.test(h)) {
            h = h.replace(/(^|&)open=[^&]*/, `$1open=${ name }`);
        } else {
            h = h + (h ? '&' : '') + `open=${ name }`;
        }
        setHashURL(h);
    }
    function tearDownExistingModule(name) {
        const existing = runtime.mains.get(name);
        if (!existing)
            return false;
        try {
            for (const v of Array.from(existing._scope.values())) {
                try {
                    v.delete();
                } catch (e) {
                }
            }
        } catch (e) {
            console.warn('[lopepage drop-in] teardown scope:', e);
        }
        runtime.mains.delete(name);
        return true;
    }
    async function installFromFile(file) {
        const name = parseModuleName(file.name);
        if (!name) {
            console.warn('[lopepage drop-in] bad filename:', file.name);
            return;
        }
        const src = await file.text();
        const blob = new Blob([src], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        let imported;
        try {
            imported = await window.importShim(url, `file://${ name }`);
        } catch (e) {
            console.error('[lopepage drop-in] import failed:', e);
            return;
        }
        if (typeof imported.default !== 'function') {
            console.warn('[lopepage drop-in] default export not a function');
            return;
        }
        const replaced = tearDownExistingModule(name);
        const mod = runtime.module(imported.default);
        runtime.mains.set(name, mod);
        ensureDomScriptTag(name, src);
        openModuleInHash(name);
        console.log(`[lopepage drop-in] ${ replaced ? 'replaced' : 'installed' } + opened:`, name);
    }
    let activeHeader = null;
    const clearHighlight = () => {
        if (activeHeader) {
            activeHeader.classList.remove('lopepage-drop-target');
            activeHeader = null;
        }
    };
    const isFilesDrag = e => [...e.dataTransfer?.types || []].includes('Files');
    const onDragOver = e => {
        if (!isFilesDrag(e))
            return;
        const header = e.target?.closest?.('.lm_header');
        if (!header) {
            clearHighlight();
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (activeHeader !== header) {
            activeHeader?.classList.remove('lopepage-drop-target');
            header.classList.add('lopepage-drop-target');
            activeHeader = header;
        }
    };
    const onDragLeave = e => {
        if (!page.contains(e.relatedTarget))
            clearHighlight();
    };
    const onDrop = e => {
        if (!isFilesDrag(e))
            return;
        const header = e.target?.closest?.('.lm_header');
        if (!header)
            return;
        e.preventDefault();
        clearHighlight();
        const f = e.dataTransfer.files[0];
        if (f)
            installFromFile(f).catch(err => console.error('[lopepage drop-in] failed:', err));
    };
    page.addEventListener('dragover', onDragOver);
    page.addEventListener('dragleave', onDragLeave);
    page.addEventListener('drop', onDrop);
    invalidation.then(() => {
        page.removeEventListener('dragover', onDragOver);
        page.removeEventListener('dragleave', onDragLeave);
        page.removeEventListener('drop', onDrop);
        clearHighlight();
        document.getElementById(STYLE_ID)?.remove();
    });
    return 'drop-in handler installed';
};
const _1v605qi = function _file_attachment_cache(reload)
{
    reload;
    return new Map();
};
const _1fgpmzl = function _renderFileAttachment()
{
    return function renderFileAttachment(mime, bytes) {
        const m = String(mime || '').toLowerCase();
        // HTML: srcdoc keeps the runtime same-origin-ish (opaque) but renders rich content
        if (m === 'text/html' || m === 'application/xhtml+xml') {
            const iframe = document.createElement('iframe');
            iframe.setAttribute('srcdoc', new TextDecoder().decode(bytes));
            Object.assign(iframe.style, {
                width: '100%',
                height: '100%',
                border: '0',
                display: 'block'
            });
            return iframe;
        }
        if (m.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(new Blob([bytes], { type: mime }));
            Object.assign(img.style, {
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                margin: 'auto'
            });
            return img;
        }
        if (m.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = URL.createObjectURL(new Blob([bytes], { type: mime }));
            Object.assign(audio.style, { width: '100%' });
            return audio;
        }
        if (m.startsWith('video/')) {
            const video = document.createElement('video');
            video.controls = true;
            video.src = URL.createObjectURL(new Blob([bytes], { type: mime }));
            Object.assign(video.style, {
                width: '100%',
                height: '100%'
            });
            return video;
        }
        if (m === 'text/plain' || m === 'text/markdown' || m === 'application/json' || m.startsWith('text/')) {
            const pre = document.createElement('pre');
            pre.textContent = new TextDecoder().decode(bytes);
            Object.assign(pre.style, {
                margin: '0',
                padding: '8px',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box'
            });
            return pre;
        }
        // application/pdf and unknown: blob: iframe — browser picks the viewer
        const iframe = document.createElement('iframe');
        iframe.src = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' }));
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: '0',
            display: 'block'
        });
        return iframe;
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/golden-layout-2-6-0", async () => runtime.module((await import("/@tomlarkworthy/golden-layout-2-6-0.js?v=4")).default));  
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-selection", async () => runtime.module((await import("/@tomlarkworthy/module-selection.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));  
  main.define("module @tomlarkworthy/claude-code-pairing", async () => runtime.module((await import("/@tomlarkworthy/claude-code-pairing.js?v=4")).default));  
  main.define("module @tomlarkworthy/command-palette", async () => runtime.module((await import("/@tomlarkworthy/command-palette.js?v=4")).default));  
  $def("_1xyxga0", "page", ["htl","isOnObservableCom","lopeviz_handle_css","base_css","light_theme_css","commandPaletteStyles","commandPaletteOverlay","linkTo"], _1xyxga0);  
  $def("_1ujnhdh", "append_to_body", ["page"], _1ujnhdh);  
  $def("_1nv51s8", "testNavigation", ["htl","linkTo"], _1nv51s8);  
  $def("_ydvyos", "viewof reload", ["Inputs"], _ydvyos);  
  $def("_1we0ggl", "reload", ["Generators","viewof reload"], _1we0ggl);  
  $def("_plefwg", "onLoadConfig", ["parseGoldenDSL","URLSearchParams","location"], _plefwg);  
  $def("_1nzpnqy", "visualizer_cache", ["reload"], _1nzpnqy);  
  $def("_1ojown8", "modulePanel", ["appendScrollLog","currentModules","file_attachment_cache","renderFileAttachment","visualizer_cache","visualizer","runtime","isOnObservableCom","scrollKeyFor","fix_scroll","scroll_cache"], _1ojown8);  
  $def("_1gm4gbf", "blobPanel", [], _1gm4gbf);  
  $def("_lxv2e2", "settings", [], _lxv2e2);  
  $def("_lp1ggk", "is_mobile", ["width"], _lp1ggk);  
  $def("_qbghwu", "initial config", ["onLoadConfig","settings"], _qbghwu);  
  $def("_15lk82w", "mutable config", ["Mutable","initial config"], _15lk82w);  
  $def("_1bki6eh", "config", ["mutable config"], _1bki6eh);  
  $def("_14z0bay", "resize", ["Generators","addEventListener","invalidation","removeEventListener"], _14z0bay);  
  $def("_18jv72h", "layout", ["resize","gl","mutable config","page","modulePanel","blobPanel"], _18jv72h);
  $def("_tsjb2x", "layout_state", ["appendScrollLog","layout","gl","mutable config"], _tsjb2x);  
  $def("_11nrwvj", "viewof lopepageModule", ["thisModule"], _11nrwvj);  
  $def("_r97569", "lopepageModule", ["Generators","viewof lopepageModule"], _r97569);  
  $def("_1sp5wo4", null, ["md"], _1sp5wo4);  
  $def("_1ts23ma", "viewof scrollDebug", ["Inputs"], _1ts23ma);  
  $def("_7jxivy", "scrollDebug", ["Generators","viewof scrollDebug"], _7jxivy);  
  $def("_1f2wuqm", "appendScrollLog", ["viewof scrollDebug","mutable scrollLog"], _1f2wuqm);  
  $def("_1nbnzwx", "initial scrollLog", ["scrollDebug"], _1nbnzwx);  
  $def("_1f7xtz1", "mutable scrollLog", ["Mutable","initial scrollLog"], _1f7xtz1);  
  $def("_1dyz4o0", "scrollLog", ["mutable scrollLog"], _1dyz4o0);  
  $def("_1d1nkw9", "scrollKeyFor", ["appendScrollLog"], _1d1nkw9);  
  $def("_tb217h", "scroll_cache", [], _tb217h);  
  $def("_12p8mg7", "fix_scroll", ["scroll_cache","scrollKeyFor","appendScrollLog"], _12p8mg7);  
  $def("_arfw00", "scroll_fix_sync_layout", ["sync_layout_to_url","layout","appendScrollLog","modulePanel"], _arfw00);  
  $def("_3nwpp4", "URLrouting", ["md"], _3nwpp4);  
  $def("_14te9pl", "sync_layout_from_url", ["reload","resize","URLSearchParams","hash","appendScrollLog","parseGoldenDSL","gl","layout","serializeGoldenDSL","treeSyncGolden","invalidation"], _14te9pl);  
  $def("_1l50a0d", "sync_layout_to_url", ["appendScrollLog","sync_layout_from_url","config","test_url_roundtrip","serializeGoldenDSL","location","setHashURL"], _1l50a0d);  
  $def("_jcy1xg", "test_url_roundtrip", ["sync_layout_from_url"], _jcy1xg);  
  $def("_1yxu9kf", "setHashURL", ["location","appendScrollLog","history"], _1yxu9kf);  
  $def("_1zkl8r", "treeSyncGolden", ["appendScrollLog","gl"], _1zkl8r);  
  $def("_133ahw5", "background_jobs", ["onLoadConfig","layout_state","sync_layout_from_url","test_url_roundtrip","sync_layout_to_url","runtime","navigator_jobs","commandPaletteKeybinding","auto_attach","scroll_fix_sync_layout","commit_history","replay_git","change_listener","cc_chat"], _133ahw5);  
  $def("_1n78po6", "imports", ["md"], _1n78po6);  
  $def("_b2c0kp", null, ["exporter"], _b2c0kp);  
  $def("_1ey5aow", "dragOutGrips", ["layout","invalidation"], _1ey5aow);  
  $def("_1gkn0mq", "dropInHandler", ["location","setHashURL","runtime","page","invalidation"], _1gkn0mq);  
  main.define("gl", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("gl", _));  
  main.define("base_css", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("base_css", _));  
  main.define("light_theme_css", ["module @tomlarkworthy/golden-layout-2-6-0", "@variable"], (_, v) => v.import("light_theme_css", _));  
  main.define("unorderedSync", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("unorderedSync", _));  
  main.define("runtime", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));  
  main.define("Inspector", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("lopeviz_handle_css", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("lopeviz_handle_css", _));  
  main.define("viewof notebookModule", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("viewof notebookModule", _));  
  main.define("notebookModule", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("notebookModule", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("viewof selected_modules", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("viewof selected_modules", _));  
  main.define("selected_modules", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("selected_modules", _));  
  main.define("navigator_jobs", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("navigator_jobs", _));  
  main.define("serializeGoldenDSL", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("serializeGoldenDSL", _));  
  main.define("parseGoldenDSL", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("parseGoldenDSL", _));  
  main.define("linkTo", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("persistedAttachments", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("persistedAttachments", _));  
  main.define("getHashModules", ["module @tomlarkworthy/module-selection", "@variable"], (_, v) => v.import("getHashModules", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("ascendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("ascendants", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("auto_attach", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("auto_attach", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  main.define("commit_history", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("commit_history", _));  
  main.define("change_listener", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("change_listener", _));  
  main.define("replay_git", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("replay_git", _));  
  main.define("cc_chat", ["module @tomlarkworthy/claude-code-pairing", "@variable"], (_, v) => v.import("cc_chat", _));  
  main.define("commandPaletteStyles", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteStyles", _));  
  main.define("commandPaletteKeybinding", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteKeybinding", _));  
  main.define("commandPaletteOverlay", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteOverlay", _));  
  $def("_1v605qi", "file_attachment_cache", ["reload"], _1v605qi);  
  $def("_1fgpmzl", "renderFileAttachment", [], _1fgpmzl);
  return main;
}