// Compile AssemblyScript to wasm by running `asc` IN A BROWSER, which is the
// configuration that matters: if the detector kernel is ever going to live in
// AssemblyScript, the notebook has to be able to compile it itself, the way it
// compiles the JS kernel by toString()-ing the live cells today. Zig cannot do
// that at any useful speed (see involution.zig's build note).
//
// AssemblyScript ships an importmap for exactly this -- dist/web.js just
// installs it -- so `import asc from "assemblyscript/asc"` resolves in-page.
// asc.main takes a virtual filesystem as callbacks, so no files are written.
//
// The CDN is used here for convenience. Nothing about it is load-bearing: the
// four mapped URLs (asc, assemblyscript, binaryen, long) are ~1.7MB of plain
// JS and would become file attachments in a notebook that shipped this.
//
//   bun scratch/rmbt/ascc.ts scratch/rmbt/involution.as.ts out.wasm [--O 3] [--runtime stub]
import { chromium } from "playwright";

const SRC = process.argv[2], OUT = process.argv[3];
if (!SRC || !OUT) { console.error("usage: ascc.ts <in.ts> <out.wasm> [--O 3] [--runtime stub]"); process.exit(2); }
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const O = arg("O", "3");
const RUNTIME = arg("runtime", "stub");
const AS = "0.28.20";
const EXTRA = process.argv.slice(2).filter((a) => a.startsWith("--as-")).map((a) => a.replace(/^--as-/, "--"));
const source = await Bun.file(SRC).text();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.setContent(`<!doctype html><html><head><script type="importmap">${JSON.stringify({
  imports: {
    assemblyscript: `https://cdn.jsdelivr.net/npm/assemblyscript@${AS}/dist/assemblyscript.js`,
    "assemblyscript/asc": `https://cdn.jsdelivr.net/npm/assemblyscript@${AS}/dist/asc.js`,
    binaryen: "https://cdn.jsdelivr.net/npm/binaryen@131.0.0-nightly.20260721/index.js",
    long: "https://cdn.jsdelivr.net/npm/long@5.3.2/index.js"
  }
})}</script></head><body></body></html>`, { waitUntil: "domcontentloaded" });

const res: any = await page.evaluate(async ({ src, o, runtime, EXTRA }) => {
  const asc = (await import("assemblyscript/asc")).default;
  const out: Record<string, Uint8Array | string> = {};
  const argv = ["main.ts", "--outFile", "main.wasm", "--textFile", "main.wat",
    "-O" + o, "--runtime", runtime].concat(EXTRA);
  const { error, stdout, stderr } = await asc.main(argv, {
    readFile: (name: string) => (name === "main.ts" ? src : null),
    writeFile: (name: string, data: any) => { out[name] = data; },
    listFiles: () => []
  });
  return {
    version: asc.version,
    error: error ? String(error.message || error) : null,
    stdout: String(stdout.toString() || "").slice(0, 2000),
    stderr: String(stderr.toString() || "").slice(0, 4000),
    bytes: out["main.wasm"] ? Array.from(out["main.wasm"] as Uint8Array) : null,
    wat: typeof out["main.wat"] === "string" ? (out["main.wat"] as string).length : 0
  };
}, { src: source, o: O, runtime: RUNTIME, EXTRA });

await browser.close();
if (res.stderr && res.stderr.trim()) console.error(res.stderr.trim());
if (res.error) { console.error("asc: " + res.error); process.exit(1); }
if (!res.bytes) { console.error("no wasm emitted"); process.exit(1); }
await Bun.write(OUT, new Uint8Array(res.bytes));
console.log(`asc ${res.version}: ${OUT} ${res.bytes.length} bytes (-O${O}, runtime ${RUNTIME})`);
