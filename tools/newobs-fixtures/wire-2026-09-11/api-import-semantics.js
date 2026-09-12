const _9 = function(){return(
1
)};

const _31 = function()
{
  ("");
}
;

const _153 = function myclass(){return(
class myclass {}
)};

const _115 = function obj_literal(){return(
{}
)};

const _11 = function x(){return(
""
)};

const _13 = function y(x){return(
x
)};

const _15 = function z(x,y)
{
  ("");
  return x + y;
}
;

const _145 = function comments()
{
  // a comment
  return "";
}
;

const _17 = function* generator(x,y)
{
  yield x + y;
}
;

const _20 = function _function(){return(
function () {}
)};

const _71 = function asyncfunction(){return(
async function () {}
)};

const _25 = function named_function(){return(
function foo() {}
)};

const _151 = function thisReference(){return(
(this || 0) + 1
)};

const _22 = function lambda(){return(
() => {}
)};

const _33 = function error()
{
  throw new Error();
}
;

const _165 = function error_obj()
{
  throw { foo: "bar" };
}
;

const _162 = function(error_dep){return(
error_dep
)};

const _39 = function viewof$view(Inputs){return(
Inputs.input()
)};

const _42 = function mutable$q(){return(
6
)};

const _45 = function inbuilt(_){return(
_
)};

const _48 = function file(FileAttachment){return(
FileAttachment("empty")
)};

const _52 = function mutable_dep(viewof$view,lambda,mutable$q)
{
  viewof$view;
  lambda;
  mutable$q.value;
  return mutable$q.value;
}
;

const _55 = function mutable_dep_2(file,q)
{
  file;
  return q + 1;
}
;

const _57 = function viewofdep_inline(viewof$view){return(
viewof$view
)};

const _61 = function viewofdatadep(view){return(
view
)};

const _93 = function(dep){return(
dep
)};

const _168 = function event(Event){return(
new Event("input")
)};

const _64 = async (__variable) => {
const {dep, mutabledep, mutable$mutabledep, viewdep, viewof$viewdep, dep: dep_alias, error_dep, mutabledep: aslias_mutabledep, mutable$mutabledep: mutable$aslias_mutabledep, viewdep: aslias_viewdep, viewof$viewdep: viewof$aslias_viewdep, mutabledep: aslias_mutabledep_data, viewdep: aslias_viewdep_data} = await (import("./dependancy").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("dep")?.import("dep", module);
  outputs.get("mutabledep")?.import("mutabledep", module);
  outputs.get("mutable$mutabledep")?.import("mutable mutabledep", "mutable$mutabledep", module);
  outputs.get("viewdep")?.import("viewdep", module);
  outputs.get("viewof$viewdep")?.import("viewof viewdep", "viewof$viewdep", module);
  outputs.get("dep_alias")?.import("dep", "dep_alias", module);
  outputs.get("error_dep")?.import("error_dep", module);
  outputs.get("aslias_mutabledep")?.import("mutabledep", "aslias_mutabledep", module);
  outputs.get("mutable$aslias_mutabledep")?.import("mutable mutabledep", "mutable$aslias_mutabledep", module);
  outputs.get("aslias_viewdep")?.import("viewdep", "aslias_viewdep", module);
  outputs.get("viewof$aslias_viewdep")?.import("viewof viewdep", "viewof$aslias_viewdep", module);
  outputs.get("aslias_mutabledep_data")?.import("mutabledep", "aslias_mutabledep_data", module);
  outputs.get("aslias_viewdep_data")?.import("viewdep", "aslias_viewdep_data", module);
  return {};
}));

return {dep,mutabledep,mutable$mutabledep,viewdep,viewof$viewdep,dep_alias,error_dep,aslias_mutabledep,mutable$aslias_mutabledep,aslias_viewdep,viewof$aslias_viewdep,aslias_mutabledep_data,aslias_viewdep_data};
};

export default function define(runtime) {
  const main = runtime.module();
  main.builtin("view", (_) => _.value);
  const fileAttachments = new Map([
    ["empty", {url: "https://static.observableusercontent.com/files/50cad75d56578d08f50d560a50a6f4a66919f1f0b9c189221c6768a04dc958323335dac14ca3526e6527019d02e9e00d21d247eb5c2646b38ec7720e0ddcaa7e", mimeType: "application/octet-stream", lastModified: 1729015412575.129, size: 2}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("cell 9", [], _9);
  main.define("cell 31", [], _31);
  main.define("myclass", [], _153);
  main.define("obj_literal", [], _115);
  main.define("x", [], _11);
  main.define("y", ["x"], _13);
  main.define("z", ["x","y"], _15);
  main.define("comments", [], _145);
  main.define("generator", ["x","y"], _17);
  main.define("_function", [], _20);
  main.define("asyncfunction", [], _71);
  main.define("named_function", [], _25);
  main.define("thisReference", [], _151);
  main.define("lambda", [], _22);
  main.define("error", [], _33);
  main.define("error_obj", [], _165);
  main.define("cell 162", ["error_dep"], _162);
  main.define("viewof view", ["Inputs"], _39);
  main.define("view", ["Generators", "viewof view"], (G, _) => G.input(_));
  main.define("initial q", [], _42);
  main.define("mutator q", ["Mutable", "initial q"], (M, _) => ((m) => [m, {get value() { return m.value; }, set value(v) { m.value = v; }}])(M(_)));
  main.define("mutable q", ["mutator q"], ([, m]) => m);
  main.define("q", ["mutator q"], ([m]) => m);
  main.define("inbuilt", ["_"], _45);
  main.define("file", ["FileAttachment"], _48);
  main.define("mutable_dep", ["viewof view","lambda","mutable q"], _52);
  main.define("mutable_dep_2", ["file","q"], _55);
  main.define("viewofdep_inline", ["viewof view"], _57);
  main.define("viewofdatadep", ["view"], _61);
  main.define("cell 93", ["dep"], _93);
  main.define("event", ["Event"], _168);
  main.define("cell 64", ["@variable"], _64);
  main.define("dep", ["cell 64"], (_) => _.dep);
  main.define("mutabledep", ["cell 64"], (_) => _.mutabledep);
  main.define("mutable$mutabledep", ["cell 64"], (_) => _.mutable$mutabledep);
  main.define("viewdep", ["cell 64"], (_) => _.viewdep);
  main.define("viewof$viewdep", ["cell 64"], (_) => _.viewof$viewdep);
  main.define("dep_alias", ["cell 64"], (_) => _.dep_alias);
  main.define("error_dep", ["cell 64"], (_) => _.error_dep);
  main.define("aslias_mutabledep", ["cell 64"], (_) => _.aslias_mutabledep);
  main.define("mutable$aslias_mutabledep", ["cell 64"], (_) => _.mutable$aslias_mutabledep);
  main.define("aslias_viewdep", ["cell 64"], (_) => _.aslias_viewdep);
  main.define("viewof$aslias_viewdep", ["cell 64"], (_) => _.viewof$aslias_viewdep);
  main.define("aslias_mutabledep_data", ["cell 64"], (_) => _.aslias_mutabledep_data);
  main.define("aslias_viewdep_data", ["cell 64"], (_) => _.aslias_viewdep_data);
  return main;
}
