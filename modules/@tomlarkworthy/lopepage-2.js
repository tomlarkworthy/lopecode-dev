const _1pg70e1 = function _lp2_doc_overview(md){return(
md`# Lopepage-2: Multi-notebook layout

A layout engine for lopecode notebooks. It tiles modules into resizable splits and tabbed stacks, serialises the layout to the URL hash, and preserves scroll position across layout changes. It owns its DOM directly.

It rests on three mechanisms, each described in its own section:

1. **Immortal panes** — one scroll container per module, created once and reparented on layout change, so \`scrollTop\` is retained.
2. **Persistent-id scroll anchoring** — when a pane's content resizes after load, the cell at the viewport top is held in place by its \`pid\`.
3. **A layout tree** reconciled to DOM and round-tripped through the \`#view=\` DSL under loop-protected hash ownership.

Dependencies: [\`runtime-sdk\`](https://observablehq.com/@tomlarkworthy/runtime-sdk) (\`persistentId\`, \`runtime\`), [\`visualizer\`](https://observablehq.com/@tomlarkworthy/visualizer) (cell rendering), [\`modules\`](https://observablehq.com/@tomlarkworthy/modules) (\`currentModules\` — incremental module discovery), [\`themes\`](https://observablehq.com/@tomlarkworthy/themes) (\`apply_theme\`). Four orthogonal feature modules are composed by import and kept reachable from \`lp2_background_jobs\`: [\`command-palette\`](https://observablehq.com/@tomlarkworthy/command-palette) (⌘K), [\`claude-code-pairing\`](https://observablehq.com/@tomlarkworthy/claude-code-pairing) (\`cc_chat\`), [\`local-change-history\`](https://observablehq.com/@tomlarkworthy/local-change-history) (edit recording/replay), and [\`editor-5\`](https://observablehq.com/@tomlarkworthy/editor-5) (\`auto_attach\` — inline cell editing).`
)};
const _1ov8ye5 = function _lp2_doc_model(md){return(
md`### Layout model and DSL

The layout is a single tree. \`viewof lp2Model\` holds it as reactive state. A node is one of:

- \`{t:'row'|'col', sizes:[..%], children:[node]}\` — a split; \`sizes\` are percentages summing to 100, one per child.
- \`{t:'stack', active:int, tabs:[{module}]}\` — a tabbed pane; \`active\` indexes \`tabs\`.

There is always exactly one root node. \`lp2_parseDSL\` and \`lp2_serializeDSL\` convert the tree to and from the \`#view=\` \`R\`/\`C\`/\`S\` weighted DSL, the same grammar the rest of lopecode uses, so a layout is fully described by its URL.`
)};
const _1rihrff = function _lp2Model(Inputs){return(
Inputs.input({
  t: 'row',
  sizes: [
    50,
    50
  ],
  children: [
    {
      t: 'stack',
      active: 0,
      tabs: [{ module: '@tomlarkworthy/runtime-sdk' }]
    },
    {
      t: 'stack',
      active: 0,
      tabs: [{ module: '@tomlarkworthy/visualizer' }]
    }
  ]
})
)};
const _1ow4sob = (G, _) => G.input(_);
const _l8xp7u = function _lp2_parseDSL(){return(
input => {
  if (!input)
    return null;
  input = String(input);
  if (input.startsWith('#'))
    input = input.slice(1);
  const mView = input.match(/(?:^|&)view=([^&]*)/);
  if (mView)
    input = mView[1];
  let i = 0;
  const num = () => {
    const s = i;
    while (i < input.length && input[i] >= '0' && input[i] <= '9')
      i++;
    return s < i ? parseInt(input.slice(s, i), 10) : null;
  };
  const moduleName = () => {
    const s = i;
    while (i < input.length && !',)#'.includes(input[i]))
      i++;
    return input.slice(s, i);
  };
  const parseLeaf = () => {
    const weight = num();
    const module = moduleName();
    let cell;
    if (input[i] === '#') {
      i++;
      const s = i;
      while (i < input.length && !',)'.includes(input[i]))
        i++;
      cell = input.slice(s, i);
    }
    return {
      node: {
        module,
        ...cell ? { cell } : {}
      },
      weight
    };
  };
  const parseItem = () => {
    const c = input[i];
    return c === 'R' || c === 'C' || c === 'S' ? parseGroup() : parseLeaf();
  };
  const parseList = isStack => {
    const items = [];
    while (i < input.length && input[i] !== ')') {
      items.push(isStack ? parseLeaf() : parseItem());
      if (input[i] === ',')
        i++;
    }
    return items;
  };
  const parseGroup = () => {
    const type = input[i++];
    const weight = num();
    let items = [];
    if (input[i] === '(') {
      i++;
      items = parseList(type === 'S');
      if (input[i] === ')')
        i++;
    }
    if (type === 'S')
      return {
        node: {
          t: 'stack',
          active: 0,
          tabs: items.map(it => it.node)
        },
        weight
      };
    const children = items.map(it => it.node);
    const sizes = items.map(it => it.weight != null ? it.weight : Math.round(100 / items.length));
    return {
      node: {
        t: type === 'R' ? 'row' : 'col',
        children,
        sizes
      },
      weight
    };
  };
  const r = parseItem();
  return r ? r.node : null;
}
)};
const _15gufbj = function _lp2_serializeDSL(){return(
root => {
  const s = (node, weight) => {
    const w = weight != null ? weight : 100;
    if (!node)
      return '';
    if (node.t === 'stack') {
      const tabs = (node.tabs || []).map(l => l.module + (l.cell ? '#' + l.cell : '')).join(',');
      return `S${ w }(${ tabs })`;
    }
    if (node.t === 'row' || node.t === 'col') {
      const n = node.children || [];
      const kids = n.map((c, idx) => s(c, node.sizes && node.sizes[idx] != null ? node.sizes[idx] : Math.round(100 / n.length))).join(',');
      return `${ node.t === 'row' ? 'R' : 'C' }${ w }(${ kids })`;
    }
    return (node.module || '') + (node.cell ? '#' + node.cell : '');
  };
  return s(root, 100);
}
)};
const _14hgn59 = function _lp2_doc_panes(md){return(
md`### Immortal panes

\`lp2_paneRegistry\` is a \`Map\` from module name to a single scroll \`<div>\` that hosts that module's [\`visualizer\`](https://observablehq.com/@tomlarkworthy/visualizer) render. \`lp2_getPane\` builds the pane on first request and returns the cached element thereafter. \`lp2_moduleByName\` resolves a module name to its runtime module via \`currentModules\` from [\`modules\`](https://observablehq.com/@tomlarkworthy/modules), an async generator that yields a cumulative module map as modules resolve.

Invariants:

- One pane element per module name, for the lifetime of the page.
- A layout change reparents the cached element; it is never recreated, so its rendered content and DOM state are preserved.
- A layout-only change does not alter a pane's content height, so capturing \`scrollTop\` before the reparent and restoring it after is exact.`
)};
const _r14r4j = function _lp2_moduleByName(lp2_watchedModules){return(
name => lp2_watchedModules && lp2_watchedModules.get ? lp2_watchedModules.get(name) : undefined
)};
const _j3eb9x = function _lp2_paneRegistry(){return(
new Map()
)};
const _z08s5w = function _lp2_getPane(lp2_scrollToCell,lp2_paneRegistry,lp2_moduleByName,visualizer,runtime,lp2_installAnchor)
{
  return (moduleName, deepLinkCell) => {
    const applyDeepLink = entry => {
      if (deepLinkCell && !entry.transient && entry.deepLink !== deepLinkCell) {
        entry.deepLink = deepLinkCell;
        lp2_scrollToCell(entry, deepLinkCell);
      }
      return entry;
    };
    let entry = lp2_paneRegistry.get(moduleName);
    if (entry)
      return applyDeepLink(entry);
    const el = document.createElement('div');
    el.className = 'lp2-pane';
    el.dataset.module = moduleName;
    Object.assign(el.style, {
      overflow: 'auto',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflowAnchor: 'auto'
    });
    const mod = lp2_moduleByName(moduleName);
    if (!mod) {
      // Module not in the (incrementally-populated) map yet. Return a transient placeholder
      // WITHOUT caching, so a later render retries once the module resolves. Caching here would
      // freeze the pane on "not found" forever (panes are immortal).
      el.textContent = 'loading ' + moduleName + '\u2026';
      el.style.cssText += ';display:flex;align-items:center;justify-content:center;color:var(--theme-foreground-faint);font:12px var(--monospace,monospace)';
      return {
        el,
        viz: null,
        moduleName,
        anchor: null,
        transient: true
      };
    }
    const viz = visualizer(runtime, {
      invalidation: new Promise(() => {
      }),
      module: mod,
      filter: (cell_name, variables) => {
        if (variables?.[0]?._type !== 1)
          return false;
        if (typeof cell_name === 'string' && cell_name.startsWith('dynamic '))
          return false;
        return true;
      }
    });
    el.appendChild(viz);
    entry = {
      el,
      viz,
      moduleName,
      anchor: null
    };
    lp2_paneRegistry.set(moduleName, entry);
    lp2_installAnchor(entry);
    return applyDeepLink(entry);
  };
};
const _88b5go = function _lp2_doc_scroll(md){return(
md`### Scroll anchoring

When a pane's content changes height after mount (async cells, images), the anchor keeps the viewport stable. \`lp2_anchor\` records the cell at the viewport top as \`{pid, offset}\`, where \`pid\` is \`persistentId(node.variable)\` from [\`runtime-sdk\`](https://observablehq.com/@tomlarkworthy/runtime-sdk). Every visualizer cell node carries a \`.variable\` backref, so the pid is read without modifying the visualizer.

\`lp2_installAnchor\` attaches a \`ResizeObserver\` to the pane content and re-applies the anchor (\`scrollTop = node.offsetTop + offset\`) on each callback. The observer fires after layout and before paint, so the correction lands in the same frame. A programmatic \`scrollTop\` write disables the browser's native \`overflow-anchor\`, so the anchor is maintained in JS.`
)};
const _78h40x = function _lp2_anchor(persistentId)
{
  const cellNodes = paneEl => [...paneEl.querySelectorAll('.observablehq[cell]')];
  const pidOf = node => {
    try {
      return node.variable ? persistentId(node.variable) : null;
    } catch (e) {
      return null;
    }
  };
  const capture = paneEl => {
    const top = paneEl.scrollTop;
    if (top <= 0)
      return null;
    for (const node of cellNodes(paneEl)) {
      const nTop = node.offsetTop, nBot = nTop + node.offsetHeight;
      if (nBot > top + 1) {
        const pid = pidOf(node);
        if (pid)
          return {
            pid,
            offset: top - nTop
          };
      }
    }
    return null;
  };
  const restore = (paneEl, anchor) => {
    if (!anchor || !anchor.pid)
      return false;
    const node = cellNodes(paneEl).find(n => pidOf(n) === anchor.pid);
    if (!node)
      return false;
    paneEl.scrollTop = node.offsetTop + anchor.offset;
    return true;
  };
  return {
    cellNodes,
    pidOf,
    capture,
    restore
  };
};
const _d4xe91 = function _lp2_installAnchor(lp2_anchor,ResizeObserver){return(
entry => {
  const el = entry.el;
  if (el.__lp2_anchor_bound)
    return;
  el.__lp2_anchor_bound = true;
  const A = lp2_anchor;
  let raf = 0;
  el.addEventListener('scroll', () => {
    if (el.__lp2_pinning)
      return;
    if (raf)
      return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      entry.anchor = A.capture(el);
    });
  }, { passive: true });
  const content = el.querySelector('.lope-viz') || el.firstElementChild;
  if (content && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (!entry.anchor)
        return;
      el.__lp2_pinning = true;
      A.restore(el, entry.anchor);
      requestAnimationFrame(() => {
        el.__lp2_pinning = false;
      });
    });
    ro.observe(content);
    entry.ro = ro;
  }
}
)};
const _xwsg4w = function _lp2_doc_layout(md){return(
md`### Layout rendering and docking

\`lp2_renderNode\` reconciles the model tree to DOM: rows and cols are flexbox with draggable splitters that write percentages back to \`node.sizes\`; a stack is a tab header plus the active pane. \`lp2_view\` runs the render together with the scroll capture/restore, and exposes \`commit(newRoot)\`, which republishes the model through the \`lp2Model\` viewof. Every structural change therefore re-renders and round-trips to the URL through one path.

\`lp2_ops\` holds the tree operations: \`findHost\`, \`removeLeaf\`, \`dropBeside\`, \`normalize\`, and \`move\`. \`normalize\` collapses emptied stacks and single-child splits, so the tree stays minimal. Dragging a tab onto a pane's edge splits it (left/right/top/bottom); onto its centre merges into that stack. \`lp2_dragOut\` writes the module's \`.js\` source to the drag \`DataTransfer\`, so the same drag can drop the module out to the filesystem.`
)};
const _1kgkxiz = function _lp2_host()
{
  const host = document.createElement("div");
  host.className = "lp2-host";
  Object.assign(host.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    overflow: "hidden"
  });
  return host;
};
const _6f57qb = function _lp2_renderNode(lp2_renderStack,lp2_renderSplit)
{
  return ctx => {
    // dispatch a layout node to its renderer; `make` recurses for nested splits
    const make = node => {
      if (!node)
        return document.createTextNode('');
      if (node.t === 'stack')
        return lp2_renderStack(node, ctx);
      if (node.t === 'row' || node.t === 'col')
        return lp2_renderSplit(node, ctx, make);
      return document.createTextNode('unknown node ' + node.t);
    };
    return make;
  };
};
const _1r0c4er = function _lp2_ops()
{
  // pure-ish surgery on the live layout tree; mutate then commit() to republish
  const replaceNode = (root, oldRef, newNode) => {
    if (root === oldRef)
      return newNode;
    const rec = n => {
      if (!n || !n.children)
        return;
      for (let i = 0; i < n.children.length; i++) {
        if (n.children[i] === oldRef) {
          n.children[i] = newNode;
          return true;
        }
        if (rec(n.children[i]))
          return true;
      }
      return false;
    };
    rec(root);
    return root;
  };
  // collapse empty stacks and single-child splits; returns cleaned node or null
  const normalize = node => {
    if (!node)
      return null;
    if (node.t === 'stack')
      return node.tabs && node.tabs.length ? node : null;
    const kids = (node.children || []).map(normalize).filter(Boolean);
    if (kids.length === 0)
      return null;
    if (kids.length === 1)
      return kids[0];
    node.children = kids;
    node.sizes = kids.map(() => Math.round(100 / kids.length));
    return node;
  };
  // find the stack holding `module`; returns {stack, tabIndex} or null
  const findHost = (root, module) => {
    let res = null;
    const rec = n => {
      if (!n || res)
        return;
      if (n.t === 'stack') {
        const ti = (n.tabs || []).findIndex(l => l.module === module);
        if (ti >= 0)
          res = {
            stack: n,
            tabIndex: ti
          };
      } else
        (n.children || []).forEach(rec);
    };
    rec(root);
    return res;
  };
  // is `target` reachable from root?
  const contains = (root, target) => {
    if (root === target)
      return true;
    return (root.children || []).some(c => contains(c, target));
  };
  // remove first leaf with `module`; returns {root, leaf}
  const removeLeaf = (root, module) => {
    const host = findHost(root, module);
    if (!host)
      return {
        root,
        leaf: null
      };
    const [leaf] = host.stack.tabs.splice(host.tabIndex, 1);
    if (host.stack.active >= host.stack.tabs.length)
      host.stack.active = Math.max(0, host.stack.tabs.length - 1);
    return {
      root: normalize(root) || {
        t: 'stack',
        active: 0,
        tabs: []
      },
      leaf
    };
  };
  // drop `leaf` relative to `targetStack`: side = left|right|top|bottom|center
  const dropBeside = (root, targetStack, leaf, side) => {
    if (side === 'center') {
      targetStack.tabs.push(leaf);
      targetStack.active = targetStack.tabs.length - 1;
      return root;
    }
    const orient = side === 'left' || side === 'right' ? 'row' : 'col';
    const newStack = {
      t: 'stack',
      active: 0,
      tabs: [leaf]
    };
    const order = side === 'left' || side === 'top' ? [
      newStack,
      targetStack
    ] : [
      targetStack,
      newStack
    ];
    const repl = {
      t: orient,
      sizes: [
        50,
        50
      ],
      children: order
    };
    return replaceNode(root, targetStack, repl);
  };
  // perform a full move: remove dragged module, then drop beside target
  const move = (root, module, targetStack, side) => {
    const host = findHost(root, module);
    if (!host)
      return root;
    // dragging a tab within its own stack: a lone tab has nowhere to go;
    // a centre-drop onto its own stack is a no-op
    if (host.stack === targetStack && (host.stack.tabs.length === 1 || side === 'center'))
      return root;
    const {
      root: r2,
      leaf
    } = removeLeaf(root, module);
    if (!leaf)
      return root;
    // the target stack object is mutated in place, so it survives removal unless it
    // was the host and got emptied (guarded above); confirm it is still in the tree
    if (!contains(r2, targetStack)) {
      // target collapsed away: drop the leaf back into whatever remains as the root
      return dropBeside(r2, r2, leaf, side);
    }
    return dropBeside(r2, targetStack, leaf, side);
  };
  return {
    replaceNode,
    normalize,
    findHost,
    contains,
    removeLeaf,
    dropBeside,
    move
  };
};
const _sx484g = function _lp2_dragOut(){return(
(moduleName, dataTransfer) => {
  const res = window.lopecode.contentSync(moduleName);
  const text = res && res.bytes ? new TextDecoder().decode(res.bytes) : '';
  const mime = res && res.mime || 'application/javascript';
  const fname = moduleName.replace(/^@/, '').replace(/\//g, '_') + '.js';
  dataTransfer.setData('text/plain', text);
  dataTransfer.setData('application/javascript', text);
  dataTransfer.setData('DownloadURL', mime + ':' + fname + ':data:' + mime + ';base64,' + btoa(unescape(encodeURIComponent(text))));
  dataTransfer.effectAllowed = 'copy';
  return {
    fname,
    len: text.length,
    mime
  };
}
)};
const _1l0f5al = function _lp2_view(lp2_host,lp2Model,lp2_installAnchor,lp2_anchor,$0,Event,lp2_getPane,lp2_dragOut,lp2_ops,linkTo,lp2_paneRegistry,lp2_renderNode,lp2_burger)
{
  const host = lp2_host;
  lp2Model;
  lp2_installAnchor;
  lp2_anchor;
  const vmEl = $0;
  const commit = newRoot => {
    vmEl.value = newRoot;
    vmEl.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const ctx = {
    getPane: lp2_getPane,
    dragOut: lp2_dragOut,
    ops: lp2_ops,
    commit,
    getRoot: () => lp2Model,
    linkTo
  };
  const rerender = () => {
    const saved = new Map();
    for (const [name, entry] of lp2_paneRegistry) {
      lp2_installAnchor(entry);
      const anc = lp2_anchor.capture(entry.el);
      saved.set(name, anc || { raw: entry.el.scrollTop });
    }
    host.replaceChildren(lp2_renderNode(ctx)(lp2Model));
    // dock the immortal burger button into the top-left tab bar; a rerender moves
    // the button so any open popover is anchored stale — close it
    lp2_burger.close();
    const firstTabs = host.querySelector('.lp2-tabs');
    if (firstTabs)
      firstTabs.prepend(lp2_burger.button);
    for (const [name, anc] of saved) {
      const entry = lp2_paneRegistry.get(name);
      if (!entry || !entry.el.isConnected)
        continue;
      if (entry.pendingDeepLink)
        continue;
      if (anc.pid) {
        if (!lp2_anchor.restore(entry.el, anc) && anc.raw)
          entry.el.scrollTop = anc.raw;
      } else if (anc.raw)
        entry.el.scrollTop = anc.raw;
      entry.anchor = anc.pid ? anc : entry.anchor;
    }
  };
  rerender();
  return host;
};
const _1bytrbx = function _lp2_probe(lp2_view,lp2_paneRegistry)
{
  lp2_view;
  return 'lp2 mounted, panes=' + lp2_paneRegistry.size;
};
const _orvfgz = function _lp2_doc_hash(md){return(
md`### Hash ownership

\`lp2_hash\` observes \`location.hash\`. \`lp2_syncFromUrl\` parses it into the model when it changes externally; \`lp2_syncToUrl\` serialises the model back. \`lp2_setHash\` writes via \`history.replaceState\`, which updates the URL without firing \`hashchange\`.

\`view=\` is the layout (the \`R\`/\`S\`/\`C\` DSL) and is lopepage-2's to own. \`open=@mod[#cell]\` and \`close=@mod\` are one-shot intents: \`lp2_syncFromUrl\` overlays a module into the layout (setting a leaf's deep-link \`cell\` when \`#cell\` is given) or removes one — merging into the live layout when there is no \`view=\` — and \`lp2_syncToUrl\` drops the intent once the layout reflects it. The tab close \`×\` writes \`close=\` via \`linkTo\`, so closing exercises the same path.

Invariants:

- \`lp2_syncToUrl\` writes only when the model round-trips: \`serialize(parse(serialize(model))) === serialize(model)\`. A layout that does not round-trip never reaches the URL.
- Writing is gated on \`window.__lp2_owns_hash\`, set only while lopepage-2 is the mounted page, so the URL is left untouched when the module is imported as a dependency.
- Only \`view=\` and the intents it consumes (\`open\`) are managed; every other hash param (e.g. \`cc=\`) is preserved verbatim, because a decoupled module cannot assume it owns them.
- Because \`replaceState\` is silent and the read path is driven by \`hashchange\`, a write does not re-trigger a read.`
)};
const _y2r8d1 = function _lp2_hash(Generators,location){return(
Generators.observe(notify => {
  const update = () => notify(location.hash);
  update();
  window.addEventListener('hashchange', update);
  return () => window.removeEventListener('hashchange', update);
})
)};
const _1nwbntj = function _lp2_setHash(location,history){return(
newHash => {
  const h = newHash.startsWith('#') ? newHash : '#' + newHash;
  const href = location.pathname + location.search + h;
  try {
    history.replaceState(null, '', href);
    return true;
  } catch (e) {
    try {
      location.hash = h;
      return true;
    } catch (e2) {
      return false;
    }
  }
}
)};
const _1vcr15c = function _lp2_syncFromUrl($0,lp2_hash,lp2_parseDSL,lp2_ops,lp2_serializeDSL,Event)
{
  const el = $0;
  // element ref (NOT value) -> only re-runs on hash change, no loop
  const hash = lp2_hash;
  // re-run on external hashchange / initial load
  let view = null, open = null, close = null;
  for (const part of String(hash).replace(/^#/, '').split('&').filter(Boolean)) {
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    const val = eq >= 0 ? part.slice(eq + 1) : '';
    if (key === 'view')
      view = decodeURIComponent(val);
    else if (key === 'open')
      open = decodeURIComponent(val);
    else if (key === 'close')
      close = decodeURIComponent(val);  // every other param (cc=, and anything other modules own) is ignored here
  }
  if (!view && !open && !close)
    return { status: 'skipped' };
  // base model: parse view= when present, else clone the live layout so
  // `open` / `close` apply to it rather than replacing it
  let model;
  try {
    model = view ? lp2_parseDSL(view) : JSON.parse(JSON.stringify(el.value));
  } catch (e) {
    return {
      status: 'error',
      error: String(e)
    };
  }
  // apply the one-shot open=@mod[#cell] intent
  let openApplied = false;
  if (open) {
    const [modRaw, cellRaw] = open.split('#');
    const module = (modRaw || '').trim();
    const cell = (cellRaw || '').trim() || null;
    if (module) {
      const findLeaf = n => {
        if (!n)
          return null;
        if (n.t === 'stack') {
          for (const leaf of n.tabs || [])
            if (leaf.module === module)
              return {
                stack: n,
                leaf
              };
          return null;
        }
        for (const c of n.children || []) {
          const f = findLeaf(c);
          if (f)
            return f;
        }
        return null;
      };
      const firstStack = n => {
        if (!n)
          return null;
        if (n.t === 'stack')
          return n;
        for (const c of n.children || []) {
          const f = firstStack(c);
          if (f)
            return f;
        }
        return null;
      };
      const found = findLeaf(model);
      if (found) {
        if (cell)
          found.leaf.cell = cell;
        found.stack.active = found.stack.tabs.indexOf(found.leaf);
      } else {
        let st = firstStack(model);
        if (!st)
          model = st = {
            t: 'stack',
            active: 0,
            tabs: []
          };
        st.tabs = st.tabs || [];
        st.tabs.push(cell ? {
          module,
          cell
        } : { module });
        st.active = st.tabs.length - 1;
      }
      openApplied = true;
    }
  }
  // apply the one-shot close=@mod intent (remove the leaf, collapse via normalize)
  let closeApplied = false;
  if (close) {
    const r = lp2_ops.removeLeaf(model, close);
    if (r.leaf) {
      model = r.root;
      closeApplied = true;
    }
  }
  const reser = lp2_serializeDSL(model);
  // republish when the layout changed, or when open set active/cell on an
  // already-present module (active is not serialized, so compare by intent)
  const applied = openApplied || closeApplied || reser !== lp2_serializeDSL(el.value);
  if (applied) {
    el.value = model;
    el.dispatchEvent(new Event('input'));
  }
  return {
    status: 'ok',
    view,
    open,
    close,
    openApplied,
    closeApplied,
    reser,
    applied
  };
};
const _1rf2mk0 = function _lp2_syncToUrl(lp2Model,lp2_serializeDSL,lp2_parseDSL,location,lp2_setHash)
{
  const model = lp2Model;
  // re-run on model change
  if (!window.__lp2_owns_hash)
    return { status: 'dormant' };
  // armed only when lopepage-2 is the page
  let dsl;
  try {
    dsl = lp2_serializeDSL(model);
  } catch (e) {
    return {
      status: 'serialize-failed',
      error: String(e)
    };
  }
  // loop protection: only write if the DSL round-trips stably
  let ok = false;
  try {
    ok = lp2_serializeDSL(lp2_parseDSL(dsl)) === dsl;
  } catch (e) {
    ok = false;
  }
  if (!ok)
    return {
      status: 'blocked-roundtrip',
      dsl
    };
  // preserve unknown params (cc=...), strip one-shot intents
  const raw = String(location.hash || '').replace(/^#/, '');
  const intents = new Set([
    'open',
    'close',
    'focus',
    'from'
  ]);
  const extra = [];
  let currentView = null;
  for (const part of raw.split('&').filter(Boolean)) {
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    if (key === 'view')
      currentView = decodeURIComponent(part.slice(eq + 1));
    else if (!intents.has(key))
      extra.push(part);
  }
  const newHash = '#view=' + dsl + (extra.length ? '&' + extra.join('&') : '');
  if (newHash !== location.hash) {
    lp2_setHash(newHash);
    return {
      status: 'written',
      dsl
    };
  }
  return {
    status: 'no-change',
    dsl
  };
};
const _6e8yep = function _lp2_doc_mount(md){return(
md`### Page mount, theme, and orthogonal features

\`lp2_page\` builds the fullscreen \`#lopepage-2\` container, adopts the [\`themes\`](https://observablehq.com/@tomlarkworthy/themes) stylesheets via \`apply_theme\`, and appends the [\`command-palette\`](https://observablehq.com/@tomlarkworthy/command-palette) chrome (\`commandPaletteStyles\` + the hidden \`commandPaletteOverlay\`) so ⌘K has a node to reveal.

\`lp2_background_jobs\` holds references to the main-loop cells of orthogonal feature modules so the runtime instantiates them while lopepage-2 is the page: \`commandPaletteKeybinding\` (installs the ⌘K listener), \`cc_chat\` (opens the [\`claude-code-pairing\`](https://observablehq.com/@tomlarkworthy/claude-code-pairing) connection), \`change_listener\`/\`commit_history\`/\`replay_git\` (the [\`local-change-history\`](https://observablehq.com/@tomlarkworthy/local-change-history) edit recorder/replayer), and \`auto_attach\` (the [\`editor-5\`](https://observablehq.com/@tomlarkworthy/editor-5) editor that attaches CodeMirror to rendered cells for inline editing). These modules are composed by import, not added to \`mains\`.

\`lp2_append_to_body\` is the keystone cell: reachable only when lopepage-2 is booted as a main, it appends the page to \`document.body\`, references \`lp2_background_jobs\`, and sets \`window.__lp2_owns_hash\`. With \`bootconf.headless\` set, the runtime observes this cell as the page's single output.`
)};
const _1y1ubko = function _lp2_page(apply_theme,lp2_host,commandPaletteStyles,commandPaletteOverlay)
{
  apply_theme;
  // adopt theme stylesheets into the document
  const root = document.createElement('div');
  root.id = 'lopepage-2';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--theme-background-a, #fff)'
  });
  const style = document.createElement('style');
  style.textContent = [
    'html,body{margin:0;padding:0;max-width:100vw;}',
    '#lopepage-2 .lope-viz .observablehq{position:relative;min-height:17px;}',
    '#lopepage-2 .lope-viz .observablehq:not(.observablehq--running):empty::after{content:\'<detached>\';font-style:oblique;opacity:.5;}',
    '#lopepage-2 .lp2-tabs button:hover{background:rgba(0,0,0,.06);}',
    '#lopepage-2 .lp2-splitter:hover{background:#bbb;}'
  ].join('\n');
  root.appendChild(style);
  root.appendChild(lp2_host);
  // command-palette chrome: a <style> and a fixed overlay, hidden until ⌘K
  root.appendChild(commandPaletteStyles);
  root.appendChild(commandPaletteOverlay);
  return root;
};
const _1cumx25 = function _lp2_background_jobs(commandPaletteKeybinding,cc_chat,change_listener,commit_history,replay_git,auto_attach,lp2_watchModules,lp2_menu_sync,lp2_menu_defaults)
{
  // hold references so these orthogonal features' main-loop cells instantiate
  commandPaletteKeybinding;
  // installs the ⌘K keydown listener
  cc_chat;
  // instantiates the pairing connection
  change_listener;
  // records cell edits into local-change-history
  commit_history;
  // commits runtime edit history
  replay_git;
  // replays git commits on load
  auto_attach;
  // attaches editor-5 CodeMirror editors to rendered cells
  lp2_watchModules;
  // keeps the layout-relevant module watcher running
  lp2_menu_sync;
  // keeps the burger menu populated from the plugin registry
  lp2_menu_defaults;
  // registers the built-in menu items (download, fork)
  return 'background jobs: command-palette, claude-code-pairing, local-change-history, editor-5, module-watcher, burger-menu';
};
const _1rtuk9d = function _lp2_append_to_body(lp2_view,lp2_syncFromUrl,lp2_syncToUrl,lp2_background_jobs,lp2_page)
{
  lp2_view;
  // ensure the layout renders into the host
  lp2_syncFromUrl;
  // keep hash -> model live
  lp2_syncToUrl;
  // keep model -> hash live (dormant until armed below)
  lp2_background_jobs;
  // activate orthogonal features (⌘K palette, pairing) while lopepage-2 is the page
  window.__lp2_owns_hash = true;
  // arm hash ownership; only reachable when lopepage-2 is the page
  const page = lp2_page;
  if (!page.isConnected)
    document.body.appendChild(page);
  return 'lopepage-2 mounted';
};
const _z83rug = function _29(currentModules){return(
currentModules
)};
const _12ez53h = function _lp2_renderTab(location)
{
  return (node, i, ctx) => {
    const leaf = node.tabs[i];
    const active = node.active || 0;
    const tab = document.createElement('button');
    tab.textContent = leaf.module.split('/').pop();
    tab.title = leaf.module + '  (drag to a pane edge to dock, or out to save as .js)';
    Object.assign(tab.style, {
      border: 'none',
      padding: '4px 8px',
      cursor: 'grab',
      fontSize: '11px',
      background: i === active ? 'var(--theme-background-a)' : 'transparent',
      color: i === active ? 'var(--theme-foreground)' : 'var(--theme-foreground-faint)'
    });
    tab.onclick = () => {
      node.active = i;
      ctx.commit(ctx.getRoot());
    };
    tab.draggable = true;
    tab.addEventListener('dragstart', ev => {
      window.__lp2_drag = { module: leaf.module };
      try {
        ev.dataTransfer.setData('application/x-lp2-leaf', leaf.module);
      } catch (_) {
      }
      try {
        ctx.dragOut(leaf.module, ev.dataTransfer);
      } catch (_) {
      }
    });
    tab.addEventListener('dragend', () => {
      window.__lp2_drag = null;
      if (window.__lp2_dropZone) {
        window.__lp2_dropZone.style.display = 'none';
        window.__lp2_dropZone = null;
      }
    });
    const close = document.createElement('span');
    close.textContent = '\xD7';
    close.title = 'Close';
    Object.assign(close.style, {
      marginLeft: '6px',
      opacity: '.45',
      fontWeight: '700',
      cursor: 'pointer'
    });
    close.onmouseenter = () => close.style.opacity = '1';
    close.onmouseleave = () => close.style.opacity = '.45';
    // don't let a grab on × start a tab drag or activate the tab
    close.addEventListener('mousedown', ev => ev.stopPropagation());
    close.addEventListener('click', ev => {
      ev.stopPropagation();
      // route through the URL intent system: close=<module>
      location.hash = ctx.linkTo({ close: leaf.module }, { baseURI: location.href });
    });
    tab.appendChild(close);
    return tab;
  };
};
const _m7n4c3 = function _lp2_dropZone()
{
  return (body, tabsEl, node, ctx) => {
    // which edge/centre of `el` the pointer is over: centre = merge, edge = split that side
    const sideOf = (ev, el) => {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      if (x > 0.3 && x < 0.7 && y > 0.3 && y < 0.7)
        return 'center';
      const d = {
        left: x,
        right: 1 - x,
        top: y,
        bottom: 1 - y
      };
      return Object.keys(d).reduce((a, b) => d[b] < d[a] ? b : a);
    };
    const zone = document.createElement('div');
    Object.assign(zone.style, {
      position: 'absolute',
      pointerEvents: 'none',
      display: 'none',
      background: 'rgba(40,120,255,.18)',
      outline: '2px solid rgba(40,120,255,.6)',
      outlineOffset: '-2px',
      zIndex: 5,
      boxSizing: 'border-box'
    });
    body.appendChild(zone);
    const showZone = side => {
      const f = {
        left: [
          '0',
          '0',
          '50%',
          '100%'
        ],
        right: [
          '50%',
          '0',
          '50%',
          '100%'
        ],
        top: [
          '0',
          '0',
          '100%',
          '50%'
        ],
        bottom: [
          '0',
          '50%',
          '100%',
          '50%'
        ],
        center: [
          '15%',
          '15%',
          '70%',
          '70%'
        ]
      }[side];
      Object.assign(zone.style, {
        display: 'block',
        left: f[0],
        top: f[1],
        width: f[2],
        height: f[3]
      });
    };
    body.addEventListener('dragover', ev => {
      if (!window.__lp2_drag)
        return;
      ev.preventDefault();
      try {
        ev.dataTransfer.dropEffect = 'copy';
      } catch (_) {
      }
      // only one zone visible: hide whichever was last shown elsewhere
      if (window.__lp2_dropZone && window.__lp2_dropZone !== zone)
        window.__lp2_dropZone.style.display = 'none';
      window.__lp2_dropZone = zone;
      showZone(sideOf(ev, body));
    });
    body.addEventListener('dragleave', ev => {
      // ignore moves between this body's own descendants
      if (ev.relatedTarget && body.contains(ev.relatedTarget))
        return;
      zone.style.display = 'none';
      if (window.__lp2_dropZone === zone)
        window.__lp2_dropZone = null;
    });
    body.addEventListener('drop', ev => {
      if (!window.__lp2_drag)
        return;
      ev.preventDefault();
      const side = sideOf(ev, body);
      zone.style.display = 'none';
      window.__lp2_dropZone = null;
      const m = window.__lp2_drag.module;
      window.__lp2_drag = null;
      ctx.commit(ctx.ops.move(ctx.getRoot(), m, node, side));
    });
    // the tab header is also a drop target: dropping a tab onto it merges into this
    // stack (the natural "combine into tabs" gesture); always a centre merge.
    if (tabsEl) {
      tabsEl.addEventListener('dragover', ev => {
        if (!window.__lp2_drag)
          return;
        ev.preventDefault();
        try {
          ev.dataTransfer.dropEffect = 'copy';
        } catch (_) {
        }
        if (window.__lp2_dropZone && window.__lp2_dropZone !== zone)
          window.__lp2_dropZone.style.display = 'none';
        window.__lp2_dropZone = zone;
        showZone('center');
      });
      tabsEl.addEventListener('dragleave', ev => {
        if (ev.relatedTarget && (tabsEl.contains(ev.relatedTarget) || body.contains(ev.relatedTarget)))
          return;
        zone.style.display = 'none';
        if (window.__lp2_dropZone === zone)
          window.__lp2_dropZone = null;
      });
      tabsEl.addEventListener('drop', ev => {
        if (!window.__lp2_drag)
          return;
        ev.preventDefault();
        zone.style.display = 'none';
        window.__lp2_dropZone = null;
        const m = window.__lp2_drag.module;
        window.__lp2_drag = null;
        ctx.commit(ctx.ops.move(ctx.getRoot(), m, node, 'center'));
      });
    }
    return zone;
  };
};
const _1hs48bp = function _lp2_splitter()
{
  return (node, i, row, wrap, slots, ctx) => {
    const sp = document.createElement('div');
    sp.className = 'lp2-splitter';
    Object.assign(sp.style, {
      flex: '0 0 6px',
      cursor: row ? 'col-resize' : 'row-resize',
      background: '#ddd',
      flexShrink: 0
    });
    sp.addEventListener('pointerdown', e => {
      e.preventDefault();
      try {
        sp.setPointerCapture(e.pointerId);
      } catch (_) {
      }
      const startPos = row ? e.clientX : e.clientY;
      const wrapSize = row ? wrap.clientWidth : wrap.clientHeight;
      const s0 = node.sizes[i], s1 = node.sizes[i + 1], total = s0 + s1;
      const onMove = ev => {
        const delta = ((row ? ev.clientX : ev.clientY) - startPos) / wrapSize * 100;
        // integer percentages so the layout round-trips through the integer-only #view= DSL
        const n0 = Math.round(Math.max(5, Math.min(total - 5, s0 + delta)));
        node.sizes[i] = n0;
        node.sizes[i + 1] = total - n0;
        slots[i].style.flex = node.sizes[i] + ' 1 0';
        slots[i + 1].style.flex = node.sizes[i + 1] + ' 1 0';
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        ctx.commit(ctx.getRoot());
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
    return sp;
  };
};
const _nj1uts = function _lp2_renderStack(lp2_renderTab,lp2_dropZone){return(
(node, ctx) => {
  const wrap = document.createElement('div');
  wrap.className = 'lp2-stack';
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    width: '100%'
  });
  const tabsEl = document.createElement('div');
  tabsEl.className = 'lp2-tabs';
  Object.assign(tabsEl.style, {
    display: 'flex',
    gap: '2px',
    flex: '0 0 auto',
    background: 'var(--theme-background-b)',
    borderBottom: '1px solid var(--theme-foreground-fainter)',
    overflow: 'hidden'
  });
  const body = document.createElement('div');
  Object.assign(body.style, {
    flex: '1 1 auto',
    minHeight: 0,
    position: 'relative',
    display: 'flex'
  });
  const active = node.active || 0;
  (node.tabs || []).forEach((leaf, i) => {
    const pane = ctx.getPane(leaf.module, leaf.cell).el;
    pane.style.display = i === active ? 'block' : 'none';
    pane.style.flex = '1 1 auto';
    body.appendChild(pane);
    tabsEl.appendChild(lp2_renderTab(node, i, ctx));
  });
  lp2_dropZone(body, tabsEl, node, ctx);
  wrap.append(tabsEl, body);
  return wrap;
}
)};
const _a9rn1a = function _lp2_renderSplit(lp2_splitter){return(
(node, ctx, make) => {
  const row = node.t === 'row';
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: row ? 'row' : 'column',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    width: '100%'
  });
  const kids = node.children || [];
  if (!node.sizes || node.sizes.length !== kids.length)
    node.sizes = kids.map(() => Math.round(100 / kids.length));
  const slots = [];
  kids.forEach((child, i) => {
    const slot = document.createElement('div');
    Object.assign(slot.style, {
      flex: node.sizes[i] + ' 1 0',
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      overflow: 'hidden'
    });
    slot.appendChild(make(child));
    wrap.appendChild(slot);
    slots.push(slot);
    if (i < kids.length - 1)
      wrap.appendChild(lp2_splitter(node, i, row, wrap, slots, ctx));
  });
  return wrap;
}
)};
const _6vp46e = function _lp2_watchedModules(Inputs){return(
Inputs.input(new Map())
)};
const _1hxhexc = (G, _) => G.input(_);
const _16ptruj = function _lp2_watchModules(lp2Model,currentModules,$0,Event)
{
  // Collect the module names the current layout actually references.
  const names = new Set();
  const walk = n => {
    if (!n)
      return;
    if (n.t === 'stack')
      (n.tabs || []).forEach(leaf => leaf?.module && names.add(leaf.module));
    else
      (n.children || []).forEach(walk);
  };
  walk(lp2Model);
  // Resolve those names against the (churning) currentModules map.
  const byName = new Map();
  for (const [mod, info] of currentModules)
    if (info?.name)
      byName.set(info.name, info.module ?? mod);
  const next = new Map();
  for (const name of names) {
    const m = byName.get(name);
    if (m)
      next.set(name, m);
  }
  // Only republish when the relevant resolved set actually changed — this is what
  // decouples the repaint from raw currentModules churn.
  const prev = $0.value;
  let changed = !(prev instanceof Map) || prev.size !== next.size;
  if (!changed)
    for (const [k, v] of next)
      if (prev.get(k) !== v) {
        changed = true;
        break;
      }
  if (changed) {
    $0.value = next;
    $0.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return `watch ${ names.size } / resolved ${ next.size }${ changed ? ' (updated)' : '' }`;
};
const _td27y7 = function _lp2_scrollToCell(lp2_anchor)
{
  return (entry, cellName) => {
    // One-shot deep-link: scroll the pane so `cellName` (a variable name, e.g. from @mod#cell) sits at
    // the top, then seed the pane's pid anchor so the ResizeObserver re-pins it through later reflow.
    // Right after a reparent the immortal pane's content is momentarily short, which clamps scrollTop
    // back to 0, so retry until the scroll lands — or until content height settles (target is genuinely
    // past the last full page, so we can only scroll as far as it goes).
    if (!cellName || !entry || entry.transient)
      return;
    // Own the pane scroll until the deep-link lands, so a concurrent rerender's scroll-restore
    // (which captured the pre-deep-link scrollTop) does not clobber it. Cleared on land or give-up.
    entry.pendingDeepLink = true;
    const done = () => entry.pendingDeepLink = false;
    let tries = 0, lastSH = -1, stable = 0;
    const attempt = () => {
      const el = entry.el;
      const again = () => {
        if (tries++ < 60)
          window.setTimeout(attempt, 80);
        else
          done();
      };
      if (!el || !el.isConnected || !el.clientHeight)
        return again();
      const node = lp2_anchor.cellNodes(el).find(n => n.getAttribute('cell') === cellName);
      if (!node)
        return again();
      const targetTop = node.offsetTop;
      el.__lp2_pinning = true;
      el.scrollTop = targetTop;
      const pid = lp2_anchor.pidOf(node);
      if (pid)
        entry.anchor = {
          pid,
          offset: 0
        };
      window.requestAnimationFrame(() => {
        el.__lp2_pinning = false;
      });
      if (Math.abs(el.scrollTop - targetTop) <= 2)
        return done();
      if (el.scrollHeight === lastSH) {
        if (++stable >= 3)
          return done();
      } else {
        stable = 0;
        lastSH = el.scrollHeight;
      }
      return again();
    };
    // Defer so the first attempt runs AFTER this rerender's synchronous scroll-restore and after
    // getPane reparents the (immortal) pane; pendingDeepLink stays true across that window so the
    // restore skips this pane, then the deferred attempt scrolls the now-settled pane to the cell.
    window.setTimeout(attempt, 0);
  };
};
const _1mnud0c = function _lp2_doc_menu(md){return(
md`### Burger menu (plugin registry)

A hamburger button docked at the left of the top-left tab bar opens a menu of pluggable items. \`viewof lp2MenuItems\` is the registry: a reactive array of \`{id, label, svg, action, children, order}\`. \`svg\` is an SVG string, an \`Element\`, or a function returning one; \`children\` nests a submenu; lower \`order\` sorts first.

Plugins (this module's defaults, or any other notebook) register through \`lp2_registerMenuItem(item)\`, which upserts by \`id\` and returns a disposer — call it from \`invalidation\` so a re-run replaces rather than duplicates. Registration republishes only \`lp2MenuItems\`, and only \`lp2_menu_sync\` depends on it, so adding an item repopulates the popover in place — the layout, panes, and scroll state are untouched.

The button and popover are built once by \`lp2_burger\` (immortal, like panes) and reparented into the current top-left tab bar on each layout render. \`lp2_menu_defaults\` registers the built-ins: **Download** and **Fork** via [\`exporter-3\`](https://observablehq.com/@tomlarkworthy/exporter-3)'s \`downloadAnchor\`/\`forkAnchor\`, which serialise every booted main.`
)};
const _v3n2r8 = function _lp2MenuItems(Inputs){return(
Inputs.input([])
)};
const _8wq5dn = (G, _) => G.input(_);
const _p9krt2 = function _lp2_registerMenuItem($0,Event){return(
item => {
  if (!item || !item.id)
    throw new Error('menu item needs an id');
  const el = $0;
  const publish = items => {
    el.value = items;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  publish((el.value || []).filter(it => it.id !== item.id).concat([item]));
  return () => {
    const cur = el.value || [];
    // only remove if this exact registration is still current (a re-register superseded us otherwise)
    if (cur.includes(item))
      publish(cur.filter(it => it !== item));
  };
}
)};
const _6tghw4 = function _lp2_burger(invalidation)
{
  const button = document.createElement('button');
  button.className = 'lp2-burger';
  button.title = 'Menu';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>';
  Object.assign(button.style, {
    border: 'none',
    background: 'transparent',
    padding: '4px 8px',
    cursor: 'pointer',
    color: 'var(--theme-foreground)',
    display: 'inline-flex',
    alignItems: 'center'
  });
  const popover = document.createElement('div');
  popover.className = 'lp2-menu';
  Object.assign(popover.style, {
    position: 'fixed',
    display: 'none',
    zIndex: 1000,
    minWidth: '190px',
    background: 'var(--theme-background-a, #fff)',
    color: 'var(--theme-foreground)',
    border: '1px solid var(--theme-foreground-fainter)',
    borderRadius: '4px',
    boxShadow: '0 4px 16px rgba(0,0,0,.18)',
    padding: '4px',
    font: '12px var(--sans-serif, sans-serif)'
  });
  const style = document.createElement('style');
  style.textContent = [
    '.lp2-menu button.lp2-menu-item{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:transparent;border:none;cursor:pointer;padding:6px 10px;font:inherit;color:inherit;border-radius:3px;}',
    '.lp2-menu button.lp2-menu-item:hover{background:rgba(128,128,128,.15);}'
  ].join('\n');
  popover.appendChild(style);
  const list = document.createElement('div');
  popover.appendChild(list);
  document.body.appendChild(popover);
  const close = () => {
    popover.style.display = 'none';
    button.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    const r = button.getBoundingClientRect();
    popover.style.left = Math.round(r.left) + 'px';
    popover.style.top = Math.round(r.bottom + 2) + 'px';
    popover.style.display = 'block';
    button.setAttribute('aria-expanded', 'true');
  };
  button.addEventListener('click', ev => {
    ev.stopPropagation();
    popover.style.display === 'none' ? open() : close();
  });
  // a click that lands outside the popover/button dismisses; so does Escape
  const onDocDown = ev => {
    if (popover.style.display === 'none')
      return;
    if (popover.contains(ev.target) || button.contains(ev.target))
      return;
    close();
  };
  const onKey = ev => {
    if (ev.key === 'Escape')
      close();
  };
  document.addEventListener('mousedown', onDocDown);
  document.addEventListener('keydown', onKey);
  invalidation.then(() => {
    document.removeEventListener('mousedown', onDocDown);
    document.removeEventListener('keydown', onKey);
    popover.remove();
    button.remove();
  });
  return {
    button,
    popover,
    list,
    open,
    close
  };
};
const _2xf9jm = function _lp2_menu_sync(lp2_burger,lp2MenuItems)
{
  const {list, close} = lp2_burger;
  const bySort = arr => [...arr || []].sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || String(a.label ?? a.id).localeCompare(String(b.label ?? b.id)));
  const icon = svg => {
    const span = document.createElement('span');
    Object.assign(span.style, {
      width: '16px',
      height: '16px',
      flex: '0 0 16px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    let node = typeof svg === 'function' ? svg() : svg;
    if (typeof node === 'string') {
      const t = document.createElement('template');
      t.innerHTML = node.trim();
      node = t.content.firstElementChild;
    }
    if (node instanceof Element) {
      node = node.cloneNode(true);
      node.setAttribute('width', '16');
      node.setAttribute('height', '16');
      span.appendChild(node);
    }
    return span;
  };
  let count = 0;
  const addItems = (arr, depth, container) => {
    for (const item of bySort(arr)) {
      count++;
      const btn = document.createElement('button');
      btn.className = 'lp2-menu-item';
      btn.style.paddingLeft = 10 + depth * 16 + 'px';
      btn.appendChild(icon(item.svg));
      const lbl = document.createElement('span');
      lbl.textContent = item.label ?? item.id;
      lbl.style.flex = '1 1 auto';
      btn.appendChild(lbl);
      container.appendChild(btn);
      if (item.children && item.children.length) {
        const caret = document.createElement('span');
        caret.textContent = '▸';
        caret.style.opacity = '.6';
        btn.appendChild(caret);
        const sub = document.createElement('div');
        sub.style.display = 'none';
        container.appendChild(sub);
        addItems(item.children, depth + 1, sub);
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          const opening = sub.style.display === 'none';
          sub.style.display = opening ? 'block' : 'none';
          caret.textContent = opening ? '▾' : '▸';
        });
      } else
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          close();
          try {
            item.action && item.action();
          } catch (err) {
            console.error('lp2 menu item', item.id, err);
          }
        });
    }
  };
  list.replaceChildren();
  addItems(lp2MenuItems, 0, list);
  if (!count) {
    const empty = document.createElement('div');
    empty.textContent = 'no menu items';
    Object.assign(empty.style, {
      padding: '6px 10px',
      color: 'var(--theme-foreground-faint)'
    });
    list.appendChild(empty);
  }
  return `menu: ${ count } item${ count === 1 ? '' : 's' }`;
};
const _hs74kp = function _lp2_menu_defaults(lp2_registerMenuItem,disk_svg,downloadAnchor,forkAnchor,invalidation)
{
  // built-in items, registered through the same plugin path any other notebook uses;
  // the anchors carry exporter-3's export behaviour, so acting = clicking a fresh one
  const disposers = [
    lp2_registerMenuItem({
      id: 'download',
      order: 10,
      label: 'Download',
      svg: () => disk_svg('currentColor'),
      action: () => downloadAnchor({}, 'download').click()
    }),
    lp2_registerMenuItem({
      id: 'fork',
      order: 20,
      label: 'Fork (new tab)',
      svg: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="4" cy="3.5" r="1.8"/><circle cx="12" cy="3.5" r="1.8"/><circle cx="8" cy="12.5" r="1.8"/><path d="M4 5.3v1.2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5.3M8 8.5v2.2"/></svg>',
      action: () => forkAnchor({}, 'fork').click()
    })
  ];
  invalidation.then(() => disposers.forEach(d => d()));
  return 'menu defaults: download, fork';
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/modules", async () => runtime.module((await import("/@tomlarkworthy/modules.js?v=4")).default));  
  main.define("module @tomlarkworthy/claude-code-pairing", async () => runtime.module((await import("/@tomlarkworthy/claude-code-pairing.js?v=4")).default));  
  main.define("module @tomlarkworthy/command-palette", async () => runtime.module((await import("/@tomlarkworthy/command-palette.js?v=4")).default));  
  main.define("module @tomlarkworthy/themes", async () => runtime.module((await import("/@tomlarkworthy/themes.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  $def("_1pg70e1", "lp2_doc_overview", ["md"], _1pg70e1);  
  $def("_1ov8ye5", "lp2_doc_model", ["md"], _1ov8ye5);  
  $def("_1rihrff", "viewof lp2Model", ["Inputs"], _1rihrff);  
  $def("_1ow4sob", "lp2Model", ["Generators","viewof lp2Model"], _1ow4sob);  
  $def("_l8xp7u", "lp2_parseDSL", [], _l8xp7u);  
  $def("_15gufbj", "lp2_serializeDSL", [], _15gufbj);  
  $def("_14hgn59", "lp2_doc_panes", ["md"], _14hgn59);  
  $def("_r14r4j", "lp2_moduleByName", ["lp2_watchedModules"], _r14r4j);  
  $def("_j3eb9x", "lp2_paneRegistry", [], _j3eb9x);  
  $def("_z08s5w", "lp2_getPane", ["lp2_scrollToCell","lp2_paneRegistry","lp2_moduleByName","visualizer","runtime","lp2_installAnchor"], _z08s5w);  
  $def("_88b5go", "lp2_doc_scroll", ["md"], _88b5go);  
  $def("_78h40x", "lp2_anchor", ["persistentId"], _78h40x);  
  $def("_d4xe91", "lp2_installAnchor", ["lp2_anchor","ResizeObserver"], _d4xe91);  
  $def("_xwsg4w", "lp2_doc_layout", ["md"], _xwsg4w);  
  $def("_1kgkxiz", "lp2_host", [], _1kgkxiz);  
  $def("_6f57qb", "lp2_renderNode", ["lp2_renderStack","lp2_renderSplit"], _6f57qb);  
  $def("_1r0c4er", "lp2_ops", [], _1r0c4er);  
  $def("_sx484g", "lp2_dragOut", [], _sx484g);  
  $def("_1l0f5al", "lp2_view", ["lp2_host","lp2Model","lp2_installAnchor","lp2_anchor","viewof lp2Model","Event","lp2_getPane","lp2_dragOut","lp2_ops","linkTo","lp2_paneRegistry","lp2_renderNode","lp2_burger"], _1l0f5al);
  $def("_1bytrbx", "lp2_probe", ["lp2_view","lp2_paneRegistry"], _1bytrbx);  
  $def("_orvfgz", "lp2_doc_hash", ["md"], _orvfgz);  
  $def("_y2r8d1", "lp2_hash", ["Generators","location"], _y2r8d1);  
  $def("_1nwbntj", "lp2_setHash", ["location","history"], _1nwbntj);  
  $def("_1vcr15c", "lp2_syncFromUrl", ["viewof lp2Model","lp2_hash","lp2_parseDSL","lp2_ops","lp2_serializeDSL","Event"], _1vcr15c);  
  $def("_1rf2mk0", "lp2_syncToUrl", ["lp2Model","lp2_serializeDSL","lp2_parseDSL","location","lp2_setHash"], _1rf2mk0);  
  $def("_6e8yep", "lp2_doc_mount", ["md"], _6e8yep);  
  $def("_1y1ubko", "lp2_page", ["apply_theme","lp2_host","commandPaletteStyles","commandPaletteOverlay"], _1y1ubko);  
  $def("_1cumx25", "lp2_background_jobs", ["commandPaletteKeybinding","cc_chat","change_listener","commit_history","replay_git","auto_attach","lp2_watchModules","lp2_menu_sync","lp2_menu_defaults"], _1cumx25);
  $def("_1rtuk9d", "lp2_append_to_body", ["lp2_view","lp2_syncFromUrl","lp2_syncToUrl","lp2_background_jobs","lp2_page"], _1rtuk9d);  
  $def("_z83rug", null, ["currentModules"], _z83rug);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("persistentId", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("persistentId", _));  
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));  
  main.define("currentModules", ["module @tomlarkworthy/modules", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("cc_chat", ["module @tomlarkworthy/claude-code-pairing", "@variable"], (_, v) => v.import("cc_chat", _));  
  main.define("commandPaletteKeybinding", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteKeybinding", _));  
  main.define("commandPaletteOverlay", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteOverlay", _));  
  main.define("commandPaletteStyles", ["module @tomlarkworthy/command-palette", "@variable"], (_, v) => v.import("commandPaletteStyles", _));  
  main.define("apply_theme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("apply_theme", _));  
  main.define("current_theme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("current_theme", _));  
  main.define("change_listener", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("change_listener", _));  
  main.define("commit_history", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("commit_history", _));  
  main.define("replay_git", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("replay_git", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("auto_attach", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("auto_attach", _));
  main.define("disk_svg", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("disk_svg", _));
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
  main.define("forkAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("forkAnchor", _));
  $def("_12ez53h", "lp2_renderTab", ["location"], _12ez53h);  
  $def("_m7n4c3", "lp2_dropZone", [], _m7n4c3);  
  $def("_1hs48bp", "lp2_splitter", [], _1hs48bp);  
  $def("_nj1uts", "lp2_renderStack", ["lp2_renderTab","lp2_dropZone"], _nj1uts);  
  $def("_a9rn1a", "lp2_renderSplit", ["lp2_splitter"], _a9rn1a);  
  $def("_6vp46e", "viewof lp2_watchedModules", ["Inputs"], _6vp46e);  
  $def("_1hxhexc", "lp2_watchedModules", ["Generators","viewof lp2_watchedModules"], _1hxhexc);  
  $def("_16ptruj", "lp2_watchModules", ["lp2Model","currentModules","viewof lp2_watchedModules","Event"], _16ptruj);  
  $def("_td27y7", "lp2_scrollToCell", ["lp2_anchor"], _td27y7);
  $def("_1mnud0c", "lp2_doc_menu", ["md"], _1mnud0c);
  $def("_v3n2r8", "viewof lp2MenuItems", ["Inputs"], _v3n2r8);
  $def("_8wq5dn", "lp2MenuItems", ["Generators","viewof lp2MenuItems"], _8wq5dn);
  $def("_p9krt2", "lp2_registerMenuItem", ["viewof lp2MenuItems","Event"], _p9krt2);
  $def("_6tghw4", "lp2_burger", ["invalidation"], _6tghw4);
  $def("_2xf9jm", "lp2_menu_sync", ["lp2_burger","lp2MenuItems"], _2xf9jm);
  $def("_hs74kp", "lp2_menu_defaults", ["lp2_registerMenuItem","disk_svg","downloadAnchor","forkAnchor","invalidation"], _hs74kp);
  return main;
}
