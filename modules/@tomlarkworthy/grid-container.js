const _10nfeqw = function _1(md){return(
md`# Grid Container`
)};
const _101xf8r = function _widget(gridContainer,runtime,invalidation,gridModule){return(
gridContainer(runtime, {
  invalidation,
  module: gridModule,
  include: [
    "demo",
    "viewof freq",
    "viewof amp",
    "waveStats",
    "wavePlot",
    "export_ui"
  ],
  layout: {
    atoms: {
      demo: { x: 0, y: 0, w: 380, h: 460 },
      "viewof freq": { x: 400, y: 0, w: 500, h: 80 },
      "viewof amp": { x: 400, y: 80, w: 500, h: 80 },
      waveStats: { x: 400, y: 160, w: 500, h: 80 },
      wavePlot: { x: 400, y: 240, w: 500, h: 220 },
      export_ui: { x: 900, y: 240, w: 250, h: 220 }
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
  grid,                  // snap pitch in px, default 20
  width, height,         // container size, default "100%" x 480
  filter,                // extra predicate (cell_name, variables, i, state) => boolean
  persist,               // rewrite own source on change, default true
  detachNodes            // steal cell DOM from other views, default true
})
~~~

**＋ cell** lists the module's cells not yet on the surface; clicking one appends it to \`include:\`. Hover an atom for its handle: drag ⠿ to move (snaps to grid), ✕ removes it from \`include:\`, ✎ opens the cell editor in a floating panel above the surface. Drag an atom's bottom-right corner to resize — size snaps on release, content stretches to the atom, and the body gains scrollbars only when smaller than its content; unresized atoms track their content size. The container itself is resizable the same way. **⊞ pack** shelf-packs all atoms left-to-right.

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
  background-image: radial-gradient(circle, color-mix(in srgb, currentColor 14%, transparent) 1px, transparent 1px);
  background-attachment: local;
}
.sg-toolbar { position: absolute; top: 6px; right: 6px; z-index: 60; display: flex; gap: 4px; }
.sg-toolbar button {
  font: 11px var(--sans-serif, system-ui); padding: 2px 8px; cursor: pointer;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 4px; opacity: 0.7;
}
.sg-toolbar button:hover { opacity: 1; }
.sg-add-menu {
  position: absolute; top: 30px; right: 6px; z-index: 70;
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
.lope-grid-container > .sg-atom {
  box-sizing: border-box; display: flex; flex-direction: column;
  resize: both; overflow: hidden;
  min-width: 40px; min-height: 24px;
  width: max-content; height: max-content;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #e5e5e5);
  border-radius: 6px;
}
.sg-atom:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.sg-atom.sg-dragging { cursor: grabbing; z-index: 40; }
.sg-atom-handle {
  position: absolute; top: 0; left: 0; max-width: 70%; height: 14px;
  display: flex; align-items: center; gap: 3px; padding: 0 5px 0 3px;
  box-sizing: border-box;
  font: 9px var(--sans-serif, system-ui);
  color: var(--theme-foreground-muted, #666);
  background: color-mix(in srgb, var(--theme-background-alt, #f0f0f0) 92%, transparent);
  border: 1px solid var(--theme-foreground-faintest, #e5e5e5);
  border-top: none; border-left: none;
  border-radius: 6px 0 6px 0;
  opacity: 0; pointer-events: none;
  cursor: grab; user-select: none; z-index: 5;
  transition: opacity 0.12s;
}
.sg-atom:hover > .sg-atom-handle,
.sg-atom.sg-dragging > .sg-atom-handle { opacity: 1; pointer-events: auto; }
.sg-atom-grip { opacity: 0.6; }
.sg-atom-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sg-atom-remove {
  border: none; background: none; cursor: pointer;
  font-size: 9px; line-height: 1; opacity: 0.5; padding: 0 2px;
}
.sg-atom-remove:hover { opacity: 1; }
.sg-atom-edit {
  position: absolute; top: 0; right: 0; z-index: 5;
  border: none; cursor: pointer;
  background: color-mix(in srgb, var(--theme-background-alt, #f0f0f0) 92%, transparent);
  border-radius: 0 6px 0 6px;
  font-size: 10px; line-height: 14px; height: 14px; opacity: 0; padding: 0 4px;
  pointer-events: none;
  transition: opacity 0.12s;
}
.sg-atom:hover > .sg-atom-edit { opacity: 0.6; pointer-events: auto; }
.sg-atom > .sg-atom-edit:hover { opacity: 1; }
.sg-atom-body { padding: 4px 6px; overflow: auto; flex: 1 1 auto; min-height: 0; }
.sg-atom-body > * { max-width: 100%; }
.sg-atom-body > form { width: 100%; max-width: none; }
.sg-atom-body form > div { flex: 1 1 auto; max-width: none; }
.sg-atom-body form input[type="range"] { flex: 1 1 auto; width: 100% !important; }
.sg-atom-body > svg { width: 100%; height: auto; }
.sg-atom.sg-running { outline: 2px solid rgba(75, 156, 211, 0.7); }
.sg-atom.sg-error { outline: 2px solid #d73a49; }
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
  return (rt, {invalidation, module = main, filter = () => true, include = null, grid = 20, width = '100%', height = 480, layout = {}, persist = true, detachNodes = true} = {}) => {
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
    scroll.style.backgroundSize = `${ grid }px ${ grid }px`;
    scroll.style.backgroundPosition = `${ grid / 2 }px ${ grid / 2 }px`;
    frame.appendChild(scroll);
    let root;
    // assigned after visualizer creation
    // --- self-rewriting persistence: include + layout live in the defining cell
    const findSelf = () => [...rt._variables].find(v => v._value === frame);
    // what this instance was constructed from; used to skip no-op writes
    // (formatting differs between our serializer and the compiler)
    const constructedJSON = JSON.stringify([
      state,
      includeState
    ]);
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
    const rewriteSource = async () => {
      try {
        if (JSON.stringify([
            state,
            includeState
          ]) === constructedJSON)
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
    const keyOf = variable => variable?._name ?? (variable?.pid != null ? 'pid:' + variable.pid : null);
    const positionAtom = atom => {
      const pos = state.atoms[atom.dataset.sgKey];
      if (!pos)
        return;
      atom.style.left = pos.x + 'px';
      atom.style.top = pos.y + 'px';
      if (pos.w)
        atom.style.width = pos.w + 'px';
      if (pos.h)
        atom.style.height = pos.h + 'px';
    };
    const managedNodes = () => root ? [...root.children].filter(n => n.classList?.contains('observablehq') && n.dataset.sgKey) : [];
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
          const bottom = Math.max(0, ...Object.values(state.atoms).map(p => (p.y || 0) + (p.h || 80)));
          state.atoms[key] = {
            x: grid,
            y: snap(bottom + grid)
          };
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
      const W = frame.clientWidth || 720;
      let x = grid, y = grid, rowH = 0;
      for (const n of nodes) {
        const w = n.offsetWidth || 240;
        const h = n.offsetHeight || 80;
        if (x > grid && x + w > W - grid) {
          x = grid;
          y += snap(rowH) + grid;
          rowH = 0;
        }
        const key = n.dataset.sgKey;
        const pos = state.atoms[key] || (state.atoms[key] = {});
        pos.x = snap(x);
        pos.y = snap(y);
        positionAtom(n);
        x = pos.x + w + grid;
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
        if (/px$/.test(n.style.width)) {
          const w = Math.max(grid * 2, snap(n.offsetWidth));
          n.style.width = w + 'px';
          if (pos.w !== w) {
            pos.w = w;
            changed = true;
          }
        }
        if (/px$/.test(n.style.height)) {
          const h = Math.max(grid, snap(n.offsetHeight));
          n.style.height = h + 'px';
          if (pos.h !== h) {
            pos.h = h;
            changed = true;
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
        addCell(module._scope.has('viewof ' + instName) ? 'viewof ' + instName : instName);
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
      panel.style.left = pos.x + 'px';
      panel.style.top = pos.y + (atom.offsetHeight || 40) + 10 + 'px';
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
      const body = document.createElement('div');
      body.className = 'sg-atom-body';
      atom.appendChild(handle);
      atom.appendChild(editBtn);
      atom.appendChild(body);
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
          pos.x = Math.max(0, snap(start.cx + ev.clientX - start.x));
          pos.y = Math.max(0, snap(start.cy + ev.clientY - start.y));
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
    const toolbar = document.createElement('div');
    toolbar.className = 'sg-toolbar';
    const addMenu = document.createElement('div');
    addMenu.className = 'sg-add-menu';
    addMenu.style.display = 'none';
    const addBtn = document.createElement('button');
    addBtn.textContent = '\uFF0B cell';
    addBtn.title = 'add a cell to the widget';
    addBtn.addEventListener('click', () => {
      if (addMenu.style.display !== 'none') {
        addMenu.style.display = 'none';
        return;
      }
      addMenu.replaceChildren();
      const tmpls = templateRoots();
      if (tmpls.length) {
        const head = document.createElement('div');
        head.className = 'sg-add-empty';
        head.textContent = 'templates \u2014 instantiate a copy';
        addMenu.appendChild(head);
        for (const t of tmpls) {
          const item = document.createElement('button');
          item.textContent = '\u2295 ' + t.replace(/^template_/, '');
          item.title = 'copy the ' + t + ' cell group under a new name';
          item.addEventListener('click', () => {
            addMenu.style.display = 'none';
            instantiateTemplate(t);
          });
          addMenu.appendChild(item);
        }
      }
      const names = candidateNames().filter(n => !n.replace(/^viewof /, '').startsWith('template_'));
      if (names.length && tmpls.length) {
        const head = document.createElement('div');
        head.className = 'sg-add-empty';
        head.textContent = 'cells';
        addMenu.appendChild(head);
      }
      if (!names.length && !tmpls.length) {
        const empty = document.createElement('div');
        empty.className = 'sg-add-empty';
        empty.textContent = 'no more cells';
        addMenu.appendChild(empty);
      }
      for (const name of names) {
        const item = document.createElement('button');
        item.textContent = name;
        item.addEventListener('click', () => {
          addMenu.style.display = 'none';
          addCell(name);
        });
        addMenu.appendChild(item);
      }
      addMenu.style.display = '';
    });
    const packBtn = document.createElement('button');
    packBtn.textContent = '\u229E pack';
    packBtn.title = 'shelf-pack all atoms left-to-right';
    packBtn.addEventListener('click', () => pack());
    toolbar.appendChild(addBtn);
    toolbar.appendChild(packBtn);
    toolbar.addEventListener('pointerdown', e => e.stopPropagation());
    frame.appendChild(toolbar);
    frame.appendChild(addMenu);
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
const _1915hke = function _demo(md){return(
md`## Demo

The cells below form a small dataflow (\`freq\`, \`amp\` → \`wave\` → \`wavePlot\`, \`waveStats\`). The widget surface at the bottom composes the named pieces: rearrange them on the grid, use **＋ cell** / ✕ to change what's included, and watch the \`widget\` cell's source rewrite its \`include:\` and \`layout:\` literals (open its editor to see them change live).`
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
  $def("_1915hke", "demo", ["md"], _1915hke);  
  $def("_6es2w1", "viewof freq", ["Inputs"], _6es2w1);  
  $def("_1qobt7m", "freq", ["Generators","viewof freq"], _1qobt7m);  
  $def("_5vi3tw", "viewof amp", ["Inputs"], _5vi3tw);  
  $def("_1aucsko", "amp", ["Generators","viewof amp"], _1aucsko);  
  $def("_e1gs7b", "wave", ["amp","freq"], _e1gs7b);  
  $def("_10ocase", "waveStats", ["wave"], _10ocase);  
  $def("_1tr1jbm", "wavePlot", ["htl","wave"], _1tr1jbm);  
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