// Receive an exportToHTML result POSTed from the PAIRED tab.
//
// save-in-place.ts boots its own headless page, so it can only ever export what
// is on disk. Live-only cell edits exist solely in the user's tab, so the export
// has to be driven there -- this is just the sink half of that script.
//
//   bun scratch/rmbt/sip-sink.ts --out scratch/rmbt/sip-live.html --port 8791
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const OUT = arg("out", "scratch/rmbt/sip-live.html");
const PORT = Number(arg("port", "8791"));

let resolveDone: (v: string) => void;
const done = new Promise<string>((r) => { resolveDone = r; });

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method !== "POST") return new Response("sink", { headers: { "Access-Control-Allow-Origin": "*" } });
    const body = await req.text();
    resolveDone!(body);
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }
});
console.log(`sink listening on http://localhost:${server.port}/  -> ${OUT}`);

const html = await done;
await Bun.write(OUT, html);
console.log(`received ${html.length} bytes (${(html.length / 1e6).toFixed(2)} MB), wrote ${OUT}`);
server.stop();
