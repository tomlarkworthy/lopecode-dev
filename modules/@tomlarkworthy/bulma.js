const _7cjgms = function _1(md){return(
md`# Bulma`
)};
const _1okr6re = function _2(html){return(
html`
<quote>
<a href="https://bulma.io/">Bulma</a> is a CSS framework based on Flexbox.
</quote>

If you want to customize have a look at <a href='https://observablehq.com/@tomlarkworthy/custom-bulma'>custom-bulma</a>
`
)};
const _1c0kfpr = function _3(md){return(
md`
~~~js
import {bulma} from "@tomlarkworthy/bulma"
import {bulmaWithIcons} from "@tomlarkworthy/bulma"
~~~
`
)};
const _sw4jge = function _box(html){return(
html`
<div class="box">
  <article class="media">
    <div class="media-left">
      <figure class="image is-64x64">
        <img src="https://bulma.io/images/placeholders/128x128.png" alt="Image">
      </figure>
    </div>
    <div class="media-content">
      <div class="content">
        <p>
          <strong>John Smith</strong> <small>@johnsmith</small> <small>31m</small>
          <br>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean efficitur sit amet massa fringilla egestas. Nullam condimentum luctus turpis.
        </p>
      </div>
      <nav class="level is-mobile">
        <div class="level-left">
          <a class="level-item">
            <span class="icon is-small"><i class="fas fa-reply"></i></span>
          </a>
          <a class="level-item">
            <span class="icon is-small"><i class="fas fa-retweet"></i></span>
          </a>
          <a class="level-item">
            <span class="icon is-small"><i class="fas fa-heart"></i></span>
          </a>
        </div>
      </nav>
    </div>
  </article>
</div>
`
)};
const _1od6ox8 = function _card(html){return(
html`<div class="columns">
      <div class="column is-one-third">
        
<div class="card">
  <div class="card-image">
    <figure class="image is-4by3">
      <img src="https://bulma.io/images/placeholders/1280x960.png" alt="Placeholder image">
    </figure>
  </div>
  <div class="card-content">
    <div class="media">
      <div class="media-left">
        <figure class="image is-48x48">
          <img src="https://bulma.io/images/placeholders/96x96.png" alt="Placeholder image">
        </figure>
      </div>
      <div class="media-content">
        <p class="title is-4">John Smith</p>
        <p class="subtitle is-6">@johnsmith</p>
      </div>
    </div>

    <div class="content">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      Phasellus nec iaculis mauris. <a>@bulmaio</a>.
      <a href="#">#css</a> <a href="#">#responsive</a>
      <br>
      <time datetime="2016-1-1">11:09 PM - 1 Jan 2016</time>
    </div>
  </div>
</div>`
)};
const _16lqiaw = function _colorIcons(html){return(
html`<span class="icon has-text-info">
  <i class="fas fa-info-circle"></i>
</span>
<span class="icon has-text-success">
  <i class="fas fa-check-square"></i>
</span>
<span class="icon has-text-warning">
  <i class="fas fa-exclamation-triangle"></i>
</span>
<span class="icon has-text-danger">
  <i class="fas fa-ban"></i>
</span>`
)};
const _iua4mr = function _overrides(html){return(
html`<style>
h1 {
	font-size: 3rem !important;
}
</style>`
)};
const _1hxosc0 = async function _bulmaWithIcons(require,FONT_AWESOME_VERSION,bulma)
{
  await require(`https://use.fontawesome.com/releases/${FONT_AWESOME_VERSION}/js/all.js`).catch(() => {});
  return bulma;
};
const _cydiqz = function _bulma(html,BULMA_VERSION){return(
html`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/${BULMA_VERSION}/css/bulma.min.css">`
)};
const _188v64m = function _BULMA_VERSION(){return(
"0.9.1"
)};
const _1blkb05 = function _FONT_AWESOME_VERSION(){return(
"v5.15.0"
)};
const _evqjql = function _12(md){return(
md`https://fontawesome.com/icons?d=gallery&m=free`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_7cjgms", null, ["md"], _7cjgms);  
  $def("_1okr6re", null, ["html"], _1okr6re);  
  $def("_1c0kfpr", null, ["md"], _1c0kfpr);  
  $def("_sw4jge", "box", ["html"], _sw4jge);  
  $def("_1od6ox8", "card", ["html"], _1od6ox8);  
  $def("_16lqiaw", "colorIcons", ["html"], _16lqiaw);  
  $def("_iua4mr", "overrides", ["html"], _iua4mr);  
  $def("_1hxosc0", "bulmaWithIcons", ["require","FONT_AWESOME_VERSION","bulma"], _1hxosc0);  
  $def("_cydiqz", "bulma", ["html","BULMA_VERSION"], _cydiqz);  
  $def("_188v64m", "BULMA_VERSION", [], _188v64m);  
  $def("_1blkb05", "FONT_AWESOME_VERSION", [], _1blkb05);  
  $def("_evqjql", null, ["md"], _evqjql);
  return main;
}