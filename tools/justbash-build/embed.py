#!/usr/bin/env python3
"""Embed the vendored just-bash gzip bundle into the justbash notebook engine module,
following the @tomlarkworthy/acorn-8-11-3 FileAttachment pattern. CDN import kept as fallback."""
import base64, sys, pathlib

HTML = pathlib.Path("lopebooks/notebooks/@tomlarkworthy_justbash.html")
GZ = pathlib.Path("tools/justbash-build/justbash.browser.bundle.js.gz")

html = HTML.read_text()
b64 = base64.b64encode(GZ.read_bytes()).decode()

# 1) Insert the gzip file-attachment <script> block right before the engine module script.
engine_open = '<script id="@tomlarkworthy/just-bash" \n  type="text/plain"\n  data-mime="application/javascript"\n>'
assert html.count(engine_open) == 1, f"engine open anchor count={html.count(engine_open)}"
att_block = (
    '<script id="@tomlarkworthy/just-bash/just-bash.browser.js.gz"\n'
    '        type="text/plain"\n'
    '        data-encoding="base64"\n'
    '        data-mime="application/gzip"\n'
    '>\n' + b64 + '\n</script>\n'
)
html = html.replace(engine_open, att_block + engine_open, 1)

# 2) Replace the justBashModule cell body: gunzip the FileAttachment, import the blob; CDN fallback.
old_fn = ("const _1d8rbf6 = function _justBashModule(importShim) {\n"
          "    return import('https://esm.sh/just-bash@3.0.1/browser');\n"
          "};")
assert html.count(old_fn) == 1, f"justBashModule fn anchor count={html.count(old_fn)}"
new_fn = ("const _1d8rbf6 = async function _justBashModule(FileAttachment) {\n"
          "    try {\n"
          "        const att = FileAttachment('just-bash.browser.js.gz');\n"
          "        const buf = await new Response((await att.stream()).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();\n"
          "        const url = URL.createObjectURL(new Blob([buf], { type: 'text/javascript' }));\n"
          "        return await import(url);\n"
          "    } catch (e) {\n"
          "        return await import('https://esm.sh/just-bash@3.0.1/browser');\n"
          "    }\n"
          "};")
html = html.replace(old_fn, new_fn, 1)

# 3) Add the FileAttachment builtin to the engine define(); anchor on its first $def (unique pid).
engine_first_def = '  $def("_e1yf8c", null, ["md"], _e1yf8c);  '
assert html.count(engine_first_def) == 1, f"engine first-def anchor count={html.count(engine_first_def)}"
fa_block = (
    '  const fileAttachments = new Map(["just-bash.browser.js.gz"].map((name) => {\n'
    '    const module_name = "@tomlarkworthy/just-bash";\n'
    '    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));\n'
    '    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));\n'
    '    return [name, {url: blob_url, mimeType: mime}];\n'
    '  }));\n'
    '  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));\n'
)
html = html.replace(engine_first_def, fa_block + engine_first_def, 1)

# 4) Repoint the justBashModule $def dependency from importShim to FileAttachment.
old_def = '$def("_1d8rbf6", "justBashModule", ["importShim"], _1d8rbf6);'
assert html.count(old_def) == 1, f"justBashModule $def anchor count={html.count(old_def)}"
html = html.replace(old_def, '$def("_1d8rbf6", "justBashModule", ["FileAttachment"], _1d8rbf6);', 1)

HTML.write_text(html)
print(f"embedded {len(b64)} base64 chars; new file size = {len(html)/1024/1024:.2f} MB")
