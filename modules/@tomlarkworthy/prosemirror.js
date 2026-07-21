const _1wn9hy0 = function _1(htl){return(
htl.html`<h1 style="display: none;">ProseMirror lib</h1>`
)};
const _1ff4qu4 = function _container()
{
  const container = document.createElement("div");

  const setFocused = (focused) => {
    container.classList.toggle("is-focused", focused);
  };

  container.addEventListener("focusin", () => setFocused(true));
  container.addEventListener("focusout", (event) => {
    if (event.relatedTarget && container.contains(event.relatedTarget)) return;
    setFocused(false);
  });
  return container;
};
const _5t7xdg = function _view(prosemirror,container,state,invalidation)
{
  new prosemirror.EditorView(container, { state });
  invalidation.then(() => (container.innerHTML = ""));
};
const _1qx0ors = function _state(prosemirror)
{
  const {
    EditorState,
    schema,
    exampleSetup,
    defaultMarkdownParser,
    defaultMarkdownSerializer
  } = prosemirror;

  const doc = defaultMarkdownParser.parse(
    `# Vendored [ProseMirror](https://prosemirror.net/examples/markdown/)
This is a prosemirror element. Its editing menu will appear when clicked!

`
  );

  return EditorState.create({
    doc,
    schema,
    plugins: exampleSetup({ schema })
  });
};
const _1j59703 = function _hide_menu_css(htl){return(
htl.html`<style>
.ProseMirror-menubar {
  display: none;
}
div.is-focused .ProseMirror-menubar {
  display: flex;
}

.ProseMirror-focused {
  padding: 1px;
}
</style>`
)};
const _1a5bkvo = function _6(md){return(
md`prosemirror is sensitive to how it is imported, this is a single dependancy.


## bundling prose-mirror
\`\`\`bash
npm install --save prosemirror-state \\
                      prosemirror-view \\
                      prosemirror-model \\
                      prosemirror-example-setup \\
                      prosemirror-transform \\
                      prosemirror-history \\
                      prosemirror-keymap \\
                      prosemirror-inputrules \\
                      prosemirror-commands \\
                      prosemirror-dropcursor \\
                      prosemirror-gapcursor \\
                      prosemirror-menu \\
                      prosemirror-markdown \\
                      prosemirror-tables

echo 'export * from "./node_modules/prosemirror-state/dist/index.js";
export * from "./node_modules/prosemirror-view/dist/index.js";
export * from "./node_modules/prosemirror-model/dist/index.js";
export * from "./node_modules/prosemirror-transform/dist/index.js";
export * from "./node_modules/prosemirror-history/dist/index.js";
export * from "./node_modules/prosemirror-keymap/dist/index.js";
export * from "./node_modules/prosemirror-inputrules/dist/index.js";
export * from "./node_modules/prosemirror-commands/dist/index.js";
export * from "./node_modules/prosemirror-dropcursor/dist/index.js";
export * from "./node_modules/prosemirror-gapcursor/dist/index.js";
export * from "./node_modules/prosemirror-menu/dist/index.js";
export * from "./node_modules/prosemirror-tables/dist/index.js";
export * from "./node_modules/prosemirror-markdown/dist/index.js";
export * from "./node_modules/prosemirror-example-setup/dist/index.js";' \\
  | npx esbuild --bundle --minify --format=esm > prosebundle.js

gzip --force -9 prosebundle.js
\`\`\`


### Bundling ProseMirror CSS

\`\`\`bash
echo 'import base from "./node_modules/prosemirror-view/style/prosemirror.css";
import menu from "./node_modules/prosemirror-menu/style/menu.css";
import gapcursor from "./node_modules/prosemirror-gapcursor/style/gapcursor.css";
import example from "./node_modules/prosemirror-example-setup/style/style.css";
import tables from "./node_modules/prosemirror-tables/style/tables.css";

const style = document.createElement("style");
style.textContent = base + menu + gapcursor + example + tables;
document.head.appendChild(style);' \\
  | npx esbuild --bundle --minify --loader:.css=text --format=esm > prosecssbundle.js

gzip --force -9 prosecssbundle.js
\`\`\``
)};
const _ns3zjr = function _7(md){return(
md`---`
)};
const _kh148z = async function _prosemirror(prosemirrorCssLoaded, unzip, FileAttachment) {
    prosemirrorCssLoaded;
    const blob = await unzip(FileAttachment('prosebundle@5.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _wdgd8q = async function _prosemirrorCssLoaded(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('prosecssbundle@1.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
    return true;
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
  const fileAttachments = new Map(["prosecssbundle@1.js.gz","prosebundle@5.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/prosemirror";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_1wn9hy0", null, ["htl"], _1wn9hy0);  
  $def("_1ff4qu4", "container", [], _1ff4qu4);  
  $def("_5t7xdg", "view", ["prosemirror","container","state","invalidation"], _5t7xdg);  
  $def("_1qx0ors", "state", ["prosemirror"], _1qx0ors);  
  $def("_1j59703", "hide_menu_css", ["htl"], _1j59703);  
  $def("_1a5bkvo", null, ["md"], _1a5bkvo);  
  $def("_ns3zjr", null, ["md"], _ns3zjr);  
  $def("_kh148z", "prosemirror", ["prosemirrorCssLoaded","unzip","FileAttachment"], _kh148z);  
  $def("_wdgd8q", "prosemirrorCssLoaded", ["unzip","FileAttachment"], _wdgd8q);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);
  return main;
}