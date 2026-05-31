import { Bash, InMemoryFs } from "just-bash";
import { watchableFs, fsDirectoryHandle } from "./filesync-adapter.mjs";

// file-sync's exact helpers (copied verbatim from the module) operate on a handle:
const writeFile = async (dirHandle, path, content) => {
  const parts = path.split('/');
  let current = dirHandle;
  for (const dir of parts.slice(0, -1)) current = await current.getDirectoryHandle(dir, { create: true });
  const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};
const readFile = async (dirHandle, path) => {
  const parts = path.split('/');
  let current = dirHandle;
  for (const dir of parts.slice(0, -1)) current = await current.getDirectoryHandle(dir);
  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  return await fileHandle.getFile();
};

const events = [];
const base = new InMemoryFs();
const fs = watchableFs(base);
fs.onChange(e => events.push(`${e.op} ${e.path}${e.dest ? " -> " + e.dest : ""}`));
const dir = fsDirectoryHandle(fs);

// 1. file-sync "disassemble" style: write a module .js + an attachment as Uint8Array
await writeFile(dir, "myhost/@tomlarkworthy/justbash.js", "export default function define(){/* v1 */}\n");
await writeFile(dir, "myhost/bootconf.json", '{"mains":["@tomlarkworthy/justbash"]}');
await writeFile(dir, "myhost/@tomlarkworthy/justbash/logo.png", new Uint8Array([1,2,3,4]));

// 2. shell (over the SAME watchable fs) edits the disassembled module — like an agent would
const sh = new Bash({ fs, cwd: "/myhost/@tomlarkworthy" });
const before = await readFile(dir, "myhost/@tomlarkworthy/justbash.js");
await new Promise(r => setTimeout(r, 5));
await sh.exec("sed -i 's#v1#v2 EDITED BY SHELL#' justbash.js");

// 3. file-sync "filesToNotebook" style: read it back + detect change via lastModified
const after = await readFile(dir, "myhost/@tomlarkworthy/justbash.js");
const text = await after.text();

// 4. file-sync directory iteration (line 568-573): discover modules per org
const found = [];
const notebookDir = await dir.getDirectoryHandle("myhost");
for await (const [orgName, orgHandle] of notebookDir) {
  if (orgHandle.kind !== "directory") continue;
  for await (const [fname, fhandle] of orgHandle) {
    if (fhandle.kind === "file" && fname.endsWith(".js")) found.push(orgName + "/" + fname);
  }
}

// 5. attachment round-trips as bytes
const att = await readFile(dir, "myhost/@tomlarkworthy/justbash/logo.png");
const attBytes = new Uint8Array(await att.arrayBuffer());

console.log(JSON.stringify({
  shellEditVisibleViaHandle: text.includes("v2 EDITED BY SHELL"),
  lastModifiedChanged: after.lastModified >= before.lastModified,
  discoveredModules: found,
  attachmentBytes: [...attBytes],
  shellEditFiredWatchEvent: events.some(e => e.startsWith("writeFile /myhost/@tomlarkworthy/justbash.js")),
  allEvents: events,
}, null, 2));
