const _1fc4llj = function _1(md){return(
md`# lightning-fs@4.6.0

\`\`\`js
import {FS} from "@tomlarkworthy/lightning-fs-4-6-0"
\`\`\`

~~~js
import {git, http} from "@tomlarkworthy/isomorphic-git-1-30-1" 
~~~`
)};
const _1tds3ro = async function _FS(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('lightning-fs-4.6.0.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return (await import(objectURL)).default;
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _dqri64 = function _3(md){return(
md`
### build
\`\`\`
npm install @isomorphic-git/lightning-fs@4.6.0
esbuild --minify --format=esm --bundle node_modules/@isomorphic-git/lightning-fs/dist/lightning-fs.min.js > lightning-fs@4.6.0.js
gzip -9 lightning-fs@4.6.0.js


\`\`\``
)};
const _g5fwfs = function _unzip(Response,DecompressionStream){return(
async (attachment) => {
  const response = await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  );

  return response.blob();
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["lightning-fs-4.6.0.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/lightning-fs-4-6-0";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_1fc4llj", null, ["md"], _1fc4llj);  
  $def("_1tds3ro", "FS", ["unzip","FileAttachment"], _1tds3ro);  
  $def("_dqri64", null, ["md"], _dqri64);  
  $def("_g5fwfs", "unzip", ["Response","DecompressionStream"], _g5fwfs);
  return main;
}