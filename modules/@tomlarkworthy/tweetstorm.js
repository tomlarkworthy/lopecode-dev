const _1spyo8v = async function _1(html,FileAttachment){return(
html`<div class="content"><h1>Tweetstorm helper</h1>

<figure class="image is-128x128">
<img width=200 height="200" src=${await FileAttachment("Twitter_Social_Icon_Square_Color.png").url()}><img></figure>
<p>
Tweetstorms are linked tweets to create longer, blog-like content. 
<p>
For why you want to write like this, and good guide to wiring tweetstorms, checkout <a href="https://www.animalz.co/blog/how-to-write-a-tweetstorm/">animalz blog post</a> on the subject.
<p>
An exemplary Tweetstormer is <a href="https://twitter.com/Suhail">@Suhail</a>. He syndicates his tweetstorms to Medium! 👀


`
)};
const _dky87g = function _2(tweet){return(
tweet("998660806005768192")
)};
const _1790t7d = function _3(html){return(
html`<div class="content">
<p><------ Add Comment for feature requests.
<h2> Helper</h2>
This tool will help you stay within the limits and do the numbering for you.

<p>Send me a comment if you need something else, or fork it yourself as it's a permissive ISC license.


`
)};
const _hy4x0o = function _4(reconcile,html,tweetstorm,constants,$0,copy,sleep)
{
  const content = reconcile(this, html`<div class='content'>
    ${tweetstorm.segments.map((segment, index) => {
      // TODO: Lots of B.S. due to https://github.com/observablehq/htl/issues/18
      const prefix = `${index + 1}/${tweetstorm.segments.length}`; 
      const length = prefix.length + 1 + segment.text.length;
      const calc = () => `${prefix.length + 1 + segment.text.length}/${constants.max_chars}`
      const recalc = () => `${document.getElementById(`s${index}`).value.length}/${constants.max_chars}`
      return html.fragment`
        <textarea id="s${index}"
        class="textarea"
        onkeyup=${() => document.getElementById(`c${index}`).innerHTML = recalc()}
        onchange=${() => {
                const textarea = document.getElementById(`s${index}`);
                console.log(textarea)                 
                segment.text = textarea.value.startsWith(prefix + ' ')
                  ? textarea.value.substring(prefix.length + 1)
                : textarea.value;
                $0.value = tweetstorm
              }}
        >${prefix} ${segment.text}</textarea>
        <span class="tags are-medium">
          <span id="c${index}"
                class="tag"
                style="align: right; color: ${length > constants.max_chars ? 'red': null};"
          >
            ${calc()}
          </span>
          <span class="tag"
                onclick=${async () => {
                  copy(document.getElementById(`s${index}`).value)
                  const message = document.getElementById(`m${index}`);
                  message.innerHTML = "Copied!"
                  await sleep(1);
                  message.innerHTML = ""
                }}
          >
            <i class="fas fa-copy"></i>
          </span>
          <span id="m${index}"
                class="tag">
          </span>
        </span>
        `
    })}
    <button onclick=${() => {
      tweetstorm.segments.push({text:""})
      $0.value = tweetstorm
    }}
    >
      Another tweet please
    </button>
  `);
  return content;
};
const _9mz0o8 = function _5(html){return(
html`<div class="content"><h2>As Plain text`
)};
const _2jsylb = function _fulltext($0,html,tweetstorm,copy,sleep)
{
  function loadFulltext(text) {
    $0.value = ({
      segments: text.split("\n\n").map(text => ({
        text
      }))
    });
  }
  
  return html`<textarea id="fulltext"
                        onchange=${(evt) => loadFulltext(evt.target.value)}
                        class="textarea">
      ${tweetstorm.segments.map(segment => {
        return segment.text
      }).join("\n\n")}
    </textarea>
    <span class="tags are-medium">
      <span class="tag"
      onclick=${async () => {
        copy(document.getElementById('fulltext').value)
        const message = document.getElementById('message');
        message.innerHTML = "Copied!"
        await sleep(1);
        message.innerHTML = ""
      }}
      >
      <i class="fas fa-copy"></i>
      </span>
      <span id="message"
      class="tag">
      </span>
    </span>
  `
};
const _1hy6gti = function _7(bulmaWithIcons){return(
bulmaWithIcons
)};
const _11m95y1 = function _tweetstorm(){return(
{
  segments: [{
    text: ""
  }]
}
)};
const _15q2aww = (M, _) => new M(_);
const _16yg18d = _ => _.generator;
const _xzzk9w = function _constants(){return(
{
  max_chars: 280

}
)};
const _v3twea = function _sleep(){return(
async function sleep(secs) {
  function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
  return timeout(secs * 1000);
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["Twitter_Social_Icon_Square_Color.png"].map((name) => {
    const module_name = "@tomlarkworthy/tweetstorm";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @tomlarkworthy/reconcile-nanomorph", async () => runtime.module((await import("/@tomlarkworthy/reconcile-nanomorph.js?v=4")).default));  
  main.define("module @mbostock/tweet", async () => runtime.module((await import("/@mbostock/tweet.js?v=4")).default));  
  main.define("module @mbostock/copy-to-clipboard", async () => runtime.module((await import("/@mbostock/copy-to-clipboard.js?v=4")).default));  
  $def("_1spyo8v", null, ["html","FileAttachment"], _1spyo8v);  
  $def("_dky87g", null, ["tweet"], _dky87g);  
  $def("_1790t7d", null, ["html"], _1790t7d);  
  $def("_hy4x0o", null, ["reconcile","html","tweetstorm","constants","mutable tweetstorm","copy","sleep"], _hy4x0o);  
  $def("_9mz0o8", null, ["html"], _9mz0o8);  
  $def("_2jsylb", "fulltext", ["mutable tweetstorm","html","tweetstorm","copy","sleep"], _2jsylb);  
  $def("_1hy6gti", null, ["bulmaWithIcons"], _1hy6gti);  
  $def("_11m95y1", "initial tweetstorm", [], _11m95y1);  
  $def("_15q2aww", "mutable tweetstorm", ["Mutable","initial tweetstorm"], _15q2aww);  
  $def("_16yg18d", "tweetstorm", ["mutable tweetstorm"], _16yg18d);  
  $def("_xzzk9w", "constants", [], _xzzk9w);  
  $def("_v3twea", "sleep", [], _v3twea);  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("bulmaWithIcons", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulmaWithIcons", _));  
  main.define("reconcile", ["module @tomlarkworthy/reconcile-nanomorph", "@variable"], (_, v) => v.import("reconcile", _));  
  main.define("tweet", ["module @mbostock/tweet", "@variable"], (_, v) => v.import("tweet", _));  
  main.define("copy", ["module @mbostock/copy-to-clipboard", "@variable"], (_, v) => v.import("copy", _));
  return main;
}