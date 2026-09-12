const _9 = function acorn(acorn_url){return(
import(acorn_url)
)};

const _40 = function acorn_walk(acorn_walk_url){return(
import(acorn_walk_url)
)};

const _37 = async function acorn_walk_url(unzip,FileAttachment)
{
  const blob = await unzip(FileAttachment("acorn-walk-8.3.2.js.gz"));

  const objectURL = URL.createObjectURL(
    new Blob([blob], { type: "application/javascript" })
  );
  return objectURL;
}
;

const _19 = async function acorn_url(unzip,FileAttachment)
{
  const blob = await unzip(FileAttachment("acorn-8.11.3.js.gz"));

  const objectURL = URL.createObjectURL(
    new Blob([blob], { type: "application/javascript" })
  );
  return objectURL;
}
;

const _11 = function unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["acorn-walk-8.3.2.js.gz", {url: "https://static.observableusercontent.com/files/c2f0e91f1dd2b6f54808b2ba0ce16404a46278d3925ac7c9b8241c057c99c536f7b7434052464a2041d2df284f0217a5f5e857d88f423fcf6153a9cd6befa099", mimeType: "application/gzip", lastModified: 1779653460078.858, size: 2169}],
    ["acorn-8.11.3.js.gz", {url: "https://static.observableusercontent.com/files/ef3eafe327e862f191a35f6501c2c3467f9ccf3996a62bbddb02349c8154f92287caac5ba6cdd7b41dfc21857e366b4c2342a2a9d8e2fbaed102125ce54ee1d3", mimeType: "application/gzip", lastModified: 1759474107110.453, size: 32870}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("acorn", ["acorn_url"], _9);
  main.define("acorn_walk", ["acorn_walk_url"], _40);
  main.define("acorn_walk_url", ["unzip","FileAttachment"], _37);
  main.define("acorn_url", ["unzip","FileAttachment"], _19);
  main.define("unzip", ["Response","DecompressionStream"], _11);
  return main;
}
