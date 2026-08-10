// Compare (and optionally replace) the hexframes.json file attachment embedded
// in the notebook. Live DOM edits to an attachment block do NOT survive an
// export -- the exporter serialises boot-time blobs -- so the disk block is the
// only place a regenerated label set can be installed.
//
//   bun scratch/rmbt/patch-attachment.ts            # report only
//   bun scratch/rmbt/patch-attachment.ts --write
import { readFileSync, writeFileSync } from "node:fs";

const HTML = "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html";
const NEWJSON = "scratch/rmbt/bank/hexframes.json";
const ID = "@tomlarkworthy/coded-landmark-tracking-data/hexframes.json";
const WRITE = process.argv.includes("--write");

const t = readFileSync(HTML, "utf8");
const needle = `id="${ID}"`;
const at = t.indexOf(needle);
if (at < 0) throw new Error("attachment id not found");
if (t.indexOf(needle, at + 1) >= 0) throw new Error("attachment id is not unique -- refusing");
const tagStart = t.lastIndexOf("<script", at);
const tagEnd = t.indexOf(">", at) + 1;
const tag = t.slice(tagStart, tagEnd);
const bodyEnd = t.indexOf("</script>", tagEnd);
const body = t.slice(tagEnd, bodyEnd);
const isB64 = /base64/.test(tag);
console.log("tag:", tag);
console.log(`body ${body.length} chars, base64=${isB64}`);

const summarise = (label: string, text: string) => {
  const j = JSON.parse(text);
  const frames = Array.isArray(j) ? j : j.frames ?? Object.values(j);
  const srcs: Record<string, number> = {};
  let marks = 0;
  for (const f of frames as any[]) {
    for (const l of f.truth ?? f.labels ?? []) { marks++; srcs[l.src ?? "(none)"] = (srcs[l.src ?? "(none)"] ?? 0) + 1; }
  }
  console.log(`${label}: ${(frames as any[]).length} frames, ${marks} marks, srcs=${JSON.stringify(srcs)}`);
  return { frames, marks };
};

const cur = summarise("EMBEDDED", isB64 ? Buffer.from(body.trim(), "base64").toString("utf8") : body);
const newText = readFileSync(NEWJSON, "utf8");
const nxt = summarise("NEW     ", newText);

if ((cur.frames as any[]).length !== (nxt.frames as any[]).length || cur.marks !== nxt.marks) {
  console.error("REFUSING: frame or mark count differs; this is not a like-for-like relabel.");
  process.exit(1);
}

if (!WRITE) { console.log("\n(report only; pass --write to install)"); process.exit(0); }

const encoded = isB64 ? Buffer.from(newText, "utf8").toString("base64") : newText;
const out = t.slice(0, tagEnd) + encoded + t.slice(bodyEnd);
// round-trip before committing to disk
const back = out.slice(out.indexOf(">", out.indexOf(needle)) + 1, out.indexOf("</script>", out.indexOf(needle)));
JSON.parse(isB64 ? Buffer.from(back.trim(), "base64").toString("utf8") : back);
writeFileSync(HTML, out);
console.log(`\nwrote ${HTML} (${(out.length / 1e6).toFixed(2)} MB), attachment body ${body.length} -> ${encoded.length} chars`);
