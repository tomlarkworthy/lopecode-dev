const _10nfeqw = function _1(md){return(
md`# Grid Container`
)};
const _101xf8r = function _widget(gridContainer,runtime,invalidation,gridModule){return(
gridContainer(runtime, {
  invalidation,
  module: gridModule,
  columns: 12,
  include: [
    "demo",
    "viewof freq",
    "viewof amp",
    "waveStats",
    "wavePlot",
    "export_ui",
    "controls"
  ],
  layout: {
    atoms: {
      demo: { x: 0, y: 0, w: 6, h: 6 },
      "viewof freq": { x: 6, y: 0, w: 6, h: 1 },
      "viewof amp": { x: 6, y: 1, w: 6, h: 1 },
      waveStats: { x: 6, y: 2, w: 3, h: 2 },
      export_ui: { x: 9, y: 2, w: 3, h: 2 },
      wavePlot: { x: 6, y: 4, w: 6, h: 4 },
      controls: { x: 0, y: 6 }
    }
  }
})
)};
const _arrhl6 = function _title(md){return(
md`
A fixed-size container that composes named cells as rearrangeable atoms on a snap-to-grid surface — a widget builder. Atoms are live dataflow elements: any HTML or value is adopted via Inspector, recomputes reactively, and the underlying cell source is editable in a floating editor (editor-5).

Grid container is a *self-editing view*, like [editable-md](https://observablehq.com/@tomlarkworthy/editable-md): mutating the UI rewrites the defining cell's own source code. Both the \`include:\` list (which cells are on the surface) and the \`layout:\` literal (where they are) live in the cell that calls \`gridContainer\` — drag an atom or add a cell and the source updates, so export, diff and undo all see the widget as code.

~~~js
import {gridContainer} from '@tomlarkworthy/grid-container'

widget = gridContainer(runtime, {
  invalidation,          // required for teardown
  module,                // module to render, default main
  include: ["viewof x"], // cell names to show; omit to show all non-plumbing cells
  layout: {},            // {frame: {w,h}, atoms: {name: {x,y,w,h}}} — rewritten in place
  columns: 12,           // reactive mode: pitch = width/columns, atom x/y/w/h are grid units
  grid,                  // fixed-pixel snap pitch, default 20 (used when columns is null)
  showGrid,              // draw the dot grid, default true
  width, height,         // container size, default "100%" x 480
  filter,                // extra predicate (cell_name, variables, i, state) => boolean
  persist,               // rewrite own source on change, default true
  detachNodes            // steal cell DOM from other views, default true
})
~~~

With \`columns\` set the grid is **reactive**: the pitch is the container width divided by the column count, so atoms reflow as the container resizes (positions and sizes in \`layout.atoms\` are grid units, not pixels). Without \`columns\` the grid keeps a fixed \`grid\` pixel pitch. \`gridControls()\` exposes \`columns\` and \`showGrid\` as an \`Inputs.form\` when the host is in reactive mode.

The grid has no built-in chrome. Its operations are a public API on the frame element (\`frame.grid\`: \`addCell\`, \`removeCell\`, \`pack\`, \`candidates\`, \`templates\`, \`instantiate\`), and the bundled controls are an ordinary view built with \`gridControls()\` — include it in the grid like any cell (\`controls = gridControls()\`), drag it, remove it, edit it. It drives whichever grid hosts it in the DOM, and user cells can implement their own controls against the same API. **＋ cell** lists the module's cells not yet on the surface (and \`template_*\` groups to instantiate); **⊞ pack** shelf-packs all atoms left-to-right; and in reactive mode a **columns** slider and **grid dots** toggle (an \`Inputs.form\`) are shown in the same component.

Hover an atom for its handle: drag ⠿ to move (snaps to grid), ✕ removes it from \`include:\`, ✎ opens the cell editor in a floating panel above the surface. Drag an atom's bottom-right corner to resize — size snaps on release, content stretches to the atom, and the body gains scrollbars only when smaller than its content; unresized atoms track their content size. The container itself is resizable the same way.

Atoms hold the *live* DOM: observers are dispatched in attach order (runtime-sdk \`observe\`), so the last-attached view — the grid — adopts each cell's element and widgets stay real-time.`
)};
const _1amxztb = function _sg_css(){return(
`.sg-frame {
  position: relative; overflow: hidden; box-sizing: border-box;
  resize: both;
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 8px;
  background-color: var(--theme-background-alt, #fafafa);
}
.sg-scroll {
  position: absolute; inset: 0; overflow: auto;
  padding-top: 18px;
  background-image: radial-gradient(circle, color-mix(in srgb, currentColor 14%, transparent) 1px, transparent 1px);
  background-attachment: local;
}
.sg-controls { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.sg-controls-row { display: flex; gap: 4px; align-items: center; }
.sg-add-select {
  font: 11px var(--sans-serif, system-ui); padding: 2px 6px; cursor: pointer;
  background: var(--theme-background, #fff);
  color: var(--theme-foreground, #111);
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 4px; opacity: 0.8;
}
.sg-add-select:hover { opacity: 1; }
.sg-settings { font: 11px var(--sans-serif, system-ui); }
.sg-settings form { margin: 0; }
.sg-controls button {
  font: 11px var(--sans-serif, system-ui); padding: 2px 8px; cursor: pointer;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 4px; opacity: 0.7;
}
.sg-controls button:hover { opacity: 1; }
.sg-add-menu {
  position: fixed; z-index: 70;
  display: flex; flex-direction: column;
  max-height: 300px; overflow: auto; min-width: 160px;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faint, #bbb);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.sg-add-menu button {
  font: 12px var(--code, monospace); text-align: left;
  padding: 4px 10px; border: none; background: none; cursor: pointer;
}
.sg-add-menu button:hover { background: var(--theme-background-alt, #f0f0f0); }
.sg-add-menu .sg-add-empty {
  font: 11px var(--sans-serif, system-ui);
  color: var(--theme-foreground-muted, #888);
  padding: 6px 10px;
}
.sg-viz-host { position: relative; width: 100%; min-height: 100%; }
.sg-viz-host > .lope-viz { position: absolute; inset: 0; }
/* !important: hosting frames style .observablehq descendants with ID selectors
   (lopepage-2: "#lopepage-2 .lope-viz .observablehq {position: relative}") which
   outrank any class selector; relative positioning gives each atom its own y origin */
.lope-viz.lope-grid-container > .observablehq { position: absolute !important; margin: 0; }
/* outer wrapper: grid-positioned, holds the content box + the chrome. overflow
   is visible so the chrome (name/edit) can sit OUTSIDE the box and not be clipped;
   it never resizes (resize lives on the inner box) */
.lope-grid-container > .sg-atom {
  box-sizing: border-box; overflow: visible;
  width: max-content; height: max-content;
}
/* inner content box: the resizable, clipped, visible surface */
.sg-atom-box {
  box-sizing: border-box; display: flex; flex-direction: column;
  resize: both; overflow: hidden;
  min-width: 40px; min-height: 24px;
  width: max-content; height: max-content;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #e5e5e5);
  border-radius: 6px;
}
.sg-atom:hover > .sg-atom-box { box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.sg-atom.sg-dragging { cursor: grabbing; z-index: 40; }
.sg-atom.sg-running > .sg-atom-box { outline: 2px solid rgba(75, 156, 211, 0.7); }
.sg-atom.sg-error > .sg-atom-box { outline: 2px solid #d73a49; }
/* chrome sits directly above the box (bottom:100%), outside the content, with a
   high z-index so it clears neighbouring atoms rather than hiding behind them.
   margin-bottom is NEGATIVE so the chrome overlaps the box top by a couple px:
   this closes the dead-zone gap that used to un-hover the atom (dropping the handle
   to pointer-events:none) as the cursor travelled from the box up to the handle. */
.sg-atom-handle {
  position: absolute; bottom: 100%; left: 0; margin-bottom: -2px;
  max-width: 90%; height: 15px;
  display: flex; align-items: center; gap: 3px; padding: 0 5px;
  box-sizing: border-box;
  font: 9px var(--sans-serif, system-ui);
  color: var(--theme-foreground-muted, #666);
  background: var(--theme-background-alt, #f0f0f0);
  border: 1px solid var(--theme-foreground-faintest, #e5e5e5);
  border-radius: 5px 5px 0 0;
  opacity: 0; pointer-events: none;
  cursor: grab; user-select: none; z-index: 30;
  transition: opacity 0.2s ease 0.35s; /* delayed fade-out = grace while near */
}
.sg-atom:hover > .sg-atom-handle,
.sg-atom.sg-dragging > .sg-atom-handle {
  opacity: 1; pointer-events: auto; transition-delay: 0s; /* appear instantly */
}
.sg-atom-grip { opacity: 0.6; }
.sg-atom-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sg-atom-remove {
  border: none; background: none; cursor: pointer;
  font-size: 9px; line-height: 1; opacity: 0.5; padding: 0 2px;
}
.sg-atom-remove:hover { opacity: 1; }
.sg-atom-edit {
  position: absolute; bottom: 100%; right: 0; margin-bottom: -2px; z-index: 30;
  border: 1px solid var(--theme-foreground-faintest, #e5e5e5); cursor: pointer;
  background: var(--theme-background-alt, #f0f0f0);
  border-radius: 5px 5px 0 0;
  font-size: 10px; line-height: 15px; height: 15px; opacity: 0; padding: 0 5px;
  pointer-events: none;
  transition: opacity 0.2s ease 0.35s;
}
.sg-atom:hover > .sg-atom-edit { opacity: 0.7; pointer-events: auto; transition-delay: 0s; }
.sg-atom > .sg-atom-edit:hover { opacity: 1; }
.sg-atom-body { padding: 4px 6px; overflow: auto; flex: 1 1 auto; min-height: 0; }
/* the body is the Inspector's node, so it gains the observablehq class;
   observablehq.com styles .observablehq with margin: 17px 0 — reset it
   (two-class selector outranks the site's one-class rule) */
.sg-atom-box > .sg-atom-body { margin: 0; }
.sg-atom-body > * { max-width: 100%; }
.sg-atom-body > form { width: 100%; max-width: none; }
.sg-atom-body form > div { flex: 1 1 auto; max-width: none; }
.sg-atom-body form input[type="range"] { flex: 1 1 auto; width: 100% !important; }
.sg-atom-body > svg { width: 100%; height: auto; }
.sg-editor-panel {
  position: absolute; z-index: 50;
  display: flex; flex-direction: column;
  min-width: 380px; max-width: 560px; max-height: 360px;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faint, #bbb);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.sg-editor-header {
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0; padding: 3px 8px;
  font: 11px var(--sans-serif, system-ui);
  color: var(--theme-foreground-muted, #666);
  background: var(--theme-background-alt, #f5f5f5);
  border-bottom: 1px solid var(--theme-foreground-faintest, #eee);
  border-radius: 6px 6px 0 0;
  cursor: grab; user-select: none;
}
.sg-editor-header span { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sg-editor-header button {
  border: none; background: none; cursor: pointer;
  font-size: 11px; line-height: 1; opacity: 0.5; padding: 0 2px;
}
.sg-editor-header button:hover { opacity: 1; }
.sg-editor-body { overflow: auto; flex: 1 1 auto; min-height: 0; }`
)};
const _79iuqn = function _gridContainer(main,sg_css,decompile,compile,cellEditor,Inspector,visualizer)
{
  // survives the self-rewrite remount cycle (factory closure outlives instances);
  // keyed by the viewed module, which is known at construction time
  const transient = new Map();
  // module -> {top, left, editors: [key]}
  const spanOf = (src, openIdx, open, close) => {
    let depth = 0, q = null;
    for (let i = openIdx; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '\\')
          i++;
        else if (c === q)
          q = null;
      } else if (c === '"' || c === '\'' || c === '`')
        q = c;
      else if (c === open)
        depth++;
      else if (c === close) {
        depth--;
        if (!depth)
          return i + 1;
      }
    }
    return -1;
  };
  return (rt, {invalidation, module = main, filter = () => true, include = null, grid = 20, columns = null, showGrid = true, width = '100%', height = 480, layout = {}, persist = true, detachNodes = true} = {}) => {
    // hide imports and runtime plumbing regardless of mode
    const HIDDEN_NAMES = new Set([
      'invalidation',
      '@variable',
      'visibility'
    ]);
    const baseFilter = (name, variables) => {
      for (const n of [
          name,
          variables?.[0]?._name
        ]) {
        if (typeof n !== 'string')
          continue;
        if (HIDDEN_NAMES.has(n))
          return false;
        if (n.startsWith('module '))
          return false;
      }
      return true;
    };
    let includeState = include ? [...include] : null;
    const includeFilter = (name, variables) => {
      if (!includeState)
        return true;
      for (const n of [
          name,
          variables?.[0]?._name
        ]) {
        if (typeof n === 'string' && includeState.includes(n))
          return true;
      }
      return false;
    };
    const userFilter = filter;
    filter = (...args) => baseFilter(...args) && includeFilter(...args) && userFilter(...args);
    const snap = v => Math.round(v / grid) * grid;
    const px = v => typeof v === 'number' ? v + 'px' : v;
    // reactive columns mode: atom x/y/w/h are grid units, pitch derives from width
    let columnsState = columns;
    let showGridState = showGrid;
    const unitMode = () => columnsState != null;
    const DOTS = 'radial-gradient(circle, color-mix(in srgb, currentColor 14%, transparent) 1px, transparent 1px)';
    const pitch = () => {
      if (!unitMode())
        return grid;
      const w = scroll.clientWidth || frame.clientWidth || 0;
      return w > 0 ? w / columnsState : grid;
    };
    const applyGridStyle = () => {
      const p = pitch();
      if (p > 0) {
        scroll.style.backgroundSize = `${ p }px ${ p }px`;
        scroll.style.backgroundPosition = `${ p / 2 }px ${ p / 2 }px`;
      }
      scroll.style.backgroundImage = showGridState ? DOTS : 'none';
    };
    const reflowAll = () => {
      applyGridStyle();
      for (const n of managedNodes())
        positionAtom(n);
    };
    const state = {
      frame: { ...layout.frame || {} },
      atoms: Object.fromEntries(Object.entries(layout.atoms || {}).map(([k, v]) => [
        k,
        { ...v }
      ]))
    };
    const frame = document.createElement('div');
    frame.className = 'sg-frame';
    frame.style.width = state.frame.w ? state.frame.w + 'px' : px(width);
    frame.style.height = state.frame.h ? state.frame.h + 'px' : px(height);
    const style = document.createElement('style');
    style.textContent = sg_css;
    frame.appendChild(style);
    const scroll = document.createElement('div');
    scroll.className = 'sg-scroll';
    frame.appendChild(scroll);
    applyGridStyle();
    let root;
    // assigned after visualizer creation
    // --- self-rewriting persistence: include + layout live in the defining cell
    const findSelf = () => [...rt._variables].find(v => v._value === frame);
    // what this instance was constructed from; used to skip no-op writes
    // (formatting differs between our serializer and the compiler)
    const stateSig = () => JSON.stringify([
      state,
      includeState,
      columnsState,
      showGridState
    ]);
    const constructedJSON = stateSig();
    const serializeLayout = () => {
      const frameLine = Object.keys(state.frame).length ? `    frame: ${ JSON.stringify(state.frame) },\n` : '';
      const atomLines = Object.entries(state.atoms).map(([k, p]) => `      ${ JSON.stringify(k) }: ${ JSON.stringify(p) }`);
      return `{\n${ frameLine }    atoms: {\n${ atomLines.join(',\n') }\n    }\n  }`;
    };
    const spliceProp = (src, prop, openChar, closeChar, serialized) => {
      const m = new RegExp(prop + '\\s*:\\s*\\' + openChar).exec(src);
      if (m) {
        const open = m.index + m[0].length - 1;
        const end = spanOf(src, open, openChar, closeChar);
        if (end < 0)
          return null;
        return src.slice(0, m.index) + prop + ': ' + serialized + src.slice(end);
      }
      // property absent: insert at the top of the options object
      const call = src.indexOf('gridContainer(');
      if (call < 0)
        return null;
      const optsOpen = src.indexOf('{', call);
      if (optsOpen < 0)
        return null;
      return src.slice(0, optsOpen + 1) + '\n  ' + prop + ': ' + serialized + ',' + src.slice(optsOpen + 1);
    };
    const spliceScalar = (src, prop, value, insertIfAbsent) => {
      const re = new RegExp('\\b' + prop + '\\s*:\\s*[^,}\\n]+');
      const m = re.exec(src);
      if (m)
        return src.slice(0, m.index) + prop + ': ' + value + src.slice(m.index + m[0].length);
      if (!insertIfAbsent)
        return src;
      const call = src.indexOf('gridContainer(');
      if (call < 0)
        return null;
      const optsOpen = src.indexOf('{', call);
      if (optsOpen < 0)
        return null;
      return src.slice(0, optsOpen + 1) + '\n  ' + prop + ': ' + value + ',' + src.slice(optsOpen + 1);
    };
    const rewriteSource = async () => {
      try {
        if (stateSig() === constructedJSON)
          return;
        const self = findSelf();
        if (!self) {
          console.warn('grid-container: defining cell not found; changes not saved');
          return;
        }
        // snapshot view state now, while this instance is live
        transient.set(module, {
          top: scroll.scrollTop,
          left: scroll.scrollLeft,
          editors: [...editors.keys()]
        });
        const src = await decompile([self]);
        // a newer instance may have taken over during the await — never write stale state
        if (self._value !== frame)
          return;
        let newSrc = src;
        if (includeState)
          newSrc = spliceProp(newSrc, 'include', '[', ']', JSON.stringify(includeState)) ?? newSrc;
        newSrc = spliceProp(newSrc, 'layout', '{', '}', serializeLayout());
        if (columnsState != null)
          newSrc = spliceScalar(newSrc, 'columns', String(columnsState), true) ?? newSrc;
        newSrc = spliceScalar(newSrc, 'showGrid', String(showGridState), showGridState === false) ?? newSrc;
        if (!newSrc || newSrc === src)
          return;
        // editable-md pattern: compile + redefine self; the cell recomputes and
        // remounts identically from the new literals
        const variables = compile(newSrc);
        self._inputs = variables[0]._inputs.map(n => self._module._resolve(n));
        let _fn;
        eval('_fn = ' + variables[0]._definition.toString());
        self.define(self._name, variables[0]._inputs, _fn);
      } catch (e) {
        console.warn('grid-container: source rewrite failed', e);
      }
    };
    // saves are event-driven (gesture end, menu click); the latch serializes
    // overlapping rewrites without dropping the latest state
    let saving = false, saveAgain = false;
    const scheduleSave = async () => {
      if (!persist)
        return;
      if (saving) {
        saveAgain = true;
        return;
      }
      saving = true;
      try {
        do {
          saveAgain = false;
          await rewriteSource();
        } while (saveAgain);
      } finally {
        saving = false;
      }
    };
    // settings (columns/showGrid) reflow live but persist only once the value
    // settles — a slider drag would otherwise rewrite the source per step
    let settingsSaveTimer = null;
    const scheduleSettingsSave = () => {
      if (!persist)
        return;
      if (settingsSaveTimer)
        window.clearTimeout(settingsSaveTimer);
      settingsSaveTimer = window.setTimeout(() => {
        settingsSaveTimer = null;
        scheduleSave();
      }, 350);
    };
    const keyOf = variable => variable?._name ?? (variable?.pid != null ? 'pid:' + variable.pid : null);
    const positionAtom = atom => {
      const pos = state.atoms[atom.dataset.sgKey];
      if (!pos)
        return;
      const u = unitMode() ? pitch() : 1;
      atom.style.left = (pos.x || 0) * u + 'px';
      atom.style.top = (pos.y || 0) * u + 'px';
      // size lives on the inner box (the resizable element); the outer wrapper
      // is width/height:max-content and follows it
      const box = atom.__box;
      if (box) {
        if (pos.w)
          box.style.width = pos.w * u + 'px';
        if (pos.h)
          box.style.height = pos.h * u + 'px';
      }
    };
    const managedNodes = () => root ? [...root.children].filter(n => n.classList?.contains('observablehq') && n.dataset.sgKey) : [];
    // deferred content-size measurement for atoms lacking an explicit unit size:
    // wait until the node has laid out (Inputs settle a frame or two after fulfilled)
    const pendingMeasure = new Set();
    const measureSoon = (node, key, tries) => window.requestAnimationFrame(() => {
      const pos = state.atoms[key];
      if (!pos || !unitMode() || !frame.isConnected) {
        pendingMeasure.delete(key);
        return;
      }
      const box = node.__box || node;
      const p = pitch();
      if ((p <= 0 || !box.offsetWidth) && tries < 30) {
        measureSoon(node, key, tries + 1);
        return;
      }
      if (p > 0) {
        if (pos.w == null && box.offsetWidth)
          pos.w = Math.max(1, Math.ceil(box.offsetWidth / p));
        if (pos.h == null && box.offsetHeight)
          pos.h = Math.max(1, Math.ceil(box.offsetHeight / p));
      }
      pendingMeasure.delete(key);
      positionAtom(node);
    });
    const ensurePositions = () => {
      if (!root)
        return;
      for (const node of root.children) {
        if (!node.classList || !node.classList.contains('observablehq'))
          continue;
        let key = node.dataset.sgKey;
        if (!key) {
          key = keyOf(node.variable) ?? 'slot:' + Object.keys(state.atoms).length;
          node.dataset.sgKey = key;
        }
        if (!state.atoms[key]) {
          // new atom: below the current content (not persisted until a user action)
          const defH = unitMode() ? 2 : 80;
          const bottom = Math.max(0, ...Object.values(state.atoms).map(p => (p.y || 0) + (p.h || defH)));
          state.atoms[key] = unitMode() ? {
            x: 0,
            y: Math.round(bottom) + 1
          } : {
            x: grid,
            y: snap(bottom + grid)
          };
        }
        // in columns mode every atom gets an explicit grid-unit size (rounded up
        // from its content) so it aligns and reflows with the pitch. Measure in a
        // deferred frame — Inputs (range etc.) settle their width after fulfilled,
        // and the natural size must be read before positionAtom pins an explicit one
        if (unitMode()) {
          const pos = state.atoms[key];
          if ((pos.w == null || pos.h == null) && !pendingMeasure.has(key)) {
            pendingMeasure.add(key);
            measureSoon(node, key, 0);
          }
        }
        positionAtom(node);
      }
    };
    // shelf packing: left-to-right rows in cell order, using measured sizes
    const pack = () => {
      if (!frame.isConnected)
        return;
      // never pack a detached (stale) instance
      const nodes = managedNodes();
      if (!nodes.length)
        return;
      const gap = unitMode() ? pitch() : grid;
      const W = (unitMode() ? scroll.clientWidth : frame.clientWidth) || 720;
      let x = gap, y = gap, rowH = 0;
      for (const n of nodes) {
        const w = n.offsetWidth || 240;
        const h = n.offsetHeight || 80;
        if (x > gap && x + w > W - gap) {
          x = gap;
          y += rowH + gap;
          rowH = 0;
        }
        const key = n.dataset.sgKey;
        const pos = state.atoms[key] || (state.atoms[key] = {});
        if (unitMode()) {
          const p = pitch();
          pos.x = Math.round(x / p);
          pos.y = Math.round(y / p);
        } else {
          pos.x = snap(x);
          pos.y = snap(y);
        }
        positionAtom(n);
        x = x + w + gap;
        rowH = Math.max(rowH, h);
      }
      scheduleSave();
    };
    // snap explicit (user-resized) sizes on release; record only real changes
    const snapSizes = () => {
      let changed = false;
      for (const n of managedNodes()) {
        const pos = state.atoms[n.dataset.sgKey];
        if (!pos)
          continue;
        // the user resizes the inner box, so its inline style/offset carry the change
        const box = n.__box || n;
        if (/px$/.test(box.style.width)) {
          if (unitMode()) {
            const p = pitch();
            const w = Math.max(1, Math.round(box.offsetWidth / p));
            box.style.width = w * p + 'px';
            if (pos.w !== w) {
              pos.w = w;
              changed = true;
            }
          } else {
            const w = Math.max(grid * 2, snap(box.offsetWidth));
            box.style.width = w + 'px';
            if (pos.w !== w) {
              pos.w = w;
              changed = true;
            }
          }
        }
        if (/px$/.test(box.style.height)) {
          if (unitMode()) {
            const p = pitch();
            const h = Math.max(1, Math.round(box.offsetHeight / p));
            box.style.height = h * p + 'px';
            if (pos.h !== h) {
              pos.h = h;
              changed = true;
            }
          } else {
            const h = Math.max(grid, snap(box.offsetHeight));
            box.style.height = h + 'px';
            if (pos.h !== h) {
              pos.h = h;
              changed = true;
            }
          }
        }
      }
      // record frame dims only once the user actually resized away from the
      // constructed defaults (browser resize rewrites inline style in px)
      if (/px$/.test(frame.style.width) && frame.style.width !== px(width)) {
        const fw = snap(frame.offsetWidth);
        frame.style.width = fw + 'px';
        if (state.frame.w !== fw) {
          state.frame.w = fw;
          changed = true;
        }
      }
      if (/px$/.test(frame.style.height) && frame.style.height !== px(height)) {
        const fh = snap(frame.offsetHeight);
        frame.style.height = fh + 'px';
        if (state.frame.h !== fh) {
          state.frame.h = fh;
          changed = true;
        }
      }
      if (changed)
        scheduleSave();
    };
    frame.addEventListener('pointerup', snapSizes);
    // --- include mutations (self-modify the include: literal)
    const currentKeys = () => managedNodes().map(n => n.dataset.sgKey);
    const addCell = name => {
      if (!includeState)
        includeState = currentKeys();
      if (!includeState.includes(name))
        includeState.push(name);
      scheduleSave();
    };
    const removeAtom = key => {
      if (!includeState)
        includeState = currentKeys();
      includeState = includeState.filter(k => k !== key);
      closeEditor(key);
      const atom = managedNodes().find(n => n.dataset.sgKey === key);
      if (atom)
        atom.style.display = 'none';
      // hide now; gone after remount
      scheduleSave();
    };
    const candidateNames = () => {
      const seen = new Set(includeState ?? currentKeys());
      const selfName = findSelf()?._name;
      const out = [];
      try {
        for (const [name, v] of module._scope) {
          if (typeof name !== 'string' || !name)
            continue;
          if (name.startsWith('module ') || HIDDEN_NAMES.has(name))
            continue;
          if (name.startsWith('initial ') || name.startsWith('mutable '))
            continue;
          if (module._scope.has('viewof ' + name))
            continue;
          // derived viewof value
          if (seen.has(name) || name === selfName)
            continue;
          // skip import bindings/builtins — they resolve as identity aliases
          // (single input of the same name)
          if (v?._inputs?.length === 1 && v._inputs[0]?._name === name)
            continue;
          if (v?._inputs?.some(i => i?._name?.startsWith('module ')))
            continue;
          out.push(name);
        }
      } catch (e) {
        console.warn('grid-container: cell enumeration failed', e);
      }
      return out.sort();
    };
    // --- templates: cells named template_X are instantiable from the menu.
    // A group is template_X plus every template_X_* cell; instantiation copies
    // each cell's decompiled source with a textual rename template_X -> X<N>,
    // which covers identifiers, include-list strings and layout keys uniformly.
    const templateRoots = () => {
      const all = new Set();
      try {
        for (const [name] of module._scope) {
          if (typeof name !== 'string')
            continue;
          const plain = name.replace(/^viewof /, '');
          if (!plain.startsWith('template_'))
            continue;
          if (!name.startsWith('viewof ') && module._scope.has('viewof ' + name))
            continue;
          // derived viewof value
          all.add(plain);
        }
      } catch {
      }
      const names = [...all];
      return names.filter(n => !names.some(o => o !== n && n.startsWith(o + '_'))).sort();
    };
    const instantiateTemplate = async rootName => {
      try {
        const base = rootName.replace(/^template_/, '');
        const taken = n => module._scope.has(n) || module._scope.has('viewof ' + n);
        let i = 1;
        while (taken(base + i))
          i++;
        const instName = base + i;
        const groupVars = [];
        for (const [name, v] of module._scope) {
          if (typeof name !== 'string')
            continue;
          const plain = name.replace(/^viewof /, '');
          if (plain !== rootName && !plain.startsWith(rootName + '_'))
            continue;
          if (!name.startsWith('viewof ') && module._scope.has('viewof ' + name))
            continue;
          // derived viewof value: compiled with its viewof cell
          groupVars.push(v);
        }
        for (const v of groupVars) {
          const src = await decompile([v]);
          const newSrc = src.split(rootName).join(instName);
          const specs = compile(newSrc);
          for (const spec of specs) {
            let _fn;
            eval('_fn = ' + spec._definition.toString());
            const nv = module.variable();
            nv.define(spec._name, spec._inputs, _fn);
            nv.pid = '_sg' + Math.random().toString(36).slice(2, 8);
          }
        }
        // surface every instantiated group member (viewofs + plain cells),
        // renamed the same way — so a template drops a whole working widget
        for (const v of groupVars)
          addCell(v._name.split(rootName).join(instName));
      } catch (e) {
        console.warn('grid-container: template instantiation failed', e);
      }
    };
    // --- floating cell editors: separate components above the atoms (z-index)
    const editors = new Map();
    // atomKey -> panel
    const closeEditor = key => {
      const panel = editors.get(key);
      if (!panel)
        return;
      panel.__sgEditor?.dispose?.();
      panel.remove();
      editors.delete(key);
    };
    const openEditor = (variable, atom) => {
      const key = atom.dataset.sgKey;
      if (!key)
        return;
      if (editors.has(key))
        return closeEditor(key);
      const panel = document.createElement('div');
      panel.className = 'sg-editor-panel';
      const head = document.createElement('div');
      head.className = 'sg-editor-header';
      const name = document.createElement('span');
      name.textContent = variable?._name ?? '(anonymous)';
      const close = document.createElement('button');
      close.textContent = '\u2715';
      close.title = 'close editor';
      close.addEventListener('pointerdown', e => e.stopPropagation());
      close.addEventListener('click', () => closeEditor(key));
      head.appendChild(name);
      head.appendChild(close);
      head.addEventListener('pointerdown', e => {
        e.preventDefault();
        const start = {
          x: e.clientX,
          y: e.clientY,
          px: parseFloat(panel.style.left) || 0,
          py: parseFloat(panel.style.top) || 0
        };
        try {
          head.setPointerCapture(e.pointerId);
        } catch {
        }
        const move = ev => {
          panel.style.left = Math.max(0, start.px + ev.clientX - start.x) + 'px';
          panel.style.top = Math.max(0, start.py + ev.clientY - start.y) + 'px';
        };
        const up = () => {
          head.removeEventListener('pointermove', move);
          head.removeEventListener('pointerup', up);
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
      });
      let ed;
      try {
        ed = cellEditor(variable, { pinned: true });
      } catch (err) {
        ed = document.createElement('div');
        ed.textContent = 'editor failed: ' + err;
      }
      panel.__sgEditor = ed;
      const body = document.createElement('div');
      body.className = 'sg-editor-body';
      body.appendChild(ed);
      panel.appendChild(head);
      panel.appendChild(body);
      const pos = state.atoms[key] || {
        x: grid,
        y: grid
      };
      const u = unitMode() ? pitch() : 1;
      panel.style.left = (pos.x || 0) * u + 'px';
      panel.style.top = (pos.y || 0) * u + (atom.offsetHeight || 40) + 10 + 'px';
      scroll.appendChild(panel);
      editors.set(key, panel);
    };
    const atomFactory = () => variable => {
      const atom = document.createElement('div');
      atom.className = 'observablehq sg-atom';
      const handle = document.createElement('div');
      handle.className = 'sg-atom-handle';
      const grip = document.createElement('span');
      grip.className = 'sg-atom-grip';
      grip.textContent = '\u283F';
      const label = document.createElement('span');
      label.className = 'sg-atom-title';
      label.textContent = variable?._name ?? '(anonymous)';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'sg-atom-remove';
      removeBtn.textContent = '\u2715';
      removeBtn.title = 'remove from widget';
      removeBtn.addEventListener('pointerdown', e => e.stopPropagation());
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        removeAtom(atom.dataset.sgKey);
      });
      const editBtn = document.createElement('button');
      editBtn.className = 'sg-atom-edit';
      editBtn.textContent = '\u270E';
      editBtn.title = 'edit cell';
      editBtn.addEventListener('pointerdown', e => e.stopPropagation());
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        openEditor(variable, atom);
      });
      handle.appendChild(grip);
      handle.appendChild(label);
      handle.appendChild(removeBtn);
      // inner box is the resizable/clipped surface; chrome stays on the outer atom
      // (overflow:visible) so it can sit above the box and clear neighbours
      const box = document.createElement('div');
      box.className = 'sg-atom-box';
      atom.__box = box;
      const body = document.createElement('div');
      body.className = 'sg-atom-body';
      box.appendChild(body);
      atom.appendChild(handle);
      atom.appendChild(editBtn);
      atom.appendChild(box);
      const inner = new Inspector(body);
      handle.addEventListener('pointerdown', e => {
        if (e.target === removeBtn)
          return;
        e.stopPropagation();
        e.preventDefault();
        const key = atom.dataset.sgKey;
        if (!key || !state.atoms[key])
          return;
        const pos = state.atoms[key];
        const start = {
          x: e.clientX,
          y: e.clientY,
          cx: pos.x,
          cy: pos.y
        };
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
        }
        atom.classList.add('sg-dragging');
        const move = ev => {
          if (unitMode()) {
            const p = pitch();
            pos.x = Math.max(0, Math.round((start.cx * p + ev.clientX - start.x) / p));
            pos.y = Math.max(0, Math.round((start.cy * p + ev.clientY - start.y) / p));
          } else {
            pos.x = Math.max(0, snap(start.cx + ev.clientX - start.x));
            pos.y = Math.max(0, snap(start.cy + ev.clientY - start.y));
          }
          positionAtom(atom);
        };
        const up = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          atom.classList.remove('sg-dragging');
          scheduleSave();
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
      });
      return {
        _node: atom,
        pending: () => {
          atom.classList.add('sg-running');
          inner.pending();
        },
        fulfilled: (value, name) => {
          atom.classList.remove('sg-running', 'sg-error');
          if (name)
            label.textContent = name;
          try {
            inner.fulfilled(value, name);
          } catch (e) {
            console.warn('grid-container: inspector fulfilled failed', e);
          }
          ensurePositions();
        },
        rejected: (error, name) => {
          atom.classList.remove('sg-running');
          atom.classList.add('sg-error');
          try {
            inner.rejected(error, name);
          } catch (e) {
            console.warn('grid-container: inspector rejected failed', e);
          }
          ensurePositions();
        }
      };
    };
    // public surface: any view can drive the grid (gridControls() is one
    // ordinary consumer, included like any cell \u2014 no privileged chrome)
    let ro = null;
    const ensureResizeObserver = () => {
      if (ro || !unitMode() || typeof window.ResizeObserver !== 'function')
        return;
      ro = new window.ResizeObserver(() => reflowAll());
      ro.observe(scroll);
    };
    frame.grid = {
      module,
      addCell,
      removeCell: removeAtom,
      pack,
      candidates: candidateNames,
      templates: templateRoots,
      instantiate: instantiateTemplate,
      isUnitMode: () => unitMode(),
      getColumns: () => columnsState,
      getShowGrid: () => showGridState,
      setShowGrid: b => {
        showGridState = !!b;
        applyGridStyle();
        scheduleSettingsSave();
      },
      setColumns: n => {
        n = Math.max(1, Math.round(n));
        if (n === columnsState)
          return;
        if (!unitMode()) {
          // migrate stored px positions into grid units at the new pitch
          const p = (scroll.clientWidth || frame.clientWidth || 720) / n;
          for (const pos of Object.values(state.atoms)) {
            if (pos.x != null)
              pos.x = Math.round(pos.x / p);
            if (pos.y != null)
              pos.y = Math.round(pos.y / p);
            if (pos.w != null)
              pos.w = Math.max(1, Math.round(pos.w / p));
            if (pos.h != null)
              pos.h = Math.max(1, Math.round(pos.h / p));
          }
        }
        columnsState = n;
        ensureResizeObserver();
        reflowAll();
        scheduleSettingsSave();
      }
    };
    const viz = visualizer(rt, {
      invalidation,
      module,
      filter,
      inspector: atomFactory,
      detachNodes,
      classList: 'lope-grid-container'
    });
    viz.classList.add('sg-viz-host');
    root = viz.querySelector('.lope-viz');
    scroll.appendChild(viz);
    ensureResizeObserver();
    const mo = new window.MutationObserver(records => {
      for (const rec of records) {
        for (const node of rec.removedNodes) {
          // reorders are remove+insert; only close for true removals
          if (node.dataset?.sgKey && !root.contains(node))
            closeEditor(node.dataset.sgKey);
        }
      }
      ensurePositions();
    });
    mo.observe(root, { childList: true });
    let restoreRaf = null;
    if (invalidation)
      Promise.resolve(invalidation).then(() => {
        mo.disconnect();
        if (ro)
          ro.disconnect();
        if (settingsSaveTimer)
          window.clearTimeout(settingsSaveTimer);
        if (restoreRaf)
          window.cancelAnimationFrame(restoreRaf);
        frame.removeEventListener('pointerup', snapSizes);
        for (const key of [...editors.keys()])
          closeEditor(key);
      });
    // restore transient view state (scroll, open editors) across a self-rewrite.
    // Runs from the first frame so the remount never paints unscrolled.
    {
      const t = transient.get(module);
      if (t) {
        transient.delete(module);
        const pending = new Set(t.editors);
        let frames = 0;
        const apply = () => {
          frames++;
          scroll.scrollTop = t.top;
          scroll.scrollLeft = t.left;
          for (const key of [...pending]) {
            const atom = managedNodes().find(n => n.dataset.sgKey === key);
            if (atom?.variable && !editors.has(key)) {
              openEditor(atom.variable, atom);
              pending.delete(key);
            }
          }
          const ok = !pending.size && Math.abs(scroll.scrollTop - t.top) < 2 && Math.abs(scroll.scrollLeft - t.left) < 2;
          if (!ok && frames < 300)
            restoreRaf = window.requestAnimationFrame(apply);
        };
        apply();
      }
    }
    ensurePositions();
    return frame;
  };
};
const _1gcctl = function _gridControls(Inputs){return(
() => {
  // a normal view: include it in a grid like any other cell. It drives the
  // grid-container that hosts it in the DOM through the frame's public
  // `grid` API, so user cells can implement their own controls the same way.
  // Consolidated: cell add/pack buttons + reactive grid settings (Inputs.form).
  const el = document.createElement('div');
  el.className = 'sg-controls';
  const host = () => {
    const f = el.closest('.sg-frame');
    return f && f.grid;
  };
  const buttons = document.createElement('div');
  buttons.className = 'sg-controls-row';
  // native <select> for adding cells — dismisses itself on blur/escape/select
  // (a custom popup could be left open with the pointer gone). Repopulated on open.
  const addSel = document.createElement('select');
  addSel.className = 'sg-add-select';
  addSel.title = 'add a cell (or instantiate a template) into the hosting grid';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '＋ add cell…';
  const rebuild = () => {
    addSel.replaceChildren(placeholder);
    placeholder.selected = true;
    const grid = host();
    if (!grid) {
      const o = document.createElement('option');
      o.disabled = true;
      o.textContent = 'not inside a grid';
      addSel.appendChild(o);
      return;
    }
    const tmpls = grid.templates();
    if (tmpls.length) {
      const og = document.createElement('optgroup');
      og.label = 'templates — instantiate a copy';
      for (const t of tmpls) {
        const o = document.createElement('option');
        o.value = 'tmpl:' + t;
        o.textContent = '⊕ ' + t.replace(/^template_/, '');
        og.appendChild(o);
      }
      addSel.appendChild(og);
    }
    const names = grid.candidates().filter(n => !n.replace(/^viewof /, '').startsWith('template_'));
    if (names.length) {
      const og = document.createElement('optgroup');
      og.label = 'cells';
      for (const name of names) {
        const o = document.createElement('option');
        o.value = 'cell:' + name;
        o.textContent = name;
        og.appendChild(o);
      }
      addSel.appendChild(og);
    }
    if (!tmpls.length && !names.length) {
      const o = document.createElement('option');
      o.disabled = true;
      o.textContent = 'no more cells';
      addSel.appendChild(o);
    }
  };
  // populate just before the native dropdown opens
  addSel.addEventListener('mousedown', rebuild);
  addSel.addEventListener('focus', rebuild);
  addSel.addEventListener('change', () => {
    const grid = host();
    const v = addSel.value;
    addSel.selectedIndex = 0;
    if (!grid || !v)
      return;
    if (v.startsWith('tmpl:'))
      grid.instantiate(v.slice(5));
    else if (v.startsWith('cell:'))
      grid.addCell(v.slice(5));
  });
  const packBtn = document.createElement('button');
  packBtn.textContent = '⊞ pack';
  packBtn.title = 'shelf-pack all atoms left-to-right';
  packBtn.addEventListener('click', () => {
    const g = host();
    if (g)
      g.pack();
  });
  buttons.appendChild(addSel);
  buttons.appendChild(packBtn);
  // reactive grid settings — a single Inputs.form {columns, showGrid} that
  // drives the host through setColumns/setShowGrid (only when in columns mode)
  const form = Inputs.form({
    columns: Inputs.range([
      1,
      24
    ], {
      step: 1,
      value: 12,
      label: 'columns'
    }),
    showGrid: Inputs.toggle({
      value: true,
      label: 'grid dots'
    })
  });
  form.classList.add('sg-settings');
  form.addEventListener('input', () => {
    const g = host();
    if (!g || !g.isUnitMode || !g.isUnitMode())
      return;
    if (g.setColumns)
      g.setColumns(form.value.columns);
    if (g.setShowGrid)
      g.setShowGrid(form.value.showGrid);
  });
  // reflect the host's persisted settings once mounted; hide settings entirely
  // when the host is a fixed-pixel (non-columns) grid. The visualizer adopts
  // this element into the frame asynchronously, so retry until host() resolves.
  let tries = 0;
  const reflect = () => {
    const g = host();
    if (!g) {
      if (tries++ < 120)
        window.requestAnimationFrame(reflect);
      return;
    }
    if (!g.isUnitMode || !g.isUnitMode()) {
      form.style.display = 'none';
      return;
    }
    const cols = g.getColumns ? g.getColumns() : null;
    const sg = g.getShowGrid ? g.getShowGrid() : null;
    form.value = {
      columns: cols != null ? cols : form.value.columns,
      showGrid: sg != null ? sg : form.value.showGrid
    };
  };
  window.requestAnimationFrame(reflect);
  el.appendChild(buttons);
  el.appendChild(form);
  return el;
}
)};
const _1gcct2 = function _controls(gridControls){return(
gridControls()
)};
const _1915hke = function _demo(md){return(
md`## Demo

The cells below form a small dataflow (\`freq\`, \`amp\` → \`wave\` → \`wavePlot\`, \`waveStats\`). The widget surface at the bottom composes the named pieces: rearrange them on the grid, use the **＋ add cell** dropdown / ✕ to change what's included, and watch the \`widget\` cell's source rewrite its \`include:\` and \`layout:\` literals (open its editor to see them change live).

The **＋ add cell** menu also lists **templates** — cell groups named \`template_*\`. This notebook ships a \`template_dial\` group (a hue slider + its colour swatch, \`template_dial_swatch\`); pick **⊕ dial** to instantiate a fresh copy (\`dial1\`, \`dial2\`, …), each a working linked pair dropped onto the grid.`
)};
const _6es2w1 = function _freq(Inputs){return(
Inputs.range([
  0.5,
  8
], {
  label: 'freq',
  step: 0.1,
  value: 2
})
)};
const _1qobt7m = (G, _) => G.input(_);
const _5vi3tw = function _amp(Inputs){return(
Inputs.range([
  5,
  60
], {
  label: 'amp',
  step: 1,
  value: 30
})
)};
const _1aucsko = (G, _) => G.input(_);
const _e1gs7b = function _wave(amp,freq){return(
Array.from({ length: 120 }, (_, i) => ({
  x: i,
  y: amp * Math.sin(i * freq * Math.PI / 30)
}))
)};
const _10ocase = function _waveStats(wave){return(
{
  n: wave.length,
  min: Math.min(...wave.map(d => d.y)).toFixed(1),
  max: Math.max(...wave.map(d => d.y)).toFixed(1)
}
)};
const _1tr1jbm = function _wavePlot(htl,wave){return(
htl.svg`<svg width="280" height="140" viewBox="0 0 280 140" style="display:block">
  <line x1="0" y1="70" x2="280" y2="70" stroke="#ccc"></line>
  <polyline fill="none" stroke="#4269d0" stroke-width="1.5"
    points="${ wave.map((d, i) => `${ (i / (wave.length - 1) * 280).toFixed(1) },${ (70 - d.y).toFixed(1) }`).join(' ') }"></polyline>
</svg>`
)};
const _tdial = function _template_dial(Inputs){return(
Inputs.range([
  0,
  360
], {
  label: 'hue',
  step: 1,
  value: 200
})
)};
const _tdialv = (G, _) => G.input(_);
const _tdialsw = function _template_dial_swatch(htl,template_dial){return(
htl.html`<div style="width:100%;height:100%;min-height:48px;border-radius:8px;background:hsl(${ template_dial } 70% 55%)"></div>`
)};
const _zjljg7 = function _gridModule(thisModule){return(
thisModule()
)};
const _j77c60 = (G, _) => G.input(_);
const _15y82jd = function _export_ui(exporter){return(
exporter()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));  
  $def("_10nfeqw", null, ["md"], _10nfeqw);  
  $def("_101xf8r", "widget", ["gridContainer","runtime","invalidation","gridModule"], _101xf8r);  
  $def("_arrhl6", "title", ["md"], _arrhl6);  
  $def("_1amxztb", "sg_css", [], _1amxztb);  
  $def("_79iuqn", "gridContainer", ["main","sg_css","decompile","compile","cellEditor","Inspector","visualizer"], _79iuqn);
  $def("_1gcctl", "gridControls", ["Inputs"], _1gcctl);
  $def("_1gcct2", "controls", ["gridControls"], _1gcct2);
  $def("_1915hke", "demo", ["md"], _1915hke);
  $def("_6es2w1", "viewof freq", ["Inputs"], _6es2w1);  
  $def("_1qobt7m", "freq", ["Generators","viewof freq"], _1qobt7m);  
  $def("_5vi3tw", "viewof amp", ["Inputs"], _5vi3tw);  
  $def("_1aucsko", "amp", ["Generators","viewof amp"], _1aucsko);  
  $def("_e1gs7b", "wave", ["amp","freq"], _e1gs7b);  
  $def("_10ocase", "waveStats", ["wave"], _10ocase);  
  $def("_1tr1jbm", "wavePlot", ["htl","wave"], _1tr1jbm);
  $def("_tdial", "viewof template_dial", ["Inputs"], _tdial);
  $def("_tdialv", "template_dial", ["Generators","viewof template_dial"], _tdialv);
  $def("_tdialsw", "template_dial_swatch", ["htl","template_dial"], _tdialsw);
  $def("_zjljg7", "viewof gridModule", ["thisModule"], _zjljg7);
  $def("_j77c60", "gridModule", ["Generators","viewof gridModule"], _j77c60);  
  $def("_15y82jd", "export_ui", ["exporter"], _15y82jd);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellEditor", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("cellEditor", _));
  return main;
}