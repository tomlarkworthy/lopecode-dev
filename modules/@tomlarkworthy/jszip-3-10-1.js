const _76n9lc = function _1(md){return(
md`# [jszip@3.10.1](https://stuk.github.io/jszip/)

~~~js
import {JSZip} from "@tomlarkworthy/jszip-3-10-1"
~~~`
)};
const _umavbe = async function _JSZip(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('jszip-3.10.1.min.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return (await import(objectURL)).default;
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
  const fileAttachments = new Map(["jszip-3.10.1.min.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/jszip-3-10-1";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_76n9lc", null, ["md"], _76n9lc);  
  $def("_umavbe", "JSZip", ["unzip","FileAttachment"], _umavbe);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);
  return main;
}