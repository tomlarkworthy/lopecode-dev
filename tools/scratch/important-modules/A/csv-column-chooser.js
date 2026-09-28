const _csvFile = function csvFile(){return(
new File(["name,age,city\nAda,36,London\n\"Lin, B\",41,Paris\n"], "people.csv", { type: "text/csv" })
)};
const _header = function header(parseCSVLine){return(
parseCSVLine('name,"a, quoted",city')
)};
const _filtered = function filtered(streamSelectCSVToBlobURL,csvFile){return(
streamSelectCSVToBlobURL({ file: csvFile, selectedHeaders: ["city", "name"] })
)};
const _filteredText = function filteredText(filtered){return(
filtered.blob.text()
)};
const _downloadLink = function downloadLink(htl,filtered){return(
htl.html`<a href=${filtered.url} download=${filtered.filename}>Download ${filtered.filename} (${filtered.rowsWritten} rows)</a>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_csvFile", "csvFile", [], _csvFile);
  $def("_header", "header", ["parseCSVLine"], _header);
  $def("_filtered", "filtered", ["streamSelectCSVToBlobURL", "csvFile"], _filtered);
  $def("_filteredText", "filteredText", ["filtered"], _filteredText);
  $def("_downloadLink", "downloadLink", ["htl", "filtered"], _downloadLink);

  main.define("module @tomlarkworthy/csv-column-chooser", async () => "@tomlarkworthy/csv-column-chooser" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreid3dnurjoouxk26wylvokgvfxj42nwqdsyrgbfvms3m2abb6nkxwq")).default));
  main.define("streamSelectCSVToBlobURL", ["module @tomlarkworthy/csv-column-chooser", "@variable"], (_, v) => v.import("streamSelectCSVToBlobURL", _));
  main.define("parseCSVLine", ["module @tomlarkworthy/csv-column-chooser", "@variable"], (_, v) => v.import("parseCSVLine", _));
  return main;
}
