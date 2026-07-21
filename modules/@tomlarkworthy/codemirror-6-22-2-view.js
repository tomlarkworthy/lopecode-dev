const _2n4vmf = function _1(md){return(
md`# CodeMirror 6 + Javascript `
)};
const _elhctv = function _2(md){return(
md`CodeMirror is sensitive to how it is imported, this is a single dependancy. For more information check out the original [CodeMirror 6 Backwritable View](https://observablehq.com/@tomlarkworthy/codemirror-6)

\`\`\`bash
npm install --save codemirror
npm install --save @codemirror/lang-javascript
echo 'export * from "./node_modules/codemirror/dist/index.js";
      export * from "./node_modules/@codemirror/lang-javascript/dist/index.js";
      export * from "./node_modules/@codemirror/view/dist/index.js";
      export * from "./node_modules/@codemirror/state/dist/index.js";' \\
    | npx esbuild --bundle --format=esm > codemirror_javascript.js\`\`\``
)};
const _y1eozv = function _3(CodeMirror,codemirror,myDefaultTheme){return(
CodeMirror(
  `function() {
  // nice!
  return ""
}`,
  {
    extensions: [
      codemirror.EditorView.lineWrapping,
      codemirror.javascript(),
      codemirror.basicSetup,
      myDefaultTheme
    ]
  }
)
)};
const _lq9o6k = function _4(md){return(
md`---`
)};
const _9963nq = function _CodeMirror(codemirror,Event,htl,calcChange){return(
(doc = "", config = {}) => {
  const extensions = config.extensions ?? [];

  const updateViewOf = codemirror.EditorView.updateListener.of((update) => {
    console.log(update);
    container.dispatchEvent(new Event("input", { bubbles: true }));
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
    get: () => view.state.doc.toString(),
    set: (newContent = "") => {
      const change = calcChange(
        view.state.doc.toString(),
        newContent,
        view.state.selection
      );
      view.dispatch(change);
    }
  });
  return container;
}
)};
const _1jnm9si = function _6(calcChange){return(
calcChange("abcefg", "abcnewefg", { ranges: [{ from: 8 }] })
)};
const _wjccwd = function _calcChange(findMiddle){return(
(previous, next, selection) => {
  // Find where to start inserting
  const [insertOffset, endOffset] = findMiddle(previous, next);
  const insert = next.substring(insertOffset, next.length - endOffset);
  const cursor = Math.min(insertOffset + insert.length, next.length);
  return {
    changes: [
      {
        from: insertOffset,
        to: previous.length - endOffset,
        insert
      }
    ]
    /*
    selection: {
      anchor: cursor,
      head: cursor
    }*/
  };
}
)};
const _1b9kxr1 = function _findMiddle(){return(
function findMiddle(s1, s2) {
  const n = s1.length,
    m = s2.length;

  // Step 1: Find the shared prefix
  let prefixLen = 0;
  while (prefixLen < n && prefixLen < m && s1[prefixLen] === s2[prefixLen]) {
    prefixLen++;
  }

  // Step 2: Find the shared suffix
  let suffixLen = 0;
  while (
    suffixLen < n - prefixLen &&
    suffixLen < m - prefixLen &&
    s1[n - suffixLen - 1] === s2[m - suffixLen - 1]
  ) {
    suffixLen++;
  }

  return [prefixLen, suffixLen];
}
)};
const _12m5h41 = function _9(md){return(
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
const _1sduffs = function _11(md){return(
md`---`
)};
const _1ob2dzh = async function _codemirror(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('codemirror_javascript@1.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        console.log('Loading codemirror from', objectURL);
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _g5fwfs = function _unzip(Response,DecompressionStream){return(
async (attachment) => {
  const response = await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  );

  return response.blob();
}
)};
const _1hekmkt = function _14(md){return(
md`---`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["codemirror_javascript.js.gz","codemirror_javascript@1.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/codemirror-6-22-2-view";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_2n4vmf", null, ["md"], _2n4vmf);  
  $def("_elhctv", null, ["md"], _elhctv);  
  $def("_y1eozv", null, ["CodeMirror","codemirror","myDefaultTheme"], _y1eozv);  
  $def("_lq9o6k", null, ["md"], _lq9o6k);  
  $def("_9963nq", "CodeMirror", ["codemirror","Event","htl","calcChange"], _9963nq);  
  $def("_1jnm9si", null, ["calcChange"], _1jnm9si);  
  $def("_wjccwd", "calcChange", ["findMiddle"], _wjccwd);  
  $def("_1b9kxr1", "findMiddle", [], _1b9kxr1);  
  $def("_12m5h41", null, ["md"], _12m5h41);  
  $def("_1io61wn", "myDefaultTheme", ["codemirror"], _1io61wn);  
  $def("_1sduffs", null, ["md"], _1sduffs);  
  $def("_1ob2dzh", "codemirror", ["unzip","FileAttachment"], _1ob2dzh);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);  
  $def("_1hekmkt", null, ["md"], _1hekmkt);
  return main;
}