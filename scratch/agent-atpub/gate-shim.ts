// Preload shim: makes com.atproto.repo.getRecord return a bundle whose files table is built
// from the LOCAL notebook's CIDs, so the tool's idempotence gate should fire ("no change").
// Everything else (resolvePds, listBlobs, listRecords) still hits the live PDS.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DOMParser } from "linkedom";
import { importNotebookModule } from "../../tools/notebook-import.ts";

const NB = "lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html";
const PUB = readFileSync("lopecode/notebooks/atproto.html", "utf8");

function block(id: string) {
  const m = new RegExp(`<script[^>]*\\sid="${id.replace(/[/@-]/g, (c) => "\\" + c)}"[^>]*>`).exec(PUB)!;
  const s = m.index + m[0].length;
  return PUB.slice(s, PUB.indexOf("</script>", s));
}

const dir = mkdtempSync(join(tmpdir(), "gate-"));
const w = (id: string, f: string) => { const p = join(dir, f); writeFileSync(p, block(id)); return p; };
const at = await importNotebookModule(w("@tomlarkworthy/atproto", "atproto.js"));
const aw = await importNotebookModule(w("@tomlarkworthy/at-write", "at-write.js"), {
  overrides: {
    DOMParser,
    decodeBase64: await at.value("decodeBase64"),
    textBytes: await at.value("textBytes"),
    safeStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  },
});
const html = readFileSync(NB, "utf8");
const files = await (await aw.value("extractFiles"))(html);
const title = /<title>([^<]*)<\/title>/i.exec(html)![1].trim();

const fake = {
  cid: "bafyFAKEPRIOR",
  value: {
    $type: "com.lopecode.bundle",
    title,
    createdAt: "2026-07-11T15:11:59.298Z",
    files: files.map((f: any) => ({
      id: f.id,
      encoding: f.encoding,
      blob: { $type: "blob", ref: { $link: f.cid }, mimeType: f.mime, size: f.size },
    })),
  },
};

const real = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(typeof input === "string" ? input : input.url);
  if (url.includes("com.atproto.repo.getRecord")) {
    console.log("[shim] intercepted getRecord → synthetic prior with local CIDs");
    return new Response(JSON.stringify(fake), { status: 200, headers: { "content-type": "application/json" } });
  }
  return real(input, init);
}) as typeof fetch;
