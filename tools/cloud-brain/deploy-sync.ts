/**
 * Writes what a Brain runs as a directory whose paths are the modules' import paths.
 *   BRAIN_BASE=cb4 bun tools/cloud-brain/deploy-sync.ts <dir>
 * Two public reads, no key: the deployer's infra.getModules (every module a Worker owns, with its files)
 * and the page the kernel serves (the shell: every other module the page imports, and their files).
 *   <dir>/manifest.json            which module is a service of which Worker, at which hash; which are shared
 *   <dir>/@user/name.js            a module, where import("/@user/name.js?v=4") looks for it
 *   <dir>/@user/name/<file>        a file of a module
 * A second run against an unchanged Brain writes nothing new, so `git status` in <dir> is the difference.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { parse } from "acorn";
import { blocks } from "../lib/notebook-blocks.ts";

const base = process.env.BRAIN_BASE, out = process.argv[2];
if (!base || !out) { console.error("BRAIN_BASE=<base> bun tools/cloud-brain/deploy-sync.ts <dir>"); process.exit(1); }
const host = process.env.BRAIN_HOST || "endpointservices.workers.dev";
const kernel = `https://${base}.${host}`, deployer = `https://${base}-deployer.${host}`;
const X = "/xrpc/com.lopecode.brain.";

const put = (path: string, body: string | Uint8Array) => {
  const to = resolve(out, path);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, body);
};
// The modules a module imports: the `main.define("module @user/name", …)` statements of its define function, read
// from the parse. A name inside a string (a fixture, a doc) is not one.
const unparsed: string[] = [];
const imports = (text: string, name: string) => {
  let ast: any;
  try { ast = parse(text, { ecmaVersion: "latest", sourceType: "module" }); } catch (e) { unparsed.push(name + ": " + (e as Error).message); return null; }
  const define = ast.body.find((n: any) => n.type === "ExportDefaultDeclaration")?.declaration;
  const names = (define?.body?.body || []).map((n: any) => n.type === "ExpressionStatement" && n.expression.type === "CallExpression" && n.expression.callee.property?.name === "define" && n.expression.arguments[0]?.value)
    .filter((v: any) => typeof v === "string" && v.startsWith("module @")).map((v: string) => v.slice(7));
  return [...new Set<string>(names)].sort();
};

const got = await (await fetch(deployer + X + "infra.getModules")).json();
const services = [];
for (const m of got.modules.sort((a: any, b: any) => a.module.localeCompare(b.module))) {
  // The deployer keeps the source of a Worker that was removed. What runs answers getSource with the same hash;
  // only that is written (Tom, 2026-10-10: "yes only what is running").
  const live = await fetch(kernel + X + "getSource?worker=" + m.worker).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const running = m.worker === "brain-deployer" || (!!live && live.hash === m.hash && live.module === m.module);
  if (!running) continue;
  put(m.module + ".js", m.text);
  for (const [name, text] of Object.entries(m.files || {})) put(m.module + "/" + name, text as string);
  services.push({ module: m.module, worker: m.worker, hash: m.hash, files: Object.keys(m.files || {}).sort(), imports: imports(m.text, m.module) });
}

const owned = new Set(services.map((s) => s.module));
const page = await (await fetch(kernel + "/")).text();
const shared = [], files = [];
let bootconf = null;
for (const b of blocks(page)) {
  const mime = /data-mime="([^"]+)"/.exec(b.attrs)?.[1], enc = /data-encoding="([^"]+)"/.exec(b.attrs)?.[1] || "";
  if (b.id === "bootconf.json" && mime === "application/json") { bootconf = JSON.parse(b.content); continue; }
  if (!b.id.startsWith("@") || owned.has(b.id)) continue;
  const js = mime === "application/javascript" && b.id.split("/").length === 2;
  if (js && !enc) {
    put(b.id + ".js", b.content);
    shared.push({ module: b.id, imports: imports(b.content, b.id) });
  } else {
    // A library kept encoded (the runtime, the inspector) is a file, not a notebook module.
    const bytes = enc.startsWith("base64") ? Buffer.from(b.content, "base64") : b.content;
    const path = b.id + (js ? ".js" : "");
    put(path, enc.endsWith("+gzip") ? gunzipSync(bytes as Buffer) : bytes);
    files.push({ path, mime });
  }
}

const have = new Set([...owned, ...shared.map((s) => s.module)]);
const missing = [...new Set([...services, ...shared].flatMap((s) => s.imports || []))].filter((m) => !have.has(m)).sort();
put("manifest.json", JSON.stringify({ brain: kernel, distiller: got.distiller, bootconf, services, shared, files, missing, unparsed }, null, 1) + "\n");
console.log(`${services.length} service modules, ${shared.length} shared, ${files.length} files, ${missing.length} imports with no module: ${missing.join(" ")}` + (unparsed.length ? "\nnot parsed: " + unparsed.join("; ") : ""));
