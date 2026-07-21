const _s7e7uu = function _1(md){return(
md`# Isomorphic-git@1.30.1

~~~js
import {git, http} from "@tomlarkworthy/isomorphic-git-1-30-1" 
~~~

~~~js
import {FS} from "@tomlarkworthy/lightning-fs-4-6-0"
~~~`
)};
const _vz8us1 = async function _git(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('isomorphic-git-1@1.30.1.bundle.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _2acekr = async function _http(unzip, FileAttachment) {
    const blob = await unzip(FileAttachment('isomorphic-git-http-1.0.0-beta.36.js.gz'));
    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
    try {
        return await import(objectURL);
    } finally {
        URL.revokeObjectURL(objectURL);
    }
};
const _1emihnv = function _4(md){return(
md`
### bundle building
\`\`\`
npm install isomorphic-git@1.30.1

// build.js
import { build } from 'esbuild';
import { http } from '@hyrious/esbuild-plugin-http';  // resolver for http/https URLs

await build({
  stdin: {
    contents: 'export * from "https://cdn.jsdelivr.net/npm/isomorphic-git@1.30.1/+esm";',
    sourcefile: 'remote.js',
  },
  minify: true,
  bundle: true,
  format: 'esm',
  outfile: 'isomorphic-git@1.30.1.bundle.js',
  plugins: [http()],          // pulls the remote module tree and inlines it
});


node build.js
gzip -9 isomorphic-git@1.30.1.bundle.js
\`\`\``
)};
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
  const fileAttachments = new Map(["isomorphic-git-1@1.30.1.bundle.js.gz","isomorphic-git-http-1.0.0-beta.36.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/isomorphic-git-1-30-1";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_s7e7uu", null, ["md"], _s7e7uu);  
  $def("_vz8us1", "git", ["unzip","FileAttachment"], _vz8us1);  
  $def("_2acekr", "http", ["unzip","FileAttachment"], _2acekr);  
  $def("_1emihnv", null, ["md"], _1emihnv);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}