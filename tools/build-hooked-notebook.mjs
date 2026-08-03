// Build a notebook with the bootloader definition-hooks seam + a userspace policy module.
//
//   node tools/build-hooked-notebook.mjs <frame.html> <out.html> [--swap old=modules/x.js]
//                                        [--add @user/mod=modules/@user/mod.js] [--main @user/mod]
//                                        [--rename old=new] [--title "..."]
//
// Always: splices tools/definition-hooks-patch.js into the bootloader boot cell
// (before conf.mains import) and sets bootconf.hooks = true.
import fs from "node:fs";

const CT = "</" + "script>";
const args = process.argv.slice(2);
const [frame, out] = args.filter((a) => !a.startsWith("--"));
const opt = (name) => args.filter((a) => a.startsWith("--" + name + "=")).map((a) => a.slice(name.length + 3));
const one = (name) => opt(name)[0];

let h = fs.readFileSync(frame, "utf8");

// The string `<script id="bootconf.json"` also appears INSIDE other blocks
// (exporter-3's emitted template, the docs). Only the occurrence whose body
// parses as JSON is the real config block — anchoring on lastIndexOf() splices
// into a markdown cell and corrupts it.
const realBootconf = (s) => {
  let i = -1;
  while ((i = s.indexOf('<script id="bootconf.json"', i + 1)) >= 0) {
    const t = s.indexOf(">", i), e = s.indexOf(CT, t);
    try { JSON.parse(s.slice(t + 1, e)); return i; } catch {}
  }
  throw new Error("no parseable bootconf block");
};
const patch = fs.readFileSync("tools/definition-hooks-patch.js", "utf8");
if (patch.includes("<" + "/script")) throw new Error("patch has literal close tag");

// --- swap an existing module block's body -----------------------------------
for (const spec of opt("swap")) {
  const [id, path] = spec.split("=");
  const src = fs.readFileSync(path, "utf8");
  if (src.includes("<" + "/script")) throw new Error(path + " has literal close tag");
  const i = h.indexOf('<script id="' + id + '"');
  if (i < 0) throw new Error("no block for " + id);
  const t = h.indexOf(">", i), e = h.indexOf(CT, t);
  h = h.slice(0, t + 1) + "\n" + src + "\n" + h.slice(e);
  console.log("swapped", id, "<-", path);
}

// --- rename an id everywhere (block id + bootconf mains + hash) --------------
for (const spec of opt("rename")) {
  const [from, to] = spec.split("=");
  const n = h.split(from).length - 1;
  h = h.split(from).join(to);
  console.log("renamed", from, "->", to, "(" + n + ")");
}

// --- add new module blocks ---------------------------------------------------
for (const spec of opt("add")) {
  const [id, path] = spec.split("=");
  const src = fs.readFileSync(path, "utf8");
  if (src.includes("<" + "/script")) throw new Error(path + " has literal close tag");
  if (h.includes('<script id="' + id + '"')) {
    const i = h.indexOf('<script id="' + id + '"');
    const t = h.indexOf(">", i), e = h.indexOf(CT, t);
    h = h.slice(0, t + 1) + "\n" + src + "\n" + h.slice(e);
    console.log("replaced existing", id);
  } else {
    // insert before the real bootconf block so it is parsed as part of the module set
    const anchor = realBootconf(h);
    const block = '<script id="' + id + '" type="text/plain" data-mime="application/javascript">\n' + src + "\n" + CT + "\n";
    h = h.slice(0, anchor) + block + h.slice(anchor);
    console.log("added", id, "(" + src.length + " bytes)");
  }
}

// --- splice the hooks seam into the bootloader boot cell ---------------------
const bb = h.indexOf('<script id="@tomlarkworthy/bootloader"');
if (bb < 0) throw new Error("no bootloader block");
// Bootloader copies differ in indentation between notebooks (2-space vs
// 4-space), so anchor on structure, not on exact whitespace.
const blockEnd = h.indexOf(CT, bb);
const m = /\n([ \t]*)if \(conf\.hash && !location\.hash\) \{/.exec(h.slice(bb, blockEnd));
if (!m) throw new Error("boot anchor not found in bootloader block");
const ai = bb + m.index;
h = h.slice(0, ai) + "\n" + patch + h.slice(ai);
console.log("spliced hooks seam at bootloader offset", m.index, "(indent " + m[1].length + ")");

// --- bootconf: hooks on, extra mains -----------------------------------------
{
  const i = realBootconf(h);
  const t = h.indexOf(">", i), e = h.indexOf(CT, t);
  const conf = JSON.parse(h.slice(t + 1, e));
  conf.hooks = true;
  for (const m of opt("main")) if (!conf.mains.includes(m)) conf.mains.push(m);
  if (one("hash")) conf.hash = one("hash");
  h = h.slice(0, t + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n" + h.slice(e);
  console.log("bootconf.mains:", JSON.stringify(conf.mains));
}

const title = one("title");
if (title) h = h.replace(/<title>[^<]*<\/title>/, "<title>" + title + "</title>");

fs.writeFileSync(out, h);
// QA copy with debugger statements neutralised (they trap Playwright/CDP)
const qa = "/tmp/" + out.split("/").pop().replace(/\.html$/, "") + "-qa.html";
fs.writeFileSync(qa, h.split("debugger;").join("void 0;"));
// syntax-check the patched bootloader (recompute offset: --add shifted it)
const bb2 = h.indexOf('<script id="@tomlarkworthy/bootloader"');
const t2 = h.indexOf(">", bb2);
fs.writeFileSync("/tmp/bootcheck.mjs", h.slice(t2 + 1, h.indexOf(CT, t2)));
console.log("wrote", out, h.length, "bytes\nQA copy", qa);
