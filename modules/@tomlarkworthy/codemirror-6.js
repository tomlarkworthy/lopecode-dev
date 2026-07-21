const _274az = function _1(md){return(
md`# CodeMirror 6 Backwritable View`
)};
const _1ewqgh7 = function _2(md){return(
md`Refactor of [@andy0130tw](https://observablehq.com/@andy0130tw/codemirror) Codemirror component. Added back-writability (it was very hard to get events right, use [@tomlarkworthy/ndd](/@tomlarkworthy/ndd)) and switched to <strike>UPKG</strike> \`jspm.dev\`  because Skypack was causing errors ([issue](https://github.com/skypackjs/skypack-cdn/issues/159)).

Sample usage: 

\`\`\`javascript
import { CodeMirror } from '@tomlarkworthy/codemirror-6'

viewof editor = CodeMirror('initial text', {
  extensions: []
})
\`\`\`

Thanks [@jmatsushita](https://observablehq.com/@jmatsushita) for the \`jspm.dev\` fix!

Back-writability allows the view to be bound to other views, such as [localStorageView](https://observablehq.com/@tomlarkworthy/local-storage-view). Example [here](https://observablehq.com/@tomlarkworthy/community-help#cell-540).
`
)};
const _vg33ez = function _javascriptPlugin(esmCodeMirror){return(
esmCodeMirror("lang-javascript")
)};
const _xylqz7 = function _editor(CodeMirror,javascriptPlugin,codemirror,myDefaultTheme){return(
CodeMirror("const foo = () => 4.5\n", {
  extensions: [
    javascriptPlugin.javascript(),
    codemirror.basicSetup,
    myDefaultTheme
  ]
})
)};
const _i6pe2h = (G, _) => G.input(_);
const _1gy8xq8 = function _5(editor){return(
editor
)};
const _1kgugck = function _texarea(Inputs,$0){return(
Inputs.bind(
  Inputs.textarea({
    label: "bidirecitonal binding"
  }),
  $0
)
)};
const _19y9cim = (G, _) => G.input(_);
const _ns3zjr = function _7(md){return(
md`---`
)};
const _tjuwhl = function _CODEMIRROR_VERSION(){return(
"6.0.1"
)};
const _12m5h41 = function _9(md){return(
md`---`
)};
const _yngp86 = function _CodeMirror(codemirror,Event,htl,calcChange){return(
(doc = "", config = {}) => {
  const extensions = config.extensions ?? [];

  const updateViewOf = codemirror.EditorView.updateListener.of((update) => {
    if (doc !== view.state.doc.toString()) {
      doc = view.state.doc.toString();
      container.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  const view = new codemirror.EditorView({
    doc,
    extensions: [updateViewOf, ...extensions]
  });
  const el = view.dom;
  const container = htl.html`<div><span onInput=${(evt) =>
    evt.stopPropagation()}>${el}`;
  Object.defineProperty(container, "value", {
    enumerable: true,
    get: () => doc,
    set: (newContent = "") => {
      const change = calcChange(doc, newContent, view.state.selection);
      doc = newContent;
      view.dispatch(change);
    }
  });
  return container;
}
)};
const _14egc9w = function _11(calcChange){return(
calcChange("abcddddddefg", "abcddddddefg", { ranges: [{ from: 8 }] })
)};
const _ibp4j7 = function _calcChange(){return(
(previous, next, selection) => {
  // Find where to start inserting
  for (
    var insertOffset = 0;
    insertOffset < selection.ranges[0].from;
    insertOffset++
  ) {
    if (previous[insertOffset] !== next[insertOffset]) break;
  }

  // Find where the insert ends
  for (
    var endOffset = 0;
    endOffset < previous.length - selection.ranges[0].from;
    endOffset++
  ) {
    if (
      previous[previous.length - endOffset - 1] !==
      next[next.length - endOffset - 1]
    )
      break;
  }
  const insert = next.substring(insertOffset, next.length - endOffset);
  const cursor = Math.min(insertOffset + insert.length, next.length);
  return {
    changes: [
      {
        from: insertOffset,
        to: previous.length - endOffset,
        insert
      }
    ],
    selection: {
      anchor: cursor,
      head: cursor
    }
  };
}
)};
const _1ywz8ya = function _13(md){return(
md`---`
)};
const _1io61wn = function _myDefaultTheme(codemirror){return(
codemirror.EditorView.theme({
  "&": {
    fontFamily: 'Consolas, "Roboto Mono", monospace',
    fontSize: "14px",
    height: "200px",
    border: "1px solid #ddd"
  }
})
)};
const _1n03464 = function _15(md){return(
md`---`
)};
const _g6ce4n = function _esmImport() {
    return pkg => import(`https://jspm.dev/${ pkg }`);
};
const _1n6zbww = function _esmCodeMirror(esmImport,CODEMIRROR_VERSION){return(
(mod) =>
  esmImport(
    "@codemirror/" +
      (mod.indexOf("@") >= 0 ? mod : `${mod}@${CODEMIRROR_VERSION}`)
  )
)};
const _j5pxar = function _codemirror(esmImport){return(
esmImport(`codemirror`)
)};
const _1slgyls = function _19(md){return(
md`---`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_274az", null, ["md"], _274az);  
  $def("_1ewqgh7", null, ["md"], _1ewqgh7);  
  $def("_vg33ez", "javascriptPlugin", ["esmCodeMirror"], _vg33ez);  
  $def("_xylqz7", "viewof editor", ["CodeMirror","javascriptPlugin","codemirror","myDefaultTheme"], _xylqz7);  
  $def("_i6pe2h", "editor", ["Generators","viewof editor"], _i6pe2h);  
  $def("_1gy8xq8", null, ["editor"], _1gy8xq8);  
  $def("_1kgugck", "viewof texarea", ["Inputs","viewof editor"], _1kgugck);  
  $def("_19y9cim", "texarea", ["Generators","viewof texarea"], _19y9cim);  
  $def("_ns3zjr", null, ["md"], _ns3zjr);  
  $def("_tjuwhl", "CODEMIRROR_VERSION", [], _tjuwhl);  
  $def("_12m5h41", null, ["md"], _12m5h41);  
  $def("_yngp86", "CodeMirror", ["codemirror","Event","htl","calcChange"], _yngp86);  
  $def("_14egc9w", null, ["calcChange"], _14egc9w);  
  $def("_ibp4j7", "calcChange", [], _ibp4j7);  
  $def("_1ywz8ya", null, ["md"], _1ywz8ya);  
  $def("_1io61wn", "myDefaultTheme", ["codemirror"], _1io61wn);  
  $def("_1n03464", null, ["md"], _1n03464);  
  $def("_g6ce4n", "esmImport", [], _g6ce4n);  
  $def("_1n6zbww", "esmCodeMirror", ["esmImport","CODEMIRROR_VERSION"], _1n6zbww);  
  $def("_j5pxar", "codemirror", ["esmImport"], _j5pxar);  
  $def("_1slgyls", null, ["md"], _1slgyls);
  return main;
}