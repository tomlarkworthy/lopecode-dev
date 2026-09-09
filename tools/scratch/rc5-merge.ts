// One-off: merge ObservableHQ's robocoop-5 cells into the local module working copies.
// Plan-driven so the resolution of every divergent cell is stated, not implied:
//   take   <cell>        replace the local definition and dep list with Observable's
//   add    <cell>        Observable has it, local does not — insert it
//   custom <cell> <file> a hand-merged body (both sides had unique work)
//   import <name> <mod>  a cross-module import the incoming cells need
// Cells not named are kept local.
import { parseVariableGroups } from "../lope-push-ws.js";
import * as acorn from "acorn";
import { readFileSync, writeFileSync } from "fs";

const [modId, planPath] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planPath, "utf8"))[modId];
const workPath = `modules/${modId}.js`;
let src = readFileSync(workPath, "utf8");

const obsSrc = await (await fetch(`https://api.observablehq.com/${modId}.js?v=4`)).text();
const obs = new Map<string, any>();
for (const g of parseVariableGroups(obsSrc, acorn).groups ?? [])
  for (const v of g ?? []) if (v?._name) obs.set(v._name, v);

const defLine = (name: string) => {
  const re = new RegExp(`^(\\s*)\\$def\\("([^"]+)",\\s*"${name.replace(/[$]/g, "\\$&")}",\\s*\\[([^\\]]*)\\],\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\);(\\s*)$`, "m");
  const m = src.match(re);
  if (!m) throw new Error(`no $def for ${name} in ${modId}`);
  return { m, indent: m[1], pid: m[2], inputs: m[3], fnRef: m[4] };
};

/** Replace the initialiser of `const <fnRef> = …;` using its acorn range. */
function replaceHolder(fnRef: string, text: string) {
  const ast: any = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  for (const node of ast.body) {
    if (node.type !== "VariableDeclaration") continue;
    for (const d of node.declarations)
      if (d.id?.name === fnRef && d.init) { src = src.slice(0, d.init.start) + text + src.slice(d.init.end); return; }
  }
  throw new Error(`no holder ${fnRef}`);
}

const quoted = (inputs: string[]) => inputs.map((i) => JSON.stringify(i)).join(",");

for (const [name, file] of Object.entries<string>(plan.custom ?? {})) {
  const { m, pid, indent } = defLine(name);
  const body = readFileSync(file, "utf8").replace(/\n$/, "");
  const inputs = JSON.parse(readFileSync(file.replace(/\.js$/, ".inputs.json"), "utf8"));
  replaceHolder(defLine(name).fnRef, body);
  src = src.replace(m[0], `${indent}$def("${pid}", ${JSON.stringify(name)}, [${quoted(inputs)}], ${defLine(name).fnRef});`);
  console.log(`custom ${name}  inputs=${inputs.length}`);
}

for (const name of plan.take ?? []) {
  const o = obs.get(name); if (!o) throw new Error(`observable has no ${name}`);
  const { m, pid, indent, fnRef } = defLine(name);
  replaceHolder(fnRef, o._definition);
  src = src.replace(m[0], `${indent}$def("${pid}", ${JSON.stringify(name)}, [${quoted(o._inputs)}], ${fnRef});`);
  console.log(`take   ${name}  inputs=${JSON.stringify(o._inputs)}`);
}

// Adds go after the last holder and the last $def, keeping the file's two-block shape.
for (const name of plan.add ?? []) {
  const o = obs.get(name); if (!o) throw new Error(`observable has no ${name}`);
  const pid = "_rc5" + name.replace(/[^A-Za-z0-9]/g, "");
  const anchor = src.indexOf("\nexport default function define(");
  src = src.slice(0, anchor) + `\nconst ${pid} = ${o._definition};` + src.slice(anchor);
  const defs = [...src.matchAll(/^\s*\$def\(.*\);\s*$/gm)];
  const last = defs[defs.length - 1];
  const at = last.index! + last[0].length;
  src = src.slice(0, at) + `\n  $def("${pid}", ${JSON.stringify(name)}, [${quoted(o._inputs)}], ${pid});` + src.slice(at);
  console.log(`add    ${name}  pid=${pid}  inputs=${JSON.stringify(o._inputs)}`);
}

for (const [name, mod] of Object.entries<string>(plan.import ?? {})) {
  if (src.includes(`main.define("${name}", ["module ${mod}"`)) { console.log(`import ${name} — already present`); continue; }
  const loader = `main.define("module ${mod}",`;
  if (!src.includes(loader)) throw new Error(`${modId} has no module loader for ${mod}`);
  const imports = [...src.matchAll(/^\s*main\.define\("[^"]+", \["module [^"]+", "@variable"\].*$/gm)];
  const last = imports[imports.length - 1];
  const at = last.index! + last[0].length;
  src = src.slice(0, at) + `\n  main.define("${name}", ["module ${mod}", "@variable"], (_, v) => v.import("${name}", _));` + src.slice(at);
  console.log(`import ${name} from ${mod}`);
}

acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }); // refuse to write a file that will not parse
writeFileSync(workPath, src);
console.log(`wrote ${workPath}`);
