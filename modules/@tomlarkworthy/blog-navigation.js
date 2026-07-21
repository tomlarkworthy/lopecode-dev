const _1mlkooi = function _1(md){return(
md`# My Blog Theme`
)};
const _1nemv37 = function _topbar(html,notebooks)
{
  function menuitem(options) {
    return html`<a class="navbar-item"
                   rel=${options.rel}
                   href=${options.href}>
                  <span class="icon-text">
                    <span class="icon">
                      <i class="fa ${options.icon}"></i>
                    </span>
                    <span>${options.content || options.href}</span>
                  </span>
                </a>`;
  }
  return html`<nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
    <style>
details summary::-webkit-details-marker {
  display:none;
}

.navbar,
.navbar-menu,
.navbar-start,
.navbar-end {
  align-items: flex-start;
  display: flex;
  padding: 0;
}
/* this undoes the media selector, but it would be better to put in SASS */
.navbar-dropdown {
    background-color: #fff;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    border-top: 2px solid #dbdbdb;
    box-shadow: 0 8px 8px rgba(10,10,10,.1);
    font-size: .875rem;
    left: 0;
    min-width: 100%;
    position: absolute;
    top: 100%;
    z-index: 20;
}
    </style>
    <div class="navbar-brand">
      <a class="navbar-item" href="http://tomlarkworthy.endpointservices.net">
        <h2>TOM LARKWORTHY</h2>
      </a>
    </div>

    <div id="navbarBasicExample" class="navbar-brand">
        <details class="navbar-item has-dropdown is-hoverable">
          <summary class="navbar-link">
            Social
          </summary>
          <div class="navbar-dropdown">
            ${menuitem({
              href: "https://observablehq.com/@tomlarkworthy",
              icon: "fa-dot-circle",
              content: "Observable (@tomlarkworthy)",
              rel: "me"
            })}
            ${menuitem({
              href: "https://observablehq.com/@endpointservices",
              icon: "fa-dot-circle",
              content: "Observable (@endpointservices)",
              rel: "me"
            })}
            ${menuitem({
              href: "https://github.com/tomlarkworthy",
              icon: "fa-github",
              content: "Github",
              rel: "me"
            })}
            ${menuitem({
              href: "https://twitter.com/tomlarkworthy",
              icon: "fa-twitter",
              content: "Twitter",
              rel: "me"
            })}
            ${menuitem({
              href: "https://www.linkedin.com/in/tom-larkworthy-74a3263/",
              icon: "fa-linkedin",
              content: "Linkedin",
              rel: "me"
            })}
            ${menuitem({
              href: "/rss.xml",
              icon: "fa-rss-square",
              content: "RSS"
            })}
          </div>
        </details>
      
        <details class="navbar-item has-dropdown is-hoverable">
          <summary class="navbar-link">
            Projects
          </summary>
          <div class="navbar-dropdown">
            <a class="navbar-item">
              Early Firebase
            </a>
            <a class="navbar-item" href="https://edinburghhacklab.com/author/tom-larkworthy/">
              Cofounder Edinburgh Hacklab 
            </a>
            <a class="navbar-item" href="https://scholar.google.com/scholar?q=tom+larkworthy">
              Robotics
            </a>
            <a class="navbar-item" href="https://github.com/futurice/terraform-examples">
              Terraform Examples
            </a>
            <a class="navbar-item" href="mailto:tom.larkworthy@gmail.com">
              Contact
            </a>
          </div>
        </details>
        <details class="navbar-item has-dropdown is-hoverable">
          <summary class="navbar-link">
            Notebooks
          </summary>
          <div class="navbar-dropdown">
            ${notebooks.map(
              notebook => html`<a class="navbar-item" href="${notebook.target}">
              ${notebook.title}
            </a>`
            )}
          </div>
        </details>
    </div>
  </nav>
`;
};
const _l8xlom = function _notebooks(notebooksUnordered){return(
notebooksUnordered
  .sort((a, b) => a.target.localeCompare(b.target))
  .map(n => ({
    title: n.target
      .replace('/notebooks/tomlarkworthy/', '')
      .replace('.html', ''),
    ...n
  }))
)};
const _raom7o = function _notebooksUnordered(queryDependants){return(
queryDependants({
  app_id: "b6a918d2-9cda-4fde-b2ec-add91b22ea02",
  dependsOnTags: ["notebook"]
})
)};
const _16896wx = function _6(header){return(
window.document.head.append(header)
)};
const _67m8gi = function _7(header){return(
header.outerHTML
)};
const _1ybyg8x = function _header(html,bulmaWithIcons){return(
html`
<link rel="authorization_endpoint" href="https://indieauth.com/auth">
<link ref="me" href="https://endpointservice.web.app/notebooks/@endpointservices/identity/deploys/hub/mods/T">
<link rel="webmention" href="https://webmention.io/tomlarkworthy.endpointservices.net/webmention" />
<link rel="pingback" href="https://webmention.io/tomlarkworthy.endpointservices.net/xmlrpc" />
${bulmaWithIcons}
<script src="https://kit.fontawesome.com/aeb44cf583.js" crossorigin="anonymous"></scr\ipt>
`
)};
const _1b318vz = function _9(articleHeader){return(
articleHeader({
  "title": "My test title",
  "type":"website",
  "url":"blah.com",
  "description":"description",
  "image":"image",
}).outerHTML
)};
const _ew622q = function _articleHeader(html,header){return(
(metadata) => html`
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title> ${metadata.title} </title>
<meta property="og:type" content="article"/>
<meta name="description" content=${metadata.description}/>
<meta property="og:url" content="${metadata.url}"/>
<meta property="og:description" content="${metadata.description}"/>
<meta property="og:image" content="${metadata.image}"/>

<meta name="twitter:card" content="summary" />
<meta name="twitter:site" content="${metadata.url}" />
<meta name="twitter:creator" content="${metadata.twitterCreator}" />
<meta name="twitter:title" content=${metadata.title} />
<meta name="twitter:description" content=${metadata.description} />
<meta name="twitter:image" content=${metadata.image} />

${header}
`
)};
const _1x8a9iz = function _articleFooter(html){return(
(metadata) => {
  return html`<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <small>&copy; Copyright ${new Date().getFullYear()}, Tom Larkworthy</small>
    </p>
    <p>
      ${metadata.notebook ? html`Full source code to generate this article is available on <a href=${metadata.notebook}>Observablehq.com</a>.` : null} 
      The website contentis licensed <a href="http://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY NC SA 4.0</a>.
    </p>
  </div>
</footer>`
}
)};
const _k96e06 = function _12(deployStaticFile,headers){return(
deployStaticFile({
  app_id: 'b6a918d2-9cda-4fde-b2ec-add91b22ea02',
  source: headers.href,
  target: `_headers`
})
)};
const _8ql2av = function _headers(deploy){return(
deploy("netlifyCORSHeaders", (req, res) =>
  res.send(`/notebooks/*
  Access-Control-Allow-Origin: *
`)
)
)};
const _1a6yxzf = function _19(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["tom_larkworthy.jpeg"].map((name) => {
    const module_name = "@tomlarkworthy/blog-navigation";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/blog-sidebar", async () => runtime.module((await import("/@tomlarkworthy/blog-sidebar.js?v=4")).default));  
  main.define("module @tomlarkworthy/serverside-cells", async () => runtime.module((await import("/@tomlarkworthy/serverside-cells.js?v=4")).default));  
  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @endpointservices/netlify", async () => runtime.module((await import("/@endpointservices/netlify.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1mlkooi", null, ["md"], _1mlkooi);  
  $def("_1nemv37", "topbar", ["html","notebooks"], _1nemv37);  
  $def("_l8xlom", "notebooks", ["notebooksUnordered"], _l8xlom);  
  $def("_raom7o", "notebooksUnordered", ["queryDependants"], _raom7o);  
  main.define("sidebar", ["module @tomlarkworthy/blog-sidebar", "@variable"], (_, v) => v.import("sidebar", _));  
  $def("_16896wx", null, ["header"], _16896wx);  
  $def("_67m8gi", null, ["header"], _67m8gi);  
  $def("_1ybyg8x", "header", ["html","bulmaWithIcons"], _1ybyg8x);  
  $def("_1b318vz", null, ["articleHeader"], _1b318vz);  
  $def("_ew622q", "articleHeader", ["html","header"], _ew622q);  
  $def("_1x8a9iz", "articleFooter", ["html"], _1x8a9iz);  
  $def("_k96e06", null, ["deployStaticFile","headers"], _k96e06);  
  $def("_8ql2av", "headers", ["deploy"], _8ql2av);  
  main.define("deploy", ["module @tomlarkworthy/serverside-cells", "@variable"], (_, v) => v.import("deploy", _));  
  main.define("bulmaWithIcons", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulmaWithIcons", _));  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("deployStaticFile", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("deployStaticFile", _));  
  main.define("queryDependants", ["module @endpointservices/netlify", "@variable"], (_, v) => v.import("queryDependants", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1a6yxzf", null, ["footer"], _1a6yxzf);
  return main;
}