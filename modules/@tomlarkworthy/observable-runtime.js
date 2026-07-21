const _kvrivm = function _1(md){return(
md`# Observable Runtime (v5)

\`\`\`js
import {Runtime, Inspector, Library, RuntimeError} from "@tomlarkworthy/observable-runtime"
\`\`\``
)};
const _a188e4 = function _Runtime(observable){return(
observable.Runtime
)};
const _nz6rsh = function _Inspector(observable){return(
observable.Inspector
)};
const _1s7i28f = function _Library(observable){return(
observable.Library
)};
const _1iyzb44 = function _RuntimeError(observable){return(
observable.RuntimeError
)};
const _b2ba5g = async function _observable(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('runtime.js.gz'));
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
  const fileAttachments = new Map(["runtime.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/observable-runtime";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_kvrivm", null, ["md"], _kvrivm);  
  $def("_a188e4", "Runtime", ["observable"], _a188e4);  
  $def("_nz6rsh", "Inspector", ["observable"], _nz6rsh);  
  $def("_1s7i28f", "Library", ["observable"], _1s7i28f);  
  $def("_1iyzb44", "RuntimeError", ["observable"], _1iyzb44);  
  $def("_b2ba5g", "observable", ["unzip","FileAttachment"], _b2ba5g);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}