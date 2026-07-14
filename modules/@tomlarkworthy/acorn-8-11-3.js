const _k54r8u = function _1(md){return(
md`# [Acorn@8.11.3](https://github.com/acornjs/acorn)

\`\`\`\`js
import { acorn } from "@tomlarkworthy/acorn-8-11-3"
\`\`\``
)};
const _1xdqqxo = function _acorn(acorn_url) {
    return import(acorn_url);
};
const _jdtsxp = async function _acorn_url(unzip,FileAttachment)
{
  const blob = await unzip(FileAttachment("acorn-8.11.3.js.gz"));

  const objectURL = URL.createObjectURL(
    new Blob([blob], { type: "application/javascript" })
  );
  return objectURL;
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
  const fileAttachments = new Map(["acorn-8.11.3.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/acorn-8-11-3";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_k54r8u", null, ["md"], _k54r8u);  
  $def("_1xdqqxo", "acorn", ["acorn_url"], _1xdqqxo);  
  $def("_jdtsxp", "acorn_url", ["unzip","FileAttachment"], _jdtsxp);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}