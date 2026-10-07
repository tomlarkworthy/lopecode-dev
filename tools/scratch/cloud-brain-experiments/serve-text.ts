const text = await Bun.file(import.meta.dir + "/snippets.txt").text();
Bun.serve({ port: 47811, hostname: "127.0.0.1", fetch: () => new Response(text, { headers: { "access-control-allow-origin": "*" } }) });
console.log(text.length);
