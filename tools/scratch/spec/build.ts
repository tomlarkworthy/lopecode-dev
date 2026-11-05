import { readFileSync, writeFileSync } from "node:fs";
import { snapshot, snapshotSchema, views } from "../ordinal-diagram/snapshot.js";
const live = readFileSync(`${import.meta.dir}/../ordinal-diagram/live.js`, "utf8").replace(/^export /gm, "");
const chapters = readFileSync(`${import.meta.dir}/../ordinal-diagram/chapters.js`, "utf8").replace(/^export /gm, "");
const fixture = readFileSync(`${import.meta.dir}/../ordinal-diagram/cb4-public.json`, "utf8");
const tiny = readFileSync(`${import.meta.dir}/../ordinal-diagram/tiny.js`, "utf8").replace(/^export /gm, "");
const dir = import.meta.dir;
const rel = readFileSync(`${dir}/../ordinal-diagram/rel.js`, "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const engine = readFileSync(`${dir}/../ordinal-diagram/engine.js`, "utf8").replace(/^export \{[^}]*\};\s*$/m, "");
if (/^\/\/ %%/m.test(engine)) throw new Error("engine contains a chunk separator");
let seed = readFileSync(`${dir}/ordinal-diagram.src.ojs`, "utf8");
seed = seed.replace("/*@ENGINE@*/", () => engine.trimEnd())
  .replace("/*@TINY@*/", () => tiny.trimEnd())
  .replace("/*@LIVE@*/", () => live.trimEnd())
  .replace("/*@REL@*/", () => rel.trimEnd())
  .replace("/*@CHAPTERS@*/", () => chapters.trimEnd())
  .replace("/*@FIXTURE@*/", () => fixture.trim())
  .replace("/*@SNAPSHOT@*/", () => JSON.stringify(snapshot, null, 2))
  .replace("/*@SNAPSCHEMA@*/", () => JSON.stringify(snapshotSchema, null, 2))
  .replace("/*@VIEWS@*/", () => JSON.stringify(views, null, 2));
if (/\/\*@[A-Z]+@\*\//.test(seed)) throw new Error("unreplaced marker");
writeFileSync(`${dir}/ordinal-diagram.ojs`, seed);
console.log("wrote", seed.length);
