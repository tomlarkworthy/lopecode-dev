const _b3y7l7 = function _file_browser(all_module_files,htl,confirm,removeFileAttachment,setFileAttachment)
{
  const byModule = new Map();
  for (const a of all_module_files) {
    if (!byModule.has(a.module)) byModule.set(a.module, []);
    byModule.get(a.module).push(a);
  }
  const fmt = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };
  const totalFiles = all_module_files.length;
  const totalSize = all_module_files.reduce((s, f) => s + f.size, 0);
  const container = htl.html`<div style="font-family: var(--sans-serif, system-ui); font-size: 13px">
    <h1 style="margin: 0 0 4px 0">Writable FileAttachments</h2>
    <div style="color: #666; margin-bottom: 12px">${totalFiles} files across ${
    byModule.size
  } modules, ${fmt(totalSize)} total</div>
  </div>`;
  for (const [mod, files] of byModule) {
    const modSize = files.reduce((s, f) => s + f.size, 0);
    const details = htl.html`<details open style="margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px">
      <summary style="font-weight: 600; cursor: pointer; padding: 4px 0; font-size: 14px">
        ${mod} <span style="color: #888; font-weight: 400">(${
      files.length
    } file${files.length !== 1 ? "s" : ""}, ${fmt(modSize)})</span>
      </summary>
    </details>`;
    const table = htl.html`<table style="width: 100%; border-collapse: collapse; margin: 8px 0">
      <thead><tr style="border-bottom: 2px solid #ddd; text-align: left">
        <th style="padding: 4px 8px">Name</th>
        <th style="padding: 4px 8px">Size</th>
        <th style="padding: 4px 8px">Type</th>
        <th style="padding: 4px 8px">Actions</th>
      </tr></thead>
      <tbody></tbody>
    </table>`;
    const tbody = table.querySelector("tbody");
    for (const f of files) {
      const tr = htl.html`<tr style="border-bottom: 1px solid #eee"></tr>`;
      tr.appendChild(
        htl.html`<td style="padding: 4px 8px; word-break: break-all">${f.name}</td>`
      );
      tr.appendChild(
        htl.html`<td style="padding: 4px 8px; white-space: nowrap">${fmt(
          f.size
        )}</td>`
      );
      tr.appendChild(
        htl.html`<td style="padding: 4px 8px"><code style="font-size: 12px">${
          f.mimeType || "\u2014"
        }</code></td>`
      );
      const actions = htl.html`<td style="padding: 4px 8px; white-space: nowrap"></td>`;
      actions.appendChild(
        htl.html`<a href="${f.url}" download="${f.name}" style="color: #0366d6; text-decoration: none; margin-right: 12px">Download</a>`
      );
      const rm = htl.html`<button style="cursor: pointer; color: #d73a49; border: 1px solid #d73a49; background: white; border-radius: 3px; padding: 2px 8px; font-size: 12px">Remove</button>`;
      rm.onclick = () => {
        if (confirm("Remove " + f.name + "?")) {
          removeFileAttachment(f.name, f._module);
          tr.remove();
        }
      };
      actions.appendChild(rm);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    }
    details.appendChild(table);
    const addRow = htl.html`<div style="padding: 4px 8px"></div>`;
    const fileInput = htl.html`<input type="file" style="font-size: 12px">`;
    fileInput.onchange = () => {
      if (fileInput.files[0])
        setFileAttachment(fileInput.files[0], files[0]._module);
    };
    addRow.appendChild(
      htl.html`<label style="font-size: 12px">Add file: </label>`
    );
    addRow.appendChild(fileInput);
    details.appendChild(addRow);
    container.appendChild(details);
  }
  return container;
};
const _16tnqs = function _2(md){return(
md`Attach files to notebooks without uploading them anywhere. Massive files, no problem! Offers programmatic access to the FileAttachments too.

~~~js
import {getFileAttachment, setFileAttachment, removeFileAttachment, jsonFileAttachment, createFileAttachment} from '@tomlarkworthy/fileattachments'
~~~`
)};
const _djaip8 = function _file(Inputs){return(
Inputs.file({ label: "add file" })
)};
const _o8ksrq = (G, _) => G.input(_);
const _1ghph5p = function _attach_file(setFileAttachment,file)
{
  setFileAttachment(file);
};
const _jvabup = function _5(md){return(
md`Files are stored in \`mutable attachments\` as a Map of \`filename => FileAttachment\` which updates reactively.`
)};
const _14j7szf = function _selected(Inputs,attachments){return(
Inputs.select(attachments, { label: "file attachments" })
)};
const _oj0zwd = (G, _) => G.input(_);
const _132n9gt = function _7(md){return(
md`The normal FileAttachment API is available so it plays nicely with other features like downloads.`
)};
const _gdxjec = function _download_selected(selected,DOM){return(
selected &&
  DOM.download(selected.blob(), selected.name, `Download ${selected.name}`)
)};
const _l8n1og = async function _size_bytes(selected){return(
selected && (await selected.arrayBuffer()).byteLength
)};
const _167pgjq = function _attachments(Inputs,getFileAttachments){return(
Inputs.input(getFileAttachments())
)};
const _1ky92vk = (G, _) => G.input(_);
const _1l7fbod = function _jsonFileAttachment(createFileAttachment){return(
(name, obj) => {
  const str = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(str);
  const blob = new Blob([bytes], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  return createFileAttachment(url, name, "application/json");
}
)};
const _durgrm = function _createFileAttachment(FileAttachmentClass){return(
(url, name, mimeType) => {
  const file = new FileAttachmentClass(name, mimeType);
  Object.defineProperty(file, "url", { value: () => url });
  return file;
}
)};
const _lask4g = function _setFileAttachment(main,getFileAttachmentsMap,$0,getFileAttachments,Event)
{
    return async function setFileAttachment(file, module = main) {
        file = await file;
        if (!file)
            return;
        let FileAttachment = module._builtins.get('FileAttachment');
        if (!FileAttachment) {
            // dependancies don't have FileAttachment object so lazily create one
            const fileAttachments = new Map();
            FileAttachment = module._runtime.fileAttachments(name => fileAttachments.get(name));
            module.builtin('FileAttachment', FileAttachment);
        }
        const map = getFileAttachmentsMap(FileAttachment);
        const url = typeof file.url === 'function' ? await file.url() : URL.createObjectURL(file);
        map.set(file.name, url);
        $0.value = getFileAttachments();
        $0.dispatchEvent(new Event('input'));
    };
};
const _12z6s2j = function _getFileAttachment(main,getFileAttachments){return(
(name, module = main) =>
  getFileAttachments(module).get(name)
)};
const _jhq2u = function _removeFileAttachment(main,getFileAttachmentsMap,$0,getFileAttachments,Event){return(
function (name, module = main) {
  getFileAttachmentsMap(module._builtins.get("FileAttachment")).delete(name);
  $0.value = getFileAttachments();
  $0.dispatchEvent(new Event("input"));
}
)};
const _1b0vy8x = function _getFileAttachments(main,getFileAttachmentsMap){return(
function getFileAttachments(module = main) {
  const FileAttachment = module._builtins.get("FileAttachment");
  return new Map(
    [...getFileAttachmentsMap(FileAttachment).entries()].map(
      ([name, payload]) => [name, FileAttachment.call(null, name)]
    )
  );
}
)};
const _5nfcyp = function _getFileAttachmentsMap(){return(
(FileAttachment) => {
  let fileMap;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try {
    FileAttachment("");
  } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap || new Map();
}
)};
const _l3um8o = function _FileAttachmentClass(sampleFileAttachment)
{
  return sampleFileAttachment.__proto__.__proto__.constructor;
};
const _17tlw1p = function _fileInput(Inputs){return(
Inputs.file()
)};
const _kltp8w = (G, _) => G.input(_);
const _zsh4v4 = function _plainFile(){return(
new File([], "cool")
)};
const _5jfk3a = function _sampleFileAttachment(DataTransfer,plainFile,$0,Event)
{
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(plainFile);
  $0[0].files = dataTransfer.files;
  $0[0].dispatchEvent(new Event("input"));
  return $0.value;
};
const _1mhy1zd = async function _all_module_files(attachments,main,getFileAttachmentsMap)
{
    void attachments;
    // dependency for reactivity
    const runtime = main._runtime;
    const nameMap = new Map();
    for (const v of runtime._variables) {
        if (v._name && typeof v._name === 'string' && v._name.startsWith('module ')) {
            const modName = v._name.slice(7);
            const resolvedMod = v._value;
            if (resolvedMod && resolvedMod._scope)
                nameMap.set(resolvedMod, modName);
        }
    }
    const builtin = runtime._builtin;
    const source = m => !m._source ? m : source(m._source);
    const allMods = new Set(Array.from(runtime._variables, v => source(v._module)));
    const results = [];
    for (const mod of allMods) {
        if (mod === builtin)
            continue;
        const FA = mod._builtins.get('FileAttachment');
        if (!FA)
            continue;
        const map = getFileAttachmentsMap(FA);
        if (!map || map.size === 0)
            continue;
        const name = nameMap.get(mod) || 'main';
        for (const [filename, entry] of map) {
            const url = typeof entry === 'string' ? entry : entry.url;
            const mimeType = typeof entry === 'object' ? entry.mimeType : null;
            let size = 0;
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                size = blob.size;
            } catch (e) {
            }
            results.push({
                module: name,
                name: filename,
                url,
                mimeType,
                size,
                _module: mod
            });
        }
    }
    return results;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_b3y7l7", "file_browser", ["all_module_files","htl","confirm","removeFileAttachment","setFileAttachment"], _b3y7l7);  
  $def("_16tnqs", null, ["md"], _16tnqs);  
  $def("_djaip8", "viewof file", ["Inputs"], _djaip8);  
  $def("_o8ksrq", "file", ["Generators","viewof file"], _o8ksrq);  
  $def("_1ghph5p", "attach_file", ["setFileAttachment","file"], _1ghph5p);  
  $def("_jvabup", null, ["md"], _jvabup);  
  $def("_14j7szf", "viewof selected", ["Inputs","attachments"], _14j7szf);  
  $def("_oj0zwd", "selected", ["Generators","viewof selected"], _oj0zwd);  
  $def("_132n9gt", null, ["md"], _132n9gt);  
  $def("_gdxjec", "download_selected", ["selected","DOM"], _gdxjec);  
  $def("_l8n1og", "size_bytes", ["selected"], _l8n1og);  
  $def("_167pgjq", "viewof attachments", ["Inputs","getFileAttachments"], _167pgjq);  
  $def("_1ky92vk", "attachments", ["Generators","viewof attachments"], _1ky92vk);  
  $def("_1l7fbod", "jsonFileAttachment", ["createFileAttachment"], _1l7fbod);  
  $def("_durgrm", "createFileAttachment", ["FileAttachmentClass"], _durgrm);  
  $def("_lask4g", "setFileAttachment", ["main","getFileAttachmentsMap","viewof attachments","getFileAttachments","Event"], _lask4g);  
  $def("_12z6s2j", "getFileAttachment", ["main","getFileAttachments"], _12z6s2j);  
  $def("_jhq2u", "removeFileAttachment", ["main","getFileAttachmentsMap","viewof attachments","getFileAttachments","Event"], _jhq2u);  
  $def("_1b0vy8x", "getFileAttachments", ["main","getFileAttachmentsMap"], _1b0vy8x);  
  $def("_5nfcyp", "getFileAttachmentsMap", [], _5nfcyp);  
  $def("_l3um8o", "FileAttachmentClass", ["sampleFileAttachment"], _l3um8o);  
  $def("_17tlw1p", "viewof fileInput", ["Inputs"], _17tlw1p);  
  $def("_kltp8w", "fileInput", ["Generators","viewof fileInput"], _kltp8w);  
  $def("_zsh4v4", "plainFile", [], _zsh4v4);  
  $def("_5jfk3a", "sampleFileAttachment", ["DataTransfer","plainFile","viewof fileInput","Event"], _5jfk3a);  
  $def("_1mhy1zd", "all_module_files", ["attachments","main","getFileAttachmentsMap"], _1mhy1zd);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}