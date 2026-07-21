const _hsp23a = function _1(md){return(
md`# [escodegen@2.1.0](https://github.com/estools/escodegen)

JS AST to code (the inverse of Acorn)

\`\`\`js
import {escodegen} from '@tomlarkworthy/escodegen'
\`\`\``
)};
const _rg6wi4 = async function _escodegen(Response,FileAttachment,DecompressionStream)
{
  const source = await new Response(
    (
      await FileAttachment("escodegen.browser.min.js.gz").stream()
    ).pipeThrough(new DecompressionStream("gzip"))
  ).text();
  const fn = eval(source.replace(".call(this,this)", ""));
  fn(window);
  return window.escodegen;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["escodegen.browser.min.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/escodegen";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_hsp23a", null, ["md"], _hsp23a);  
  $def("_rg6wi4", "escodegen", ["Response","FileAttachment","DecompressionStream"], _rg6wi4);
  return main;
}