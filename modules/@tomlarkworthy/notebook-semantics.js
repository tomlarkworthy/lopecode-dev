const _1apifgw = function _1(md){return(
md`# Test Notebook of Semantics`
)};
const _19mwdo2 = function _2(){return(
1
)};
const _1kc1s9l = function _3()
{
  ("");
};
const _1yssbxs = function _html(htl){return(
htl.html`<div>`
)};
const _1yuztwo = function _myclass(){return(
class myclass {}
)};
const _1dwo15k = function _obj_literal(){return(
{}
)};
const _1ersgna = function _x(){return(
""
)};
const _1pqz5vc = function _y(x){return(
x
)};
const _zh8x7b = function _z(x,y)
{
  ("");
  return x + y;
};
const _1ythxhu = function _comments()
{
  // a comment
  return "";
};
const _10nxq06 = function* _generator(x,y)
{
  yield x + y;
};
const _lfhgf = function __function(){return(
function () {}
)};
const _1gphlst = function _asyncfunction(){return(
async function () {}
)};
const _mz330f = function _named_function(){return(
function foo() {}
)};
const _48zyrn = function _thisReference(){return(
(this || 0) + 1
)};
const _g2216 = function _lambda(){return(
() => {}
)};
const _tteab5 = function _error()
{
  throw new Error();
};
const _1q91uxr = function _error_obj()
{
  throw { foo: "bar" };
};
const _gvb23r = function _19(error_dep){return(
error_dep
)};
const _1spu2px = function _view(Inputs){return(
Inputs.input()
)};
const _1c7nth5 = (G, _) => G.input(_);
const _1ctnar2 = function _q(){return(
6
)};
const _e8yk5b = (M, _) => new M(_);
const _13b4cde = _ => _.generator;
const _15qj6mu = function _inbuilt(_){return(
_
)};
const _1mptksu = function _file(FileAttachment){return(
FileAttachment("empty")
)};
const _1qnbn76 = function _mutable_dep($0,lambda,$1)
{
  $0;
  lambda;
  $1.value;
  return $1.value;
};
const _znzem1 = function _mutable_dep_2(file,q)
{
  file;
  return q + 1;
};
const _r224uo = function _viewofdep_inline($0){return(
$0
)};
const _153cgt0 = function _viewofdatadep(view){return(
view
)};
const _1qu20uh = function _28(dep){return(
dep
)};
const _1fshkxt = function _event(Event){return(
new Event("input")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["empty"].map((name) => {
    const module_name = "@tomlarkworthy/notebook-semantics";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/dependancy", async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default));  
  $def("_1apifgw", null, ["md"], _1apifgw);  
  $def("_19mwdo2", null, [], _19mwdo2);  
  $def("_1kc1s9l", null, [], _1kc1s9l);  
  $def("_1yssbxs", "html", ["htl"], _1yssbxs);  
  $def("_1yuztwo", "myclass", [], _1yuztwo);  
  $def("_1dwo15k", "obj_literal", [], _1dwo15k);  
  $def("_1ersgna", "x", [], _1ersgna);  
  $def("_1pqz5vc", "y", ["x"], _1pqz5vc);  
  $def("_zh8x7b", "z", ["x","y"], _zh8x7b);  
  $def("_1ythxhu", "comments", [], _1ythxhu);  
  $def("_10nxq06", "generator", ["x","y"], _10nxq06);  
  $def("_lfhgf", "_function", [], _lfhgf);  
  $def("_1gphlst", "asyncfunction", [], _1gphlst);  
  $def("_mz330f", "named_function", [], _mz330f);  
  $def("_48zyrn", "thisReference", [], _48zyrn);  
  $def("_g2216", "lambda", [], _g2216);  
  $def("_tteab5", "error", [], _tteab5);  
  $def("_1q91uxr", "error_obj", [], _1q91uxr);  
  $def("_gvb23r", null, ["error_dep"], _gvb23r);  
  $def("_1spu2px", "viewof view", ["Inputs"], _1spu2px);  
  $def("_1c7nth5", "view", ["Generators","viewof view"], _1c7nth5);  
  $def("_1ctnar2", "initial q", [], _1ctnar2);  
  $def("_e8yk5b", "mutable q", ["Mutable","initial q"], _e8yk5b);  
  $def("_13b4cde", "q", ["mutable q"], _13b4cde);  
  $def("_15qj6mu", "inbuilt", ["_"], _15qj6mu);  
  $def("_1mptksu", "file", ["FileAttachment"], _1mptksu);  
  $def("_1qnbn76", "mutable_dep", ["viewof view","lambda","mutable q"], _1qnbn76);  
  $def("_znzem1", "mutable_dep_2", ["file","q"], _znzem1);  
  $def("_r224uo", "viewofdep_inline", ["viewof view"], _r224uo);  
  $def("_153cgt0", "viewofdatadep", ["view"], _153cgt0);  
  $def("_1qu20uh", null, ["dep"], _1qu20uh);  
  $def("_1fshkxt", "event", ["Event"], _1fshkxt);  
  main.define("dep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("dep", _));  
  main.define("mutable mutabledep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("mutable mutabledep", _));  
  main.define("mutabledep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("mutabledep", _));  
  main.define("viewof viewdep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("viewof viewdep", _));  
  main.define("viewdep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("viewdep", _));  
  main.define("dep_alias", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("dep", "dep_alias", _));  
  main.define("error_dep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("error_dep", _));  
  main.define("mutable aslias_mutabledep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("mutable mutabledep", "mutable aslias_mutabledep", _));  
  main.define("aslias_mutabledep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("mutabledep", "aslias_mutabledep", _));  
  main.define("viewof aslias_viewdep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("viewof viewdep", "viewof aslias_viewdep", _));  
  main.define("aslias_viewdep", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("viewdep", "aslias_viewdep", _));  
  main.define("aslias_mutabledep_data", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("mutabledep", "aslias_mutabledep_data", _));  
  main.define("aslias_viewdep_data", ["module @tomlarkworthy/dependancy", "@variable"], (_, v) => v.import("viewdep", "aslias_viewdep_data", _));
  return main;
}