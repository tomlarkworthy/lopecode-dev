const _w1icvg = function _1(md){return(
md`# [Notebook Kit@1.5.2](https://github.com/observablehq/notebook-kit) in the browser

Bundled [here](https://github.com/tomlarkworthy/notebook-kit/tree/selfhost/notebook-kit-selfhost)

Examples [here](https://observablehq.com/@tomlarkworthy/notebook-kit-examples)

The bundle is stored gzipped (\`notebook-kit-browser.js.gz\`, ~49KB) and gunzipped in userspace via \`DecompressionStream\` — the same pattern \`@tomlarkworthy/acorn-8-11-3\` uses. Possible further optimisation (not done): it still ships its own acorn (~116KB of ~177KB uncompressed); it could reuse the shared acorn from \`@tomlarkworthy/acorn-8-11-3\` by building with acorn external (specifiers \`/npm/acorn@8.11.3/+esm\`, \`/npm/acorn-walk@8.3.2/+esm\`).

\`\`\`js
import {kit} from "@tomlarkworthy/notebook-kit"
\`\`\``
)};
const _1fo4bi4 = async function _kit(FileAttachment) {
    return import(URL.createObjectURL(new Blob([await new Response((await FileAttachment('notebook-kit-browser.js.gz').stream()).pipeThrough(new DecompressionStream("gzip"))).blob()], { type: "application/javascript" })));
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["notebook-kit-browser.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/notebook-kit";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_w1icvg", null, ["md"], _w1icvg);  
  $def("_1fo4bi4", "kit", ["FileAttachment"], _1fo4bi4);
  return main;
}