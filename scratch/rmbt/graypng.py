"""Encode raw luma as a true 8-bit greyscale PNG (colour type 0).

canvas.toBlob only emits RGBA, so a "greyscale" PNG from the browser still
carries four channels of duplicated data. This writes one. Adaptive filtering
picks, per row, the filter minimising the sum of absolute differences -- the
standard heuristic, and worth roughly a third on this material.
"""
import zlib, struct, sys

def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

def encode(luma, w, h, level=9):
    raw = bytearray()
    prev = bytearray(w)
    for y in range(h):
        line = luma[y * w:(y + 1) * w]
        best, bestsum = None, None
        for ftype in range(5):
            if ftype == 0:
                f = bytes(line)
            elif ftype == 1:
                f = bytes((line[x] - (line[x - 1] if x else 0)) & 0xFF for x in range(w))
            elif ftype == 2:
                f = bytes((line[x] - prev[x]) & 0xFF for x in range(w))
            elif ftype == 3:
                f = bytes((line[x] - (((line[x - 1] if x else 0) + prev[x]) >> 1)) & 0xFF for x in range(w))
            else:
                f = bytearray()
                for x in range(w):
                    a = line[x - 1] if x else 0
                    b = prev[x]
                    c = prev[x - 1] if x else 0
                    p = a + b - c
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    f.append((line[x] - pr) & 0xFF)
                f = bytes(f)
        # sum of absolute signed deviations
            s = sum(v if v < 128 else 256 - v for v in f)
            if bestsum is None or s < bestsum:
                bestsum, best = s, (ftype, f)
        raw.append(best[0])
        raw += best[1]
        prev = line
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(bytes(raw), level)) + chunk(b"IEND", b""))

if __name__ == "__main__":
    src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    luma = open(src, "rb").read()
    assert len(luma) == w * h, (len(luma), w * h)
    png = encode(luma, w, h)
    open(dst, "wb").write(png)
    print(f"{dst}  {len(png)}")
