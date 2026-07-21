const _93zg43 = function _1(html){return(
html`<div class="content">
<h1> Pause and Play STEM Activities Book</h1>
<p style="max-width: 100%;">
Hey! I am a stay at home mum of twins, previously a scientist. I wrote a book for young kids (ages 3–7). The book has simple, graphical instructions on how to set up and play with science activities at home. It allows young children, even without reading skills to decide which science activity they want to explore & to prepare & play with the activities independently. Every science activity is linked to a QR code with an engaging Youtube video from <a href="https://www.youtube.com/channel/UCpL1E-yK38HGsNaIfVPdc8w">my channel</a>. The videos offer further insights into the activities through a different types of media. Our science activities only use household items aiming for minimal preparations. The book also includes suggestions on how to extend the activities and kid-friendly scientific explanations. By combining this print book, our Youtube videos, and minimal parental support, we create a holistic, real-life experience allowing young kids to choose, play, and learn science.
</p>
`
)};
const _vutdkv = function _2(location,html)
{
  if (location.search == "?success") {
    return html`<div class="content"><h1>Thank you for your support!!!`
  } else return html` `
};
const _1f6ig1d = async function _3(html,FileAttachment){return(
html`<center><img width="600" src=${await FileAttachment("pauseandplay.jpg").url()}>`
)};
const _bkljok = function _4(html){return(
html`<div class="content">
<h4> You try it out. The full book is availible as a <a href="https://www.dropbox.com/s/0z8p8yb533pz0vc/Book_Nov21_PageCorrection%20copy.pdf?dl=0">pdf</a>.</h4>
`
)};
const _fn4ox6 = function _5(html,api){return(
html`<div class="content">
<h2> Live outside the EU?</h2>

You can get the book through <a href="https://geni.us/0vWW">Amazon</a>.

<h2> Live inside the EU?</h2>

${api.inStock() ? html`We have books in stock that we can mail directly. You can also buy from <a href="https://geni.us/0vWW">Amazon</a>.`: 
                  html`Sorry, we are out of stock for direct mail, but you can also buy from <a href="https://geni.us/0vWW">Amazon</a>.`}



`
)};
const _13w081 = function _6(html,location,api){return(
html`<center>${location.search != "?success" && api.inStock()? html`
  <button class="button is-primary"
          onclick=${() => api.buy('price_1Hzps5HGNosi6Ft0NRhFBcVZ')}>
    Buy 1 Pause and Play activity book for 13 EUR
  </button>
  <br><br>
  <button class="button is-primary"
          onclick=${() => api.buy('price_1IA0TNHGNosi6Ft0HtAb2qOz')}>
    Buy 2 Pause and Play activites books 20 EUR
  </button>
</center>`: null}`
)};
const _hdqtif = function _7(md){return(
md`<pre>
























</pre>
`
)};
const _1gv3r5q = function _8(html){return(
html`<div class="content"><h2>Ignore everything below `
)};
const _1gihxhd = function _api(stripe){return(
{
  inStock () {return true},
  buy (code) {
    stripe.redirectToCheckout({
      lineItems: [{
        price: code,
        quantity: 1,
      }],
      mode: 'payment',
      successUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?success',
      cancelUrl: 'https://observablehq.com/@tomlarkworthy/pause-and-play-book?cancel',
      shippingAddressCollection: {
        allowedCountries: ["BE","GR","LT","PT","BG","ES","LU","RO","CZ","FR","HU","SI","DK","HR",
                           "MT","SK","DE","IT","NL","FI","EE","CY","AT","SE","IE","LV","PL"]
      }
    });
  },
}
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

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["pauseandplay.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/pause-and-play-shop";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  $def("_93zg43", null, ["html"], _93zg43);  
  $def("_vutdkv", null, ["location","html"], _vutdkv);  
  $def("_1f6ig1d", null, ["html","FileAttachment"], _1f6ig1d);  
  $def("_bkljok", null, ["html"], _bkljok);  
  $def("_fn4ox6", null, ["html","api"], _fn4ox6);  
  $def("_13w081", null, ["html","location","api"], _13w081);  
  $def("_hdqtif", null, ["md"], _hdqtif);  
  $def("_1gv3r5q", null, ["html"], _1gv3r5q);  
  $def("_1gihxhd", "api", ["stripe"], _1gihxhd);  
  $def("_zyjvcq", "Stripe", ["require"], _zyjvcq);  
  $def("_1f1qpev", "STRIPE_API_KEY", [], _1f1qpev);  
  $def("_xdzp1b", "stripe", ["Stripe","STRIPE_API_KEY"], _xdzp1b);  
  $def("_3bpe1r", null, ["bulma"], _3bpe1r);  
  main.define("bulma", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulma", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));
  return main;
}