const _cx0r2v = function _1(md){return(
md`# modern-screenshot@4.6.6`
)};
const _pl976v = function _2(modern_screenshot){return(
modern_screenshot.domToImage(document.body, { scale: 2 })
)};
const _18k59k3 = async function _modern_screenshot(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('modern-screenshot-4.6.6.js.gz'));
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
  const fileAttachments = new Map(["modern-screenshot-4.6.6.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/modern-screenshot";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_cx0r2v", null, ["md"], _cx0r2v);  
  $def("_pl976v", null, ["modern_screenshot"], _pl976v);  
  $def("_18k59k3", "modern_screenshot", ["unzip","FileAttachment"], _18k59k3);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}