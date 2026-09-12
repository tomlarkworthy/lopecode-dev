const _11 = async function expect(unzip,FileAttachment)
{
  const blob = await unzip(
    FileAttachment("jest-expect-standalone-24.0.2.js.gz")
  );

  const objectURL = URL.createObjectURL(
    new Blob([blob], { type: "application/javascript" })
  );
  try {
    await import(objectURL);
    return window.expect;
  } finally {
    URL.revokeObjectURL(objectURL);
  }
}
;

const _9 = function unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["jest-expect-standalone-24.0.2.js.gz", {url: "https://static.observableusercontent.com/files/44a994984be925455541ea84ec6b0c4ac2a0a77b36d929488143676c7876feaa8c75c9212ac08426ddee2de1e894294f40aac0106776eb2bd224021b6b48843a", mimeType: "application/gzip", lastModified: 1751314521532.213, size: 87649}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("expect", ["unzip","FileAttachment"], _11);
  main.define("unzip", ["Response","DecompressionStream"], _9);
  return main;
}
