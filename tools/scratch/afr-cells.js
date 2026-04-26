// Cell declarations to be inserted before `export default function define(...)`.
const _afrProse01 = function _afrProse(md){return(
md`### Recursive Affordances — Live Dimensionality

Every anchor below is a drag handle **and** a spawn point. Plain drag moves it. **Alt-drag** pulls a new rod out of it. **Shift-click** removes a rod (and its descendants). Watch the \`params\` vector under the canvas grow and shrink as you build.

#### What's happening
- \`afrSpawns\` is a mutable list of records: \`{id, type, parentId, parentKey, state}\`.
- Each frame, \`afrRender(afrSpawns)\` walks the list in order, appending each spawn's scalars to a fresh \`params\` array, and emits the SVG fragment.
- New tip anchors carry the same \`rod\` spawn fn — so spawning is recursive. Chains and trees fall out of one definition.

#### Dimensionality is dynamic
\`params.length\` changes as you add/remove rods. No registry, no schema — only the spawn list is persisted. Indices never leak between frames, so removals never invalidate anyone.`
)};
const _afrSpawns01 = function _afrSpawns(){return(
[{ id: 'root', type: 'root', state: { x: 200, y: 200 } }]
)};
const _afrSpawns02 = (M, _) => new M(_);
const _afrSpawns03 = _ => _.generator;
const _afrRender01 = function _afrRender(){return(
(spawns, htl) => {
  const params = [];
  const paramMeta = [];
  const anchorIndex = new Map();
  const parts = [];
  const alloc = (spawnId, slotKey, value) => {
    const i = params.push(value) - 1;
    paramMeta.push({ spawnId, slotKey });
    return i;
  };
  const anchorNode = (spawnId, key, x, y, afford, fill) =>
    htl.svg`<circle class="afr-anchor"
      data-spawn=${spawnId} data-key=${key} data-afford=${afford}
      cx=${x} cy=${y} r="9" fill=${fill}
      stroke="white" stroke-width="2" style="cursor:grab"/>`;
  for (const s of spawns) {
    if (s.type === 'root') {
      const xi = alloc(s.id, 'x', s.state.x);
      const yi = alloc(s.id, 'y', s.state.y);
      const x = params[xi], y = params[yi];
      anchorIndex.set(s.id + ':A', { xi, yi, x, y });
      parts.push(anchorNode(s.id, 'A', x, y, 'rod', '#4af'));
    } else if (s.type === 'rod') {
      const bxi = alloc(s.id, 'bx', s.state.bx);
      const byi = alloc(s.id, 'by', s.state.by);
      const bx = params[bxi], by = params[byi];
      const from = anchorIndex.get(s.parentId + ':' + s.parentKey);
      if (!from) continue;
      anchorIndex.set(s.id + ':B', { xi: bxi, yi: byi, x: bx, y: by });
      parts.push(htl.svg`<line x1=${from.x} y1=${from.y} x2=${bx} y2=${by}
        stroke="#4af" stroke-width="3" stroke-linecap="round"/>`);
      parts.push(anchorNode(s.id, 'B', bx, by, 'rod', '#fa4'));
    }
  }
  return { parts, params, paramMeta, anchorIndex };
}
)};
const _afrState01 = function _afrState(afrRender, afrSpawns, htl){return(
afrRender(afrSpawns, htl)
)};
const _afrSvg01 = function _afrSvg(afrState, htl, $0)
{
  const { parts } = afrState;
  const container = htl.svg`<svg width="400" height="400" viewBox="0 0 400 400"
    style="border-radius:8px;background:#0d1117;user-select:none;touch-action:none;display:block"></svg>`;
  for (const p of parts) container.append(p);
  const clientToLocal = (ev) => {
    const pt = container.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    return pt.matrixTransform(container.getScreenCTM().inverse());
  };
  const collectDescendants = (list, rootId) => {
    const out = new Set([rootId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of list) {
        if (s.parentId && out.has(s.parentId) && !out.has(s.id)) {
          out.add(s.id);
          grew = true;
        }
      }
    }
    return out;
  };
  const patchState = (id, patch) => {
    const live = $0.value;
    $0.value = live.map(s => s.id === id ? { ...s, state: { ...s.state, ...patch } } : s);
  };
  container.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('afr-anchor')) return;
    e.preventDefault();
    const spawnId = t.dataset.spawn;
    const key = t.dataset.key;
    const live0 = $0.value;
    if (e.shiftKey) {
      const toRemove = collectDescendants(live0, spawnId);
      $0.value = live0.filter(s => !toRemove.has(s.id));
      return;
    }
    const p0 = clientToLocal(e);
    let dragId = spawnId;
    let dragType = (live0.find(s => s.id === spawnId) || {}).type;
    if (e.altKey) {
      const newId = 'r' + Math.random().toString(36).slice(2, 8);
      const newRec = {
        id: newId, type: 'rod',
        parentId: spawnId, parentKey: key,
        state: { bx: p0.x + 0.01, by: p0.y + 0.01 }
      };
      $0.value = [...live0, newRec];
      dragId = newId;
      dragType = 'rod';
    }
    const onMove = (ev) => {
      const p = clientToLocal(ev);
      if (dragType === 'root') patchState(dragId, { x: p.x, y: p.y });
      else if (dragType === 'rod') patchState(dragId, { bx: p.x, by: p.y });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
  return container;
};
const _afrParamsView01 = function _afrParamsView(afrState, htl){return(
htl.html`<div style="font-family:ui-monospace,monospace;font-size:12px;padding:10px;background:#0d1117;color:#8bb;border-radius:8px">
  <div style="color:#4af">params (length <b style="color:white">${afrState.params.length}</b>):</div>
  <div style="margin-top:6px;color:white;word-break:break-all">[${afrState.params.map(v => v.toFixed(1)).join(', ')}]</div>
  <div style="color:#666;margin-top:8px;font-size:11px">slots: ${afrState.paramMeta.map(m => m.spawnId + ':' + m.slotKey).join(', ')}</div>
</div>`
)};
// === END cell declarations ===

// $def calls to be inserted before `return main;` in define():
//  $def("_afrProse01", "afrProse", ["md"], _afrProse01);
//  $def("_afrSpawns01", "initial afrSpawns", [], _afrSpawns01);
//  $def("_afrSpawns02", "mutable afrSpawns", ["Mutable","initial afrSpawns"], _afrSpawns02);
//  $def("_afrSpawns03", "afrSpawns", ["mutable afrSpawns"], _afrSpawns03);
//  $def("_afrRender01", "afrRender", [], _afrRender01);
//  $def("_afrState01", "afrState", ["afrRender","afrSpawns","htl"], _afrState01);
//  $def("_afrSvg01", "afrSvg", ["afrState","htl","mutable afrSpawns"], _afrSvg01);
//  $def("_afrParamsView01", "afrParamsView", ["afrState","htl"], _afrParamsView01);
