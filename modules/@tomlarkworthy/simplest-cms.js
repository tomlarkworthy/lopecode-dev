const _1jlnngn = function _1(md){return(
md`# Simplest CMS`
)};
const _1tamylm = function _2(md){return(
md`Publicly viewable Google sheets can be queried client-side with no CORS issues in CSV format, by sheetname.

\`d3.csv\` uses the first row to define the keys and returns array of objects.

Together you can build an incredibly simple serverless content management system.

I have sheet already setup [here](https://docs.google.com/spreadsheets/d/12oy6SbzN58lelbboOThhO_ly0mKC0tlZ4BVxlW10UZ8/edit?gid=0#gid=0) for an example`
)};
const _1qlr9nf = function _sheetId(){return(
"12oy6SbzN58lelbboOThhO_ly0mKC0tlZ4BVxlW10UZ8"
)};
const _wwjxm6 = function _sheetName(){return(
"products"
)};
const _2mhwvw = function _5(md){return(
md`The following fetches and decodes it in one line of code:`
)};
const _fqybit = function _products(d3,sheetId,sheetName){return(
d3.csv(
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`
)
)};
const _7nqwj4 = function _7(md){return(
md`The resultant array is a legible structured format for use in downstream processing:-`
)};
const _pz70g4 = function _8(Inputs,products){return(
Inputs.table(products)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1jlnngn", null, ["md"], _1jlnngn);  
  $def("_1tamylm", null, ["md"], _1tamylm);  
  $def("_1qlr9nf", "sheetId", [], _1qlr9nf);  
  $def("_wwjxm6", "sheetName", [], _wwjxm6);  
  $def("_2mhwvw", null, ["md"], _2mhwvw);  
  $def("_fqybit", "products", ["d3","sheetId","sheetName"], _fqybit);  
  $def("_7nqwj4", null, ["md"], _7nqwj4);  
  $def("_pz70g4", null, ["Inputs","products"], _pz70g4);
  return main;
}