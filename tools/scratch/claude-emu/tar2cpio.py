#!/usr/bin/env python3
"""docker-export tar -> gzipped newc cpio initramfs, injecting /init + /dev nodes."""
import tarfile, sys, gzip, io, struct

src, dst = sys.argv[1], sys.argv[2]

out = io.BytesIO()
ino = [1]

def entry(name, mode, data=b"", nlink=1, rdev=(0, 0)):
    ino[0] += 1
    nameb = name.encode() if isinstance(name, str) else name
    namesize = len(nameb) + 1
    hdr = (
        b"070701"
        + f"{ino[0]:08x}".encode()
        + f"{mode:08x}".encode()
        + b"00000000" * 2          # uid gid
        + f"{nlink:08x}".encode()
        + b"00000000"              # mtime
        + f"{len(data):08x}".encode()
        + b"00000000" * 2          # devmajor devminor
        + f"{rdev[0]:08x}".encode()
        + f"{rdev[1]:08x}".encode()
        + f"{namesize:08x}".encode()
        + b"00000000"              # check
    )
    out.write(hdr)
    out.write(nameb + b"\x00")
    out.write(b"\x00" * ((-(110 + namesize)) % 4))
    out.write(data)
    out.write(b"\x00" * ((-len(data)) % 4))

INIT = """#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs devtmpfs /dev
hostname claude-emu
export HOME=/root TERM=vt100
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# Credit entropy so node's getrandom() doesn't block for minutes: a
# deterministic emulator can't self-init the CRNG from timing jitter.
/sbin/seedrng 2>/dev/null && echo "[init] entropy seeded"
echo ""
echo "=== claude-emu: Alpine riscv64 + Node $(node --version 2>/dev/null) ==="
echo "Try: claude --version"
echo ""
if [ -c /dev/hvc0 ]; then
  exec setsid sh -c 'exec sh </dev/hvc0 >/dev/hvc0 2>&1'
fi
exec /bin/sh
"""

SEEDRNG = open("seedrng", "rb").read()

# injected entries first
entry("init", 0o100755, INIT.encode())
entry("sbin", 0o040755)
entry("sbin/seedrng", 0o100755, SEEDRNG)
entry("proc", 0o040555)
entry("sys", 0o040555)
entry("dev", 0o040755)
entry("dev/console", 0o020622, rdev=(5, 1))
entry("dev/null", 0o020666, rdev=(1, 3))
entry("dev/zero", 0o020666, rdev=(1, 5))
entry("dev/tty", 0o020666, rdev=(5, 0))
entry("root", 0o040700)
entry("tmp", 0o041777)

skip_prefixes = ("dev/", "proc/", "sys/", "tmp/")
skip_exact = {".dockerenv", "dockerenv", "ir.bin", "dev", "proc", "sys", "tmp", "init", "root", "."}

tf = tarfile.open(src)
n = 0
for m in tf:
    name = m.name
    if name.startswith("./"):
        name = name[2:]
    name = name.lstrip("/")
    if not name or name in skip_exact or name.startswith(skip_prefixes):
        continue
    if m.issym():
        entry(name, 0o120777, m.linkname.encode())
    elif m.isdir():
        entry(name, 0o040000 | (m.mode & 0o7777))
    elif m.isfile():
        data = tf.extractfile(m).read()
        entry(name, 0o100000 | (m.mode & 0o7777), data)
    elif m.islnk():  # hardlink -> duplicate content
        target = m.linkname.lstrip("./")
        data = tf.extractfile(tf.getmember(m.linkname)).read()
        entry(name, 0o100000 | (m.mode & 0o7777), data)
    else:
        continue
    n += 1
entry("TRAILER!!!", 0)

raw = out.getvalue()
with open(dst, "wb") as f:
    f.write(gzip.compress(raw, 6))
print(f"{n} tar entries, cpio {len(raw)/1e6:.1f} MB -> {dst} {len(gzip.compress(raw,6))/1e6:.1f} MB gz")
