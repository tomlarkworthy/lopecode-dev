const _1tdjp0a = function _title(md){return(
md`# Editor: Reactive Userspace Cell Mutator (v5)

[YouTube explainer](https://www.youtube.com/shorts/6FjeJRBC2iw)

A cell that edits the source of other cells. It is implemented in userspace as a normal cell, so it follows exported notebooks, so exported notebooks become editable! It pairs particularly well with the [single file export](https://observablehq.com/@tomlarkworthy/exporter-3), because edits are also exported, so you can permanently save your works in a format that continues to be editable and exportable indefinitely. It works offline too!


The editor is able to edit _any_ cell in the runtime, including those in dependancies. Import \`auto_attach\` and run that cell. You can also instanciate an editor component on any variable reference.

\`\`\`js
import {auto_attach, cellEditor} from '@tomlarkworthy/editor-5'
\`\`\`


#### Use cases
- Edit notebooks offline
- Try things out without committing to them
- Improved debugging workflow, as you can insert \`debugger\` expressions to dependancies on-demand.
`
)};
const _dm53bx = function _2(md){return(
md`## Example`
)};
const _61oxjf = function _title_variable(lookupVariable,editorModule){return(
lookupVariable("title", editorModule)
)};
const _15uilf0 = function _4(cellEditor,title_variable){return(
cellEditor(title_variable, { pinned: true })
)};
const _wpcfq8 = function _5(md){return(
md`## TODO
- open new cell edtior
- SyntaxErrors (see Runtime, they are cells)
- Rename cell
  - UI variable name does not update
- Load cell from hash, will need the main module named properly in moduleMap
- Import node support (maybe this is a different concern)`
)};
const _1ociws4 = function _6(md){return(
md`## Sync editors`
)};
const _hdieof = function _editors(){return(
new Map()
)};
const _ipx6cz = function _auto_attach(keepalive,editorModule,syncers,attachContextManu,divToVar,runtime,editors,cellEditor)
{
    keepalive(editorModule, 'editor_jobs');
    syncers;
    const placed = new Set();
    if (attachContextManu) {
        document.querySelectorAll('.observablehq').forEach(div => {
            const variable = divToVar(runtime, div);
            if (!variable)
                return;
            if (!editors.has(variable)) {
                editors.set(variable, cellEditor(variable));
            }
            const editor = editors.get(variable);
            const next = div.nextSibling;
            if (next !== editor) {
                const ae = document.activeElement;
                const hadFocus = ae && editor.contains(ae);
                let restore = null;
                if (hadFocus) {
                    const fe = ae;
                    if (fe && (fe.tagName === 'INPUT' || fe.tagName === 'TEXTAREA') && 'selectionStart' in fe) {
                        const start = fe.selectionStart, end = fe.selectionEnd;
                        restore = () => {
                            fe.focus({ preventScroll: true });
                            fe.setSelectionRange(start, end);
                        };
                    } else {
                        restore = () => fe?.focus?.({ preventScroll: true });
                    }
                }
                div.after(editor);
                restore?.();
            }
            placed.add(variable);
        });
    }
    [...editors.entries()].forEach(([variable, editor]) => {
        if (!placed.has(variable)) {
            editor.dispose?.();
            editor.remove();
            editors.delete(variable);
        }
    });
};
const _1iwobxt = function _divToVar(){return(
function divToVar(runtime, div) {
  if (!div) return undefined;
  if (div.variable) {
    return div.variable;
  } else {
    return [...runtime._variables].find((v) => v._observer._node === div);
  }
}
)};
const _1usw8c2 = async function _attachContextManu(Inputs,isOnObservableCom,optionsFile){return(
Inputs.toggle({
  label: "attach menu",
  value: (await optionsFile.json())?.__attachMenu ?? !isOnObservableCom()
})
)};
const _1oaz8r1 = (G, _) => G.input(_);
const _pamenu = function _persist_attach_menu($0,attachContextManu,Event){
  // Bake the global edit-mode flag into cell_options.json so it survives export/fork.
  // Depends on `viewof options` (element, stable), not `options` (value), so this
  // write does not re-trigger itself; save_options then persists the attachment.
  $0.value.__attachMenu = attachContextManu;
  $0.dispatchEvent(new Event("input"));
  return "persist_attach_menu";
};
const _16ks4jz = function _12(md){return(
md`## \`cellEditor\` component

Using Dataflow templating to create reusable Hotbar Component builder`
)};
const _199ztvl = function _hotbarTemplate(lookupVariable,editorModule){return(
lookupVariable(
  [
    ...[
      "editedCell",
      "edit",
      "select",
      "up",
      "down",
      "remove",
      "apply",
      "addCells",
      "copy",
      "paste"
    ].flatMap((name) => ["viewof " + name, name]),
    "code_editor",
    "hotbar",
    "code_editor_view",
    "editor_manager",
    "toolbar",
    "selectVariable",
    "compile_and_update",
    "decompiled",
    "editor_refresh_from_runtime"
  ],
  editorModule
)
)};
const _1q95xt6 = function _cellEditor(cloneDataflow,editorTemplate,shellTemplate,getOption,Event,setOption,createCell,findCell,pinOnCreate,dragReorder){return(
(variable, {
    pinned = undefined
} = {}) => {
    const host = document.createElement('div');
    let shellDispose = null;
    let heavyDispose = null;
    let editView = null;
    let shellEl = null;
    let body = null;
    const clearBody = () => {
        if (body)
            body.replaceChildren();
    };
    const closeHeavy = () => {
        if (heavyDispose) {
            heavyDispose();
            heavyDispose = null;
        }
        clearBody();
    };
    const openHeavy = () => {
        if (heavyDispose)
            return;
        if (!body)
            return;
        heavyDispose = cloneDataflow(editorTemplate, name => {
            if (name === 'editor_panel') {
                return {
                    fulfilled: element => {
                        if (!element)
                            return;
                        if (!body)
                            return;
                        if (body.firstChild !== element || body.childNodes.length !== 1) {
                            body.replaceChildren(element);
                        }
                    }
                };
            }
            if (name === 'selectVariable') {
                return {
                    fulfilled: selectVariable => {
                        if (typeof selectVariable !== 'function')
                            return;
                        selectVariable(variable);
                    }
                };
            }
            return {};
        });
    };
    const syncOpen = () => {
        const open = !!(editView && editView.value);
        if (open)
            openHeavy();
        else
            closeHeavy();
        if (shellEl) {
            const bodyEl = shellEl.querySelector('.cell-editor-body');
            if (bodyEl)
                bodyEl.style.display = open ? 'block' : 'none';
        }
    };
    shellDispose = cloneDataflow(shellTemplate, name => {
        if (name === 'hotbar_shell') {
            return {
                fulfilled: element => {
                    if (!element)
                        return;
                    shellEl = element;
                    host.replaceChildren(element);
                    body = element.querySelector('.cell-editor-body');
                    // Lightweight "add cell below" on the always-present shell,
                    // so a cell can be inserted without opening the heavy editor.
                    const hotbar = element.querySelector('.hotbar');
                    if (hotbar && !hotbar.querySelector('.add-cell-btn')) {
                        const add = document.createElement('span');
                        add.className = 'add-cell-btn';
                        add.textContent = '➕';
                        add.title = 'Add cell below';
                        add.style.cssText = 'cursor: pointer; margin-right: 6px;';
                        add.tabIndex = -1;
                        add.addEventListener('mousedown', e => e.preventDefault());
                        add.addEventListener('click', e => {
                            e.stopPropagation();
                            createCell({ cell: findCell(variable) });
                        });
                        hotbar.prepend(add);
                    }
                    // Drag the whole hotbar to reorder this cell (alternative to up/down arrows).
                    if (hotbar && !hotbar.dataset.reorderable) {
                        hotbar.dataset.reorderable = '1';
                        hotbar.style.cursor = 'grab';
                        const grip = document.createElement('span');
                        grip.className = 'reorder-grip';
                        grip.textContent = '⠿'; // ⠿ drag handle
                        grip.title = 'Drag to reorder cell';
                        // Float left so the grip sits at the far edge of the full-width
                        // bar, while ➕/edit stay right-aligned via the shell's text-align.
                        grip.style.cssText = 'float: left; margin-left: 4px; opacity: 0.55;';
                        hotbar.prepend(grip);
                        dragReorder(variable, hotbar);
                    }
                    if (body)
                        syncOpen();
                }
            };
        }
        if (name === 'selectVariable') {
            return {
                fulfilled: selectVariable => {
                    if (typeof selectVariable !== 'function')
                        return;
                    selectVariable(variable);
                }
            };
        }
        if (name === 'viewof edit') {
            return {
                fulfilled: view => {
                    if (!view)
                        return;
                    editView = view;
                    const forceOpen = !!(variable?.pid && pinOnCreate.has(variable.pid));
                    if (forceOpen)
                        pinOnCreate.delete(variable.pid);
                    const resolved_pinned = forceOpen || !!getOption(variable, 'pinned', pinned);
                    view.value = resolved_pinned;
                    view.dispatchEvent(new Event('input'));
                    syncOpen();
                    view.addEventListener('input', () => {
                        const next = !!view.value;
                        setOption(variable, 'pinned', next);
                        syncOpen();
                    });
                }
            };
        }
        return {};
    });
    host.dispose = () => {
        closeHeavy();
        if (shellDispose) {
            shellDispose();
            shellDispose = null;
        }
    };
    return host;
}
)};
const _x5ixji = function _hotbar_shell($0,Event,htl,edit)
{
  const toggle = () => {
    $0.value = !$0.value;
    $0.dispatchEvent(new Event("input"));
  };

  const el = htl.html`<div class="cell-editor"
    style="display: flex;
           flex-direction: column;
           background: var(--theme-background-alt);">
    <style>
      .cell-editor .cm-editor {
        height: fit-content;
        background-color: var(--theme-background);
      }
      .cell-editor .hotbar {
        margin-left: auto;
        text-align: right;
        font-family: var(--monospace);
        font-size: 12px;
        height: 17px;
        outline: 1px solid var(--theme-background-alt);
        user-select: none;
      }
    </style>

    <div style="width:100%; cursor: pointer;" onclick=${toggle}>
      <div class="hotbar">${edit ? "close" : "edit"}</div>
    </div>

    <div class="cell-editor-body" style="display: ${
      edit ? "block" : "none"
    };"></div>
  </div>`;

  el.addEventListener("click", (evt) => evt.stopPropagation());
  return el;
};
const _1ed5zb9 = function _editor_panel($0,htl,toolbar,nav,reversibleAttach,combine,code_editor)
{
  const cell = $0.value;
  return htl.html`<div style="display: flex; flex-direction: column;">
    ${toolbar}
    ${cell ? nav(cell) : null}
    <div style="flex-grow: 1; padding-bottom: 1rem;">
      ${reversibleAttach(combine, code_editor)}
    </div>
  </div>`;
};
const _yk7udl = function _shellTemplate($0,editedCell,selectVariable,$1,edit,hotbar_shell,lookupVariable,editorModule)
{
    // Force reactive deps on every looked-up variable so the cached lookup
    // refreshes when any template cell is redefined. Without these, redefining
    // e.g. `hotbar_shell` leaves clones holding stale variable handles.
    [
        $0,
        editedCell,
        selectVariable,
        $1,
        edit,
        hotbar_shell
    ];
    return lookupVariable([
        'editedCell',
        'viewof editedCell',
        'selectVariable',
        'viewof edit',
        'edit',
        'hotbar_shell'
    ], editorModule);
};
const _jot8he = function _editorTemplate($0,editedCell,selectVariable,$1,$2,$3,$4,$5,$6,$7,$8,toolbar,nav,cellLinks,variableLink,decompiled,code_editor_view,code_editor,editor_manager,editor_refresh_from_runtime,editor_panel,lookupVariable,editorModule)
{
    // Force reactive deps on every looked-up variable so the cached lookup
    // refreshes when any template cell is redefined. Without these, redefining
    // e.g. `viewof apply` leaves heavies cloning against stale variable handles.
    [
        $0,
        editedCell,
        selectVariable,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        toolbar,
        nav,
        cellLinks,
        variableLink,
        decompiled,
        code_editor_view,
        code_editor,
        editor_manager,
        editor_refresh_from_runtime,
        editor_panel
    ];
    return lookupVariable([
        'editedCell',
        'viewof editedCell',
        'selectVariable',
        'viewof select',
        'viewof up',
        'viewof down',
        'viewof remove',
        'viewof addCells',
        'viewof apply',
        'viewof copy',
        'viewof paste',
        'toolbar',
        'nav',
        'cellLinks',
        'variableLink',
        'decompiled',
        'code_editor_view',
        'code_editor',
        'editor_manager',
        'editor_refresh_from_runtime',
        'editor_panel'
    ], editorModule);
};
const _oshnzp = function _19(md){return(
md`## Hotbar Prototype`
)};
const _1o2h65s = function _editedCell(Inputs){return(
Inputs.input(null)
)};
const _7g3h7h = (G, _) => G.input(_);
const _1urs1md = function _findCell($0,modules){return(
(variable, dom = undefined) => {
  if (variable) {
    const cells = $0.value.get(variable._module) || [];
    let cell = cells.find((cell) => cell.variables.includes(variable));
    if (!cell) {
      console.warn("Could not find cell for ", variable);
      return;
    }
    cell = {
      dom,
      name: cell.name,
      module: {
        cells: cells,
        ...modules.get(variable._module)
      },
      variables: cell.variables
    };
    return cell;
  }
}
)};
const _1uhm0y9 = function _selectVariable(findCell,_,$0,Event){return(
async function selectVariable(variable, dom = undefined) {
  console.log("selectVariable", variable);
  let cell = findCell(variable, dom);
  if (!_.isEqual($0.value, cell)) {
    $0.value = cell;
    $0.dispatchEvent(new Event("input"));
  } else {
    $0.value = cell;
  }
  return cell;
}
)};
const _3jxaqk = function _23(selectVariable,hotbarTemplate)
{
return selectVariable(hotbarTemplate[5]);
};
const _49mpmh = function _hotbar($0,Event,setOption,$1,htl,edit,toolbar,nav,reversibleAttach,combine,code_editor)
{
  console.log("hotbar start");
  const toggle = () => {
    $0.value = !$0.value;
    $0.dispatchEvent(new Event("input"));
    setOption(
      $1.value.variables[0],
      "pinned",
      $0.value
    );
  };

  const combined = htl.html`<div class="cell-editor" 
    style="display: flex;
           flex-direction: column;
           background: var(--theme-background-alt);">
  <style>
    .picked {
      outline: 1px dashed #999;
    }
    .cm-editor {
      height: fit-content;
      background-color: var(--theme-background);
    }
    .hotbar {
      margin-left: auto;
      text-align: right;
      font-family: var(--monospace);
      font-size: 12px;
      height: 17px;
      outline: 1px solid var(--theme-background-alt);
    }
  </style>
  <div style="width:100%; cursor: pointer;" onclick=${toggle}>
    <div class="hotbar">
      ${edit ? "close" : "edit"}
    </div>
  </div>
  <div style="display: ${edit ? "block" : "none"};">
    ${toolbar}
    ${nav($1.value)}
    <div style="flex-grow: 1; padding-bottom: 1rem;">
      ${reversibleAttach(combine, code_editor)}
    </div>
  </div>
    
</div>`;

  combined.addEventListener("mouseup", (event) => {});
  combined.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  console.log("hotbar stop");
  return combined;
};
const _n8s6yl = function _25($0){return(
$0.value
)};
const _ytd2rq = function _26(nav,editedCell){return(
nav(editedCell)
)};
const _1t4gep6 = function _nav(html,cellLinks){return(
function nav(editedCell) {
  const outputs = [...editedCell.variables[0]._outputs];
  const inputs = editedCell.variables[0]._inputs;
  return html`<div>
<span>${cellLinks("inputs", inputs)}</span>
<span>${cellLinks("outputs", outputs)}</span>
</div>`;
}
)};
const _1tv9qxo = function _cellLinks(html,variableLink){return(
function cellLinks(label, variables) {
  if (variables.length == 0) return [];
  return html`${label}: ${variables.map(
    (v, index) =>
      html`${index > 0 ? ", " : ""}<a href="${variableLink(v)}">${
        v._name || "anon"
      }</a>`
  )} `;
}
)};
const _1opggh8 = async function _identity(lookupVariable,editorModule){return(
(await lookupVariable("lookupVariable", editorModule))._definition
)};
const _1nfia2p = function _variableLink(identity,navHref,modules)
{
    return v => {
        if (v._type === 2 && v._inputs.length == 1) {
            // Implicit variable created on reference, go up one
            v = v._inputs[0];
        }
        // Follow import chain to the defining module
        const idStr = identity?.toString();
        if (idStr) {
            while (v._inputs?.length === 1 && v._definition?.toString() === idStr) {
                v = v._inputs[0];
            }
        }
        return navHref(`${ modules.get(v._module).name }${ typeof v._name == 'string' ? `#${ v._name }` : '' }`);
    };
};
const _1tm2n0w = function _31(md){return(
md`Save edits by exporting to a single file`
)};
const _16wblye = function _32(md){return(
md`### Known Issues
- If you create a new cell, it is invisible, it will appear after exporting.`
)};
const _1jdvxd9 = function _33(md){return(
md`### Editor UI Components`
)};
const _1j1loxx = function _combine(Inputs){return(
Inputs.toggle({
  label: "untick to destructure",
  value: true
})
)};
const _1h8337z = (G, _) => G.input(_);
const _tct2nf = function _edit(Inputs){return(
Inputs.toggle({ label: "edit" })
)};
const _7izj7k = (G, _) => G.input(_);
const _1fwb5jc = function _toolbar(htl,reversibleAttach,combine,$0,$1,$2,$3,$4,$5,$6,$7){return(
htl.html`<div
    class="toolbar"
    style="display: flex; gap: 4px;"
>
    <style>
      .toolbar form { width: auto; }
      .toolbar label { user-select: none; }
    </style>
    ${reversibleAttach(combine, $0)}
    ${reversibleAttach(combine, $1)}
    ${reversibleAttach(combine, $2)}
    ${reversibleAttach(combine, $3)}
    ${reversibleAttach(combine, $4)}
    ${reversibleAttach(combine, $5)}
    ${reversibleAttach(combine, $6)}
    ${reversibleAttach(combine, $7)}
    <span style="flex-grow: 1;"></span>
</div>`
)};
const _yej3hb = function _addCells(Inputs,createCell,$0){return(
Inputs.button("➕", {
  reduce: async () => {
    await createCell({ cell: $0.value });
  }
})
)};
const _1aii9ps = (G, _) => G.input(_);
const _1bn860e = function _remove(Inputs,deleteCell,$0){return(
Inputs.button("🗑️", {
  reduce: () => deleteCell({ cell: $0.value })
})
)};
const _1ad0xr8 = (G, _) => G.input(_);
const _lwb7d7 = function _apply(Inputs,compile_and_update,code_editor_view,editedCell,replaceCodeMirrorDoc)
{
    const button = Inputs.button('\u25B6️', {
        reduce: async () => {
            // #166: Read source directly from the live CodeMirror view rather than from
            // `states.get(editedCell.variables[0])`. After a kind-changing recompile
            // (regular -> import, etc.), `editedCell.variables[0]` is a freshly-defined
            // variable that the `cellIdFacet` map was never keyed by, so a `states.get`
            // lookup returns undefined and `.doc.toString()` throws.
            // After compile, push the decompiled (canonical) source back into
            // the editor so the user sees what the runtime actually has.
            const canonical = await compile_and_update(code_editor_view.state.doc.toString(), editedCell.variables, editedCell);
            if (typeof canonical === 'string') {
                replaceCodeMirrorDoc(code_editor_view, canonical, { preserveCursor: true });
            }
        }
    });
    // supress gaining focus
    // doesn't work on observable iframe
    // https://issues.chromium.org/issues/40654608
    button.tabIndex = '-1';
    button.onmousedown = e => e.preventDefault();
    return button;
};
const _1cjyuqm = (G, _) => G.input(_);
const _14rfku9 = function _up(Inputs,moveCell,$0){return(
Inputs.button("⬆", {
  reduce: () => moveCell($0.value, -1)
})
)};
const _frzs5d = (G, _) => G.input(_);
const _9pymuj = function _paste(Inputs,readObservableClipboardCells,pasteObservableCellsIntoModule,editedCell){return(
Inputs.button("📋", {
  reduce: async () => {
    const cells = await readObservableClipboardCells();
    return pasteObservableCellsIntoModule({ cells, editedCell });
  }
})
)};
const _1whsszt = (G, _) => G.input(_);
const _corxwl = function _down(Inputs,moveCell,$0){return(
Inputs.button("⬇", {
  reduce: () => moveCell($0.value, 1)
})
)};
const _1to28po = (G, _) => G.input(_);
const _gia2ci = function _copy(Inputs,html,$0,decompile,$1,getOption,cellsToClipboard){return(
Inputs.button(
  html`<span style="font-size: .875em; margin-right: .125em; position: relative; top: -.25em; left: -.125em">
  📄<span style="position: absolute; top: .25em; left: .25em">📄</span>
</span>`,
  {
    reduce: async () => {
      const current = $0.value;
      if (!current?.variables?.length) return;

      const seen = new Set();
      const cells = [];

      const add = async (variables) => {
        const key = variables?.[0];
        if (!key || seen.has(key)) return;
        seen.add(key);
        cells.push(await decompile(variables));
      };

      await add(current.variables);

      const live = $1.value;
      if (live?.entries) {
        for (const [, moduleCells] of live.entries()) {
          for (const c of moduleCells || []) {
            const v0 = c?.variables?.[0];
            if (!v0) continue;
            if (v0 === current.variables[0]) continue;
            if (getOption(v0, "selected", false)) {
              await add(c.variables);
            }
          }
        }
      }

      await cellsToClipboard(cells);
    }
  }
)
)};
const _fw41wt = (G, _) => G.input(_);
const _srtw8o = function _module(editedCell){return(
editedCell.module.module
)};
const _rv7t7x = function _code_editor_view(EditorView)
{
  console.log("code_editor_view");
  return new EditorView();
};
const _xvo1n6 = function _code_editor(code_editor_view)
{
  console.log("code_editor");
  code_editor_view.dom.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  return code_editor_view.dom;
};
const _1imarq2 = function _47(md){return(
md`## API`
)};
const _470wv4 = function _moveCell($0){return(
async (cell, amount) =>
  $0.send({
    command: "moveCell",
    args: {
      cell,
      amount
    }
  })
)};
const _mvbs01 = function _moveCellBeside($0){return(
async (cell, target, placeAfter = false) =>
  $0.send({
    command: "moveCellBeside",
    args: {
      cell,
      target,
      placeAfter
    }
  })
)};
const _drag01 = function _dragReorder(runtime,divToVar,findCell,moveCellBeside){return(
(variable, handle) => {
  if (!document.getElementById('lope-reorder-style')) {
    const s = document.createElement('style');
    s.id = 'lope-reorder-style';
    s.textContent =
      'body.lope-reordering, body.lope-reordering * { user-select: none !important; cursor: grabbing !important; }';
    document.head.appendChild(s);
  }

  const THRESH = 5;
  let pointerId = null, dragging = false, startX = 0, startY = 0;
  let cells = null, ownIndex = -1, scroller = null, indicator = null;
  const blockSelect = (ev) => ev.preventDefault();

  // Same-module visible cells in DOM order; one entry per rendered .observablehq div.
  const getModuleCells = () => {
    const mod = variable._module;
    const out = [];
    for (const div of document.querySelectorAll('.observablehq')) {
      const v = divToVar(runtime, div);
      if (v && v._module === mod) out.push({ div, v });
    }
    return out;
  };

  const ensureIndicator = () => {
    if (indicator) return indicator;
    indicator = document.createElement('div');
    indicator.style.cssText =
      'position: fixed; height: 0; z-index: 2147483646; pointer-events: none;' +
      'border-top: 2px solid var(--theme-foreground-focus, #3b5bdb);';
    document.body.appendChild(indicator);
    return indicator;
  };
  const removeIndicator = () => { if (indicator) { indicator.remove(); indicator = null; } };

  // gap 0..N: how many cells sit above pointer Y (by their vertical midpoint).
  const gapAt = (y) => {
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i].div.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return cells.length;
  };

  const drawIndicator = (g) => {
    const ind = ensureIndicator();
    const ref = cells[Math.min(ownIndex, cells.length - 1)].div.getBoundingClientRect();
    const y = g < cells.length
      ? cells[g].div.getBoundingClientRect().top
      : cells[cells.length - 1].div.getBoundingClientRect().bottom;
    ind.style.left = ref.left + 'px';
    ind.style.width = ref.width + 'px';
    ind.style.top = (y - 1) + 'px';
  };

  const autoScroll = (y) => {
    if (!scroller) return;
    const r = scroller.getBoundingClientRect
      ? scroller.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const M = 36;
    let dy = 0;
    if (y < r.top + M) dy = -Math.ceil((r.top + M - y) / 3);
    else if (y > r.bottom - M) dy = Math.ceil((y - (r.bottom - M)) / 3);
    if (dy && scroller.scrollBy) scroller.scrollBy({ top: dy });
  };

  const beginDrag = () => {
    cells = getModuleCells();
    ownIndex = cells.findIndex(c => c.v === variable);
    if (ownIndex < 0) return false;
    dragging = true;
    scroller = cells[ownIndex].div.closest('.lm_content')
      || document.scrollingElement || document.documentElement;
    document.body.classList.add('lope-reordering');
    handle.style.cursor = 'grabbing';
    // Drop any selection the gesture already started and block new ones for the drag.
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.removeAllRanges) sel.removeAllRanges();
    document.addEventListener('selectstart', blockSelect, true);
    return true;
  };

  const onMove = (e) => {
    if (pointerId == null) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < THRESH && Math.abs(e.clientY - startY) < THRESH) return;
      if (!beginDrag()) return;
    }
    e.preventDefault();
    drawIndicator(gapAt(e.clientY));
    autoScroll(e.clientY);
  };

  const teardown = () => {
    if (pointerId != null && handle.releasePointerCapture) {
      try { handle.releasePointerCapture(pointerId); } catch (_) {}
    }
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('selectstart', blockSelect, true);
    handle.style.cursor = '';
    document.body.classList.remove('lope-reordering');
    removeIndicator();
  };

  const onUp = (e) => {
    const wasDragging = dragging;
    let target, placeAfter = false, ownDiv = null, doMove = false;
    if (wasDragging) {
      ownDiv = cells[ownIndex].div;
      const g = gapAt(e.clientY);
      // Drop in own slot (just above or below self) is a no-op.
      if (g !== ownIndex && g !== ownIndex + 1) {
        doMove = true;
        if (g < cells.length) {
          target = cells[g].v;         // insert before the cell now at the gap
        } else {
          target = cells[cells.length - 1].v;  // dropped past the last visible cell
          placeAfter = true;
        }
      }
    }
    teardown();
    pointerId = null; dragging = false; cells = null; ownIndex = -1; scroller = null;
    if (wasDragging) {
      // Suppress the click that would otherwise toggle the editor open/closed.
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      handle.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => handle.removeEventListener('click', stop, { capture: true }), 0);
      if (doMove) moveCellBeside(findCell(variable, ownDiv), target, placeAfter);
    }
  };

  const onCancel = () => {
    teardown();
    pointerId = null; dragging = false; cells = null; ownIndex = -1; scroller = null;
  };

  const onDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest('.add-cell-btn')) return;
    pointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY;
    dragging = false;
    if (handle.setPointerCapture) { try { handle.setPointerCapture(e.pointerId); } catch (_) {} }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
  };

  handle.addEventListener('pointerdown', onDown);
  // Suppress the native text-selection drag that would otherwise start on press.
  // mousedown-preventDefault leaves `click` intact (same trick as the add button).
  handle.addEventListener('mousedown', e => {
    if (!(e.target && e.target.closest && e.target.closest('.add-cell-btn'))) e.preventDefault();
  });
  handle.addEventListener('selectstart', blockSelect);
  handle.style.touchAction = 'none';
  handle.style.userSelect = 'none';
  return () => handle.removeEventListener('pointerdown', onDown);
}
)};
const _pinoncr = function _pinOnCreate(){return(
new Set()  // variable pids to open (pin) their editor as soon as the cell mounts
)};
const _19znal9 = function _createCell($0){return(
async ({cell, source = "{}" } = {}) =>
  $0.send({
    command: "createCell",
    args: {
      source,
      cell
    }
  })
)};
const _d9nzys = function _deleteCell($0){return(
async ({cell}) =>
  $0.send({
    command: "deleteCell",
    args: {
      cell
    }
  })
)};
const _1toku21 = function _51(md){return(
md`## API handler`
)};
const _d7ouqx = function _command(flowQueue){return(
flowQueue()
)};
const _118qt2v = (G, _) => G.input(_);
const _c4420j = function _53(command){return(
command
)};
const _1f6v167 = function _findCellByVariable(){return(
(v, cells) =>
  [...cells.entries()].find((vars) => vars.includes(v))
)};
const _dmk8lv = function _findCellIndex(){return(
(variables, cells) => {
  let index = 0;
  for (let cellCandidate of cells.values()) {
    if (cellCandidate.variables[0] === variables[0]) {
      return index;
    } else {
      index++;
    }
  }
}
)};
const _jy01vb = function _lookupCellByIndex(){return(
(index, cells) => {
  let current = 0;
  for (let cellCandidate of cells.values()) {
    if (current === index) {
      return cellCandidate;
    } else {
      current++;
    }
  }
}
)};
const _1rhoxk2 = function _findVariableIndex(runtime){return(
(variable, variables = runtime._variables) =>
  [...variables].findIndex((vi) => vi === variable)
)};
const _2pkmxz = async function _command_processor(command,$0,compile_and_update,remove_variables,$1,findCellIndex,lookupCellByIndex,findVariableIndex,repositionSetElement,runtime,selectVariable,$2,pinOnCreate,findCell)
{
    if (command.processed)
        return;
    let result = undefined;
    if (command.command == 'createCell') {
        $0.value = true;
        // Mark the new variable's pid (identity-stable, no cell-map lookup) so its
        // cellEditor opens pinned as soon as auto_attach mounts the shell. Keyed by
        // pid because findCell() lags one reactive tick behind creation here.
        const newVars = [];
        result = await compile_and_update('{}', newVars, command.args.cell);
        const nv = newVars[0];
        if (nv?.pid) pinOnCreate.add(nv.pid);
        if (nv) await selectVariable(nv);
    } else if (command.command == 'deleteCell') {
        remove_variables(command.args.cell.variables);
        result = true;
    } else if (command.command == 'moveCell') {
        const cellList = $1.value.get(command.args.cell.module.module);
        const cellIndex = findCellIndex(command.args.cell.variables, cellList);
        const targetCellIndex = cellIndex + command.args.amount;
        const targetCell = lookupCellByIndex(targetCellIndex, cellList);
        if (targetCell) {
            const currentFirstVariableIndex = findVariableIndex(command.args.cell.variables[0]);
            const targetFirstVariableIndex = findVariableIndex(targetCell.variables[0]);
            const change = targetFirstVariableIndex - currentFirstVariableIndex;
            const dom = command.args.cell.dom;
            const preY = dom?.getBoundingClientRect?.().top;
            command.args.cell.variables.forEach(v => {
                const currentIndex = findVariableIndex(v);
                repositionSetElement(runtime._variables, v, currentIndex + change);
            });
            await selectVariable(command.args.cell.variables[0], command.args.cell.dom);
            // Keep moved cell at same screen position so neighbours shift around it.
            // Cells here have wildly varying heights (some embed 500+ px iframes), so
            // a one-position move can otherwise jump hundreds of pixels (#163). Poll
            // for syncers' reactive DOM reorder before measuring postY — the chain
            // runs on macrotasks, so requestAnimationFrame is not sufficient.
            if (preY != null && dom?.isConnected) {
                let postY = preY;
                for (let i = 0; i < 30 && postY === preY; i++) {
                    await new Promise(r => setTimeout(r, 50));
                    if (!dom.isConnected)
                        break;
                    postY = dom.getBoundingClientRect().top;
                }
                const delta = postY - preY;
                if (delta !== 0) {
                    const scroller = dom.closest('.lm_content') || document.scrollingElement;
                    scroller?.scrollBy?.({
                        top: delta,
                        behavior: 'instant'
                    });
                }
            }
        }
        result = true;
    } else if (command.command == 'moveCellBeside') {
        // Drag-drop reorder: place cell's variables immediately before (or, with
        // placeAfter, after) the anchor cell that `target` belongs to. Repositions by
        // variable identity, not cell index, so hidden/import/template variables
        // between visible cells don't skew the destination. The anchor is resolved to
        // its whole cell so multi-variable cells (viewof/mutable) aren't split, and a
        // drop past the last visible cell anchors to it (placeAfter) rather than to the
        // module's far-off last dynamic variable.
        const { cell, target, placeAfter } = command.args;
        const anchorCell = findCell(target);
        const arr = Array.from(runtime._variables);
        const groupSet = new Set(cell.variables);
        const group = arr.filter(v => groupSet.has(v));
        const without = arr.filter(v => !groupSet.has(v));
        let insertAt = -1;
        if (anchorCell?.variables?.length) {
            const idxs = anchorCell.variables
                .map(v => without.indexOf(v))
                .filter(i => i >= 0);
            if (idxs.length)
                insertAt = placeAfter ? Math.max(...idxs) + 1 : Math.min(...idxs);
        }
        if (insertAt >= 0 && group.length) {
            without.splice(insertAt, 0, ...group);
            runtime._variables.clear();
            without.forEach(v => runtime._variables.add(v));
            await selectVariable(cell.variables[0], cell.dom);
        }
        result = true;
    }
    if (result) {
        command.processed = true;
        $2.resolve(result);
    }
};
const _8iz5z2 = function _59(md){return(
md`### UI Action`
)};
const _m873d1 = function _states(){return(
new Map()
)};
const _mxwoc4 = function _cellIdFacet(codemirror){return(
codemirror.Facet.define({ combine: (v) => v[0] })
)};
const _y7997q = function _62(md){return(
md`## LSP Integration

Observable JS lezer parser, runtime-aware autocomplete, parse-error squiggles. Plumbed into the cell editor below.`
)};
const _7btuqg = function _observableJS_language(codemirror,observable_lezer_parser){return(
codemirror.LRLanguage.define({
    name: 'observable-javascript',
    parser: observable_lezer_parser.configure({
        props: [
            codemirror.indentNodeProp.add({
                Block: codemirror.delimitedIndent({ closing: '}' }),
                ArrowFunction: codemirror.continuedIndent({ except: /^\s*({|case|default)/ })
            }),
            codemirror.foldNodeProp.add({ 'Block ObjectExpression ArrayExpression': codemirror.foldInside })
        ]
    }),
    languageData: {
        commentTokens: {
            line: '//',
            block: {
                open: '/*',
                close: '*/'
            }
        },
        indentOnInput: /^\s*[)\]}]$/,
        closeBrackets: {
            brackets: [
                '(',
                '[',
                '{',
                '\'',
                '"',
                '`'
            ]
        },
        wordChars: '$_'
    }
})
)};
const _1xf04v5 = function _observableJS_highlightStyle(codemirror,lezerhighlight){return(
codemirror.HighlightStyle.define([
    {
        tag: lezerhighlight.tags.keyword,
        color: 'var(--syntax-keyword)'
    },
    {
        tag: [
            lezerhighlight.tags.bool,
            lezerhighlight.tags.null,
            lezerhighlight.tags.atom
        ],
        color: 'var(--syntax-atom)'
    },
    {
        tag: lezerhighlight.tags.string,
        color: 'var(--syntax-string)'
    },
    {
        tag: [
            lezerhighlight.tags.number,
            lezerhighlight.tags.regexp
        ],
        color: 'var(--syntax-literal)'
    },
    {
        tag: lezerhighlight.tags.comment,
        color: 'var(--syntax-comment)',
        fontStyle: 'italic'
    },
    {
        tag: lezerhighlight.tags.function(lezerhighlight.tags.variableName),
        color: 'var(--syntax-definition)'
    },
    {
        tag: lezerhighlight.tags.definition(lezerhighlight.tags.variableName),
        color: 'var(--syntax-definition)'
    },
    {
        tag: lezerhighlight.tags.variableName,
        color: 'var(--syntax-variable)'
    },
    {
        tag: lezerhighlight.tags.propertyName,
        color: 'var(--syntax-variable)'
    },
    {
        tag: lezerhighlight.tags.operator,
        color: 'var(--syntax-keyword)'
    }
])
)};
const _19d9pua = function _observableJS_lint(codemirror){return(
[
    codemirror.lintGutter(),
    codemirror.linter(view => {
        const {state} = view;
        const tree = codemirror.syntaxTree(state);
        const seen = new Set();
        const diagnostics = [];
        tree.iterate({
            enter: ({type, from, to}) => {
                if (!type.isError)
                    return;
                const end = to > from ? to : Math.min(from + 1, state.doc.length);
                const key = from + ':' + end;
                if (seen.has(key))
                    return;
                seen.add(key);
                diagnostics.push({
                    from,
                    to: end,
                    severity: 'error',
                    message: 'Syntax error'
                });
            }
        });
        return diagnostics;
    }, { delay: 250 }),
    codemirror.keymap.of(codemirror.lintKeymap ?? []),
    codemirror.EditorView.baseTheme({
        '.cm-lintRange': {
            textDecorationThickness: '2px',
            textUnderlineOffset: '3px'
        },
        '.cm-lintRange.cm-lintRange-error': { textDecoration: 'underline wavy #e11' },
        '.cm-tooltip.cm-tooltip-lint': { fontSize: '12px' }
    })
]
)};
const _125gzhe = function _editor_manager(editedCell,globalThis,codemirror,literalCompletions,EditorState,decompiled,cellIdFacet,EditorView,states,compile_and_update,code_editor_view,replaceCodeMirrorDoc,observableJS_language,observableJS_highlightStyle,myDefaultTheme)
{
  if (!editedCell?.variables?.length)
    return;
  const variable = editedCell.variables[0];
  const key = variable;
  const mod = variable && variable._module;
  const builtin = mod?._runtime?._builtin?._scope;
  const isInternal = n => n.startsWith('module @') || n.startsWith('@variable') || n.startsWith('__ojs_');
  const isPrivate = n => n.startsWith('_') || /^(webkit|moz|ms)[A-Z]/.test(n);
  const valueOf = v => {
    try {
      return v?._value;
    } catch {
      return undefined;
    }
  };
  const lookup = n => {
    if (mod?._scope?.has(n))
      return valueOf(mod._scope.get(n));
    if (builtin?.has(n))
      return valueOf(builtin.get(n));
    try {
      return globalThis[n];
    } catch {
      return undefined;
    }
  };
  const allNames = () => {
    const out = new Set();
    for (const n of mod?._scope?.keys() ?? [])
      if (!isInternal(n))
        out.add(n);
    for (const n of builtin?.keys() ?? [])
      if (!isInternal(n))
        out.add(n);
    for (const n of Object.getOwnPropertyNames(globalThis))
      if (!isPrivate(n))
        out.add(n);
    return out;
  };
  const isNoise = n => n.startsWith('_') || [
    'prototype',
    'constructor',
    'caller',
    'callee',
    'arguments',
    'name',
    'length'
  ].includes(n);
  const stopAt = new Set([
    Object.prototype,
    Function.prototype
  ]);
  const propsOf = obj => {
    const out = [];
    const seen = new Set();
    for (let o = Object(obj), d = 0; o && d < 4; o = Object.getPrototypeOf(o), d++) {
      if (d > 0 && stopAt.has(o))
        break;
      for (const n of Object.getOwnPropertyNames(o)) {
        if (seen.has(n) || isNoise(n))
          continue;
        seen.add(n);
        const desc = Object.getOwnPropertyDescriptor(o, n);
        out.push({
          label: n,
          type: typeof desc?.value === 'function' ? 'function' : 'property'
        });
      }
    }
    return out;
  };
  const classify = v => {
    if (typeof v === 'function')
      return /^\s*class\b/.test(Function.prototype.toString.call(v)) ? 'class' : 'function';
    return v === null ? 'null' : typeof v === 'object' ? 'variable' : typeof v;
  };
  const completionSource = cx => {
    for (let n = codemirror.syntaxTree(cx.state).resolve(cx.pos, -1); n; n = n.parent) {
      if (/String|Template|Comment/.test(n.name))
        return null;
    }
    // Member access on a non-identifier literal base ("".|, [].|, (5).|) — shared with the test_* cells.
    const lit = literalCompletions(cx.state, cx.pos);
    if (lit)
      return lit;
    const before = cx.state.sliceDoc(cx.state.doc.lineAt(cx.pos).from, cx.pos);
    const m = before.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$\d]*)*)$/);
    if (!m)
      return null;
    const chain = m[1].split('.');
    const prefix = chain[chain.length - 1] ?? '';
    const from = cx.pos - prefix.length;
    if (!cx.explicit && prefix.length === 0 && chain.length === 1)
      return null;
    let options;
    if (chain.length > 1) {
      let base = lookup(chain[0]);
      for (let i = 1; i < chain.length - 1; i++) {
        try {
          base = base?.[chain[i]];
        } catch {
          return null;
        }
        if (base == null)
          return null;
      }
      if (base == null)
        return null;
      options = propsOf(base).filter(o => o.label.startsWith(prefix));
    } else {
      options = [];
      for (const n of allNames()) {
        if (!n.startsWith(prefix) || isNoise(n))
          continue;
        options.push({
          label: n,
          type: classify(lookup(n))
        });
      }
    }
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options.length ? {
      from,
      to: cx.pos,
      options
    } : null;
  };
  const lintSource = view => {
    const seen = new Set();
    const diags = [];
    codemirror.syntaxTree(view.state).iterate({
      enter: ({type, from, to}) => {
        if (!type.isError)
          return;
        const end = to > from ? to : Math.min(from + 1, view.state.doc.length);
        const k = from + ':' + end;
        if (seen.has(k))
          return;
        seen.add(k);
        diags.push({
          from,
          to: end,
          severity: 'error',
          message: 'Syntax error'
        });
      }
    });
    return diags;
  };
  const state = EditorState.create({
    doc: decompiled,
    extensions: [
      cellIdFacet.of(key),
      EditorView.updateListener.of(u => states.set(u.state.facet(cellIdFacet), u.state)),
      codemirror.keymap.of([
        codemirror.indentWithTab,
        {
          key: 'Shift-Enter',
          run: () => {
            // Mirror viewof apply: push the canonical decompiled
            // source back into CodeMirror after compile.
            (async () => {
              const canonical = await compile_and_update(code_editor_view.state.doc.toString(), editedCell.variables, editedCell);
              if (typeof canonical === 'string') {
                replaceCodeMirrorDoc(code_editor_view, canonical, { preserveCursor: true });
              }
            })();
            return true;
          }
        }
      ]),
      codemirror.EditorView.lineWrapping,
      observableJS_language,
      codemirror.syntaxHighlighting(observableJS_highlightStyle),
      codemirror.autocompletion({
        override: [
          codemirror.localCompletionSource,
          completionSource
        ]
      }),
      codemirror.lintGutter(),
      codemirror.linter(lintSource, { delay: 250 }),
      codemirror.EditorView.baseTheme({
        '.cm-lintRange.cm-lintRange-error': {
          textDecoration: 'underline wavy #e11',
          textUnderlineOffset: '3px'
        }
      }),
      codemirror.basicSetup,
      myDefaultTheme
    ]
  });
  code_editor_view.setState(state);
  states.set(key, state);
};
const _65mlp5 = function _divToCell(){return(
(entries, div) => {
  if (!div) return undefined;
  if (div.variable) {
    return (
      entries.find(
        ([name, cell]) => cell[0] && cell.find((v) => v == div.variable)
      ) || div.variable
    );
  } else {
    return entries.find(
      ([name, cell]) => cell[0] && cell[0]._observer._node === div
    );
  }
}
)};
const _bt6o0p = function _68(md){return(
md`## Reacting to runtime changes

Other editors might change the definition underfoot, so we need to reload the code mirror state`
)};
const _jh2ad1 = function _editor_refresh_from_runtime(editedCell,decompile,code_editor_view,replaceCodeMirrorDoc,queueMicrotask,onCodeChange,invalidation)
{
  const lastSyncedByKey = this?.lastSyncedByKey ?? new WeakMap();
  const staleByKey = this?.staleByKey ?? new WeakMap();
  let scheduled = false;

  const getKey = () => editedCell?.variables?.[0] ?? null;

  const syncNow = async ({ force = false } = {}) => {
    const cell = editedCell;
    if (!cell?.variables?.length) return false;

    const key = getKey();
    if (!key) return false;

    const runtimeSource = await decompile(cell.variables);
    const editorSource = code_editor_view?.state?.doc?.toString?.() ?? "";

    if (runtimeSource === editorSource) {
      lastSyncedByKey.set(key, runtimeSource);
      staleByKey.set(key, false);
      return false;
    }

    const last = lastSyncedByKey.get(key);
    const isDirty = typeof last === "string" && editorSource !== last;

    if (!force && isDirty) {
      staleByKey.set(key, true);
      return false;
    }

    const changed = replaceCodeMirrorDoc(code_editor_view, runtimeSource, {
      preserveCursor: true
    });
    if (changed) {
      lastSyncedByKey.set(key, runtimeSource);
      staleByKey.set(key, false);
    }
    return changed;
  };

  const scheduleSync = ({ force = false } = {}) => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(async () => {
      scheduled = false;
      try {
        await syncNow({ force });
      } catch {}
    });
  };

  const unsubscribe = onCodeChange(({ variable }) => {
    const cell = editedCell;
    if (!cell?.variables?.length) return;
    if (!variable) return;
    if (!cell.variables.includes(variable)) return;
    scheduleSync({ force: false });
  });

  scheduleSync({ force: true });
  invalidation.then(() => unsubscribe());

  return {
    lastSyncedByKey,
    staleByKey,
    syncNow,
    scheduleSync,
    get stale() {
      const k = getKey();
      return k ? !!staleByKey.get(k) : false;
    }
  };
};
const _dvne2z = function _replaceCodeMirrorDoc(){return(
(view, nextText, {preserveCursor = true} = {}) => {
  if (!view?.state) return false;
  const prev = view.state.doc.toString();
  const next = String(nextText ?? "");
  if (prev === next) return false;

  const head = view.state.selection?.main?.head ?? 0;
  const anchor = view.state.selection?.main?.anchor ?? head;
  const nextPos = (p) => Math.max(0, Math.min(p, next.length));

  view.dispatch({
    changes: {from: 0, to: view.state.doc.length, insert: next},
    ...(preserveCursor
      ? {selection: {anchor: nextPos(anchor), head: nextPos(head)}}
      : null)
  });

  return true;
}
)};
const _cbcryi = function _71(md){return(
md`### Selection`
)};
const _rtf009 = function _select(editedCell,Inputs,getOption,setOption){return(
(() => {
  const v0 = editedCell?.variables?.[0] ?? null;
  const el = Inputs.toggle({
    value: v0 ? getOption(v0, "selected", false) : false
  });

  el.style.margin = "0";

  el.addEventListener("input", () => {
    const v = editedCell?.variables?.[0] ?? null;
    if (!v) return;
    setOption(v, "selected", el.value);
  });

  return el;
})()
)};
const _14mwbuc = (G, _) => G.input(_);
const _d2lrrw = function _73(md){return(
md`## Pinning`
)};
const _ucf24e = function _74(FileAttachment){return(
FileAttachment("cell_options.json")
)};
const _kygz54 = function _optionsFile(getFileAttachment,editorModule){return(
getFileAttachment("cell_options.json", editorModule)
)};
const _760ozq = async function _options(Inputs,optionsFile){return(
Inputs.input(await optionsFile.json())
)};
const _4rh26k = (G, _) => G.input(_);
const _1lqy7cs = function _setOption(findCell,_,$0,Event){return(
(variable, option, value) => {
  const cell = findCell(variable);
  _.set(
    $0.value,
    `${cell.module.name}.${cell.name}.${option}`,
    value
  );
  $0.dispatchEvent(new Event("input"));
}
)};
const _1oxe5ee = function _getOption(findCell,_,$0){return(
(variable, option, defaultValue) => {
  const cell = findCell(variable);
  return (
    _.get($0.value, `${cell.module.name}.${cell.name}.${option}`) ||
    defaultValue
  );
}
)};
const _kwq69p = function _save_options(setFileAttachment,jsonFileAttachment,options,editorModule){return(
setFileAttachment(
  jsonFileAttachment("cell_options.json", options),
  editorModule
)
)};
const _1ag9ajn = function _80(md){return(
md`## Pasting`
)};
const _dbvt0t = function _escapeTemplateLiteral(){return(
(s = "") =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
)};
const _1q2xn50 = function _inferCellGroupNameFromOJS(parser){return(
(source) => {
  let cell;
  try {
    cell = parser.parseCell(String(source ?? ""));
  } catch {
    return null;
  }
  if (!cell) return null;

  if (cell.id) {
    if (cell.id.type === "Identifier") return cell.id.name;
    if (cell.id.type === "ViewExpression") return `viewof ${cell.id.id.name}`;
    if (cell.id.type === "MutableExpression") return `mutable ${cell.id.id.name}`;
  }

  if (cell.body?.type === "ImportDeclaration") {
    const mod = cell.body.source?.value;
    if (typeof mod === "string" && mod.length) return `module ${mod}`;
  }

  return null;
}
)};
const _1mfm13h = function _normalizeObservableClipboardCell(inferCellGroupNameFromOJS,escapeTemplateLiteral){return(
(cell) => {
  const mode = cell?.mode ?? "js";
  const value = String(cell?.value ?? "");
  const explicitName = typeof cell?.name === "string" && cell.name.length ? cell.name : null;

  if (mode === "js") {
    const name = inferCellGroupNameFromOJS(value) ?? explicitName;
    return { mode, name, source: value };
  }

  if (mode === "md") {
    const expr = `md\`${escapeTemplateLiteral(value)}\``;
    const source = explicitName ? `${explicitName} = ${expr}` : expr;
    const name = explicitName ?? null;
    return { mode, name, source };
  }

  if (mode === "html") {
    const expr = `htl.html\`${escapeTemplateLiteral(value)}\``;
    const source = explicitName ? `${explicitName} = ${expr}` : expr;
    const name = explicitName ?? null;
    return { mode, name, source };
  }

  const name = inferCellGroupNameFromOJS(value) ?? explicitName;
  return { mode, name, source: value };
}
)};
const _1pa2xc8 = function _readObservableClipboardCells(globalThis){return(
async () => {
  const mime = "application/vnd.observablehq+json";

  if (globalThis.navigator?.clipboard?.read) {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types?.includes?.(mime)) {
        const blob = await item.getType(mime);
        const text = await blob.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) return json;
      }
    }
  }

  if (globalThis.navigator?.clipboard?.readText) {
    const text = await navigator.clipboard.readText();
    if (text == null) throw new Error("Clipboard readText returned null/undefined.");
    return [{ mode: "js", value: String(text), name: null }];
  }

  throw new Error("Clipboard API unavailable (need navigator.clipboard.read or readText).");
}
)};
const _1w99cbu = function _pasteObservableCellsIntoModule($0,normalizeObservableClipboardCell,findCell,compile_and_update){return(
async ({ cells, editedCell }) => {
  if (!editedCell?.module?.module) throw new Error("No selected cell/module to paste into.");
  if (!Array.isArray(cells) || cells.length === 0) return { total: 0, matched: 0, replacedCurrent: false, inserted: 0 };

  const moduleRuntime = editedCell.module.module;
  const moduleCells = $0.value.get(moduleRuntime) || [];
  const byName = new Map(
    moduleCells
      .filter((c) => typeof c?.name === "string" && c.name.length)
      .map((c) => [c.name, c])
  );

  const normalized = cells.map((c) => normalizeObservableClipboardCell(c)).filter((c) => typeof c?.source === "string" && c.source.length);

  const matched = [];
  const unmatched = [];

  for (const entry of normalized) {
    if (entry.name && byName.has(entry.name)) {
      const target = byName.get(entry.name);
      const ctx = findCell(target.variables[0]);
      if (ctx) matched.push({ entry, ctx });
      else unmatched.push(entry);
    } else {
      unmatched.push(entry);
    }
  }

  for (const { entry, ctx } of matched) {
    compile_and_update(entry.source, ctx.variables, ctx);
  }

  let replacedCurrent = false;
  let inserted = 0;

  if (unmatched.length > 0) {
    replacedCurrent = true;
    compile_and_update(unmatched[0].source, editedCell.variables, editedCell);

    let anchor = editedCell;
    for (let i = 1; i < unmatched.length; i++) {
      const vars = [];
      compile_and_update(unmatched[i].source, vars, anchor);
      anchor = { ...anchor, variables: vars, name: unmatched[i].name ?? anchor.name, dom: undefined };
      inserted++;
    }
  }

  return { total: normalized.length, matched: matched.length, replacedCurrent, inserted };
}
)};
const _z9vacx = function _86(md){return(
md`## Decompiler`
)};
const _gbuhyc = function _decompiled(editedCell,decompile)
{
    if (!editedCell?.variables?.length)
        return '';
    return decompile(editedCell.variables);
};
const _w5q3yf = function _editorModule(thisModule){return(
thisModule()
)};
const _18kaj2p = (G, _) => G.input(_);
const _yn5gyd = function _editor_jobs(command_processor,submit_summary,save_options,persist_attach_menu)
{
  //editedCell;
  command_processor;
  submit_summary;
  save_options;
  persist_attach_menu;
  return "editor_jobs";
};
const _1whoy5n = function _91(md){return(
md`### Apply Update`
)};
const _gk83fp = function _compile_and_update(compile,runtime,realize,repositionSetElement,decompile)
{
  return async (source, variables = [], cell) => {
    try {
      const newVariables = compile(source);
      // Skip emitting `module @X` if one already exists in the target
      // module's scope and isn't one of OUR old variables. Without this,
      // the second define() collides on the shared name and Observable
      // rewrites BOTH the new and pre-existing module variables to a
      // "defined more than once" thrower, breaking every pre-existing
      // consumer of `@X` in the module. The new import-name bindings
      // reference `module @X` by name and resolve to whatever module
      // variable is currently in scope.
      const targetScope = cell.module.module._scope;
      const ourOldNames = new Set(variables.map(v => v._name));
      const isModuleImport = nv => nv._name?.startsWith('module @') && nv._inputs.length === 0;
      const shouldSkip = nv => isModuleImport(nv) && targetScope.has(nv._name) && !ourOldNames.has(nv._name);
      const allocation = newVariables.map(nv => shouldSkip(nv) ? { reuse: targetScope.get(nv._name) } : { fresh: nv });
      const freshNewVariables = allocation.filter(a => a.fresh).map(a => a.fresh);
      let reposition = false, insertionIndex = -1;
      if (!variables || variables.length !== freshNewVariables.length) {
        reposition = true;
        // Reuse existing variable slots where we can. Preserves the first slot's
        // observer/inspector/editor-row binding so a 1→N compile (viewof = 2,
        // mutable = 3, import = 1+N bindings) keeps the user's cell visible
        // and re-editable. Only the surplus old vars are deleted; only the
        // surplus new vars are freshly created.
        const overlap = Math.min(variables.length, freshNewVariables.length);
        for (let i = overlap; i < variables.length; i++)
          variables[i].delete();
        variables.length = overlap;
        for (let i = overlap; i < freshNewVariables.length; i++) {
          const newVariable = cell.module.module.variable({});
          // Assign a random pid up-front so blank/identical new cells don't
          // collide via persistentId's contentHash. See lopecode#144.
          newVariable.pid = '_' + Math.random().toString(36).slice(2, 9);
          variables.push(newVariable);
        }
      }
      if (reposition) {
        insertionIndex = [...runtime._variables].findIndex(v => v == cell.variables.at(-1)) + 1;
      }
      const fns = await realize(freshNewVariables.map(v => v._definition), runtime);
      freshNewVariables.forEach((v, i) => {
        const variable = variables[i];
        const _fn = fns[i];
        if (v._name) {
          variable.define(v._name, v._inputs, _fn);
        } else {
          variable.define(v._inputs, _fn);
        }
        if (reposition)
          repositionSetElement(runtime._variables, variable, insertionIndex + i);
      });
      // Build the full variable set for decompile, mixing reused module-import
      // variables with the freshly-defined runtime variables, in the same order
      // as `allocation`.
      let freshIdx = 0;
      const decompileVars = allocation.map(a => a.reuse ? a.reuse : variables[freshIdx++]);
      return await decompile(decompileVars);
    } catch (e) {
      console.error(e);
    }
  };
};
const _1g3bdxp = function _93(md){return(
md`### Remove Cells`
)};
const _mhcibs = function _remove_variables(){return(
(variables) => {
  variables.forEach((v) => v.delete());
}
)};
const _1qb4uz = function _95(md){return(
md`### Runtime Representation`
)};
const _rwez9 = function _variable(Inputs,editedCell){return(
Inputs.radio(editedCell.variables, {
  label: "variable in cell group",
  format: (v) => v._name,
  value: editedCell.variables[0]
})
)};
const _11gvkq4 = (G, _) => G.input(_);
const _r5nvms = function _name(variable){return(
variable._name
)};
const _9vxebx = function _inputs(variable){return(
variable._inputs.map((v) => v._name)
)};
const _1348jvx = function _definition(Inputs,variable){return(
Inputs.textarea({
  label: "variable._definition",
  value: variable._definition.toString(),
  rows: 10
})
)};
const _b4rsn5 = (G, _) => G.input(_);
const _1pimibm = function _100(Inputs,definition,variable,realize,runtime,inputs){return(
Inputs.button("update variable", {
  disabled: definition === variable._definition.toString(),
  reduce: async () => {
    const [_fn] = await realize([definition], runtime);
    variable.define(variable._name, inputs, _fn);
  }
})
)};
const _1d94dks = function _javascriptPlugin(codemirror){return(
codemirror
)};
const _1j5gu2y = function _102(md){return(
md`### Libraries`
)};
const _lbftlp = function _literalCompletions(codemirror)
{
  // Pure extract of editor_manager's literal-base completion, for the test_* cells.
  const isNoise = n => n.startsWith('_') || [
    'prototype',
    'constructor',
    'caller',
    'callee',
    'arguments',
    'name',
    'length'
  ].includes(n);
  const stopAt = new Set([
    Object.prototype,
    Function.prototype
  ]);
  const propsOf = obj => {
    const out = [], seen = new Set();
    for (let o = Object(obj), d = 0; o && d < 4; o = Object.getPrototypeOf(o), d++) {
      if (d > 0 && stopAt.has(o))
        break;
      for (const n of Object.getOwnPropertyNames(o)) {
        if (seen.has(n) || isNoise(n))
          continue;
        seen.add(n);
        const desc = Object.getOwnPropertyDescriptor(o, n);
        out.push({
          label: n,
          type: typeof desc?.value === 'function' ? 'function' : 'property'
        });
      }
    }
    return out;
  };
  const literalProto = name => {
    switch (name) {
    case 'String':
    case 'TemplateString':
      return '';
    case 'Number':
      return 0;
    case 'BooleanLiteral':
      return false;
    case 'ArrayExpression':
      return [];
    case 'ObjectExpression':
      return {};
    case 'RegExp':
      return /(?:)/;
    default:
      return undefined;
    }
  };
  return (state, pos) => {
    const before = state.sliceDoc(state.doc.lineAt(pos).from, pos);
    const dm = before.match(/\.([A-Za-z_$][\w$]*)?$/);
    if (!dm)
      return null;
    const prefix = dm[1] ?? '';
    const dotPos = pos - prefix.length - 1;
    let mem = null;
    for (let n = codemirror.syntaxTree(state).resolveInner(dotPos, -1); n; n = n.parent) {
      if (n.name === 'MemberExpression') {
        mem = n;
        break;
      }
    }
    if (!mem)
      return null;
    let obj = mem.firstChild;
    while (obj && obj.name === 'ParenthesizedExpression')
      obj = obj.firstChild?.nextSibling ?? null;
    const base = obj && literalProto(obj.name);
    if (base === undefined)
      return null;
    const options = propsOf(base).filter(o => o.label.startsWith(prefix));
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options.length ? {
      from: pos - prefix.length,
      to: pos,
      options
    } : null;
  };
};
const _scoiwp = function _completionFixture(EditorState,observableJS_language,literalCompletions)
{
  return doc => {
    // Headless EditorState so the syntax tree parses; return labels at end of `doc`.
    const state = EditorState.create({
      doc,
      extensions: [observableJS_language]
    });
    const r = literalCompletions(state, doc.length);
    return r ? r.options.map(o => o.label) : [];
  };
};
const _160qhf1 = function _test_completion_string_literal(completionFixture)
{
  const labels = completionFixture('"".');
  for (const method of [
      'charAt',
      'slice',
      'split',
      'toUpperCase'
    ]) {
    if (!labels.includes(method))
      throw new Error(`"". missing String method '${ method }'; got ${ labels.slice(0, 8) }`);
  }
  return `"". → ${ labels.length } String.prototype methods`;
};
const _xrmooc = function _test_completion_string_prefix(completionFixture)
{
  const labels = completionFixture('"".sl');
  if (labels.join() !== 'slice')
    throw new Error(`"".sl expected ['slice'], got ${ labels }`);
  return `"".sl → slice (prefix filtered)`;
};
const _m0ar50 = function _test_completion_array_literal(completionFixture)
{
  const labels = completionFixture('[].');
  for (const method of [
      'map',
      'filter',
      'forEach',
      'find',
      'reduce'
    ]) {
    if (!labels.includes(method))
      throw new Error(`[]. missing Array method '${ method }'; got ${ labels.slice(0, 8) }`);
  }
  return `[]. → ${ labels.length } Array.prototype methods`;
};
const _13247rm = function _test_completion_number_literal(completionFixture)
{
  const labels = completionFixture('(5).');
  for (const method of [
      'toFixed',
      'toExponential',
      'toPrecision'
    ]) {
    if (!labels.includes(method))
      throw new Error(`(5). missing Number method '${ method }'; got ${ labels }`);
  }
  return `(5). → ${ labels.length } Number.prototype methods`;
};
const _quyccp = function _test_completion_bool_template_regexp(completionFixture)
{
  if (!completionFixture('true.').includes('valueOf'))
    throw new Error('true. should expose Boolean.prototype (valueOf)');
  if (!completionFixture('`x`.').includes('charAt'))
    throw new Error('`x`. should expose String.prototype (charAt)');
  if (!completionFixture('/a/.').includes('test'))
    throw new Error('/a/. should expose RegExp.prototype (test)');
  return 'true. / `x`. / /a/. expose Boolean / String / RegExp methods';
};
const _1cn3ucr = function _test_completion_parenthesised_unwrap(completionFixture)
{
  if (!completionFixture('("hi").').includes('slice'))
    throw new Error('("hi"). should unwrap to a String');
  if (!completionFixture('(([])).').includes('map'))
    throw new Error('(([])). should unwrap nested parens to an Array');
  return 'parenthesised (and nested) literals unwrap to their inner type';
};
const _15vxhca = function _test_completion_never_evaluates(completionFixture)
{
  // Undefined ref inside the array still yields Array methods — type-based, never executed.
  if (!completionFixture('[neverDefinedRef].').includes('map')) {
    throw new Error('array literal should offer Array methods by type, without evaluation');
  }
  // Non-literal bases (calls, arithmetic, scope refs) offer nothing.
  for (const doc of [
      'foo().',
      '(1 + 2).',
      '(x + y).'
    ]) {
    const labels = completionFixture(doc);
    if (labels.length)
      throw new Error(`${ doc } should yield no literal completions, got ${ labels.slice(0, 5) }`);
  }
  return 'completions are type-based \u2014 literals are never evaluated';
};
const _bz6mai = function _test_completion_identifier_deferred(completionFixture)
{
  // Identifier (foo.) and bare-word (ht) bases defer to the identifier-chain path.
  if (completionFixture('foo.').length)
    throw new Error('identifier base must defer to the identifier-chain path');
  if (completionFixture('ht').length)
    throw new Error('bare identifier (no dot) must defer');
  return 'identifier / no-dot bases deferred to the identifier-chain path';
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["cell_options.json"].map((name) => {
    const module_name = "@tomlarkworthy/editor-5";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/cells-to-clipboard", async () => runtime.module((await import("/@tomlarkworthy/cells-to-clipboard.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablehq-lezer", async () => runtime.module((await import("/@tomlarkworthy/observablehq-lezer.js?v=4")).default));  
  main.define("module @tomlarkworthy/dataflow-templating", async () => runtime.module((await import("/@tomlarkworthy/dataflow-templating.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/codemirror-6-v2", async () => runtime.module((await import("/@tomlarkworthy/codemirror-6-v2.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  $def("_1tdjp0a", "title", ["md"], _1tdjp0a);  
  $def("_dm53bx", null, ["md"], _dm53bx);  
  $def("_61oxjf", "title_variable", ["lookupVariable","editorModule"], _61oxjf);  
  $def("_15uilf0", null, ["cellEditor","title_variable"], _15uilf0);  
  $def("_wpcfq8", null, ["md"], _wpcfq8);  
  $def("_1ociws4", null, ["md"], _1ociws4);  
  main.define("syncers", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("syncers", _));  
  main.define("TRACE_CELL", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("TRACE_CELL", _));  
  $def("_hdieof", "editors", [], _hdieof);  
  $def("_ipx6cz", "auto_attach", ["keepalive","editorModule","syncers","attachContextManu","divToVar","runtime","editors","cellEditor"], _ipx6cz);  
  $def("_1iwobxt", "divToVar", [], _1iwobxt);  
  $def("_1usw8c2", "viewof attachContextManu", ["Inputs","isOnObservableCom","optionsFile"], _1usw8c2);
  $def("_1oaz8r1", "attachContextManu", ["Generators","viewof attachContextManu"], _1oaz8r1);  
  $def("_16ks4jz", null, ["md"], _16ks4jz);  
  $def("_199ztvl", "hotbarTemplate", ["lookupVariable","editorModule"], _199ztvl);  
  $def("_1q95xt6", "cellEditor", ["cloneDataflow","editorTemplate","shellTemplate","getOption","Event","setOption","createCell","findCell","pinOnCreate","dragReorder"], _1q95xt6);
  $def("_x5ixji", "hotbar_shell", ["viewof edit","Event","htl","edit"], _x5ixji);  
  $def("_1ed5zb9", "editor_panel", ["viewof editedCell","htl","toolbar","nav","reversibleAttach","combine","code_editor"], _1ed5zb9);  
  $def("_yk7udl", "shellTemplate", ["viewof editedCell","editedCell","selectVariable","viewof edit","edit","hotbar_shell","lookupVariable","editorModule"], _yk7udl);  
  $def("_jot8he", "editorTemplate", ["viewof editedCell","editedCell","selectVariable","viewof select","viewof up","viewof down","viewof remove","viewof addCells","viewof apply","viewof copy","viewof paste","toolbar","nav","cellLinks","variableLink","decompiled","code_editor_view","code_editor","editor_manager","editor_refresh_from_runtime","editor_panel","lookupVariable","editorModule"], _jot8he);  
  $def("_oshnzp", null, ["md"], _oshnzp);  
  $def("_1o2h65s", "viewof editedCell", ["Inputs"], _1o2h65s);  
  $def("_7g3h7h", "editedCell", ["Generators","viewof editedCell"], _7g3h7h);  
  $def("_1urs1md", "findCell", ["viewof liveCellMap","modules"], _1urs1md);  
  $def("_1uhm0y9", "selectVariable", ["findCell","_","viewof editedCell","Event"], _1uhm0y9);  
  $def("_3jxaqk", null, ["selectVariable","hotbarTemplate"], _3jxaqk);  
  $def("_49mpmh", "hotbar", ["viewof edit","Event","setOption","viewof editedCell","htl","edit","toolbar","nav","reversibleAttach","combine","code_editor"], _49mpmh);  
  $def("_n8s6yl", null, ["viewof editedCell"], _n8s6yl);  
  $def("_ytd2rq", null, ["nav","editedCell"], _ytd2rq);  
  $def("_1t4gep6", "nav", ["html","cellLinks"], _1t4gep6);  
  $def("_1tv9qxo", "cellLinks", ["html","variableLink"], _1tv9qxo);  
  $def("_1opggh8", "identity", ["lookupVariable","editorModule"], _1opggh8);  
  $def("_1nfia2p", "variableLink", ["identity","navHref","modules"], _1nfia2p);  
  $def("_1tm2n0w", null, ["md"], _1tm2n0w);  
  $def("_16wblye", null, ["md"], _16wblye);  
  $def("_1jdvxd9", null, ["md"], _1jdvxd9);  
  $def("_1j1loxx", "viewof combine", ["Inputs"], _1j1loxx);  
  $def("_1h8337z", "combine", ["Generators","viewof combine"], _1h8337z);  
  $def("_tct2nf", "viewof edit", ["Inputs"], _tct2nf);  
  $def("_7izj7k", "edit", ["Generators","viewof edit"], _7izj7k);  
  $def("_1fwb5jc", "toolbar", ["htl","reversibleAttach","combine","viewof select","viewof up","viewof down","viewof remove","viewof addCells","viewof apply","viewof copy","viewof paste"], _1fwb5jc);  
  $def("_yej3hb", "viewof addCells", ["Inputs","createCell","viewof editedCell"], _yej3hb);  
  $def("_1aii9ps", "addCells", ["Generators","viewof addCells"], _1aii9ps);  
  $def("_1bn860e", "viewof remove", ["Inputs","deleteCell","viewof editedCell"], _1bn860e);  
  $def("_1ad0xr8", "remove", ["Generators","viewof remove"], _1ad0xr8);  
  $def("_lwb7d7", "viewof apply", ["Inputs","compile_and_update","code_editor_view","editedCell","replaceCodeMirrorDoc"], _lwb7d7);  
  $def("_1cjyuqm", "apply", ["Generators","viewof apply"], _1cjyuqm);  
  $def("_14rfku9", "viewof up", ["Inputs","moveCell","viewof editedCell"], _14rfku9);  
  $def("_frzs5d", "up", ["Generators","viewof up"], _frzs5d);  
  $def("_9pymuj", "viewof paste", ["Inputs","readObservableClipboardCells","pasteObservableCellsIntoModule","editedCell"], _9pymuj);  
  $def("_1whsszt", "paste", ["Generators","viewof paste"], _1whsszt);  
  $def("_corxwl", "viewof down", ["Inputs","moveCell","viewof editedCell"], _corxwl);  
  $def("_1to28po", "down", ["Generators","viewof down"], _1to28po);  
  $def("_gia2ci", "viewof copy", ["Inputs","html","viewof editedCell","decompile","viewof liveCellMap","getOption","cellsToClipboard"], _gia2ci);  
  $def("_fw41wt", "copy", ["Generators","viewof copy"], _fw41wt);  
  $def("_srtw8o", "module", ["editedCell"], _srtw8o);  
  $def("_rv7t7x", "code_editor_view", ["EditorView"], _rv7t7x);  
  $def("_xvo1n6", "code_editor", ["code_editor_view"], _xvo1n6);  
  $def("_1imarq2", null, ["md"], _1imarq2);  
  $def("_470wv4", "moveCell", ["viewof command"], _470wv4);
  $def("_mvbs01", "moveCellBeside", ["viewof command"], _mvbs01);
  $def("_drag01", "dragReorder", ["runtime","divToVar","findCell","moveCellBeside"], _drag01);  
  $def("_pinoncr", "pinOnCreate", [], _pinoncr);
  $def("_19znal9", "createCell", ["viewof command"], _19znal9);
  $def("_d9nzys", "deleteCell", ["viewof command"], _d9nzys);  
  $def("_1toku21", null, ["md"], _1toku21);  
  $def("_d7ouqx", "viewof command", ["flowQueue"], _d7ouqx);  
  $def("_118qt2v", "command", ["Generators","viewof command"], _118qt2v);  
  $def("_c4420j", null, ["command"], _c4420j);  
  $def("_1f6v167", "findCellByVariable", [], _1f6v167);  
  $def("_dmk8lv", "findCellIndex", [], _dmk8lv);  
  $def("_jy01vb", "lookupCellByIndex", [], _jy01vb);  
  $def("_1rhoxk2", "findVariableIndex", ["runtime"], _1rhoxk2);  
  $def("_2pkmxz", "command_processor", ["command","viewof edit","compile_and_update","remove_variables","viewof liveCellMap","findCellIndex","lookupCellByIndex","findVariableIndex","repositionSetElement","runtime","selectVariable","viewof command","pinOnCreate","findCell"], _2pkmxz);  
  $def("_8iz5z2", null, ["md"], _8iz5z2);  
  $def("_m873d1", "states", [], _m873d1);  
  $def("_mxwoc4", "cellIdFacet", ["codemirror"], _mxwoc4);  
  $def("_y7997q", null, ["md"], _y7997q);  
  $def("_7btuqg", "observableJS_language", ["codemirror","observable_lezer_parser"], _7btuqg);  
  $def("_1xf04v5", "observableJS_highlightStyle", ["codemirror","lezerhighlight"], _1xf04v5);  
  $def("_19d9pua", "observableJS_lint", ["codemirror"], _19d9pua);  
  $def("_125gzhe", "editor_manager", ["editedCell","globalThis","codemirror","literalCompletions","EditorState","decompiled","cellIdFacet","EditorView","states","compile_and_update","code_editor_view","replaceCodeMirrorDoc","observableJS_language","observableJS_highlightStyle","myDefaultTheme"], _125gzhe);  
  $def("_65mlp5", "divToCell", [], _65mlp5);  
  $def("_bt6o0p", null, ["md"], _bt6o0p);  
  $def("_jh2ad1", "editor_refresh_from_runtime", ["editedCell","decompile","code_editor_view","replaceCodeMirrorDoc","queueMicrotask","onCodeChange","invalidation"], _jh2ad1);  
  $def("_dvne2z", "replaceCodeMirrorDoc", [], _dvne2z);  
  $def("_cbcryi", null, ["md"], _cbcryi);  
  $def("_rtf009", "viewof select", ["editedCell","Inputs","getOption","setOption"], _rtf009);  
  $def("_14mwbuc", "select", ["Generators","viewof select"], _14mwbuc);  
  $def("_d2lrrw", null, ["md"], _d2lrrw);  
  $def("_ucf24e", null, ["FileAttachment"], _ucf24e);  
  $def("_kygz54", "optionsFile", ["getFileAttachment","editorModule"], _kygz54);  
  $def("_760ozq", "viewof options", ["Inputs","optionsFile"], _760ozq);  
  $def("_4rh26k", "options", ["Generators","viewof options"], _4rh26k);  
  $def("_1lqy7cs", "setOption", ["findCell","_","viewof options","Event"], _1lqy7cs);  
  $def("_1oxe5ee", "getOption", ["findCell","_","viewof options"], _1oxe5ee);  
  $def("_kwq69p", "save_options", ["setFileAttachment","jsonFileAttachment","options","editorModule"], _kwq69p);  
  $def("_1ag9ajn", null, ["md"], _1ag9ajn);  
  $def("_dbvt0t", "escapeTemplateLiteral", [], _dbvt0t);  
  $def("_1q2xn50", "inferCellGroupNameFromOJS", ["parser"], _1q2xn50);  
  $def("_1mfm13h", "normalizeObservableClipboardCell", ["inferCellGroupNameFromOJS","escapeTemplateLiteral"], _1mfm13h);  
  $def("_1pa2xc8", "readObservableClipboardCells", ["globalThis"], _1pa2xc8);  
  $def("_1w99cbu", "pasteObservableCellsIntoModule", ["viewof liveCellMap","normalizeObservableClipboardCell","findCell","compile_and_update"], _1w99cbu);  
  $def("_z9vacx", null, ["md"], _z9vacx);
  $def("_gbuhyc", "decompiled", ["editedCell","decompile"], _gbuhyc);
  $def("_w5q3yf", "viewof editorModule", ["thisModule"], _w5q3yf);  
  $def("_18kaj2p", "editorModule", ["Generators","viewof editorModule"], _18kaj2p);  
  $def("_yn5gyd", "editor_jobs", ["command_processor","submit_summary","save_options","persist_attach_menu"], _yn5gyd);
  $def("_pamenu", "persist_attach_menu", ["viewof options","attachContextManu","Event"], _pamenu);  
  $def("_1whoy5n", null, ["md"], _1whoy5n);  
  $def("_gk83fp", "compile_and_update", ["compile","runtime","realize","repositionSetElement","decompile"], _gk83fp);  
  $def("_1g3bdxp", null, ["md"], _1g3bdxp);  
  $def("_mhcibs", "remove_variables", [], _mhcibs);  
  $def("_1qb4uz", null, ["md"], _1qb4uz);  
  $def("_rwez9", "viewof variable", ["Inputs","editedCell"], _rwez9);  
  $def("_11gvkq4", "variable", ["Generators","viewof variable"], _11gvkq4);  
  $def("_r5nvms", "name", ["variable"], _r5nvms);  
  $def("_9vxebx", "inputs", ["variable"], _9vxebx);  
  $def("_1348jvx", "viewof definition", ["Inputs","variable"], _1348jvx);  
  $def("_b4rsn5", "definition", ["Generators","viewof definition"], _b4rsn5);  
  $def("_1pimibm", null, ["Inputs","definition","variable","realize","runtime","inputs"], _1pimibm);  
  $def("_1d94dks", "javascriptPlugin", ["codemirror"], _1d94dks);  
  $def("_1j5gu2y", null, ["md"], _1j5gu2y);  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("viewof liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("viewof liveCellMap", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  main.define("extractNotebookAndCell", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("extractNotebookAndCell", _));  
  main.define("navHref", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("navHref", _));  
  main.define("cellsToClipboard", ["module @tomlarkworthy/cells-to-clipboard", "@variable"], (_, v) => v.import("cellsToClipboard", _));  
  main.define("observable_lezer_parser", ["module @tomlarkworthy/observablehq-lezer", "@variable"], (_, v) => v.import("observable_lezer_parser", _));  
  main.define("lezerhighlight", ["module @tomlarkworthy/observablehq-lezer", "@variable"], (_, v) => v.import("lezerhighlight", _));  
  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("getFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("removeFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("removeFileAttachment", _));  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("createFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("createFileAttachment", _));  
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("isnode", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isnode", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("EditorState", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("EditorState", _));  
  main.define("EditorView", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("EditorView", _));  
  main.define("codemirror", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("codemirror", _));  
  main.define("myDefaultTheme", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("myDefaultTheme", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("forcePeek", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("forcePeek", _));  
  main.define("observe", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("observe", _));
  main.define("module @tomlarkworthy/modules", async () => runtime.module((await import("/@tomlarkworthy/modules.js?v=4")).default));
  main.define("modules", ["module @tomlarkworthy/modules", "@variable"], (_, v) => v.import("currentModules", "modules", _));
  $def("_lbftlp", "literalCompletions", ["codemirror"], _lbftlp);  
  $def("_scoiwp", "completionFixture", ["EditorState","observableJS_language","literalCompletions"], _scoiwp);  
  $def("_160qhf1", "test_completion_string_literal", ["completionFixture"], _160qhf1);  
  $def("_xrmooc", "test_completion_string_prefix", ["completionFixture"], _xrmooc);  
  $def("_m0ar50", "test_completion_array_literal", ["completionFixture"], _m0ar50);  
  $def("_13247rm", "test_completion_number_literal", ["completionFixture"], _13247rm);  
  $def("_quyccp", "test_completion_bool_template_regexp", ["completionFixture"], _quyccp);  
  $def("_1cn3ucr", "test_completion_parenthesised_unwrap", ["completionFixture"], _1cn3ucr);  
  $def("_15vxhca", "test_completion_never_evaluates", ["completionFixture"], _15vxhca);  
  $def("_bz6mai", "test_completion_identifier_deferred", ["completionFixture"], _bz6mai);
  return main;
}