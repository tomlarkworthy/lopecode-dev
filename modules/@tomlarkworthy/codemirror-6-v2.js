const _1intxg = function _1(md){return(
md`# Vendored CodeMirror 6 + Javascript `
)};
const _ijajk5 = function _2(md){return(
md`CodeMirror is sensitive to how it is imported, this is a single dependancy.


build script
\`\`\`bash
npm install --save codemirror
npm install --save @codemirror/lang-javascript
npm install --save @codemirror/autocomplete
npm install --save @codemirror/language
npm install --save @codemirror/lint
echo 'export * from "./node_modules/codemirror/dist/index.js";
      export * from "./node_modules/@codemirror/lang-javascript/dist/index.js";
      export * from "./node_modules/@codemirror/autocomplete/dist/index.js";
      export * from "./node_modules/@codemirror/language/dist/index.js";
      export * from "./node_modules/@codemirror/lint/dist/index.js";
      export {indentWithTab} from "@codemirror/commands";
      export * from "./node_modules/@codemirror/view/dist/index.js";
      export * from "./node_modules/@codemirror/state/dist/index.js";' \\
    | npx esbuild --bundle --minify --format=esm > codemirror_javascript.js
gzip --force -9 codemirror_javascript.js  
\`\`\``
)};
const _2noyiv = function _3(EditorView,codemirror,myDefaultTheme){return(
new EditorView({
  doc: `function() {
  // nice!
  return ""
}`,
  extensions: [
    codemirror.EditorView.lineWrapping,
    codemirror.javascript(),
    codemirror.basicSetup,
    myDefaultTheme
  ]
}).dom
)};
const _lq9o6k = function _4(md){return(
md`---`
)};
const _3kbsiy = function _EditorView(codemirror){return(
codemirror.EditorView
)};
const _1xtldfe = function _EditorState(codemirror){return(
codemirror.EditorState
)};
const _ns3zjr = function _7(md){return(
md`---`
)};
const _1uuip0g = function _myDefaultTheme(codemirror){return(
codemirror.EditorView.theme({
    '&': {
        fontFamily: 'Consolas, "Roboto Mono", monospace',
        fontSize: '14px',
        height: '200px',
        backgroundColor: 'var(--theme-background-alt)',
        color: 'var(--theme-foreground)',
        border: '1px solid var(--theme-foreground-faintest)'
    },
    '.cm-content': { caretColor: 'var(--theme-foreground)' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--theme-foreground)' },
    '.cm-gutters': {
        backgroundColor: 'var(--theme-background-alt)',
        color: 'var(--theme-foreground-muted)',
        border: 'none',
        borderRight: '1px solid var(--theme-foreground-faintest)'
    },
    '.cm-activeLine': { backgroundColor: 'var(--theme-background-b)' },
    '.cm-activeLineGutter': {
        backgroundColor: 'var(--theme-background-b)',
        color: 'var(--theme-foreground)'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--theme-background-a)' },
    '.cm-tooltip': {
        backgroundColor: 'var(--theme-background-alt)',
        color: 'var(--theme-foreground)',
        border: '1px solid var(--theme-foreground-faintest)'
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
        fontFamily: 'Consolas, "Roboto Mono", monospace',
        color: 'var(--theme-foreground-muted)'
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { color: 'var(--theme-foreground-muted)' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: 'var(--theme-foreground-focus)',
        color: 'var(--theme-background)'
    },
    '.cm-completionMatchedText': {
        color: 'var(--theme-foreground)',
        textDecoration: 'none',
        fontWeight: 'bold'
    },
    '.cm-completionIcon': { color: 'var(--theme-foreground-fainter)' },
    '.cm-panels': {
        backgroundColor: 'var(--theme-background-alt)',
        color: 'var(--theme-foreground)'
    },
    '.cm-searchMatch': {
        backgroundColor: 'var(--theme-background-b)',
        outline: '1px solid var(--theme-foreground-faint)'
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'var(--theme-foreground-focus)',
        color: 'var(--theme-background)'
    }
})
)};
const _12m5h41 = function _9(md){return(
md`---`
)};
const _1d6o6ga = async function _codemirror(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('codemirror_javascript@5.js.gz'));
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

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["codemirror_javascript@5.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/codemirror-6-v2";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_1intxg", null, ["md"], _1intxg);  
  $def("_ijajk5", null, ["md"], _ijajk5);  
  $def("_2noyiv", null, ["EditorView","codemirror","myDefaultTheme"], _2noyiv);  
  $def("_lq9o6k", null, ["md"], _lq9o6k);  
  $def("_3kbsiy", "EditorView", ["codemirror"], _3kbsiy);  
  $def("_1xtldfe", "EditorState", ["codemirror"], _1xtldfe);  
  $def("_ns3zjr", null, ["md"], _ns3zjr);  
  $def("_1uuip0g", "myDefaultTheme", ["codemirror"], _1uuip0g);  
  $def("_12m5h41", null, ["md"], _12m5h41);  
  $def("_1d6o6ga", "codemirror", ["unzip","FileAttachment"], _1d6o6ga);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);
  return main;
}