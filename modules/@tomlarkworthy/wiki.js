const _1bpvkjb = function _1(md){return(
md`# Wiki tagged template with jscreole

https://github.com/codeholic/jscreole

Overwrite the _config_ variable to customize the Creale constructor args backing the wiki template literal. Comes preconfigured for [wikipedia](https://en.wikipedia.org/).

~~~js
import {wiki} from '@tomlarkworthy/wiki'
~~~
or

~~~js
import {wiki} with {config as config} from '@tomlarkworthy/wiki'
~~~
`
)};
const _4ttmgu = function _2(md){return(
md`## Examples`
)};
const _18tzndu = function _3(wiki){return(
wiki`
  * This is [[Wikipedia:Wikitext|wikitext]]
  * This is [[Kingdom of Romania]]
  * This is interpolated: ${Math.random()
    .toString(36)
    .substring(3)}
`
)};
const _1sk5k16 = function _config(){return(
{
  interwiki: {},
  linkFormat: 'https://en.wikipedia.org/wiki/'
}
)};
const _1kkh0sh = function _Creole(require){return(
require('jscreole@0.9.0/lib/creole.js')
  .catch(() => window["creole"])
  .then(() => window["creole"])
)};
const _pww5g3 = function _creole(Creole,config){return(
new Creole(config)
)};
const _1k5l2l5 = function _wiki(creole){return(
function wiki(strings, ...args) {
  const zippedStrings = strings.reduce((acc, cur, i) => {
    let arrToConcat = i === strings.length - 1 ? [cur] : [cur, args[i]];
    return [...acc, ...arrToConcat];
  }, []);

  const string = zippedStrings.join('');

  var span = document.createElement('span');
  creole.parse(span, string);
  return span;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1bpvkjb", null, ["md"], _1bpvkjb);  
  $def("_4ttmgu", null, ["md"], _4ttmgu);  
  $def("_18tzndu", null, ["wiki"], _18tzndu);  
  $def("_1sk5k16", "config", [], _1sk5k16);  
  $def("_1kkh0sh", "Creole", ["require"], _1kkh0sh);  
  $def("_pww5g3", "creole", ["Creole","config"], _pww5g3);  
  $def("_1k5l2l5", "wiki", ["creole"], _1k5l2l5);
  return main;
}