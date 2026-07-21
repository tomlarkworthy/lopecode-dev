const _1wrcm74 = function _title(md){return(
md`# Editor: Reactive Userspace Cell Mutator (v4)

[YouTube explainer](https://www.youtube.com/shorts/6FjeJRBC2iw)

A cell that edits the source of other cells. It is implemented in userspace as a normal cell, so it follows exported notebooks, so exported notebooks become editable! It pairs particularly well with the [single file export](https://observablehq.com/@tomlarkworthy/exporter), because edits are also exported, so you can permanently save your works in a format that continues to be editable and exportable indefinitely. It works offline too!


The editor is able to edit _any_ cell in the runtime, including those in dependancies. Import it into a notebook and then evaluate \`viewof editor\`

\`\`\`js
import {viewof editor} from '@tomlarkworthy/cell-editor'
\`\`\`

There is a minimal example of the exporter + editor setup [here](https://observablehq.com/@tomlarkworthy/editable-exports)

#### Use cases
- Edit notebooks offline
- Try things out without committing to them
- Improved debugging workflow, as you can insert \`debugger\` expressions to dependancies on-demand.
`
)};
const _1dk334g = function _2(md){return(
md`## TODO
- Rename cell
  - UI variable name does not update
- doesn't transfer properly between visualizers when editor is open
- Load cell from hash, will need the main module named properly in moduleMap
- click outside to unselect, or close
- tagged templates
- better syntax highlighter -- highlight syntax errors -- quite a lot of work, started, but see https://observablehq.com/@tomlarkworthy/observablehq-lezer)
- Import node support (maybe this is a different concern)`
)};
const _1v1noys = function _3(md){return(
md`## Select Cell`
)};
const _t4jx8p = function _selectVariable($0,modules,_,$1,Event){return(
async function selectVariable(variable, dom = undefined) {
  console.log("selectVariable", variable);
  let cell = undefined;
  if (variable) {
    const cells = $0.value.get(variable._module) || [];
    cell = cells.find((cell) => cell.variables[0] == variable);

    cell = {
      dom,
      name: cell.name,
      module: {
        cells: cells,
        ...modules.get(variable._module)
      },
      variables: cell.variables
    };
  }
  if (!_.isEqual($1.value, cell)) {
    $1.value = cell;
    $1.dispatchEvent(new Event("input"));
  } else {
    $1.value = cell;
  }
}
)};
const _q2mtyv = function _hashCell(location,extractNotebookAndCell,URLSearchParams){return(
function () {
  const hash = location.hash;
  if (hash.length > 0)
    return extractNotebookAndCell(
      new URLSearchParams(hash.substring(1)).get("cell")
    );
}
)};
const _eg6agj = function _cellListener(Generators,hash,selectVariable,divToVar,runtime,$0,invalidation){return(
Generators.observe((notify) => {
  hash;
  notify();

  const clickHandler = (evt) => {
    if (evt.detail !== 1) return; // only on single click
    selectVariable(undefined);
    notify(undefined);
  };

  const moveHandler = async (evt) => {
    if (!document.body.classList.contains("picking") || !evt.isTrusted) return;
    const div = evt.target.closest(".observablehq");
    const variable = divToVar(runtime, div);
    if (
      !variable ||
      ($0.value && div.contains($0.value.dom))
    ) {
      return;
    }

    if ($0.value?.variables[0] === variable) {
      //selectVariable(undefined);
      //notify(undefined);
    } else {
      selectVariable(variable, div);
      notify(variable);
    }
  };

  //document.body.addEventListener("click", clickHandler);
  document.body.addEventListener("mousemove", moveHandler);

  invalidation.then(() => {
    //document.body.removeEventListener("click", clickHandler);
    document.body.removeEventListener("mousemove", moveHandler);
  });
})
)};
const _1efbdyw = function _selectedCell(Inputs){return(
Inputs.input(null)
)};
const _1in3nl5 = (G, _) => G.input(_);
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
const _1owd7h4 = function _hash_selected_cell(hash,hashCell)
{
  hash;
  return hashCell();
};
const _1nluac2 = function _12(md){return(
md`## Context Menu`
)};
const _gj5udm = function _context_menu(keepalive,editorModule,htl,$0,invalidation,isOnObservableCom,selectedCell,ResizeObserver)
{
  keepalive(editorModule, "editor");
  const menu = htl.html`<div class="editor-menu" style="
      position: absolute;
      z-index: 999;
      background: var(--theme-background);
      border: 1px gray solid;
      padding: 0px 1rem;
      margin: 0px 1rem 0px;
      box-shadow: 1px 2px 2px gray;
    "
    onclick=${(e) => e.stopPropagation()}
    onmousemove=${(e) => e.stopPropagation()}
  >
      ${$0}
</div>`;
  invalidation.then(() => menu.remove());

  function positionMenu(target, menu) {
    if (!menu.parentElement) return;
    let frame = menu.parentElement.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (isOnObservableCom()) {
      menu.style.top = `${rect.bottom - frame.top + 17}px`;
    } else {
      const p = menu.offsetParent || document.body;
      const tr = target.getBoundingClientRect(); // viewport
      const pr = p.getBoundingClientRect(); // viewport

      // convert viewport -> parent coords
      const top = tr.bottom - pr.top + p.scrollTop;
      const left = tr.left - pr.left + p.scrollLeft;

      menu.style.position = "absolute";
      menu.style.top = `${top - 1}px`;
      menu.style.left = `${left}px`;
    }
    menu.style.left = `${rect.left - frame.left}px`;
  }

  if (selectedCell.dom) {
    const visualizer = selectedCell.dom.closest(".lopecode-visualizer");
    if (visualizer) {
      visualizer.appendChild(menu);
    } else {
      document.body.appendChild(menu);
    }
    positionMenu(selectedCell.dom, menu);
    window.addEventListener("resize", () =>
      positionMenu(selectedCell.dom, menu)
    );
    if (window.ResizeObserver) {
      new ResizeObserver(() => positionMenu(selectedCell.dom, menu)).observe(
        selectedCell.dom
      );
    }
  }
  return menu;
};
const _gjebb2 = function _editor(keepalive,editorModule,view,$0,toolbar,nav,$1,reversibleAttach,combine,$2,$3,$4,code_editor_view)
{
  console.log("rebuilding editor");
  keepalive(editorModule, "editor_jobs");
  const combined = view`<div class="cell-editor" 
    style="display: flex;
           flex-direction: column;">
  <style>
    .picked {
      outline: 1px dashed #999;
    }
    .cell-editor form {
      width: auto
    }
    .editor-menu summary::marker {
      content: '✍️';
      font-size: 1rem;
    }
    .cm-editor {
      height: fit-content
    }
  </style>
  <details open=${$0.value} ontoggle=${(evt) => {
    $0.value = evt.newState == "open";
  }}>
    <summary></summary>
    ${toolbar}
    ${nav($1.value)}
    <div style="display: flex;">
      ${["module", reversibleAttach(combine, $2)]}
      <span style="flex-grow: 1;"></span>
      ${["cell", reversibleAttach(combine, $3)]}
    </div>
    <div style="flex-grow: 1; padding-bottom: 1rem;">
      ${["editor", reversibleAttach(combine, $4)]}
    </div>
  </details>
</div>`;
  if ($0.value) {
    setTimeout(() => {
      code_editor_view.focus();
      code_editor_view.dispatch({
        selection: code_editor_view.state.selection
      });
    }, 0);
  }

  combined.addEventListener("mouseup", (event) => {});
  combined.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  return combined;
};
const _i6pe2h = (G, _) => G.input(_);
const _qrijja = function _15($0){return(
$0.value
)};
const _1ekverb = function _16(nav,selectedCell){return(
nav(selectedCell)
)};
const _ihidmm = function _nav(html,cellLinks){return(
function nav(selectedCell) {
  const outputs = [...selectedCell.variables[0]._outputs];
  const inputs = selectedCell.variables[0]._inputs;
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
const _c5bbe7 = function _variableLink(linkTo,modules){return(
(v) => {
  return linkTo(
    `${modules.get(v._module).name}${
      typeof v._name == "string" ? `#${v._name}` : ""
    }`
  );
}
)};
const _10o4et5 = function _foo(md,editor)
{
  md;
  editor;
};
const _1uaz1ak = function _22(md){return(
md`Save edits by exporting to a single file`
)};
const _6cst5v = function _23(exporter){return(
exporter()
)};
const _16dcfa7 = function _24(md){return(
md`### Known Issues
- If you create a new cell, it is invisible, it will appear after exporting.`
)};
const _ptdqpu = function _25(md){return(
md`### Editor UI Components`
)};
const _1344oeq = function _moduleSelection(selectedCell,Inputs,modules){return(
selectedCell &&
  Inputs.select(modules, {
    format: ([name, info]) => info.name,
    disabled: true,
    value: modules.get(selectedCell.module.module)
  })
)};
const _zaplfo = (G, _) => G.input(_);
const _3eyq6h = function _27(selectedCell){return(
selectedCell.module.cells
)};
const _nyxc3v = function _cellSelection(selectedCell,Inputs){return(
selectedCell &&
  Inputs.select(selectedCell.module.cells, {
    disabled: true,
    value: selectedCell.module.cells.find((c) => c.name == selectedCell.name)
  })
)};
const _1e63xyk = (G, _) => G.input(_);
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
const _1mzhdju = function _toolbar(view,reversibleAttach,combine,$0,$1,$2,$3,$4){return(
view`<div style="display: flex;gap: 1px;">
    ${["up", reversibleAttach(combine, $0)]}
    ${["down", reversibleAttach(combine, $1)]}
    ${["remove_variables", reversibleAttach(combine, $2)]}
    ${["add", reversibleAttach(combine, $3)]}
    ${["apply", reversibleAttach(combine, $4)]}
    <span style="flex-grow: 1;"></span>
</div>`
)};
const _2ao4j9 = function _addCells(Inputs,createCell,selectVariable){return(
Inputs.button("➕", {
  reduce: async () => {
    const vars = await createCell();
    let max = 10;
    const pollForObserver = () => {
      if (max-- == 0) {
        console.warn("Can't find dom node for new cell");
        selectVariable(vars[0]);
      } else if (vars[0]._observer._node) {
        selectVariable(vars[0], vars[0]._observer._node);
      } else {
        requestAnimationFrame(pollForObserver);
      }
    };

    pollForObserver();
  }
})
)};
const _1aii9ps = (G, _) => G.input(_);
const _7n24z8 = function _remove(Inputs,deleteCell){return(
Inputs.button("🗑️", {
  reduce: deleteCell
})
)};
const _1ad0xr8 = (G, _) => G.input(_);
const _7hjzmy = function _apply(Inputs,compile_and_update,states,selectedCell)
{
  const button = Inputs.button("▶️", {
    reduce: () => {
      compile_and_update(
        states.get(selectedCell.variables[0]).doc.toString(),
        selectedCell.variables
      );
    }
  });
  // supress gaining focus
  // doesn't work on observable iframe
  // https://issues.chromium.org/issues/40654608
  button.tabIndex = "-1";
  button.onmousedown = (e) => e.preventDefault();
  return button;
};
const _1cjyuqm = (G, _) => G.input(_);
const _14rfku9 = function _up(Inputs,moveCell,$0){return(
Inputs.button("⬆", {
  reduce: () => moveCell($0.value, -1)
})
)};
const _frzs5d = (G, _) => G.input(_);
const _corxwl = function _down(Inputs,moveCell,$0){return(
Inputs.button("⬇", {
  reduce: () => moveCell($0.value, 1)
})
)};
const _1to28po = (G, _) => G.input(_);
const _kzo0c0 = function _module(selectedCell){return(
selectedCell.module.module
)};
const _1gsutq5 = function _code_editor_view(EditorView)
{
  const view = new EditorView();
  // view.setTabFocusMode(true); doesn;t seem to work true or false
  return view;
};
const _bjjd7a = function _code_editor(code_editor_view)
{
  code_editor_view.dom.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  return code_editor_view.dom;
};
const _12w7gx9 = (G, _) => G.input(_);
const _9wdti3 = function _40(md){return(
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
const _1vptlud = function _createCell($0){return(
async ({ source = "{}" } = {}) =>
  $0.send({
    command: "createCell",
    args: {
      source
    }
  })
)};
const _r5bq1l = function _deleteCell($0){return(
async () =>
  $0.send({
    command: "deleteCell"
  })
)};
const _1t3x554 = function _focusEditor($0){return(
async ({} = {}) =>
  $0.send({
    command: "focusEditor"
  })
)};
const _z0pixw = function _45(md){return(
md`## API handler`
)};
const _d7ouqx = function _command(flowQueue){return(
flowQueue()
)};
const _118qt2v = (G, _) => G.input(_);
const _dz1xse = function _47(command){return(
command
)};
const _1f6v167 = function _findCellByVariable(){return(
(v, cells) =>
  [...cells.entries()].find((vars) => vars.includes(v))
)};
const _gvsrgs = function _findCellIndex(){return(
(variables, cells) => {
  let index = 0;
  for (let cellCandidate of cells.values()) {
    if (cellCandidate === variables) {
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
const _mq4opn = async function _command_processor(command,$0,compile_and_update,code_editor_view,remove_variables,selectedCell,findCellIndex,lookupCellByIndex,findVariableIndex,repositionSetElement,runtime,selectVariable,$1)
{
  if (command.processed) return;

  let result = undefined;
  if (command.command == "createCell") {
    $0.value = true;
    result = compile_and_update("{}");
  } else if (command.command == "focusEditor") {
    code_editor_view.focus();
    result = true;
  } else if (command.command == "deleteCell") {
    remove_variables(selectedCell.variables);
    result = true;
  } else if (command.command == "moveCell") {
    const cellIndex = findCellIndex(
      command.args.cell.variables,
      command.args.cell.module.cells
    );
    const targetCellIndex = cellIndex + command.args.amount;
    const targetCell = lookupCellByIndex(
      targetCellIndex,
      command.args.cell.module.cells
    );
    const currentFirstVariableIndex = findVariableIndex(
      command.args.cell.variables[0]
    );
    const targetFirstVariableIndex = findVariableIndex(targetCell[0]);
    const change = targetFirstVariableIndex - currentFirstVariableIndex;
    console.log(
      "moveCell",
      cellIndex,
      targetCellIndex,
      targetCell,
      currentFirstVariableIndex,
      targetFirstVariableIndex,
      change
    );
    command.args.cell.variables.forEach((v) => {
      const currentIndex = findVariableIndex(v);
      repositionSetElement(runtime._variables, v, currentIndex + change);
    });
    // recompute
    await selectVariable(command.args.cell.variables[0], command.args.cell.dom);
    result = true;
  }
  if (result) {
    command.processed = true;
    $1.resolve(result);
  }
};
const _2xprso = function _53(md){return(
md`### UI Action`
)};
const _m873d1 = function _states(){return(
new Map()
)};
const _mxwoc4 = function _cellIdFacet(codemirror){return(
codemirror.Facet.define({ combine: (v) => v[0] })
)};
const _15d1y67 = function _editor_manager(selectedCell,states,EditorState,decompiled,cellIdFacet,EditorView,codemirror,compile_and_update,code_editor_view,javascriptPlugin,myDefaultTheme)
{
  let state;
  if (!selectedCell?.variables) return;
  const key = selectedCell.variables[0];
  if (states.has(key)) {
    state = states.get(key);
  } else {
    state = EditorState.create({
      doc: decompiled,
      extensions: [
        cellIdFacet.of(key),
        EditorView.updateListener.of((update) => {
          const key = update.state.facet(cellIdFacet);
          states.set(key, update.state);
        }),
        codemirror.keymap.of([
          codemirror.indentWithTab,
          {
            key: "Shift-Enter",
            run: (view) => {
              compile_and_update(
                code_editor_view.state.doc.toString(),
                selectedCell.variables
              );
              return true;
            }
          }
        ]),
        codemirror.EditorView.lineWrapping,
        javascriptPlugin.javascript(),
        codemirror.basicSetup,
        myDefaultTheme
      ]
    });
  }

  code_editor_view.setState(state);
  states.set(key, state);
};
const _1yqkzz4 = function _enable_picking(invalidation)
{
  document.body.classList.add("picking");
  invalidation.then(() => document.body.classList.remove("picking"));
};
const _16rijmk = function _highlight_picked(selectedCell,isnode,invalidation)
{
  if (!selectedCell) return;
  const dom = isnode(selectedCell.variables[0]._value)
    ? selectedCell.variables[0]._value
    : selectedCell.variables[0]._observer._node;
  if (!dom) return;
  dom.classList.add("picked");
  invalidation.then(() => {
    dom.classList.remove("picked");
  });
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
const _te9xk = function _60(md){return(
md`### Decompiler`
)};
const _kdc1xp = function _modules(moduleMap,runtime){return(
moduleMap(runtime)
)};
const _1iethhn = function _decompiled(selectedCell,decompile)
{
  if (selectedCell.variables.length == 0) return "";
  return decompile(selectedCell.variables);
};
const _w5q3yf = function _editorModule(thisModule){return(
thisModule()
)};
const _18kaj2p = (G, _) => G.input(_);
const _1nxgruh = function _editor_jobs(selectedCell,cellListener,command_processor,enable_picking,highlight_picked,submit_summary,editor_manager)
{
  selectedCell;
  cellListener;
  command_processor;
  enable_picking;
  highlight_picked;
  submit_summary;
  editor_manager;
  return "editor_jobs";
};
const _1d24j5k = function _65(md){return(
md`### Apply Update`
)};
const _4qvn2m = function _compile_and_update(compile,selectedCell,runtime,$0,repositionSetElement){return(
(source, variables = []) => {
  try {
    let reposition = false,
      insertionIndex = -1;
    const newVariables = compile(source);
    if (!variables || variables.length !== newVariables.length) {
      reposition = true;
      variables.forEach((v) => v.delete());
      for (let i = 0; i < newVariables.length; i++) {
        const newVariable = selectedCell.module.module.variable({});
        variables.push(newVariable);
      }
    }
    if (reposition) {
      insertionIndex =
        [...runtime._variables].findIndex(
          (v) => v == $0.value.variables.at(-1)
        ) + 1;
    }
    newVariables.forEach((v, i) => {
      const variable = variables[i];
      let _fn;
      eval("_fn = " + v._definition);
      if (v._name) {
        variable.define(v._name, v._inputs, _fn);
      } else {
        variable.define(v._inputs, _fn);
      }
      if (reposition)
        repositionSetElement(runtime._variables, variable, insertionIndex + i);
    });
    return variables;
  } catch (e) {
    console.error(e);
    debugger;
  }
}
)};
const _64mbgu = function _67(md){return(
md`### Remove Cells`
)};
const _mhcibs = function _remove_variables(){return(
(variables) => {
  variables.forEach((v) => v.delete());
}
)};
const _1abtjvk = function _69(md){return(
md`### Runtime Representation`
)};
const _je3bo1 = function _variable(Inputs,selectedCell){return(
Inputs.radio(selectedCell.variables, {
  label: "variable in cell group",
  format: (v) => v._name,
  value: selectedCell.variables[0]
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
const _18svfex = function _74(Inputs,definition,variable,inputs){return(
Inputs.button("update variable", {
  disabled: definition === variable._definition.toString(),
  reduce: () => {
    let _fn;
    eval("_fn = " + definition);
    variable.define(variable._name, inputs, _fn);
  }
})
)};
const _uy34xi = function _75(md){return(
md`### Editor Libraries`
)};
const _1d94dks = function _javascriptPlugin(codemirror){return(
codemirror
)};
const _gia8f3 = function _80(md){return(
md`### Libraries`
)};
const _g5fwfs = function _unzip(Response,DecompressionStream){return(
async (attachment) => {
  const response = await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  );

  return response.blob();
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/codemirror-6-v2", async () => runtime.module((await import("/@tomlarkworthy/codemirror-6-v2.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  $def("_1wrcm74", "title", ["md"], _1wrcm74);  
  $def("_1dk334g", null, ["md"], _1dk334g);  
  $def("_1v1noys", null, ["md"], _1v1noys);  
  $def("_t4jx8p", "selectVariable", ["viewof liveCellMap","modules","_","viewof selectedCell","Event"], _t4jx8p);  
  $def("_q2mtyv", "hashCell", ["location","extractNotebookAndCell","URLSearchParams"], _q2mtyv);  
  $def("_eg6agj", "cellListener", ["Generators","hash","selectVariable","divToVar","runtime","viewof selectedCell","invalidation"], _eg6agj);  
  $def("_1efbdyw", "viewof selectedCell", ["Inputs"], _1efbdyw);  
  $def("_1in3nl5", "selectedCell", ["Generators","viewof selectedCell"], _1in3nl5);  
  $def("_1iwobxt", "divToVar", [], _1iwobxt);  
  $def("_1owd7h4", "hash_selected_cell", ["hash","hashCell"], _1owd7h4);  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  main.define("extractNotebookAndCell", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("extractNotebookAndCell", _));  
  $def("_1nluac2", null, ["md"], _1nluac2);  
  $def("_gj5udm", "context_menu", ["keepalive","editorModule","htl","viewof editor","invalidation","isOnObservableCom","selectedCell","ResizeObserver"], _gj5udm);  
  $def("_gjebb2", "viewof editor", ["keepalive","editorModule","view","viewof edit","toolbar","nav","viewof selectedCell","reversibleAttach","combine","viewof moduleSelection","viewof cellSelection","viewof code_editor","code_editor_view"], _gjebb2);  
  $def("_i6pe2h", "editor", ["Generators","viewof editor"], _i6pe2h);  
  $def("_qrijja", null, ["viewof selectedCell"], _qrijja);  
  $def("_1ekverb", null, ["nav","selectedCell"], _1ekverb);  
  $def("_ihidmm", "nav", ["html","cellLinks"], _ihidmm);  
  $def("_1tv9qxo", "cellLinks", ["html","variableLink"], _1tv9qxo);  
  $def("_c5bbe7", "variableLink", ["linkTo","modules"], _c5bbe7);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  $def("_10o4et5", "foo", ["md","editor"], _10o4et5);  
  $def("_1uaz1ak", null, ["md"], _1uaz1ak);  
  $def("_6cst5v", null, ["exporter"], _6cst5v);  
  $def("_16dcfa7", null, ["md"], _16dcfa7);  
  $def("_ptdqpu", null, ["md"], _ptdqpu);  
  $def("_1344oeq", "viewof moduleSelection", ["selectedCell","Inputs","modules"], _1344oeq);  
  $def("_zaplfo", "moduleSelection", ["Generators","viewof moduleSelection"], _zaplfo);  
  $def("_3eyq6h", null, ["selectedCell"], _3eyq6h);  
  $def("_nyxc3v", "viewof cellSelection", ["selectedCell","Inputs"], _nyxc3v);  
  $def("_1e63xyk", "cellSelection", ["Generators","viewof cellSelection"], _1e63xyk);  
  $def("_1j1loxx", "viewof combine", ["Inputs"], _1j1loxx);  
  $def("_1h8337z", "combine", ["Generators","viewof combine"], _1h8337z);  
  $def("_tct2nf", "viewof edit", ["Inputs"], _tct2nf);  
  $def("_7izj7k", "edit", ["Generators","viewof edit"], _7izj7k);  
  $def("_1mzhdju", "toolbar", ["view","reversibleAttach","combine","viewof up","viewof down","viewof remove","viewof addCells","viewof apply"], _1mzhdju);  
  $def("_2ao4j9", "viewof addCells", ["Inputs","createCell","selectVariable"], _2ao4j9);  
  $def("_1aii9ps", "addCells", ["Generators","viewof addCells"], _1aii9ps);  
  $def("_7n24z8", "viewof remove", ["Inputs","deleteCell"], _7n24z8);  
  $def("_1ad0xr8", "remove", ["Generators","viewof remove"], _1ad0xr8);  
  $def("_7hjzmy", "viewof apply", ["Inputs","compile_and_update","states","selectedCell"], _7hjzmy);  
  $def("_1cjyuqm", "apply", ["Generators","viewof apply"], _1cjyuqm);  
  $def("_14rfku9", "viewof up", ["Inputs","moveCell","viewof selectedCell"], _14rfku9);  
  $def("_frzs5d", "up", ["Generators","viewof up"], _frzs5d);  
  $def("_corxwl", "viewof down", ["Inputs","moveCell","viewof selectedCell"], _corxwl);  
  $def("_1to28po", "down", ["Generators","viewof down"], _1to28po);  
  $def("_kzo0c0", "module", ["selectedCell"], _kzo0c0);  
  $def("_1gsutq5", "code_editor_view", ["EditorView"], _1gsutq5);  
  $def("_bjjd7a", "viewof code_editor", ["code_editor_view"], _bjjd7a);  
  $def("_12w7gx9", "code_editor", ["Generators","viewof code_editor"], _12w7gx9);  
  $def("_9wdti3", null, ["md"], _9wdti3);  
  $def("_470wv4", "moveCell", ["viewof command"], _470wv4);  
  $def("_1vptlud", "createCell", ["viewof command"], _1vptlud);  
  $def("_r5bq1l", "deleteCell", ["viewof command"], _r5bq1l);  
  $def("_1t3x554", "focusEditor", ["viewof command"], _1t3x554);  
  $def("_z0pixw", null, ["md"], _z0pixw);  
  $def("_d7ouqx", "viewof command", ["flowQueue"], _d7ouqx);  
  $def("_118qt2v", "command", ["Generators","viewof command"], _118qt2v);  
  $def("_dz1xse", null, ["command"], _dz1xse);  
  $def("_1f6v167", "findCellByVariable", [], _1f6v167);  
  $def("_gvsrgs", "findCellIndex", [], _gvsrgs);  
  $def("_jy01vb", "lookupCellByIndex", [], _jy01vb);  
  $def("_1rhoxk2", "findVariableIndex", ["runtime"], _1rhoxk2);  
  $def("_mq4opn", "command_processor", ["command","viewof edit","compile_and_update","code_editor_view","remove_variables","selectedCell","findCellIndex","lookupCellByIndex","findVariableIndex","repositionSetElement","runtime","selectVariable","viewof command"], _mq4opn);  
  $def("_2xprso", null, ["md"], _2xprso);  
  $def("_m873d1", "states", [], _m873d1);  
  $def("_mxwoc4", "cellIdFacet", ["codemirror"], _mxwoc4);  
  $def("_15d1y67", "editor_manager", ["selectedCell","states","EditorState","decompiled","cellIdFacet","EditorView","codemirror","compile_and_update","code_editor_view","javascriptPlugin","myDefaultTheme"], _15d1y67);  
  $def("_1yqkzz4", "enable_picking", ["invalidation"], _1yqkzz4);  
  $def("_16rijmk", "highlight_picked", ["selectedCell","isnode","invalidation"], _16rijmk);  
  $def("_65mlp5", "divToCell", [], _65mlp5);  
  $def("_te9xk", null, ["md"], _te9xk);  
  $def("_kdc1xp", "modules", ["moduleMap","runtime"], _kdc1xp);  
  $def("_1iethhn", "decompiled", ["selectedCell","decompile"], _1iethhn);  
  $def("_w5q3yf", "viewof editorModule", ["thisModule"], _w5q3yf);  
  $def("_18kaj2p", "editorModule", ["Generators","viewof editorModule"], _18kaj2p);  
  $def("_1nxgruh", "editor_jobs", ["selectedCell","cellListener","command_processor","enable_picking","highlight_picked","submit_summary","editor_manager"], _1nxgruh);  
  $def("_1d24j5k", null, ["md"], _1d24j5k);  
  $def("_4qvn2m", "compile_and_update", ["compile","selectedCell","runtime","viewof selectedCell","repositionSetElement"], _4qvn2m);  
  $def("_64mbgu", null, ["md"], _64mbgu);  
  $def("_mhcibs", "remove_variables", [], _mhcibs);  
  $def("_1abtjvk", null, ["md"], _1abtjvk);  
  $def("_je3bo1", "viewof variable", ["Inputs","selectedCell"], _je3bo1);  
  $def("_11gvkq4", "variable", ["Generators","viewof variable"], _11gvkq4);  
  $def("_r5nvms", "name", ["variable"], _r5nvms);  
  $def("_9vxebx", "inputs", ["variable"], _9vxebx);  
  $def("_1348jvx", "viewof definition", ["Inputs","variable"], _1348jvx);  
  $def("_b4rsn5", "definition", ["Generators","viewof definition"], _b4rsn5);  
  $def("_18svfex", null, ["Inputs","definition","variable","inputs"], _18svfex);  
  $def("_uy34xi", null, ["md"], _uy34xi);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("isnode", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isnode", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("EditorState", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("EditorState", _));  
  main.define("EditorView", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("EditorView", _));  
  main.define("codemirror", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("codemirror", _));  
  main.define("myDefaultTheme", ["module @tomlarkworthy/codemirror-6-v2", "@variable"], (_, v) => v.import("myDefaultTheme", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("sourceModule", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("sourceModule", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  $def("_1d94dks", "javascriptPlugin", ["codemirror"], _1d94dks);  
  $def("_gia8f3", null, ["md"], _gia8f3);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("forcePeek", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("forcePeek", _));  
  main.define("observe", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("observe", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("viewof liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("viewof liveCellMap", _));  
  main.define("liveCellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("liveCellMap", _));
  return main;
}