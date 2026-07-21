const _c0krkw = function _1(html,md){return(
html`<div class=content>${
md`# BLOG: Netlify Deployment Manager Notebook
`}`
)};
const _1wfprru = function _metadata(content,imageUrl){return(
{
  title: "Netlify Deployment Manager Notebook",
  description: "How this blog is deployed to Netlify by an open source notebook",
  notebook: 'https://observablehq.com/@tomlarkworthy/blog-netlify-deployment-manager',
  content: content.outerHTML,
  target: "/blogs/partial-deployment.html",
  tags: ["article", "jamstack"],
  twitterCreator: "@tomlarkworthy",
  image: imageUrl,
  get url() {
    return 'https://tomlarkworthy.endpointservices.net' + this.target;
  }
}
)};
const _df0m9k = function _settings(deployStaticFile,metadata,preview){return(
deployStaticFile({
  ...metadata,
  app_id: 'b6a918d2-9cda-4fde-b2ec-add91b22ea02',
  source: preview.href
})
)};
const _8o97qh = (G, _) => G.input(_);
const _1vh7l2h = function _preview(deploy,page){return(
deploy("preview", (req, res) => {
  return res.send(page);
})
)};
const _hd1dz9 = function _6(page){return(
page
)};
const _pd52r7 = function _content(html,md,graphic){return(
html`<div class=content>${
md`

To recap I am building my blog using [Observable](https://observablehq.com) as the Content Management System (CMS) interface to a statically deployed site (Jamstack). The main motivation for building _yet-another-static-site-generator_ is that Observable is a web-based literate programming notebook environment. So the unique angle of _this_ jamstack is that the content interface is programmable and forkable (like [this](https://observablehq.com/@tomlarkworthy/blog-partial-deployment)) which gives me unlimited creative freedom and extension points as a technical content author.

${graphic.outerHTML}

**Even the deployment toolchain is hosted as a notebook** that can be forked and customized. This article describes some of the features so far for the deployment notebook.

## [Netlify Deployment Manager](https://observablehq.com/@tomlarkworthy/netlify-deploy?collection=@tomlarkworthy/blog#deployStaticFile)

So I just got partial deployment working nicely so I thought now would be a good time to summarize the deployment features so far. 

Some of my frustrations with existing CMSs are

1. Content changes either take a long time to propagate, or the overall page is slow, depending on the cache settings.

- Deployment can take a long time.

## Instant CDN cache preloading and invalidation

[Netlify](https://www.netlify.com/) solves the cache problems with a smart cache. Caches are not cold because the content is actively pushed to the CDN on deploy, *and*, the old CDN state is [invalidated](https://www.netlify.com/blog/2015/09/11/instant-cache-invalidation/) on deploy. So some hard problems are solved just by using Netlify. Thus the website is super fast without the drawback of stale caches.

## Faster Deployment with Delta Sync

The other issue is that static sites tend to be slow to deploy due to an _O(n)_ deployment complexity. Again, thanks to Netlify functionality we can send just the content that changes in deployment. Furthermore, thanks to the CMS data model we can model the dependencies across pages so we only need to regenerate the pages that change too.

Netlify offers a deployment API, so we can deploy content directly from a notebook (see the [_deployStaticFile_](https://observablehq.com/@tomlarkworthy/netlify-deploy?collection=@tomlarkworthy/blog#deployStaticFile) call).

### Tag-based dependencies

File record metadata is stored in [Firestore](https://firebase.google.com/docs/firestore) which [plays well with Observable](https://observablehq.com/@tomlarkworthy/saas-tutorial). Each record includes a _tags_ array.  When an article is updated, we do a reverse query for pages that _depend_ on file _tags_ using the [_"contains-array-any"_](https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any) query operator. Examples of content that do this are the [index.html](https://observablehq.com/@tomlarkworthy/blog-index-html) and the [rss.xml](https://observablehq.com/@tomlarkworthy/rss-atom-feed/forks) against any files tagged _"article"_. When an article is deployed, the page indexes are deployed too.

### Parallel Materialization

To improve deploy speed, each notebook contains a [serverside cell](https://observablehq.com/@tomlarkworthy/serverside-cells) used to render the page _preview_ of the page. The process of deployment is materializing of the preview link into Netlify. As the data exchange is a URL, we are pretty flexible about how content is expressed. The content doesn't even need to be hosted on Observable, for instance, the URL could be external (e.g. for materializing 3rd party libraries)

The other useful thing about using a URL as the content representation, and using serverside cells to generate the content, is that we can parallelize materialization jsut by reading the links in parrallel.

The most awesome thing about building on Observable is that this deployment toolchain is hosted within Observable notebooks too. The [Netlify Deployment Manager](https://observablehq.com/@tomlarkworthy/netlify-deploy?collection=@tomlarkworthy/blog) contains all the Oauth code and API calls used to implement the [_deployStaticFile_](https://observablehq.com/@tomlarkworthy/netlify-deploy?collection=@tomlarkworthy/blog#deployStaticFile) library cell. You can see how it works and change it whenever you want!

## Next steps

The next job is to fix the authentication so it's easier for other _Observable_ users to fork my blog examples and deploy their content on their Netlify accounts. We have not reached a usable service yet but it is getting closer!

-- Tom2

`
}`
)};
const _1y0zgwh = function _image(md,imageUrl){return(
md`![image](${imageUrl})`
)};
const _1yqhlz6 = function _imageUrl(FileAttachment){return(
FileAttachment("graphic.png").url()
)};
const _99s6lw = function _graphic(svg){return(
svg`<center><svg viewbox="0 0 800 200" width="100%" height="200">
  ${Array(120).fill(0).map((v, idx) => svg`
    <g transform="translate(${(idx-20)*11} 30)">
      <rect x=0 y="0" width="5" height="50" fill="#c00">
        <animateTransform attributeName="transform"
                            attributeType="XML"
                            type="rotate"
                            from="${idx*11} 60 70"
                            to="${idx*11 + 360} 60 70"
                            dur="3s"
                            repeatCount="indefinite"/>
      </rect>
    </g>
    
  `)}
</svg></center>`
)};
const _12dpjjn = function _page(articleHeader,metadata,topbar,sidebar,html,content,articleFooter){return(
`<!doctype html>
<html class="has-navbar-fixed-top">
  <head>
    ${articleHeader(metadata).outerHTML}
  </head>
  <body>
    ${topbar.outerHTML}
    <div class="columns">
      ${sidebar.outerHTML}
      <div class="column is-half">
        ${html`<div class="content"><h1>${metadata.title}`.outerHTML}
        ${content.outerHTML}
      </div>
    </div>
    ${articleFooter(metadata).outerHTML}
  </body>
</html>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["graphic.png"].map((name) => {
    const module_name = "@tomlarkworthy/blog-netlify-deployment-manager";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/netlify-deploy", async () => runtime.module((await import("/@tomlarkworthy/netlify-deploy.js?v=4")).default));  
  main.define("module @tomlarkworthy/blog-navigation", async () => runtime.module((await import("/@tomlarkworthy/blog-navigation.js?v=4")).default));  
  main.define("module @chitacan/rss", async () => runtime.module((await import("/@chitacan/rss.js?v=4")).default));  
  $def("_c0krkw", null, ["html","md"], _c0krkw);  
  $def("_1wfprru", "metadata", ["content","imageUrl"], _1wfprru);  
  $def("_df0m9k", "viewof settings", ["deployStaticFile","metadata","preview"], _df0m9k);  
  $def("_8o97qh", "settings", ["Generators","viewof settings"], _8o97qh);  
  $def("_1vh7l2h", "preview", ["deploy","page"], _1vh7l2h);  
  $def("_hd1dz9", null, ["page"], _hd1dz9);  
  $def("_pd52r7", "content", ["html","md","graphic"], _pd52r7);  
  $def("_1y0zgwh", "image", ["md","imageUrl"], _1y0zgwh);  
  $def("_1yqhlz6", "imageUrl", ["FileAttachment"], _1yqhlz6);  
  $def("_99s6lw", "graphic", ["svg"], _99s6lw);  
  $def("_12dpjjn", "page", ["articleHeader","metadata","topbar","sidebar","html","content","articleFooter"], _12dpjjn);  
  main.define("deployStaticFile", ["module @tomlarkworthy/netlify-deploy", "@variable"], (_, v) => v.import("deployStaticFile", _));  
  main.define("sidebar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("sidebar", _));  
  main.define("topbar", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("topbar", _));  
  main.define("articleHeader", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("articleHeader", _));  
  main.define("articleFooter", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("articleFooter", _));  
  main.define("deploy", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("deploy", _));  
  main.define("html", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("html", _));  
  main.define("svg", ["module @tomlarkworthy/blog-navigation", "@variable"], (_, v) => v.import("svg", _));  
  main.define("icon", ["module @chitacan/rss", "@variable"], (_, v) => v.import("icon", _));
  return main;
}