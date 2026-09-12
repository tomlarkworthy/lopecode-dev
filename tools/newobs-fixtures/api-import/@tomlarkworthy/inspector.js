const _56 = function inspect(Inspector){return(
function inspect(value) {
  const root = document.createElement("DIV");
  new Inspector(root).fulfilled(value);
  const element = root.firstChild;
  element.remove();
  element.value = value; // for viewof
  return element;
}
)};

const _135 = function src(unzip,FileAttachment){return(
unzip(FileAttachment("inspector-5@1.0.1.js.gz"))
)};

const _64 = function unzip(Response,DecompressionStream){return(
async (attachment) => {
  const response = await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  );

  return response.blob();
}
)};

const _38 = async function Inspector(src)
{
  // The bundle is UMD, so evaluate it as CommonJS. Not the `require` builtin:
  // notebook-kit's stdlib (new.observablehq.com) does not have one.
  const cjs = { exports: {} };
  new Function("exports", "module", await src.text())(cjs.exports, cjs);
  return cjs.exports.Inspector;
}
;

const _112 = function isnode(Element,Text){return(
(value) => {
  return (
    (value instanceof Element || value instanceof Text) &&
    value instanceof value.constructor
  );
}
)};

const _134 = () => {

};

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["inspector-5@1.0.1.js.gz", {url: "https://static.observableusercontent.com/files/871f5186f773c2c3a34e9c7afb4d2eca16ebdcc03c667941f864fc46ed9849119c5dfc69c0e0f9eee7c224eb7c90a04656c283a6b0a89eb967803f2925980fb9", mimeType: "application/gzip", lastModified: 1731532381660.324, size: 4132}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("inspect", ["Inspector"], _56);
  main.define("src", ["unzip","FileAttachment"], _135);
  main.define("unzip", ["Response","DecompressionStream"], _64);
  main.define("Inspector", ["src"], _38);
  main.define("isnode", ["Element","Text"], _112);
  main.define("cell 134", [], _134);
  return main;
}
