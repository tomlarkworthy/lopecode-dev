import { loadCanonical } from "../lope-sync.ts";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
const ROOT = resolve(import.meta.dir, "../..");
function contentOf(rel: string, moduleId: string) {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    if (m[1] === moduleId && /data-mime="application\/javascript"/.test(m[2]))
      return m[3].replace(/^\n/, "").replace(/\n$/, "");
  return null;
}
function norm(s: string) {
  s = s.split(/export default function define|^function define\(/m)[0];
  s = s.replace(/^const _[A-Za-z0-9_$]+ = (async )?function /gm, "$1function ");
  s = s.replace(/^const _[A-Za-z0-9_$]+ = \(G, _\) => G\.input\(_\);$\n?/gm, "");
  s = s.replace(/<\/scr\\ipt>/g, "</script>");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/^(\)?)\};$/gm, "$1}");
  return s;
}
function cells(src: string) {
  const named = new Map<string, string>();
  let cur: string[] = [], name: string | null = null;
  const flush = () => { if (cur.length && name && !/^_\d+$/.test(name)) named.set(name, cur.join("\n").trim()); cur = []; name = null; };
  for (const l of norm(src).split("\n")) {
    const m = l.match(/^(?:async )?function (\w+)\(/);
    if (m) { flush(); name = m[1]; }
    cur.push(l);
  }
  flush(); return named;
}
const [mod, repo, out, ...want] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const name = mod.replace("@tomlarkworthy/", "");
const obs = cells(await (await fetch(`https://api.observablehq.com/@tomlarkworthy/${name}.js?v=4`)).text());
const loc = cells(contentOf((loadCanonical() as any)[mod][repo], mod)!);
for (const c of want) {
  writeFileSync(`${out}/${c}.obs`, (obs.get(c) ?? "<absent>") + "\n");
  writeFileSync(`${out}/${c}.${repo}`, (loc.get(c) ?? "<absent>") + "\n");
}
