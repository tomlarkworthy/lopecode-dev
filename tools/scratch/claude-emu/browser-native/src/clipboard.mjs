// The clipboard image commands, served from the page's own clipboard.
//
// cli.js reads a pasted image by shelling out — check the clipboard, save it to a temp
// file, read the bytes back, delete the file (osascript on macOS, xclip/wl-paste on
// Linux, powershell on Windows). None of that exists in a browser, so ctrl+v never
// found an image. But the page already HAS the bytes: a paste event carries them. The
// parent stashes them at globalThis.__CLIPBOARD_IMAGE = {base64, mediaType} and these
// three commands answer from that, writing the temp file into the same memfs cli.js
// then reads.
import { vol } from "./fs-core.mjs";

const line = (cmd, args, opts) => {
  const a = (args || []).map(String);
  if (opts && opts.shell) return String(cmd) + (a.length ? " " + a.join(" ") : "");
  if (/\/?(ba|z)?sh$/.test(String(cmd)) && a[0] === "-c") return a[1] || "";
  return [String(cmd), ...a].join(" ");
};

const decode = (b64) => {
  const bin = atob(String(b64 || ""));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
};

// The path in `… > "/tmp/x.png"`, or the argument of `rm -f "/tmp/x.png"`.
const target = (s) => (s.match(/>\s*"([^"]+)"/) || s.match(/rm\s+-f\s+"([^"]+)"/) || s.match(/del\s+\/f\s+"([^"]+)"/) || [])[1];

export function runClipboard(cmd, args, opts) {
  const s = line(cmd, args, opts);
  if (!/xclip|wl-paste|class PNGf|Get-Clipboard|Clipboard -Format/.test(s) && !/^rm -f "[^"]*(screenshot|clipboard)[^"]*"$/.test(s)) return null;
  const img = globalThis.__CLIPBOARD_IMAGE;
  const path = target(s);

  if (/^rm -f|^del \/f/.test(s.trim())) {
    try { if (path) vol.unlinkSync(path); } catch {}
    return { code: 0, stdout: "", stderr: "" };
  }
  // getPath: the clipboard as TEXT. We deliver text paste ourselves, so report none.
  if (/text\/plain|POSIX path|Get-Clipboard"?$/.test(s) && !path) return { code: 1, stdout: "", stderr: "" };
  if (!img || !img.base64) return { code: 1, stdout: "", stderr: "" };
  // saveImage: write the bytes where cli.js is about to read them.
  if (path) {
    try {
      const dir = path.slice(0, path.lastIndexOf("/"));
      if (dir) vol.mkdirSync(dir, { recursive: true });
      vol.writeFileSync(path, decode(img.base64));
      return { code: 0, stdout: "", stderr: "" };
    } catch (e) { return { code: 1, stdout: "", stderr: String(e && e.message) + "\n" }; }
  }
  // checkImage: yes, and this is what it is.
  return { code: 0, stdout: (img.mediaType || "image/png") + "\n", stderr: "" };
}

export default { runClipboard };
