const _xbm035 = function _title(md){return(
md`# Editor: Reactive Userspace Cell Mutator

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
const _9w1d13 = function _editor($0,pull_jobs,view,reversibleAttach,combine,$1,$2,$3,$4,$5,$6)
{
  console.log("rebuilding editor mutable editor_state", $0.value);
  pull_jobs;
  const combined = view`<div class="cell-editor" 
    style="display: flex;
           flex-direction: column;">
  <style>
    .picking .observablehq:hover {
      background: #ddd2;
    }
    .picked {
      outline: 1px dashed #999;
    }
    .cell-editor form {
      width: auto
    }
    .cm-editor {
      height: fit-content
    }
  </style>
  <div style="display: flex;">
    ${["module", reversibleAttach(combine, $1)]}
    <span style="flex-grow: 1;"></span>
  </div>
  <div style="display: flex;">
    ${["cell", reversibleAttach(combine, $2)]}
    <span style="flex-grow: 1;"></span>
    ${["remove_variables", reversibleAttach(combine, $3)]}
    ${["apply", reversibleAttach(combine, $4)]}
  </div>
  <div style="flex-grow: 1;">
    ${["editor", reversibleAttach(combine, $5)]}
  </div>
  ${["log", reversibleAttach(combine, $6)]}
  
</div>`;

  combined.addEventListener("mouseup", (event) => {});
  combined.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  return combined;
};
const _i6pe2h = (G, _) => G.input(_);
const _2823va = function _4(md){return(
md`Save edits by exporting to a single file`
)};
const _7bzuh = function _5(exporter){return(
exporter()
)};
const _sxves1 = function _todo(md){return(
md`## TODO

- tagged templates
- better syntax highlighter -- highlight syntax errors -- quite a lot of work, started, but see https://observablehq.com/@tomlarkworthy/observablehq-lezer)
- Imports (maybe this is a different concern)`
)};
const _bkhiho = function _7(md){return(
md`### Known Issues
- If you create a new cell, it is invisible, it will appear after exporting.`
)};
const _1a01vs1 = function _8(md){return(
md`### Editor UI Components`
)};
const _1j1loxx = function _combine(Inputs){return(
Inputs.toggle({
  label: "untick to destructure",
  value: true
})
)};
const _1h8337z = (G, _) => G.input(_);
const _163p58u = function _refresh(Inputs){return(
Inputs.button("🔄")
)};
const _1he8f0d = (G, _) => G.input(_);
const _3yjrvt = function _remove(Inputs,remove_variables,named_cell){return(
Inputs.button("🗑️", {
  reduce: () => {
    remove_variables(named_cell[1]);
  }
})
)};
const _1ad0xr8 = (G, _) => G.input(_);
const _z3yfse = function _apply(Inputs,compile_and_update,$0,named_cell)
{
  const button = Inputs.button("▶️", {
    reduce: () => {
      compile_and_update($0.value, named_cell);
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
const _1dvcp6l = function _moduleOptions(main,modules){return(
[{ name: "main", module: main }, ...modules.values()]
)};
const _niozzb = function _module(moduleOptions,$0,Inputs)
{
  const prior =
    moduleOptions.find((o) => o.name == $0.value.last_module) ||
    moduleOptions[0];
  const select = Inputs.select(moduleOptions, {
    //label: "module",
    value: prior,
    format: (info) => info.name
  });

  return select;
};
const _th6e4k = (G, _) => G.input(_);
const _10cb2ss = function _named_cell(cells,$0,$1,Event,divToCell,module,$2,moduleOptions,invalidation,Inputs,refresh)
{
  cells.set("<new cell>", []);
  const entries = [...cells.entries()];
  const prior =
    $0.value.last_cell &&
    entries.find((cell) => cell[1][0] === $0.value.last_cell[1][0]);

  // Also allow clicking to select cell
  const clickHandler = (evt) => {
    if (document.body.classList.contains("picking") && evt.isTrusted) {
      const div = evt.target.closest(".observablehq");
      $1.value = div;
      $1.dispatchEvent(new Event("input"));

      const entry = divToCell(entries, div);

      if (entry && entry._module) {
        if (entry._module !== module.module) {
          $2.value = moduleOptions.find(
            (m) => m.module == entry._module
          );
          $2.dispatchEvent(new Event("input"));
        }
      } else {
        select.value = entry;
        select.dispatchEvent(new Event("input"));
      }
    }
  };
  document.body.addEventListener("click", clickHandler);
  invalidation.then(() =>
    document.body.removeEventListener("click", clickHandler)
  );

  const select = Inputs.select(entries, {
    //label: "cell",
    value: prior,
    nonce: refresh,
    format: (v) => v[0]
  });
  return select;
};
const _158wg82 = (G, _) => G.input(_);
const _xbb9ul = function _code_editor(CodeMirror,codemirror,javascriptPlugin,myDefaultTheme,invalidation,preserveFocus)
{
  const editor = CodeMirror("initial text", {
    extensions: [
      codemirror.keymap.of([
        {
          key: "Shift-Enter",
          run: (...args) => editor.apply(...args)
        }
      ]),
      codemirror.EditorView.lineWrapping,
      javascriptPlugin.javascript(),
      codemirror.basicSetup,
      myDefaultTheme
    ]
  });

  editor.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });
  invalidation.then(preserveFocus(editor));
  return editor;
};
const _12w7gx9 = (G, _) => G.input(_);
const _k4gwtj = function _log(Inputs){return(
Inputs.textarea({
  rows: 2,
  resize: false
})
)};
const _jj0zeo = (G, _) => G.input(_);
const _1m3g65m = function _18(md){return(
md`## API`
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
const _d7ouqx = function _command(flowQueue){return(
flowQueue()
)};
const _118qt2v = (G, _) => G.input(_);
const _k52ulw = function _23(command){return(
command
)};
const _1v5svrn = function _command_processor(command,compile_and_update,$0,remove_variables,named_cell,$1)
{
  if (command.processed) return;

  let result = undefined;
  if (command.command == "createCell") {
    result = compile_and_update("{}", ["<new cell>", []]);
  } else if (command.command == "focusEditor") {
    $0.querySelector("[contenteditable]").focus();
    result = true;
  } else if (command.command == "deleteCell") {
    remove_variables(named_cell[1]);
    result = true;
  }
  if (result) {
    command.processed = true;
    $1.resolve(result);
  }
};
const _3pas62 = function _25(md){return(
md`### UI State`
)};
const _hpcgtf = async function _cells(refresh,Inputs,cellMap,module)
{
  refresh;
  return Inputs.input(await cellMap(module.module));
};
const _7zigfr = (G, _) => G.input(_);
const _q9w4sn = function _editor_state(){return(
{
  last_cell: undefined
}
)};
const _2r1zux = (M, _) => new M(_);
const _1jtksl4 = _ => _.generator;
const _1ncpffr = function _last_selected_variable(named_cell,$0)
{
  if (named_cell && named_cell[0] !== "<new cell>") {
    $0.value.last_selected_variable = named_cell;
    console.log("last_selected_variable editor_state", $0.value);
  }
  return $0.value.last_selected_variable;
};
const _1iww3p8 = function _picked_dom(Inputs){return(
Inputs.input(null)
)};
const _1d6tot7 = (G, _) => G.input(_);
const _pjbccl = function _30(md){return(
md`### UI Action`
)};
const _n6gokh = function _pull_jobs(runtime,invalidation,observe)
{
  const jobs = [...runtime._variables].find((v) => v._name == "editor_jobs");
  invalidation.then(observe(jobs._module, jobs._name, {}));
};
const _1hu4gxv = function _editor_manager($0,compile_and_update,named_cell,decompiled,Event)
{
  $0.apply = (view) => {
    const doc = view.state.doc.toString();
    compile_and_update(doc, named_cell);
    return true;
  };
  console.log("updating editor", decompiled);
  $0.value = decompiled;
  $0.dispatchEvent(new Event("input"));
};
const _1yqkzz4 = function _enable_picking(invalidation)
{
  document.body.classList.add("picking");
  invalidation.then(() => document.body.classList.remove("picking"));
};
const _vlt8qb = function _highlight_picked(named_cell,isnode,invalidation)
{
  if (!named_cell || !named_cell[1][0]) return;
  const dom = isnode(named_cell[1][0]._value)
    ? named_cell[1][0]._value
    : named_cell[1][0]._observer._node;
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
const _1glwxyn = function _36(md){return(
md`### Decompiler`
)};
const _1fk2b3x = function _modules(refresh,forcePeek,runtime,moduleMap)
{
  refresh;
  forcePeek([...runtime._variables].find((v) => v._name == "submit_summary"));
  return moduleMap(runtime);
};
const _15uk0fu = function _decompiled(named_cell,decompile)
{
  if (named_cell[1].length == 0) return "";
  return decompile(named_cell[1]);
};
const _hu3ksb = function _editor_jobs(command_processor,enable_picking,highlight_picked,editor_manager,submit_summary,last_selected_variable)
{
  // auto subscribe with forcePeek
  command_processor;
  enable_picking;
  highlight_picked;
  editor_manager;
  submit_summary;
  last_selected_variable;
  return "editor_jobs";
};
const _3ewrf5 = function _40(md){return(
md`### Apply Update`
)};
const _znxx2y = function _compile_and_update($0,compile,main,runtime,$1,repositionSetElement,module,$2,Event){return(
(source, named_cell) => {
  $0.value = "";
  const cell = named_cell[1];
  try {
    let reposition = false,
      insertionIndex = -1;
    const newVariables = compile(source);
    if (!cell || cell.length !== newVariables.length) {
      reposition = true;
      cell.forEach((v) => v.delete());
      for (let i = 0; i < newVariables.length; i++) {
        const newVariable = main.variable({});
        cell.push(newVariable);
      }
    }
    if (reposition) {
      insertionIndex =
        [...runtime._variables].findIndex(
          (v) => v == $1.value.last_selected_variable[1].at(-1)
        ) + 1;
    }
    newVariables.forEach((v, i) => {
      const variable = cell[i];
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
    $1.value.last_cell = named_cell;
    $1.value.last_module = module.name;

    console.log("compile_and_update: mutable editor_state", $1.value);
    $2.dispatchEvent(new Event("input"));
    return named_cell;
  } catch (e) {
    $0.value = e.toString();
    debugger;
  }
}
)};
const _to7her = function _42(md){return(
md`### Remove Cells`
)};
const _ted35 = function _remove_variables($0,Event){return(
(variables) => {
  variables.forEach((v) => v.delete());
  $0.dispatchEvent(new Event("input"));
}
)};
const _1j5y6u9 = function _44(md){return(
md`### Runtime Representation`
)};
const _1qwj4hy = function _variable(Inputs,named_cell){return(
Inputs.radio(named_cell[1], {
  label: "variable in cell group",
  format: (v) => v._name,
  value: named_cell[1][0]
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
const _1qu68gc = function _49(Inputs,definition,variable,inputs){return(
Inputs.button("update definition", {
  disabled: definition === variable._definition.toString(),
  reduce: () => {
    let _fn;
    eval("_fn = " + definition);
    variable.define(variable._name, inputs, _fn);
  }
})
)};
const _n6st3n = function _50(md){return(
md`### Editor Libraries`
)};
const _1d94dks = function _javascriptPlugin(codemirror){return(
codemirror
)};
const _sbrxhe = function _56(md){return(
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
  const fileAttachments = new Map(["observablejs@1.es.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/editor";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/track-parent", async () => runtime.module((await import("/@tomlarkworthy/track-parent.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module d/e1c39d41e8e944b0@939", async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4")).default));  
  main.define("module @tomlarkworthy/codemirror-6-22-2-view", async () => runtime.module((await import("/@tomlarkworthy/codemirror-6-22-2-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter", async () => runtime.module((await import("/@tomlarkworthy/exporter.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  $def("_xbm035", "title", ["md"], _xbm035);  
  main.define("trackParent", ["module @tomlarkworthy/track-parent", "@variable"], (_, v) => v.import("trackParent", _));  
  main.define("preserveFocus", ["module @tomlarkworthy/track-parent", "@variable"], (_, v) => v.import("preserveFocus", _));  
  $def("_9w1d13", "viewof editor", ["mutable editor_state","pull_jobs","view","reversibleAttach","combine","viewof module","viewof named_cell","viewof remove","viewof apply","viewof code_editor","viewof log"], _9w1d13);  
  $def("_i6pe2h", "editor", ["Generators","viewof editor"], _i6pe2h);  
  $def("_2823va", null, ["md"], _2823va);  
  $def("_7bzuh", null, ["exporter"], _7bzuh);  
  $def("_sxves1", "todo", ["md"], _sxves1);  
  $def("_bkhiho", null, ["md"], _bkhiho);  
  $def("_1a01vs1", null, ["md"], _1a01vs1);  
  $def("_1j1loxx", "viewof combine", ["Inputs"], _1j1loxx);  
  $def("_1h8337z", "combine", ["Generators","viewof combine"], _1h8337z);  
  $def("_163p58u", "viewof refresh", ["Inputs"], _163p58u);  
  $def("_1he8f0d", "refresh", ["Generators","viewof refresh"], _1he8f0d);  
  $def("_3yjrvt", "viewof remove", ["Inputs","remove_variables","named_cell"], _3yjrvt);  
  $def("_1ad0xr8", "remove", ["Generators","viewof remove"], _1ad0xr8);  
  $def("_z3yfse", "viewof apply", ["Inputs","compile_and_update","viewof code_editor","named_cell"], _z3yfse);  
  $def("_1cjyuqm", "apply", ["Generators","viewof apply"], _1cjyuqm);  
  $def("_1dvcp6l", "moduleOptions", ["main","modules"], _1dvcp6l);  
  $def("_niozzb", "viewof module", ["moduleOptions","mutable editor_state","Inputs"], _niozzb);  
  $def("_th6e4k", "module", ["Generators","viewof module"], _th6e4k);  
  $def("_10cb2ss", "viewof named_cell", ["cells","mutable editor_state","viewof picked_dom","Event","divToCell","module","viewof module","moduleOptions","invalidation","Inputs","refresh"], _10cb2ss);  
  $def("_158wg82", "named_cell", ["Generators","viewof named_cell"], _158wg82);  
  $def("_xbb9ul", "viewof code_editor", ["CodeMirror","codemirror","javascriptPlugin","myDefaultTheme","invalidation","preserveFocus"], _xbb9ul);  
  $def("_12w7gx9", "code_editor", ["Generators","viewof code_editor"], _12w7gx9);  
  $def("_k4gwtj", "viewof log", ["Inputs"], _k4gwtj);  
  $def("_jj0zeo", "log", ["Generators","viewof log"], _jj0zeo);  
  $def("_1m3g65m", null, ["md"], _1m3g65m);  
  $def("_1vptlud", "createCell", ["viewof command"], _1vptlud);  
  $def("_r5bq1l", "deleteCell", ["viewof command"], _r5bq1l);  
  $def("_1t3x554", "focusEditor", ["viewof command"], _1t3x554);  
  $def("_d7ouqx", "viewof command", ["flowQueue"], _d7ouqx);  
  $def("_118qt2v", "command", ["Generators","viewof command"], _118qt2v);  
  $def("_k52ulw", null, ["command"], _k52ulw);  
  $def("_1v5svrn", "command_processor", ["command","compile_and_update","viewof code_editor","remove_variables","named_cell","viewof command"], _1v5svrn);  
  $def("_3pas62", null, ["md"], _3pas62);  
  $def("_hpcgtf", "viewof cells", ["refresh","Inputs","cellMap","module"], _hpcgtf);  
  $def("_7zigfr", "cells", ["Generators","viewof cells"], _7zigfr);  
  $def("_q9w4sn", "initial editor_state", [], _q9w4sn);  
  $def("_2r1zux", "mutable editor_state", ["Mutable","initial editor_state"], _2r1zux);  
  $def("_1jtksl4", "editor_state", ["mutable editor_state"], _1jtksl4);  
  $def("_1ncpffr", "last_selected_variable", ["named_cell","mutable editor_state"], _1ncpffr);  
  $def("_1iww3p8", "viewof picked_dom", ["Inputs"], _1iww3p8);  
  $def("_1d6tot7", "picked_dom", ["Generators","viewof picked_dom"], _1d6tot7);  
  $def("_pjbccl", null, ["md"], _pjbccl);  
  $def("_n6gokh", "pull_jobs", ["runtime","invalidation","observe"], _n6gokh);  
  $def("_1hu4gxv", "editor_manager", ["viewof code_editor","compile_and_update","named_cell","decompiled","Event"], _1hu4gxv);  
  $def("_1yqkzz4", "enable_picking", ["invalidation"], _1yqkzz4);  
  $def("_vlt8qb", "highlight_picked", ["named_cell","isnode","invalidation"], _vlt8qb);  
  $def("_65mlp5", "divToCell", [], _65mlp5);  
  $def("_1glwxyn", null, ["md"], _1glwxyn);  
  $def("_1fk2b3x", "modules", ["refresh","forcePeek","runtime","moduleMap"], _1fk2b3x);  
  $def("_15uk0fu", "decompiled", ["named_cell","decompile"], _15uk0fu);  
  $def("_hu3ksb", "editor_jobs", ["command_processor","enable_picking","highlight_picked","editor_manager","submit_summary","last_selected_variable"], _hu3ksb);  
  $def("_3ewrf5", null, ["md"], _3ewrf5);  
  $def("_znxx2y", "compile_and_update", ["viewof log","compile","main","runtime","mutable editor_state","repositionSetElement","module","viewof refresh","Event"], _znxx2y);  
  $def("_to7her", null, ["md"], _to7her);  
  $def("_ted35", "remove_variables", ["viewof refresh","Event"], _ted35);  
  $def("_1j5y6u9", null, ["md"], _1j5y6u9);  
  $def("_1qwj4hy", "viewof variable", ["Inputs","named_cell"], _1qwj4hy);  
  $def("_11gvkq4", "variable", ["Generators","viewof variable"], _11gvkq4);  
  $def("_r5nvms", "name", ["variable"], _r5nvms);  
  $def("_9vxebx", "inputs", ["variable"], _9vxebx);  
  $def("_1348jvx", "viewof definition", ["Inputs","variable"], _1348jvx);  
  $def("_b4rsn5", "definition", ["Generators","viewof definition"], _b4rsn5);  
  $def("_1qu68gc", null, ["Inputs","definition","variable","inputs"], _1qu68gc);  
  $def("_n6st3n", null, ["md"], _n6st3n);  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("isnode", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isnode", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("runtime", ["module d/e1c39d41e8e944b0@939", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module d/e1c39d41e8e944b0@939", "@variable"], (_, v) => v.import("main", _));  
  main.define("CodeMirror", ["module @tomlarkworthy/codemirror-6-22-2-view", "@variable"], (_, v) => v.import("CodeMirror", _));  
  main.define("codemirror", ["module @tomlarkworthy/codemirror-6-22-2-view", "@variable"], (_, v) => v.import("codemirror", _));  
  main.define("myDefaultTheme", ["module @tomlarkworthy/codemirror-6-22-2-view", "@variable"], (_, v) => v.import("myDefaultTheme", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("sourceModule", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("sourceModule", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  $def("_1d94dks", "javascriptPlugin", ["codemirror"], _1d94dks);  
  $def("_sbrxhe", null, ["md"], _sbrxhe);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("forcePeek", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("forcePeek", _));  
  main.define("observe", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("observe", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));
  return main;
}