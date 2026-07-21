const _ouut0z = function _1(md){return(
md`# Tabbed Pane View

Turn a dictionary of views into a tabbed composite view

\`\`\`js
import {tabbedPane} from '@tomlarkworthy/tabbed-pane-view'
\`\`\``
)};
const _fumpz5 = function _tabbedPane(view,htl){return(
{
  prompt:
    "create a function that takes a dictionary of views and create a new view that is a tabbed pane that switches between them",
  time: 1716923511020,
  comment: "Function to create a tabbed pane view from a dictionary of views"
} &&
  function tabbedPane(viewDict) {
    const tabNames = Object.keys(viewDict);
    const container = view`<div>
    <div class="tabs">
      ${tabNames.map(
        (name, i) => htl.html`<button 
          class="tab ${i === 0 ? "active" : ""}"
          onclick=${() => switchTab(i)}>${name}</button>`
      )}
    </div>
    <div class="tab-content">
      ${[
        "...",
        Object.fromEntries(
          tabNames.map((name, i) => [
            name,
            view`<div class="tab-panel" style="display: ${
              i === 0 ? "block" : "none"
            };">
        ${["...", viewDict[name]]}
      </div>`
          ])
        )
      ]}
    </div>
  </div>`;

    function switchTab(index) {
      container.querySelectorAll(":scope > .tabs > .tab").forEach((tab, i) => {
        tab.classList.toggle("active", i === index);
      });
      container
        .querySelectorAll(":scope > .tab-content > .tab-panel")
        .forEach((panel, i) => {
          panel.style.display = i === index ? "block" : "none";
        });
    }

    return container;
  }
)};
const _1e66kmt = function _controls(tabbedPane,Inputs){return(
tabbedPane({
  left: Inputs.range([0, 1]),
  right: Inputs.range([0, 10]),
  nested: tabbedPane({
    text: Inputs.text(),
    textarea: Inputs.textarea()
  })
})
)};
const _xjeu6a = (G, _) => G.input(_);
const _pacskl = function _4(md){return(
md`## Backdrivable`
)};
const _ar853m = function _5(Inputs,$0){return(
Inputs.bind(Inputs.range(), $0.left)
)};
const _9x5wf7 = function _6(Inputs,$0){return(
Inputs.bind(Inputs.range([0, 10]), $0.right)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  $def("_ouut0z", null, ["md"], _ouut0z);  
  $def("_fumpz5", "tabbedPane", ["view","htl"], _fumpz5);  
  $def("_1e66kmt", "viewof controls", ["tabbedPane","Inputs"], _1e66kmt);  
  $def("_xjeu6a", "controls", ["Generators","viewof controls"], _xjeu6a);  
  $def("_pacskl", null, ["md"], _pacskl);  
  $def("_ar853m", null, ["Inputs","viewof controls"], _ar853m);  
  $def("_9x5wf7", null, ["Inputs","viewof controls"], _9x5wf7);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));
  return main;
}