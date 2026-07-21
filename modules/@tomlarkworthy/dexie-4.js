const _10frh1v = function _1(md){return(
md`# [Dexie@4.2.1](https://dexie.org/) 30kb`
)};
const _e2jblc = async function _dexie(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('dexie@1.min.js.gz'));
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    const dexie = await import(url);
    URL.revokeObjectURL(url);
    return dexie;
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
  const fileAttachments = new Map(["dexie@1.min.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/dexie-4";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_10frh1v", null, ["md"], _10frh1v);  
  $def("_e2jblc", "dexie", ["unzip","FileAttachment"], _e2jblc);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}