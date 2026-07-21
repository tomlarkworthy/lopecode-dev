const _fck1wn = function _1(md){return(
md`# Network efficient SQLite querying from static file hosting.

Just saw https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/ and wanted to see if we could do it here.

This is extremely cool, a 600MB sqlite database file is hosted on static storage, and we can issue SQL queries, but only a small amount of data is transfered! Yet no backend is really running, its exploiting HTTP range queries. Amazing work Phiresky

Here I am query data from a Google Cloud bucket provisioned using https://observablehq.com/@endpointservices/storage though I had to enable public access to the files for it to work (i.e. not go through the storage client). So I would suggest using your own bucket for now. I could not use Phiresky's Github pages because of CORS. But this demo shows it definitely will work with Google Cloud Storage buckets. 🔥🔥🔥🔥🔥

`
)};
const _1i37e6i = function _2(Table,results){return(
Table(results[0].values, {
})
)};
const _m9a6up = function _3(md){return(
md`## LOOK WE ARE ISSUING SQL 👇`
)};
const _hx5m3k = function _results(worker){return(
worker.db.exec(
  `select country_code, long_name from wdi_country limit 10;`
)
)};
const _1ofno5w = function _sqlite(require){return(
require("sql.js-httpvfs")
)};
const _14nl07d = async function _workerUrl(FileAttachment){return(
URL.createObjectURL(
  new Blob([await FileAttachment("sqlite.worker@1.js").text()], {
    type: 'application/javascript'
  })
)
)};
const _1pex9zj = function _wasmUrl(FileAttachment){return(
FileAttachment("sql-wasm@1.wasm").url()
)};
const _1in1kfs = async function _worker(sqlite,configURL,workerUrl,wasmUrl){return(
await sqlite.createDbWorker(
  [
    {
      from: "jsonconfig",
      configUrl: configURL
    }
  ],
  workerUrl,
  wasmUrl
)
)};
const _rpznfw = function _configURL(){return(
'https://storage.googleapis.com/o_endpointservices_mybucket11/public/world-development-indicators-sqlite/split-db/config.json'
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["sqlite.worker.js","sql-wasm.wasm","sql-wasm@1.wasm","sqlite.worker@1.js"].map((name) => {
    const module_name = "@tomlarkworthy/phiresky-sqlite-query";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @observablehq/inputs", async () => runtime.module((await import("/@observablehq/inputs.js?v=4")).default));  
  $def("_fck1wn", null, ["md"], _fck1wn);  
  $def("_1i37e6i", null, ["Table","results"], _1i37e6i);  
  $def("_m9a6up", null, ["md"], _m9a6up);  
  $def("_hx5m3k", "results", ["worker"], _hx5m3k);  
  $def("_1ofno5w", "sqlite", ["require"], _1ofno5w);  
  $def("_14nl07d", "workerUrl", ["FileAttachment"], _14nl07d);  
  $def("_1pex9zj", "wasmUrl", ["FileAttachment"], _1pex9zj);  
  $def("_1in1kfs", "worker", ["sqlite","configURL","workerUrl","wasmUrl"], _1in1kfs);  
  main.define("Table", ["module @observablehq/inputs", "@variable"], (_, v) => v.import("Table", _));  
  $def("_rpznfw", "configURL", [], _rpznfw);
  return main;
}