const _0 = function(md){return(
md`# URL querystrings and hash parameters

\`location.search\` and \`location.hash\` are now available for use in your notebooks (by being passed down from the parent frame). For example, click [this link](${
  new URL(document.baseURI).pathname
}?one=1&two=2) to add a querystring to this notebook’s URL.`
)};

const _9 = function(md,location){return(
md`The value of \`location.search\` is: \`${location.search}\``
)};

const _13 = function(md,hash){return(
md`And we can use the normal \`hashchange\` event to respond to changes in \`location.hash\`, which is currently: \`${hash}\`.`
)};

const _20 = function hash(Generators,location,addEventListener,removeEventListener){return(
Generators.observe(notify => {
  const hashchange = () => notify(location.hash);
  hashchange();
  addEventListener("hashchange", hashchange);
  return () => removeEventListener("hashchange", hashchange);
})
)};

const _17 = function(md){return(
md`This is Markdown with some simple hashful links:

- [#simple](${document.baseURI}#simple) 
- [#hashful](${document.baseURI}#hashful) 
- [#links](${document.baseURI}#links)`
)};

const _29 = function(md){return(
md`In general, you can use \`document.baseURI\` from within a notebook to get the browser’s current URL:`
)};

const _35 = function(){return(
document.baseURI
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 0", ["md"], _0);
  main.define("cell 9", ["md","location"], _9);
  main.define("cell 13", ["md","hash"], _13);
  main.define("hash", ["Generators","location","addEventListener","removeEventListener"], _20);
  main.define("cell 17", ["md"], _17);
  main.define("cell 29", ["md"], _29);
  main.define("cell 35", [], _35);
  return main;
}
