const _1viu7ed = function _1(md){return(
md`
# Hypertext literal reconciliation with nanomorph


I love the [hypertext literal](https://observablehq.com/@observablehq/htl). It is intuitive. However, naive application of it tends to invalidate state between renders leading to poor UX.

React solved this problem with a [reconciliation](https://reactjs.org/docs/reconciliation.html) algorithm. However, React is very complicated and does not gel with Observable.

This notebook is an idea to try and get a React-like reconciliation algorithm applied to the hypertext literal in an Observable native way. We exploit the \`this\` variable to retrieve the previous DOM state allowing us to diff from the previous cell UI state. 

~~~js
import {reconcile, html} from '@tomlarkworthy/reconcile-nanomorph'
~~~

This library was used to build a [reactive unit testing framework](https://observablehq.com/@tomlarkworthy/testing).
`
)};
const _15bpbql = function _2(md){return(
md`
## Demo of problem

If we have some state defined elsewhere, say a list of messages:-

`
)};
const _14w8ubd = function _msgs(){return(
["How are you?", "I am great!, loving Observable"]
)};
const _v9g32k = (M, _) => new M(_);
const _1hk9yjx = _ => _.generator;
const _1w357st = function _4(md){return(
md`
We can create a very simple chat UI using the hypertext literal to change this external state. I love this construction as it can hold its own state and helper functions. 
`
)};
const _ovlr0x = function _5(msgs,$0,htl)
{
  async function sendMsg(evt) {
    if (evt.keyCode === 13) {
      console.log(msgs);
      $0.value = msgs.concat([evt.target.value]);
    }
  }
  return htl.html`
    ${msgs.map((msg) => htl.html`<p>${msg}</p>`)}
    <input class="text" onkeydown=${sendMsg}></input>
    <button onclick=${() => ($0.value = [])}>clear</button>
  `;
};
const _18c8x24 = function _6(md){return(
md`
This is very simple to understand, but there are some problems with the UX. After sending a message, the focus of the cursor is lost. This is because when the list changes, the HTML is rebuilt from scratch, and all DOM state is lost, including the focus. So its impossible to send lots of messages in a row, you keep having to click back into the text area!
`
)};
const _17u2wel = function _7(md){return(
md`
## Solution Attempt

Create a custom \`reconcile\` function for DOM state diffing. Unlike React and Preact, we do not use a virtual DOM. Instead we compare the previous DOM state to the new hypertext literal HTMLElement. You can get the previous state of a cell with the keyword [\`this\`](https://talk.observablehq.com/t/get-the-previous-value-of-a-cell-when-its-edited-and-saved/792).

To reuse the previous state and apply a diff we add 

         reconcile(this, <HTMLElement>)

where we previously just did

         <HTMLElement>

to the implementation. Reconcile changes DOM node at \`this\` to look like \`<HTMLElement>\` and returns it, if possible, otherwise it just returns the target. 

The reconciliation algorithm will use the "id" attribute to guide matching.
`
)};
const _62o0av = function _8(msgs,$0,reconcile,htl)
{
  function sendMsg(evt) {
    if (evt.keyCode === 13) {
      console.log(msgs);
      $0.value = msgs.concat([evt.target.value]);
    }
  }
  return reconcile(
    this,
    htl.html`
    ${msgs.map((msg) => htl.html`<p>${msg}</p>`)}
    <input id="chat" class="text" onkeydown=${sendMsg}></input>
    <button onclick=${() => ($0.value = [])}>clear</button> 
  `
  );
};
const _1gwcdo = function _9(md){return(
md`
## It works!
Now state is not lost, the focus remains on the text component, __though the text is cleared__ (a slight difference to the original [reconcile prototype](https://observablehq.com/@tomlarkworthy/reconcile))
`
)};
const _fig030 = function _10(md){return(
md`
### Implementation Notes

- Unlike React the "id" attribute is used to guide element matching.

- event handlers like onclick are implemented by hypertext literal as assignment to node properties (not HTML attributes), which is why existing DOM diffs won't work (they work at HTMLElement level).

- If you try to reconcile with a live DOM element, you have to make sure the types match (e.g. DIV to DIV) so the element can be updated in place.
`
)};
const _1n41dvh = function _morph(require){return(
require('https://bundle.run/nanomorph@5.4.2')
)};
const _1boxmm3 = function _reconcile(morph){return(
function reconcile(current, target, options) {
  if (
    !current ||
    !target ||
    current.nodeType != target.nodeType ||
    current.nodeName != target.nodeName ||
    current.namespaceURI != target.namespaceURI
  ) {
    if (current && target && current.nodeName != target.nodeName) {
      console.log("Cannot reconcile", current.nodeName, target.nodeName);
    }
    return target;
  }
  return morph(current, target, options);
}
)};
const _qe4f8p = function _13(md){return(
md `# Tests`
)};
const _oqs8sx = function _attributeCreate(htl,reconcile)
{
  const current = htl.html`<div></div>`;
  const target = htl.html`<div foo="1"></div>`;
  const reconciled = reconcile(current, target);
  console.log(reconciled);
  return reconciled.getAttribute("foo") == "1";
};
const _1h1zmrl = function _attributeRemoved(htl,reconcile)
{
  const current = htl.html`<div foo="1"></div>`;
  const target = htl.html`<div></div>`;
  const reconciled = reconcile(current, target);
  return reconciled.getAttribute("foo") === null;
};
const _16o3kdh = function _attributeUpdate(htl,reconcile)
{
  const current = htl.html`<div foo="2"></div>`;
  const target = htl.html`<div foo="1"></div>`;
  const reconciled = reconcile(current, target);
  return reconciled.getAttribute("foo") == "1";
};
const _1wtswt7 = function _attributesCRUD(htl,reconcile)
{
  const current = htl.html`<div foo="2" bar="1"></div>`;
  const target = htl.html`<div bar="2" baz="3"></div>`;
  const reconciled = reconcile(current, target);
  return (
    reconciled.getAttribute("foo") == null &&
    reconciled.getAttribute("bar") == "2" &&
    reconciled.getAttribute("baz") == "3"
  );
};
const _zapyoz = function _childUpdateInPlace(htl,reconcile)
{
  const current = htl.html`<ul><li id="t1"> </li></ul>`;
  const target = htl.html`<ul><li id="t1">1</li></ul>`;
  const beforeReconciliation = current.firstChild;
  const reconciled = reconcile(current, target);
  return (
    reconciled.firstChild === beforeReconciliation &&
    reconciled.firstChild.firstChild.wholeText === "1"
  );
};
const _102hwk7 = function _childAdded(htl,reconcile)
{
  const current = htl.html`<ul></ul>`;
  const target = htl.html`<ul><li id="t1">1</li></ul>`;
  const reconciled = reconcile(current, target);
  return reconciled.firstChild.firstChild.wholeText === "1";
};
const _6gltzk = function _childRemoved(htl,reconcile)
{
  const current = htl.html`<ul><li id="t1">1</li></ul>`;
  const target = htl.html`<ul></ul>`;
  const reconciled = reconcile(current, target);
  return reconciled.firstChild == null;
};
const _14otm4x = function _keyedChildUpdateInPlace(htl,reconcile)
{
  const current = htl.html`<ul><li id="t1"></li></ul>`;
  const target = htl.html`<ul><li></li><li id="t1"></li></ul>`;
  const beforeReconciliation = current.firstChild;
  const reconciled = reconcile(current, target);
  return reconciled.firstChild.nextSibling === beforeReconciliation;
};
const _zd40b1 = function _DOMUpdateInPlaceDOM(htl){return(
htl.html`
<div id="DOMUpdateInPlace"> 
</div>
`
)};
const _1rajvba = function _DOMUpdateInPlace(DOMUpdateInPlaceDOM,html,reconcile)
{
  DOMUpdateInPlaceDOM
  
  const current = document.getElementById("DOMUpdateInPlace")
  const target = html`<div id="DOMUpdateInPlace"><p>1</p></div>`
  const reconciled = reconcile(current, target);
  return current ===  reconciled
};
const _1ahlqkd = function _NestedDOMUpdateInPlaceDOM(html){return(
html`
<div id="NestedDOMUpdateInPlace"><p>
    <b>raw</b>
</p></div>`
)};
const _11kwgml = function _NestedDOMUpdateInPlace(NestedDOMUpdateInPlaceDOM,html,reconcile)
{
  NestedDOMUpdateInPlaceDOM
  
  const current = document.getElementById("NestedDOMUpdateInPlace")
  const target = html`<div id="NestedDOMUpdateInPlace"><p>
    <b>new</b>
  </p></div>`
  reconcile(current, target);
  return current.textContent.includes("new")
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1viu7ed", null, ["md"], _1viu7ed);  
  $def("_15bpbql", null, ["md"], _15bpbql);  
  $def("_14w8ubd", "initial msgs", [], _14w8ubd);  
  $def("_v9g32k", "mutable msgs", ["Mutable","initial msgs"], _v9g32k);  
  $def("_1hk9yjx", "msgs", ["mutable msgs"], _1hk9yjx);  
  $def("_1w357st", null, ["md"], _1w357st);  
  $def("_ovlr0x", null, ["msgs","mutable msgs","htl"], _ovlr0x);  
  $def("_18c8x24", null, ["md"], _18c8x24);  
  $def("_17u2wel", null, ["md"], _17u2wel);  
  $def("_62o0av", null, ["msgs","mutable msgs","reconcile","htl"], _62o0av);  
  $def("_1gwcdo", null, ["md"], _1gwcdo);  
  $def("_fig030", null, ["md"], _fig030);  
  $def("_1n41dvh", "morph", ["require"], _1n41dvh);  
  $def("_1boxmm3", "reconcile", ["morph"], _1boxmm3);  
  $def("_qe4f8p", null, ["md"], _qe4f8p);  
  $def("_oqs8sx", "attributeCreate", ["htl","reconcile"], _oqs8sx);  
  $def("_1h1zmrl", "attributeRemoved", ["htl","reconcile"], _1h1zmrl);  
  $def("_16o3kdh", "attributeUpdate", ["htl","reconcile"], _16o3kdh);  
  $def("_1wtswt7", "attributesCRUD", ["htl","reconcile"], _1wtswt7);  
  $def("_zapyoz", "childUpdateInPlace", ["htl","reconcile"], _zapyoz);  
  $def("_102hwk7", "childAdded", ["htl","reconcile"], _102hwk7);  
  $def("_6gltzk", "childRemoved", ["htl","reconcile"], _6gltzk);  
  $def("_14otm4x", "keyedChildUpdateInPlace", ["htl","reconcile"], _14otm4x);  
  $def("_zd40b1", "DOMUpdateInPlaceDOM", ["htl"], _zd40b1);  
  $def("_1rajvba", "DOMUpdateInPlace", ["DOMUpdateInPlaceDOM","html","reconcile"], _1rajvba);  
  $def("_1ahlqkd", "NestedDOMUpdateInPlaceDOM", ["html"], _1ahlqkd);  
  $def("_11kwgml", "NestedDOMUpdateInPlace", ["NestedDOMUpdateInPlaceDOM","html","reconcile"], _11kwgml);
  return main;
}