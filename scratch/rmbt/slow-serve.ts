// Serve one file at a fixed byte rate so the streaming behaviour of a real
// download is reproducible offline. 1.7MB/s reproduces the measured github.io
// baseline (15.11MB raw arriving over ~8.8s).
const file = process.argv[2];
const rate = Number(process.argv[3] ?? 1_700_000);
const port = Number(process.argv[4] ?? 8123);
const bytes = await Bun.file(file).arrayBuffer();
const buf = new Uint8Array(bytes);
const CHUNK = Math.round(rate / 20);
Bun.serve({
  port,
  fetch() {
    const stream = new ReadableStream({
      async start(c) {
        for (let o = 0; o < buf.length; o += CHUNK) {
          c.enqueue(buf.subarray(o, Math.min(o + CHUNK, buf.length)));
          await new Promise((r) => setTimeout(r, 50));
        }
        c.close();
      }
    });
    return new Response(stream, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
});
console.log(`serving ${file} at ${(rate / 1e6).toFixed(2)}MB/s on :${port}`);
