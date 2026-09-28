// Generate the vendorFiles cell + attachment list for @tomlarkworthy/codestrates, and the attachment blocks.
import { readFileSync, writeFileSync } from "fs";
import { gzipSync } from "zlib";
const dir = "tools/scratch/cs-vendor";
const rows = readFileSync(`${dir}/types.tsv`, "utf8").trim().split("\n").map((l) => l.split("\t"));
const name = (url: string) => {
  const u = new URL(url);
  if (u.host === "fonts.googleapis.com") return "fonts.googleapis.com-material-icons.css";
  const host = u.host === "libraries.projects.cavi.au.dk" ? "cavi" : u.host;
  const path = u.pathname.replace(/^\/javascript\//, "/").split("/").filter(Boolean);
  return [host, ...path].join("-");
};
const entries = rows.map(([url, file, , ct]) => {
  const mime = ct.split(";")[0].trim();
  const raw = readFileSync(`${dir}/${file}`);
  const gz = mime !== "font/woff2";
  const n = name(url) + (gz ? ".gz" : "");
  return { url, mime, n, data: gz ? gzipSync(raw, { level: 9 }) : raw, amime: gz ? "application/gzip" : mime };
});
const names = entries.map((e) => e.n);
if (new Set(names).size !== names.length) throw new Error("name collision");
const cell = `const _csvend = async function _vendorFiles(FileAttachment) {
  // the libraries the codestrate loads, by the URL it loads them from; see \`how\`
  const files = [
${entries.map((e) => `    [${JSON.stringify(e.url)}, ${JSON.stringify(e.mime)}, FileAttachment(${JSON.stringify(e.n)})]`).join(",\n")}
  ];
  const read = async ([url, mime, file]) => {
    const blob = await file.blob();
    const stream = file.name.endsWith(".gz") ? blob.stream().pipeThrough(new DecompressionStream("gzip")) : blob.stream();
    return [new URL(url).href, { mime, bytes: new Uint8Array(await new Response(stream).arrayBuffer()) }];
  };
  return new Map(await Promise.all(files.map(read)));
};
`;
const js = "modules/@tomlarkworthy/codestrates.js";
let s = readFileSync(js, "utf8");
if (!s.includes("_csvend")) {
  s = s.replace("const _7494zv = ", cell + "const _7494zv = ");
  s = s.replace(`  $def("_7494zv",`, `  $def("_csvend", "vendorFiles", ["FileAttachment"], _csvend);  \n  $def("_7494zv",`);
  s = s.replace(/new Map\((\["WPMv2\.js"[^\]]*)\]\.map/, (m, list) => `new Map(${list},${names.map((n) => JSON.stringify(n)).join(",")}].map`);
  writeFileSync(js, s);
}
const blocks = entries.map((e) => `<script id="@tomlarkworthy/codestrates/${encodeURIComponent(e.n)}" \n  type="text/plain"\n  data-encoding="base64"\n  data-mime="${e.amime}"\n>\n${e.data.toString("base64")}\n</script>\n`).join("");
writeFileSync(`${dir}/blocks.html`, blocks);
console.log(entries.length, "files,", blocks.length, "bytes of blocks");
