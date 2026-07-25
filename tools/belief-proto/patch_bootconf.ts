// Patch the copied notebook: bootconf mains/hash + <title>.
const path = "lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html";
let html = await Bun.file(path).text();

const bootconf = {
  mains: [
    "@tomlarkworthy/belief-state-geometry",
    "@tomlarkworthy/save-in-place",
    "@tomlarkworthy/lopepage-2"
  ],
  hash: "#view=S100(@tomlarkworthy/belief-state-geometry,@tomlarkworthy/claude-code-pairing,@tomlarkworthy/exporter-3)",
  headless: true,
  tick: "messageChannel"
};

// several copies of this tag exist inside module SOURCE (exporter-3's template
// literal) — the real block is the LAST occurrence in the document.
const open = '<script id="bootconf.json"';
const start = html.lastIndexOf(open);
if (start < 0) throw new Error("bootconf block not found");
const gt = html.indexOf(">", start);
const end = html.indexOf("</script>", gt);
const oldBody = html.slice(gt + 1, end);
if (!oldBody.includes('"mains"')) throw new Error("last bootconf block has no mains — refusing");
html = html.slice(0, gt + 1) + "\n" + JSON.stringify(bootconf, null, 2) + "\n" + html.slice(end);

html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>Transformers Represent Belief State Geometry — live</title>");

await Bun.write(path, html);
console.log("patched bootconf + title");
