// Is the File System Access API usable from a file:// notebook?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
const r = await p.evaluate(() => ({
  secureContext: window.isSecureContext,
  origin: String(location.origin),
  showDirectoryPicker: typeof window.showDirectoryPicker,
  showOpenFilePicker: typeof window.showOpenFilePicker,
  fileSystemHandle: typeof window.FileSystemHandle,
  webkitdirectoryInput: (() => { const i = document.createElement("input"); return "webkitdirectory" in i; })(),
}));
console.log(JSON.stringify(r, null, 2));
await b.close(); process.exit(0);
