const _p8qjpk = function _1(md){return(
md`# jest-expect-standalone@24.0.2

~~~js
import {expect} from "@tomlarkworthy/jest-expect-standalone"
~~~`
)};
const _mh1f13 = async function _expect(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('jest-expect-standalone-24.0.2.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        await import(objectURL);
        return window.expect;
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
  const fileAttachments = new Map(["jest-expect-standalone-24.0.2.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/jest-expect-standalone";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_p8qjpk", null, ["md"], _p8qjpk);  
  $def("_mh1f13", "expect", ["unzip","FileAttachment"], _mh1f13);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}