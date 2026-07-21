const _p7t66l = function _1(md){return(
md`# Side bar`
)};
const _hvuloa = async function _sidebar(html,FileAttachment)
{
  function menuitem(options) {
    return html`<li><a href=${options.href}>
                    <span class="icon"><i class="fa ${options.icon}"></i></span>
                    ${options.content || options.href}`;
  }
  return html`<aside class="column is-3 is-narrow-mobile is-fullheight section is-hidden-mobile sidebar">
      <div class="column is-2" style=${{ position: "fixed" }}>
        <figure class="image is-128x126">
          <img class="is-rounded" src=${await FileAttachment(
            "tom_larkworthy.jpeg"
          ).url()}>
        </figure>
        <p>
          Hacker in Berlin
        </p>
        <ul class="menu-list">
          ${menuitem({
            href: "https://observablehq.com/@tomlarkworthy",
            icon: "fa-dot-circle",
            content: "Observable"
          })}
          ${menuitem({
            href: "https://twitter.com/tomlarkworthy",
            icon: "fa-twitter",
            content: "Twitter"
          })}
          ${menuitem({
            href: "https://www.linkedin.com/in/tom-larkworthy-74a3263/",
            icon: "fa-linkedin",
            content: "Linkedin"
          })}
          ${menuitem({
            href: "/rss.xml",
            icon: "fa-rss-square",
            content: "RSS"
          })}
        </ul>
      </div>
  </aside>`;
};
const _1e3yrao = function _offset(slider){return(
slider({
  min: 0,
  max: 1000,
  value: 380,
  description: "Adjsut height of sidebar container"
})
)};
const _1454ma7 = (G, _) => G.input(_);
const _1y6ackz = function _header(html,bulmaWithIcons){return(
html`
${bulmaWithIcons}
<script src="https://kit.fontawesome.com/aeb44cf583.js" crossorigin="anonymous"></scr\ipt>
`
)};
const _1s4l72l = function _5(sidebar,offset)
{
  sidebar
  const sidebarElement = document.getElementsByClassName("sidebar")[0]
  sidebarElement.parentElement.style.height = `${offset}px`;
  return "cellHeightAdjsuter"
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["tom_larkworthy.jpeg"].map((name) => {
    const module_name = "@tomlarkworthy/blog-sidebar";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  $def("_p7t66l", null, ["md"], _p7t66l);  
  $def("_hvuloa", "sidebar", ["html","FileAttachment"], _hvuloa);  
  $def("_1e3yrao", "viewof offset", ["slider"], _1e3yrao);  
  $def("_1454ma7", "offset", ["Generators","viewof offset"], _1454ma7);  
  $def("_1y6ackz", "header", ["html","bulmaWithIcons"], _1y6ackz);  
  $def("_1s4l72l", null, ["sidebar","offset"], _1s4l72l);  
  main.define("bulmaWithIcons", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulmaWithIcons", _));  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));
  return main;
}