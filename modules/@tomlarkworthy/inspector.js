const _wjdo00 = function _1(md){return(
md`# [@observablehq/inspector@5.0.1](https://github.com/observablehq/inspector)
## also see [@observablehq/inspector](https://observablehq.com/@observablehq/inspector)
\`\`\`js
    import {inspect, Inspector} from '@tomlarkworthy/inspector'
\`\`\``
)};
const _1q5hkak = function _inspect(Inspector){return(
function inspect(value) {
  const root = document.createElement("DIV");
  new Inspector(root).fulfilled(value);
  const element = root.firstChild;
  element.remove();
  element.value = value; // for viewof
  return element;
}
)};
const _rod2q7 = function _src(unzip,FileAttachment){return(
unzip(FileAttachment("inspector-5@1.0.1.js.gz"))
)};
const _g5fwfs = function _unzip(Response,DecompressionStream){return(
async (attachment) => {
  const response = await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  );

  return response.blob();
}
)};
const _1u9tn3v = async function _Inspector(src,require)
{
  const objectURL = URL.createObjectURL(
    new Blob([src], { type: "application/javascript" })
  );
  try {
    return (await require(objectURL)).Inspector;
  } finally {
    URL.revokeObjectURL(objectURL); // Ensure URL is revoked after import
  }
};
const _b5ui8y = function _isnode(Element,Text){return(
(value) => {
  return (
    (value instanceof Element || value instanceof Text) &&
    value instanceof value.constructor
  );
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["inspector-5@1.0.1.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/inspector";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_wjdo00", null, ["md"], _wjdo00);  
  $def("_1q5hkak", "inspect", ["Inspector"], _1q5hkak);  
  $def("_rod2q7", "src", ["unzip","FileAttachment"], _rod2q7);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);  
  $def("_1u9tn3v", "Inspector", ["src","require"], _1u9tn3v);  
  $def("_b5ui8y", "isnode", ["Element","Text"], _b5ui8y);
  return main;
}