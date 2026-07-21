const _1w7hs42 = function _titleHtml(html,md,metadata){return(
html`<div class=content>${
md`# ${metadata.title}
`}`
)};
const _3neljf = async function _metadata(content,FileAttachment){return(
{
  title: "A Zero Install Forkable Jamstack",
  tags: ["article", "jamstack"],
  description: "How this blog is deployed to Netlify by an open source notebook",
  target: "/blogs/jamstack.html",
  content: content.outerHTML,
  twitterCreator: "@tomlarkworthy",
  image: await FileAttachment("image@1.png").url(),
  get url() {
    return 'https://tomlarkworthy.endpointservices.net' + this.target;
  }
}
)};
const _1t7f043 = function _settings(deployStaticFile,metadata,content,preview){return(
deployStaticFile({
  ...metadata,
  content: content.outerHTML,
  app_id: 'b6a918d2-9cda-4fde-b2ec-add91b22ea02',
  source: preview.href
})
)};
const _8o97qh = (G, _) => G.input(_);
const _1rbpmcw = function _preview(deploy,page){return(
deploy("preview", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); 
  return res.send(page)
})
)};
const _orvm6r = async function _content(html,md,FileAttachment){return(
html`<div class=content>${
md`
### This blog doesn't require tools to be installed. 
Its trivial to write and update content from any computer.
- *Everything* required to write content or customize the deployment engine is web hosted.
- Content is written in [Observable](https://observablehq.com/) notebooks (e.g. [this post, [an earlier one](https://observablehq.com/@tomlarkworthy/blog-first-post?collection=@tomlarkworthy/blog)](https://observablehq.com/@tomlarkworthy/jamstack) or the [navbars](https://observablehq.com/@tomlarkworthy/blog-common)). 
- The deployment toolchain is *also* hosted in an Observable Notebook (e.g. [Netlify deploy](https://observablehq.com/@tomlarkworthy/netlify-deploy)).
- [Observable](https://observablehq.com/) is designed for literate programming. Markdown or HTML or roll your own DSL.

### This blog is fast and does not require Javascript
The usual [Jamstack](https://jamstack.org/) advantages apply.
- Compiled to static assets deployed to a CDN.
- Exploits Netlify' [instant cache invalidation](https://www.netlify.com/blog/2015/09/11/instant-cache-invalidation/) so production updates are fast.
- Scaleable and secure.

![Google Page Speed test](${await FileAttachment("image@1.png").url()})

### This blog engine is Programmable, Open Source and Forkable.
Because the engine is programmed in Observable:
- Content is written within a web hosted IDE. You generate content programatically.
- Content pages, the deployment pipeline are executed in the browser, in cells viewers can look at.
- All pages can be forked and reprogrammed, allow blog developers to customize their blog engine without installing tooling.
`
}`
)};
const _jha66v = function _page(metadata,header,topbar,sidebar,titleHtml,content){return(
`<!doctype html>
<html class="has-navbar-fixed-top">
  <head>
    <meta property="og:type" content="article">
    <meta property="og:title" content="${metadata.title}">
  ${header.outerHTML}
  </head>
  <body>
    ${topbar.outerHTML}
    <div class="columns">
      ${sidebar.outerHTML}
    <div class="column is-half">
      ${titleHtml.outerHTML}
      ${content.outerHTML}
    </div>
  </body>
</html>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image@1.png"].map((name) => {
    const module_name = "@tomlarkworthy/jamstack";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @endpointservices/netlify", async () => runtime.module((await import("/@endpointservices/netlify.js?v=4")).default));  
  main.define("module @tomlarkworthy/blog-navigation", async () => runtime.module((await import("/@tomlarkworthy/blog-navigation.js?v=4")).default));  
  main.define("module @chitacan/rss", async () => runtime.module((await import("/@chitacan/rss.js?v=4")).default));  
  $def("_1w7hs42", "titleHtml", ["html","md","metadata"], _1w7hs42);  
  $def("_3neljf", "metadata", ["content","FileAttachment"], _3neljf);  
  $def("_1t7f043", "viewof settings", ["deployStaticFile","metadata","content","preview"], _1t7f043);  
  $def("_8o97qh", "settings", ["Generators","viewof settings"], _8o97qh);  
  $def("_1rbpmcw", "preview", ["deploy","page"], _1rbpmcw);  
  $def("_orvm6r", "content", ["html","md","FileAttachment"], _orvm6r);  
  $def("_jha66v", "page", ["metadata","header","topbar","sidebar","titleHtml","content"], _jha66v);  
  main.define("deployStaticFile", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("deployStaticFile", _));  
  main.define("session", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("session", _));  
  main.define("viewof user", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("viewof user", _));  
  main.define("user", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("user", _));  
  main.define("sidebar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("sidebar", _));  
  main.define("topbar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("topbar", _));  
  main.define("header", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("header", _));  
  main.define("deploy", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("deploy", _));  
  main.define("html", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("html", _));  
  main.define("icon", ["module @chitacan/rss", "@variable"], (_, v) => v.import("icon", _));
  return main;
}