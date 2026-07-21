const _b8sr2d = function _1(md){return(
md`# 👋 Hello [Native File System adapter](https://github.com/jimmywarting/native-file-system-adapter)

Progressive enhancement API for wrapping the File System Access API with fallbacks.

Unlike the [File System Access API](https://observablehq.com/@tomlarkworthy/file-system-api), this works within Observable (despite iframe), but will use the more performance File System Access API when possible.

You need \`_preferPolyfill: isOnObservableCom()\` when on Observable

\`\`\`js
import {filesystem} from "@tomlarkworthy/native-file-system-adapter"
\`\`\``
)};
const _xizi7b = function _2(md){return(
md`## Bundling

\`\`\`bash
npm install --save native-file-system-adapter \\
cd node_modules/native-file-system-adapter
npm install
npm run build
cd ..
echo 'export * from "./node_modules/native-file-system-adapter/src/es6.js";' \\
| npx esbuild --bundle --minify --format=esm > native-file-system-adapter.js    

gzip --force -9 native-file-system-adapter.js
\`\`\``
)};
const _zun82g = function _directoryhandle(Inputs,filesystem,isOnObservableCom){return(
Inputs.button("choose directory", {
  value: null,
  reduce: async () => {
    return filesystem.showDirectoryPicker({
      _preferPolyfill: isOnObservableCom()
    });
  }
})
)};
const _14qjz57 = (G, _) => G.input(_);
const _287obp = function _4(directoryhandle){return(
directoryhandle
)};
const _1i5h33x = function _files(directoryhandle){return(
directoryhandle ? Array.fromAsync(directoryhandle.values()) : []
)};
const _qlnjkc = function _6(Inputs,files){return(
Inputs.table(files)
)};
const _1yojz19 = async function _filesystem(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('native-file-system-adapter@1.js.gz'));
    debugger;
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _17n6uge = function _unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["native-file-system-adapter@1.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/native-file-system-adapter";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_b8sr2d", null, ["md"], _b8sr2d);  
  $def("_xizi7b", null, ["md"], _xizi7b);  
  $def("_zun82g", "viewof directoryhandle", ["Inputs","filesystem","isOnObservableCom"], _zun82g);  
  $def("_14qjz57", "directoryhandle", ["Generators","viewof directoryhandle"], _14qjz57);  
  $def("_287obp", null, ["directoryhandle"], _287obp);  
  $def("_1i5h33x", "files", ["directoryhandle"], _1i5h33x);  
  $def("_qlnjkc", null, ["Inputs","files"], _qlnjkc);  
  $def("_1yojz19", "filesystem", ["unzip","FileAttachment"], _1yojz19);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));
  return main;
}