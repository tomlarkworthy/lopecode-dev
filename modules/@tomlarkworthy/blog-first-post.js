const _1c3tjsj = function _title(html,md){return(
html`<div class=content>${
md`# First Post: Static site generation in Observable
`}`
)};
const _11rvhic = function _2(html){return(
html`<a href="http://tomlarkworthy.endpointservices.net/blogs/firstpost.html">prod`
)};
const _14jc6aq = function _3(deployStaticFile,content,preview){return(
deployStaticFile({
  title: "Static site generation in Observable",
  content: content.outerHTML,
  app_id: 'b6a918d2-9cda-4fde-b2ec-add91b22ea02',
  source: preview.href,
  target: "/blogs/firstpost.html",
  tags: ["article"]
})
)};
const _1xx9u3m = function _content(html,md,rule30n,icon){return(
html`<div class=content>${
md`

This post was authored in [_Observable_](https://observablehq.com/) at [_@tomlarkworthy/blog-first-post_](https://observablehq.com/@tomlarkworthy/blog-first-post). I love programming in _Observable_. I have always felt limited by the expressivity of CRMs like WordPress and Contentful. I want to blog using code. I want to use Observable as an interface to a static site.

## Write with Code 

With _Observable_ I can generate static prose programatically:

${rule30n(20).map(row => `    ${row.map(d => d == 0 ? ' ': '#').join('')}\n`)} 


And this is generated and embedded into a pure HTML site.

## Animate with Code

I can also embed Observable cells for dynamic content (kudos [Lionel Radisson](https://observablehq.com/@makio135)). Find more of his [great code here](https://observablehq.com/@makio135/creative-coding)

<iframe width="100%" height="600" frameborder="0"
  src="https://observablehq.com/embed/@makio135/svg-template?cell=render"></iframe>

So now I have a kick-ass static site that's super easy to update! I don't need to run a CLI command or do a PR to update it. All features can be done in the browser, including the build chain. The whole thing is entirely in _Observable_. Furthermore, it's all backed by CDN and is super fast, there are no compromises on the output, exactly because it's self authored. 

## Tech Used

I used a [serverside cell](https://observablehq.com/@tomlarkworthy/serverside-cells) called [preview](https://observablehq.com/@tomlarkworthy/blog-first-post#preview) to dynamically serve the page. You can see that preview at the following link:

[https://endpointservice.web.app/notebooks/@tomlarkworthy/blog-first-post/deployments/preview](https://endpointservice.web.app/notebooks/@tomlarkworthy/blog-first-post/deployments/preview)

By default, the preview page renders every visit. This is somewhat slow, taking around 2-3 seconds, but it means published changes are reflected quickly. However, it is a horrible URL and too slow for production.

I give the page a nice URL using Netlify. To make the production page fast, I max the shared cache settings in the [serverside cell](https://observablehq.com/@tomlarkworthy/serverside-cells) when a production _X-Version_ header is present. Thus, so we lean heavily on the integrated CDN.

On the Netlify end, I set up the page to redirect to the serverside cell URL and add a custom _X-Version_ header. When the production page is updated, the version header is bumped, so the upstream cache is invalidated.

## Stay tuned

The personal webpage is a work in progress. Meta tags are missing, the RSS feed doesn't work and it doesn't support more than one page yet! But I will add to this over the next few weeks and hopefully get it to a state where anybody can create a page easily. For now, follow along on Observable${icon()} or [Twitter](https://twitter.com/tomlarkworthy).

Check

`
}`
)};
const _ojievs = function _initial()
{
  const arr = Array(61).fill(0);
  arr[30] = 1;
  return arr
};
const _a0cmmw = async function _6(html,FileAttachment){return(
html`<img src=${await FileAttachment("image.png").url()}>`
)};
const _1mubw18 = function _rule30(){return(
(input) => input.map((_, idx) => {
  const context = [input[idx-1] || 0, input[idx] || 0, input[idx+1] || 0];
  const id = JSON.stringify
  switch (id(context)) {
    case id([1,1,1]): return 0
    case id([1,1,0]): return 0
    case id([1,0,1]): return 0
    case id([1,0,0]): return 1
    case id([0,1,1]): return 1
    case id([0,1,0]): return 1
    case id([0,0,1]): return 1
    case id([0,0,0]): return 0
    default: throw Error(`Unexpected ${context}`)
  }
})
)};
const _naeojy = function _rule30n(rule30,initial){return(
(n) => new Array(n).fill(0).reduce(
  (acc) => {
    console.log(acc)
    return acc.concat([rule30(acc[acc.length - 1])])
  },
  [initial]
)
)};
const _vcjiyf = function _preview(deploy,header,topbar,sidebar,title,content){return(
deploy("preview", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); 
  return res.send(`<html class="has-navbar-fixed-top">
    <head>
    ${header.outerHTML}
    </head>
    <body>
    ${topbar.outerHTML}
    <div class="columns">
      ${sidebar.outerHTML}
    <div class="column is-half">
      ${title.outerHTML}
      ${content.outerHTML}
    </div>
    </body>
    </html>`)
})
)};
const _1te1gdl = function _10(md){return(
md`


Netlify redirect:
-H 'cache-control: max-age=0' // Does not affect FH?

-H 'if-none-match: <etag>'  if etag is right we can cache a cache hit
-H 'Authorization: <>' We can can cause a refetch regardless

-X 'X-Version' We can cause a refetch

`
)};
const _1tnb3af = function _15(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png"].map((name) => {
    const module_name = "@tomlarkworthy/blog-first-post";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/blog-navigation", async () => runtime.module((await import("/@tomlarkworthy/blog-navigation.js?v=4")).default));  
  main.define("module @chitacan/rss", async () => runtime.module((await import("/@chitacan/rss.js?v=4")).default));  
  main.define("module @tomlarkworthy/netlify-deploy", async () => runtime.module((await import("/@tomlarkworthy/netlify-deploy.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1c3tjsj", "title", ["html","md"], _1c3tjsj);  
  $def("_11rvhic", null, ["html"], _11rvhic);  
  $def("_14jc6aq", null, ["deployStaticFile","content","preview"], _14jc6aq);  
  $def("_1xx9u3m", "content", ["html","md","rule30n","icon"], _1xx9u3m);  
  $def("_ojievs", "initial", [], _ojievs);  
  $def("_a0cmmw", null, ["html","FileAttachment"], _a0cmmw);  
  $def("_1mubw18", "rule30", [], _1mubw18);  
  $def("_naeojy", "rule30n", ["rule30","initial"], _naeojy);  
  $def("_vcjiyf", "preview", ["deploy","header","topbar","sidebar","title","content"], _vcjiyf);  
  $def("_1te1gdl", null, ["md"], _1te1gdl);  
  main.define("sidebar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("sidebar", _));  
  main.define("topbar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("topbar", _));  
  main.define("header", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("header", _));  
  main.define("deploy", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("deploy", _));  
  main.define("html", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("html", _));  
  main.define("icon", ["module @chitacan/rss", "@variable"], (_, v) => v.import("icon", _));  
  main.define("deployStaticFile", ["module @tomlarkworthy/netlify-deploy", "@variable"], (_, v) => v.import("deployStaticFile", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1tnb3af", null, ["footer"], _1tnb3af);
  return main;
}