import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
const ROOT = resolve(import.meta.dir, "../..");
function contentOf(rel: string, moduleId: string) {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (m[1] === moduleId && /data-mime="application\/javascript"/.test(m[2]))
      return m[3].replace(/^\n/, "").replace(/\n$/, "");
  }
  return null;
}
export function norm(s: string) {
  s = s.split(/export default function define|^function define\(/m)[0];
  // lopecode wraps each cell as `const _id = <fn>`; Observable emits a bare declaration
  s = s.replace(/^const _[A-Za-z0-9_$]+ = (async )?function /gm, "$1function ");
  // lopecode materialises the viewof value-extractor as its own cell; Observable does not
  s = s.replace(/^const _[A-Za-z0-9_$]+ = \(G, _\) => G\.input\(_\);$\n?/gm, "");
  // embedding artifacts: escaped close-tags and \uXXXX for non-ASCII
  s = s.replace(/<\/scr\\ipt>/g, "</script>");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/^(\)?)\};$/gm, "$1}");
  return s.split("\n").map(l => l.replace(/\s+$/, "")).filter(l => l.length).join("\n");
}
const [rel, mod, out] = process.argv.slice(2);
if (rel === "OBS") {
  const r = await fetch(`https://api.observablehq.com/${mod}.js?v=4`);
  writeFileSync(out, norm(await r.text()));
} else {
  writeFileSync(out, norm(contentOf(rel, mod)!));
}
