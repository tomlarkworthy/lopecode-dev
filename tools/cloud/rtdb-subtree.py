# Pull one top-level subtree out of a 569 MB Firebase dump without parsing the whole
# thing. The dump is one JSON object; scan bytes for "key": and brace-match from there.
import gzip, sys, json
path, key = sys.argv[1], sys.argv[2]
needle = ('"%s":' % key).encode()
buf = b""; depth = 0; started = False; out = bytearray(); pos = 0
with gzip.open(path, "rb") as f:
    while True:
        chunk = f.read(1 << 20)
        if not chunk: break
        if not started:
            buf += chunk
            i = buf.find(needle)
            if i < 0:
                buf = buf[-len(needle):]           # keep an overlap
                continue
            chunk = buf[i + len(needle):]; started = True
        for b in chunk:
            c = bytes([b])
            if not out and c in b" \t\r\n": continue
            out += c
            if c == b"{" or c == b"[": depth += 1
            elif c == b"}" or c == b"]":
                depth -= 1
                if depth == 0:
                    sys.stdout.buffer.write(bytes(out)); sys.exit(0)
print("not found", file=sys.stderr); sys.exit(1)
