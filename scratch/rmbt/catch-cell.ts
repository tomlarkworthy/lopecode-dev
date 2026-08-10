// eval_code's result serializer elides long strings in the MIDDLE, so a cell
// body cannot be read back through it at any chunk size. Receive a POST instead.
const out = process.argv[process.argv.indexOf("--out") + 1] || "scratch/rmbt/caught.txt";
const server = Bun.serve({
  port: 8799,
  async fetch(req) {
    const body = await req.text();
    await Bun.write(out, body);
    console.log(`received ${body.length} chars -> ${out}`);
    setTimeout(() => process.exit(0), 100);
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }
});
console.log("listening on " + server.port);
setTimeout(() => { console.error("timeout, nothing received"); process.exit(1); }, 60000);
