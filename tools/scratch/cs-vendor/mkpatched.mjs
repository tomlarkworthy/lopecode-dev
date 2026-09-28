import { readFileSync, writeFileSync } from "fs";
import { patchWebstratesClient } from "./patchclient.mjs";
writeFileSync("wsclient.patched.js", patchWebstratesClient(readFileSync("wsclient.js", "utf8")));
const id = readFileSync("synctest.id", "utf8").trim();
writeFileSync("synctest.html", `<!doctype html><html><head><title>t</title></head><body><p>local loader</p>
<script>window.__webstrateLocation = { protocol: "https:", host: "demo.webstrates.net", pathname: "/${id}/", search: "" };</script>
<script src="wsclient.patched.js"></script></body></html>`);
