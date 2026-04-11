# RISC-V Linux SBC — Build Artifacts

Browser-based RISC-V emulator running Linux with BusyBox, embedded in a
lopecode Observable notebook.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (JavaScript)                           │
│  ┌───────────────────────────────────────────┐  │
│  │ lopecode Observable notebook               │  │
│  │ @tomlarkworthy/linux-sbc                   │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │ RISC-V Emulator (rv32imafd)          │  │  │
│  │  │  CPU: 32-bit, M/S/U privilege modes  │  │  │
│  │  │  MMU: Sv32 two-level page tables     │  │  │
│  │  │  FPU: F+D extensions (JS float64)    │  │  │
│  │  │  Devices: UART, CLINT, PLIC          │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │       │ boots                              │  │
│  │  ┌────▼─────────────────────────────────┐  │  │
│  │  │ OpenSBI (M-mode firmware)            │  │  │
│  │  │  → Linux 6.1 kernel (S-mode)        │  │  │
│  │  │    → BusyBox initramfs (U-mode)     │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Current State (2026-04-11)

**Working:**
- Full Linux boot to BusyBox shell prompt
- Basic shell commands (ls, cat, echo, pwd, etc.)
- Integer arithmetic: `printf '%d' 42` works
- Floating point: `printf '%f' 1.0` → `1.000000`
- Floating point: `printf '%f' 3.14` → `3.140000`

**Known Issues:**
- `printf '%f' 0.5` → `0.499999` (should be `0.500000`) — ~2 ULP precision
  loss in quad-precision multiply, see softfloat.c header for details
- Emulator's FMADD.D uses JS `a * b + c` which is NOT a true fused
  multiply-add (JS may round the intermediate product)
- Diagnostic trace code (window._fpuTrace, window._storeFaultLog) still
  present in the notebook emulator — should be removed for production

## Build Scripts

All scripts run inside a `debian:bookworm` Docker container with `/src`
mounted to this directory.

| Script | Purpose |
|--------|---------|
| `build-busybox.sh` | Full toolchain: builds musl libc, softfloat, BusyBox, initramfs |
| `rebuild-kernel.sh` | Rebuilds Linux kernel with the BusyBox initramfs |
| `rebuild-all.sh` | Runs both above + creates combined boot image |
| `replace-attachment.sh` | Injects boot image into notebook HTML as base64 attachment |
| `build-shell.sh` | Legacy: builds minimal bare-metal shell (pre-BusyBox) |
| `build-linux.sh` | Legacy: original kernel build script |

### Quick rebuild cycle

```bash
# Full rebuild from scratch (slow, ~5 min):
docker run --rm -v "$PWD:/src" -w /src debian:bookworm bash /src/rebuild-all.sh

# Just rebuild softfloat + BusyBox + initramfs (reuses existing musl/kernel headers):
docker run --rm -v "$PWD:/src" -w /src debian:bookworm bash /src/build-busybox.sh

# Just rebuild kernel (reuses existing initramfs):
docker run --rm -v "$PWD:/src" -w /src debian:bookworm bash /src/rebuild-kernel.sh

# Inject into notebook:
bash replace-attachment.sh \
  ../../lopebooks/notebooks/@tomlarkworthy_linux-sbc.html \
  busybox-boot.bin.gz
```

## Key Files

| File | Description |
|------|-------------|
| `softfloat.c` | Compiler-rt builtins for rv32 ilp32d (see file header for full docs) |
| `linux-minimal.config` | Kernel config fragment (rv32imafd, no SMP, no networking) |
| `fw_jump_pie_dtb.bin` | OpenSBI M-mode firmware (prebuilt, padded to 4MB in boot image) |
| `busybox-boot.bin.gz` | Combined boot image: OpenSBI + Linux kernel + BusyBox initramfs |
| `notes.txt`, `notes-2.txt` | Development diary covering the full build-up from scratch |

## The Platform Problem

This project targets **rv32 ilp32d** which is an unusual combination:

- **rv32** (32-bit RISC-V) — most RISC-V Linux work targets rv64
- **ilp32d** ABI — `long double` is 128-bit IEEE 754 quad precision
- **clang** cross-compiler — GCC has better rv32 support
- **static musl libc** — works but musl's `strtod` needs full quad precision

The 128-bit `long double` is the root cause of most pain. The quad-precision
builtins (`__multf3`, `__addtf3`, etc.) aren't available prebuilt for this
target, so `softfloat.c` provides hand-rolled implementations.

### Recommended Path Forward: Switch to rv64

Switching the emulator to rv64 (`lp64d` ABI) would eliminate `softfloat.c`
entirely. The tradeoffs:

**Cost:**
- Rewrite the JS emulator's register file from 32-bit to 64-bit
- JavaScript has no native 64-bit integers — need BigInt (slow, ~10-50x) or
  paired Int32 hi/lo (fast but verbose)
- Page table changes from Sv32 (2-level) to Sv39 (3-level)
- Some new instructions: W-suffix variants (ADDW, SLLW, etc.)

**Benefit:**
- Entire `softfloat.c` goes away — use prebuilt libgcc or compiler-rt
- Mainstream toolchain: everything just works
- Better kernel/userspace support (rv64 is the primary RISC-V Linux target)
- Larger ecosystem of prebuilt binaries and packages

The emulator is ~1500 lines of JS. The rv64 conversion would touch the
register file, ALU operations, memory addressing, and page table walker —
estimated ~300-500 lines changed. Likely less total effort than continuing
to debug quad-precision edge cases.
