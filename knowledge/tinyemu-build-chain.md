# TinyEMU Build Chain

## Current State (Modernized, April 2026)

The linux-emu notebook ships modernized assets based on the [container2wasm](https://github.com/aspect-build/container2wasm) project's proven approach:

| Asset | Size (gzip) | Source |
|-------|-------------|--------|
| `bbl64.bin` | 22 KB | riscv-pk @ commit 7e9b671c with HTIF patches |
| `kernel.bin` | 2.2 MB | Linux 6.1.125 with container2wasm's `linux_rv64_config` |
| `initramfs.bin` | 159 KB | musl-static BusyBox 1.36.1 + init script (cpio+gzip) |
| `riscvemu64-wasm.wasm` | 78 KB | TinyEMU 2019-12-21 (unchanged) |
| `riscvemu64-wasm.js` | 28 KB | TinyEMU 2019-12-21 (unchanged) |
| `tinyemu.cfg` | <1 KB | initramfs config with networking |

**Total attachment size: ~2.5 MB compressed** (down from 4.5 MB with the old ext2 approach)

### VM Config

```javascript
{
    version: 1,
    machine: "riscv64",
    memory_size: 128,
    bios: "bbl64.bin",
    kernel: "kernel.bin",
    initrd: "initramfs.bin",
    cmdline: "console=hvc0 rdinit=/init virtio_net.napi_tx=false",
    eth0: { driver: "user" },
}
```

Key cmdline flags:
- `console=hvc0` — virtio console via SBI (TinyEMU's console mechanism)
- `rdinit=/init` — boot from initramfs
- `virtio_net.napi_tx=false` — prevents TX timeout watchdog (JS networking is async)

## Architecture

```
Browser
├── Main thread
│   ├── tinyemu_terminal (UI: boot button, terminal pre, input)
│   ├── tinyemu_worker (factory: loads assets, creates workers)
│   └── fetch relay (proxies cross-origin requests for worker)
└── Web Worker
    ├── TinyEMU WASM (riscv64 emulator)
    ├── XHR mock (serves assets from blob URLs)
    └── JS networking stack
        ├── ARP responder
        ├── DHCP server
        ├── DNS-over-HTTPS (Cloudflare 1.1.1.1)
        └── TCP HTTP proxy (10.0.2.2:3128)
```

## Build Scripts

All build scripts are in `tools/scratch/riscv/` and run in Docker containers:

| Script | Output | Description |
|--------|--------|-------------|
| `build-modern-bbl.sh` | `bbl.bin` | BBL from riscv-pk with HTIF patches |
| `build-rv64-kernel-6.1.sh` | `kernel.bin` | Linux 6.1 with container2wasm config |
| `build-busybox-musl.sh` | `initramfs.bin` | musl BusyBox initramfs |

Build outputs go to `tools/scratch/riscv/out-rv64/`.

### 1. BBL (Berkeley Boot Loader)

The bootloader must be built from [riscv-pk](https://github.com/riscv-software-src/riscv-pk) with HTIF address patches. TinyEMU expects fixed HTIF addresses at `0x40008000`/`0x40008008`, but riscv-pk normally uses ELF `.htif` section addresses.

```bash
docker run --rm -v $PWD/out-rv64:/out -v $PWD/build-modern-bbl.sh:/build.sh \
  ubuntu:22.04 bash /build.sh
```

**Critical patches in `machine/htif.c`:**
```c
// Before (original):
volatile uint64_t tohost __attribute__((section(".htif")));
volatile uint64_t fromhost __attribute__((section(".htif")));

// After (for TinyEMU):
#define tohost *(uint64_t*)0x40008000
#define fromhost *(uint64_t*)0x40008008
```

Uses riscv-pk commit `7e9b671c0415dfd7b562ac934feb9380075d4aa2` (same as container2wasm).

### 2. Kernel (Linux 6.1)

Built with container2wasm's proven `linux_rv64_config` plus initramfs support:

```bash
docker run --rm \
  -v $PWD/out-rv64:/out \
  -v $PWD/build-rv64-kernel-6.1.sh:/build.sh \
  -v /tmp/container2wasm/config/tinyemu:/config \
  ubuntu:22.04 bash /build.sh
```

Key config additions on top of container2wasm's base:
- `CONFIG_BLK_DEV_INITRD=y`
- `CONFIG_INITRAMFS_COMPRESSION_GZIP=y`
- `CONFIG_RD_GZIP=y`

Critical configs that must be enabled:
- `CONFIG_VIRTIO_CONSOLE=y`, `CONFIG_HVC_DRIVER=y` — console output
- `CONFIG_VIRTIO_MMIO=y` — device discovery
- `CONFIG_VIRTIO_NET=y` — networking
- `CONFIG_RISCV_SBI=y`, `CONFIG_RISCV_SBI_V01=y` — SBI calls for BBL
- `CONFIG_DEVTMPFS=y` — `/dev` population

### 3. Initramfs (musl BusyBox)

**Must use musl, not glibc.** glibc's static RISC-V binaries use the `rdtime` CSR instruction (`0xC01`) in user mode for `clock_gettime`. TinyEMU traps this as an illegal instruction (SIGILL). musl uses the `gettimeofday` syscall instead.

```bash
docker run --rm -v $PWD/out-rv64:/out -v $PWD/build-busybox-musl.sh:/build.sh \
  ubuntu:22.04 bash /build.sh
```

Uses `riscv64-linux-musl-cross` toolchain from [musl.cc](https://musl.cc). BusyBox is built with a minimal config (~40 applets including ash, ls, cat, wget, ifconfig, route, grep, sed, find).

The initramfs `/init` script:
```sh
#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs devtmpfs /dev
hostname tinyemu
echo ""
echo "Boot complete."
exec /bin/sh
```

## Key Discoveries & Gotchas

### HTIF Address Mismatch
TinyEMU hardcodes HTIF at `0x40008000`/`0x40008008`. Standard riscv-pk places them in an ELF `.htif` section at a different address. Without the `#define` patch, BBL starts but console I/O silently fails — no kernel output appears.

### rdtime CSR in User Mode
glibc's RISC-V `clock_gettime` uses `rdtime` (CSR `0xC01`) directly from user space. TinyEMU doesn't allow this, causing `SIGILL` on the first glibc time call (e.g., `wget`, `ls -l`). The fix is to use musl, which uses `gettimeofday` syscall instead.

### virtio_net TX Timeout
Linux 6.1's virtio_net driver has a TX watchdog that fires after 5 seconds. The JS networking stack is inherently async (fetch/promise-based), so the VM's TX queue doesn't drain fast enough. Adding `virtio_net.napi_tx=false` to the kernel cmdline disables the watchdog.

### Linux 6.6+ Doesn't Work
Newer kernels (6.6+) failed to produce console output even with the modern BBL. Linux 6.1 is the proven version used by container2wasm. The exact issue wasn't diagnosed — likely a boot protocol or device tree incompatibility.

### CORS Limitations
The JS HTTP proxy uses the browser's `fetch()` API, so it's subject to CORS. Sites without `Access-Control-Allow-Origin` headers (like google.com) return 502. CORS-enabled APIs (like httpbin.org) work fine.

## Previous State (JSLinux 2018)

The original notebook used Bellard's stock JSLinux assets from 2018:
- BBL from riscv-pk @ ac2c910b (deprecated)
- Linux ~4.15 with custom patches (`CONFIG_BLK_DEV_INITRD=n`)
- Buildroot ext2 rootfs with dynamic BusyBox + glibc (4 MB)
- Block-splitting code in the worker to serve ext2 chunks via XHR mock

The modernization eliminated the ext2 rootfs and block-splitting code, reduced total size by ~45%, upgraded to a mainstream kernel, and fixed illegal instruction crashes.

## TinyEMU Exported Functions

The WASM module exports these functions (used by the worker shim):

```
_console_queue_char(charCode)  — inject keystroke
_vm_start(cfgUrl)              — start VM from config URL
_fs_import_file(path, buf, len) — import file into 9p filesystem
_net_write_packet(buf, len)    — inject network packet
_net_set_carrier(state)        — set network link state
_te_cpu_get_pc(ptr)            — get CPU program counter (custom patch)
_te_cpu_get_priv(ptr)          — get privilege mode (custom patch)
_te_cpu_get_insn_counter(ptr)  — get instruction counter (custom patch)
```

The `_te_cpu_*` functions are custom additions for the mode timeline visualization. If rebuilding TinyEMU, these patches need to be preserved.
