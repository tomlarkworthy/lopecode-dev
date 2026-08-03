#!/usr/bin/env python3
"""Swap the rebuilt notebook-kit selfhost bundle into the lopebooks notebooks.

For each target notebook, find the two file-attachment <script> blocks whose id
starts with "@tomlarkworthy/notebook-kit/notebook-kit-browser" (the `@4` alias and
the bare main), rewrite their payload with the new bundle, and switch the encoding
from plain base64 to base64+gzip (lopecode already supports base64+gzip; it cuts the
in-HTML block ~3.6x). Also bump the "Notebook Kit@1.4.1" title to 1.5.2.

Idempotent: re-running with the same bundle yields the same bytes.
"""
import gzip, base64, io, sys, pathlib

# encoding: "base64+gzip" (compact, import-path only) or "base64" (FileAttachment-safe)
ENCODING = sys.argv[1] if len(sys.argv) > 1 else "base64+gzip"

BUNDLE = pathlib.Path(
    "/Users/tom.larkworthy/dev/lopecode-dev/scratch/notebook-kit-fork/"
    "notebook-kit-selfhost/dist/notebook-kit-browser.js"
)
TARGETS = [
    "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_notebook-kit.html",
    "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_notebook-kit-examples.html",
]
ATTACH_ID_PREFIX = '<script id="@tomlarkworthy/notebook-kit/notebook-kit-browser'

def encode(raw: bytes) -> str:
    if ENCODING == "base64":
        return base64.b64encode(raw).decode("ascii")
    buf = io.BytesIO()
    # mtime=0 => deterministic output for clean diffs
    with gzip.GzipFile(fileobj=buf, mode="wb", mtime=0) as f:
        f.write(raw)
    return base64.b64encode(buf.getvalue()).decode("ascii")

def swap(path: str, payload: str) -> dict:
    lines = pathlib.Path(path).read_text().splitlines(keepends=False)
    out, i, n = [], 0, len(lines)
    blocks = 0
    while i < n:
        line = lines[i]
        if line.startswith(ATTACH_ID_PREFIX):
            blocks += 1
            out.append(line)                       # <script id=...>
            i += 1
            # header lines until the lone ">"
            while i < n and lines[i].strip() != ">":
                hdr = lines[i]
                m = __import__("re").match(r'(\s*)data-encoding="[^"]*"', hdr)
                if m:
                    hdr = f'{m.group(1)}data-encoding="{ENCODING}"'
                out.append(hdr)
                i += 1
            if i < n:                               # the ">" line
                out.append(lines[i]); i += 1
            # replace everything up to </script> with one payload line
            while i < n and lines[i].strip() != "</script>":
                i += 1
            out.append(payload)
            if i < n:
                out.append(lines[i]); i += 1        # </script>
            continue
        # title / version bump on short (non-payload) lines only
        if len(line) < 2000 and "1.4.1" in line:
            line = line.replace("1.4.1", "1.5.2")
        out.append(line)
        i += 1
    pathlib.Path(path).write_text("\n".join(out) + "\n")
    return {"blocks": blocks}

def main():
    raw = BUNDLE.read_bytes()
    payload = encode(raw)
    print(f"encoding={ENCODING}  bundle raw={len(raw)}B  payload={len(payload)} chars")
    for t in TARGETS:
        r = swap(t, payload)
        print(f"  {pathlib.Path(t).name}: rewrote {r['blocks']} attachment block(s)")
    if any(swap.__name__ for _ in []):  # no-op
        pass

if __name__ == "__main__":
    main()
