const _awgp96 = function _1(md){return(
md`# Sticky footer in list`
)};
const _1wa95po = function _2(htl){return(
htl.html`
<ul style="background: yellow;">
  <div class="footer"><b>my footer</b> is cool</div>
  <li>one</li>
  <li>two</li>
</ul>`
)};
const _gv9l9s = function _3(htl){return(
htl.html`<style>
.footer {
  position: absolute;
  bottom: 0px;
}

li:last-child {
  padding-bottom: 50px
}

</style>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_awgp96", null, ["md"], _awgp96);  
  $def("_1wa95po", null, ["htl"], _1wa95po);  
  $def("_gv9l9s", null, ["htl"], _gv9l9s);
  return main;
}