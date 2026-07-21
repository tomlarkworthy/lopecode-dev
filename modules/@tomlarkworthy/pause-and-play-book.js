const _1q2pnkl = function _1(html){return(
html`<h1>Pause and Play book`
)};
const _nc4hbg = function _2(location,html)
{
  if (location.search == "?success") {
    return html`<div class="content"><h1>Thank you!!!`
  } else return html` `
};
const _1f6ig1d = async function _3(html,FileAttachment){return(
html`<center><img width="600" src=${await FileAttachment("pauseandplay.jpg").url()}>`
)};
const _1wkbzns = function _4(md){return(
md`## Ensure you have talked to the author to arrange delivery before purchasing`
)};
const _1tkxtgu = function _5(html,location,stripe){return(
html`<center>${location.search != "?success" ? html`
  <button class="button is-primary"
          onclick=${() => { 
  stripe.redirectToCheckout({
    lineItems: [{
      price: 'price_1Hzps5HGNosi6Ft0NRhFBcVZ', // ID of your price
      quantity: 1,
    }],
    mode: 'payment',
    successUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?success',
    cancelUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?cancel',
  });
}}>Buy Pause and Play activites book 13 EUR</button></center>`: null}`
)};
const _s7fsnj = function _6(html){return(
html`<div class="content"><h3> Get a discount if you buy one for a freind.</h3>`
)};
const _l1c7g5 = function _7(html,location,stripe){return(
html`<center>${location.search != "?success" ? html`
  <button class="button is-primary"
          onclick=${() => { 
  stripe.redirectToCheckout({
    lineItems: [{
      price: 'price_1IA0TNHGNosi6Ft0HtAb2qOz', // ID of your price
      quantity: 1,
    }],
    mode: 'payment',
    successUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?success',
    cancelUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?cancel',
  });
}}>Buy Two Pause and Play activites books 20 EUR</button></center>`: null}`
)};
const _h8qdmf = function _8(md){return(
md`
.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.


`
)};
const _9otllb = function _9(html){return(
html`<div class="content"><h2>Ignore everything below `
)};
const _zyjvcq = function _Stripe(require){return(
require('https://js.stripe.com/v3/').then(() => window["Stripe"]).catch(() => window["Stripe"])
)};
const _1f1qpev = function _STRIPE_API_KEY(){return(
"pk_live_51HbQzcHGNosi6Ft0JM18AKCtG3cIs707E1ft1B5ePvpptHb5yoLnXHXLWkyBbDjHgtlPMOT0233jrcfvWAGj6AYp00RxIZdaky"
)};
const _xdzp1b = function _stripe(Stripe,STRIPE_API_KEY){return(
Stripe(STRIPE_API_KEY)
)};
const _3bpe1r = function _13(bulma){return(
bulma
)};
const _hllce5 = function _17(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["pauseandplay.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/pause-and-play-book";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1q2pnkl", null, ["html"], _1q2pnkl);  
  $def("_nc4hbg", null, ["location","html"], _nc4hbg);  
  $def("_1f6ig1d", null, ["html","FileAttachment"], _1f6ig1d);  
  $def("_1wkbzns", null, ["md"], _1wkbzns);  
  $def("_1tkxtgu", null, ["html","location","stripe"], _1tkxtgu);  
  $def("_s7fsnj", null, ["html"], _s7fsnj);  
  $def("_l1c7g5", null, ["html","location","stripe"], _l1c7g5);  
  $def("_h8qdmf", null, ["md"], _h8qdmf);  
  $def("_9otllb", null, ["html"], _9otllb);  
  $def("_zyjvcq", "Stripe", ["require"], _zyjvcq);  
  $def("_1f1qpev", "STRIPE_API_KEY", [], _1f1qpev);  
  $def("_xdzp1b", "stripe", ["Stripe","STRIPE_API_KEY"], _xdzp1b);  
  $def("_3bpe1r", null, ["bulma"], _3bpe1r);  
  main.define("bulma", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulma", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_hllce5", null, ["footer"], _hllce5);
  return main;
}