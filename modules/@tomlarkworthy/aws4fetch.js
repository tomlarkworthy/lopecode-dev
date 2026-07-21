const _uoi1zl = function _1(md){return(
md`# [aws4fetch](https://github.com/mhart/aws4fetch)
\`\`\`js
    import {AwsClient, AwsV4Signer} from '@tomlarkworthy/aws4fetch'
\`\`\``
)};
const _y4rpi5 = async function _aws4fetch(Response, FileAttachment, DecompressionStream) {
    const response = await new Response((await FileAttachment('aws4fetch.esm.js.gz').stream()).pipeThrough(new DecompressionStream('gzip')));
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _1buaveo = function _AwsClient(aws4fetch){return(
aws4fetch.AwsClient
)};
const _1cn0iwj = function _AwsV4Signer(aws4fetch){return(
aws4fetch.AwsV4Signer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["aws4fetch.esm.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/aws4fetch";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_uoi1zl", null, ["md"], _uoi1zl);  
  $def("_y4rpi5", "aws4fetch", ["Response","FileAttachment","DecompressionStream"], _y4rpi5);  
  $def("_1buaveo", "AwsClient", ["aws4fetch"], _1buaveo);  
  $def("_1cn0iwj", "AwsV4Signer", ["aws4fetch"], _1cn0iwj);
  return main;
}