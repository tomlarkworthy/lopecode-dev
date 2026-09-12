const _14 = function Runtime(observable){return(
observable.Runtime
)};

const _10 = function Inspector(observable){return(
observable.Inspector
)};

const _12 = function Library(observable){return(
observable.Library
)};

const _16 = function RuntimeError(observable){return(
observable.RuntimeError
)};

const _5 = async function observable(unzip,FileAttachment)
{
  const blob = await unzip(FileAttachment("runtime.js.gz"));

  const objectURL = URL.createObjectURL(
    new Blob([blob], { type: "application/javascript" })
  );
  try {
    return await import(objectURL);
  } finally {
    URL.revokeObjectURL(objectURL);
  }
}
;

const _6 = function unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["runtime.js.gz", {url: "https://static.observableusercontent.com/files/8cccd6235f8a3942c32b63f3eb9b0d4dde38e067e535593d175973050f65ae06e1854be4392aee9bc4e185a83f144f78c499dca7f5c214026ad2491e46a175fd", mimeType: "application/gzip", lastModified: 1744398046024.907, size: 37193}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("Runtime", ["observable"], _14);
  main.define("Inspector", ["observable"], _10);
  main.define("Library", ["observable"], _12);
  main.define("RuntimeError", ["observable"], _16);
  main.define("observable", ["unzip","FileAttachment"], _5);
  main.define("unzip", ["Response","DecompressionStream"], _6);
  return main;
}
