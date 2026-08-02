# Convert an RGB/RGBA PNG to 8-bit grayscale using EXACTLY the luma weights the
# notebook's own frame loader uses:  gray = (r*77 + g*150 + b*29) >> 8
#
# That equality is the whole point. The loader greys every frame it draws, so if
# the stored file is already grey by the same formula the loader becomes a no-op
# (r==g==b==v gives (v*256)>>8 == v) and the bank's numbers cannot move. Any
# other formula -- sips, an average, Rec.709 -- would silently re-baseline the
# regression it is supposed to leave alone.
import sys, os, zlib, struct

def chunks(raw):
    off = 8
    while off < len(raw):
        ln = struct.unpack('>I', raw[off:off+4])[0]
        typ = raw[off+4:off+8]
        yield typ, raw[off+8:off+8+ln]
        off += 12 + ln

def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
    return a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)

def decode(raw):
    hdr = None; idat = b''
    for typ, data in chunks(raw):
        if typ == b'IHDR': hdr = struct.unpack('>IIBBBBB', data)
        elif typ == b'IDAT': idat += data
    w, h, depth, ctype, comp, filt, inter = hdr
    assert depth == 8 and inter == 0 and comp == 0, hdr
    bpp = {0:1, 2:3, 3:1, 4:2, 6:4}[ctype]
    stride = w * bpp
    data = bytearray(zlib.decompress(idat))
    out = bytearray(h * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        ft = data[pos]; pos += 1
        line = bytearray(data[pos:pos+stride]); pos += stride
        if ft == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i-bpp]) & 255
        elif ft == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                c = prev[i-bpp] if i >= bpp else 0
                line[i] = (line[i] + paeth(a, prev[i], c)) & 255
        elif ft != 0:
            raise ValueError('filter ' + str(ft))
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, ctype, bpp, bytes(out)

def encode_gray(w, h, gray):
    # adaptive filtering, minimum-sum-of-absolute-differences heuristic
    raw = bytearray()
    prev = bytearray(w)
    for y in range(h):
        line = gray[y*w:(y+1)*w]
        cands = []
        # 0 none
        cands.append((sum(line), 0, bytes(line)))
        # 1 sub
        s = bytearray(w)
        for i in range(w): s[i] = (line[i] - (line[i-1] if i else 0)) & 255
        cands.append((sum(min(v, 256-v) for v in s), 1, bytes(s)))
        # 2 up
        u = bytearray(w)
        for i in range(w): u[i] = (line[i] - prev[i]) & 255
        cands.append((sum(min(v, 256-v) for v in u), 2, bytes(u)))
        # 4 paeth
        pth = bytearray(w)
        for i in range(w):
            a = line[i-1] if i else 0
            c = prev[i-1] if i else 0
            pth[i] = (line[i] - paeth(a, prev[i], c)) & 255
        cands.append((sum(min(v, 256-v) for v in pth), 4, bytes(pth)))
        _, ft, best = min(cands)
        raw.append(ft); raw += best
        prev = bytearray(line)
    idat = zlib.compress(bytes(raw), 9)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 0, 0, 0, 0))
            + chunk(b'IDAT', idat) + chunk(b'IEND', b''))

def _pack_dir(d, w, h, unpack=False):
    # Archive mode: hexRig cases are stored as the exact bytes the detector was
    # handed (w*h 8-bit luma). That is the right thing for fidelity and the
    # wrong thing for a git checkout -- 691,200 bytes a frame, uncompressed.
    #
    # An 8-bit GRAYSCALE PNG is lossless: no subsampling, no colour management,
    # no quantisation, so it decodes back to the identical buffer. It is not
    # JPEG and the objection to JPEG does not apply. Filtered it lands at ~41%
    # of raw, against ~53% for plain zlib, because the row filters model the
    # smooth gradients in a photographed sheet.
    #
    # Every conversion is verified by decoding what was just written and
    # comparing to the source bytes. The original is only removed once that
    # passes, so a mismatch costs nothing.
    import glob
    src_ext, dst_ext = ('.png', '.gray') if unpack else ('.gray', '.png')
    files = sorted(glob.glob(os.path.join(d, '*' + src_ext)))
    if not files:
        print(f"no {src_ext} files in {d}"); return
    tot_in = tot_out = 0
    for f in files:
        raw = open(f, 'rb').read()
        if unpack:
            ww, hh, ct, bpp, gray = decode(raw)
            assert ct == 0 and bpp == 1, f"{f}: not 8-bit grayscale"
            out = gray
        else:
            assert len(raw) == w*h, f"{f}: {len(raw)} != {w}*{h}"
            out = encode_gray(w, h, raw)
            w2, h2, ct2, bpp2, back = decode(out)
            assert (w2, h2, ct2, bpp2) == (w, h, 0, 1) and back == raw, f"{f}: ROUND TRIP MISMATCH"
        dst = f[:-len(src_ext)] + dst_ext
        open(dst, 'wb').write(out)
        os.remove(f)
        tot_in += len(raw); tot_out += len(out)
        print(f"  {os.path.basename(f)} -> {os.path.basename(dst)}  "
              f"{len(raw):,} -> {len(out):,}  ({100*len(out)/len(raw):.0f}%)")
    print(f"{len(files)} file(s): {tot_in/1e6:.1f} MB -> {tot_out/1e6:.1f} MB "
          f"({100*tot_out/tot_in:.0f}%)" + ("" if unpack else "  [every round trip verified byte-exact]"))

if __name__ == '__main__':
    if sys.argv[1] in ('--pack', '--unpack'):
        _pack_dir(sys.argv[2], 960, 720, unpack=(sys.argv[1] == '--unpack'))
        raise SystemExit
    src = open(sys.argv[1], 'rb').read()
    w, h, ctype, bpp, px = decode(src)
    print(f"in: {w}x{h} ctype {ctype} bpp {bpp} {len(src):,} bytes")
    gray = bytearray(w*h)
    alpha_all_opaque = True
    already_gray = True
    for i in range(w*h):
        o = i*bpp
        r, g, b = px[o], px[o+1], px[o+2]
        if bpp == 4 and px[o+3] != 255: alpha_all_opaque = False
        if not (r == g == b): already_gray = False
        gray[i] = (r*77 + g*150 + b*29) >> 8
    print("alpha fully opaque:", alpha_all_opaque, "| already r==g==b:", already_gray)
    out = encode_gray(w, h, bytes(gray))
    print(f"out: {len(out):,} bytes  ({100*len(out)/len(src):.1f}% of original)")
    # prove the round trip: decoding what we wrote must give back `gray`
    w2, h2, ct2, bpp2, px2 = decode(out)
    assert (w2, h2, ct2, bpp2) == (w, h, 0, 1) and px2 == bytes(gray), "round trip mismatch"
    print("round trip verified: re-decode matches the intended luma exactly")
    open(sys.argv[2], 'wb').write(out)
