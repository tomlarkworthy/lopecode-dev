#!/bin/bash
set -e

echo "=== Full rebuild: OpenSBI + BusyBox + Kernel + Boot Image (rv32imafdc) ==="

# Phase 0: Rebuild OpenSBI with C extension
echo "=== Phase 0: Rebuilding OpenSBI with rv32imafdc ==="
apt-get update -qq
apt-get install -y -qq gcc-riscv64-linux-gnu gcc make bc flex bison libssl-dev python3

cd /src/opensbi
make distclean || true
make CROSS_COMPILE=riscv64-linux-gnu- \
     PLATFORM=generic \
     PLATFORM_RISCV_XLEN=32 \
     PLATFORM_RISCV_ISA=rv32imafdc_zifencei \
     PLATFORM_RISCV_ABI=ilp32d \
     FW_JUMP=y \
     FW_JUMP_ADDR=0x80400000 \
     FW_JUMP_FDT_ADDR=0x80200000 \
     FW_PIC=y \
     -j4

cp build/platform/generic/firmware/fw_jump.bin /src/fw_jump_pie_dtb.bin
echo "OpenSBI: $(ls -lh /src/fw_jump_pie_dtb.bin | awk '{print $5}')"
cd /src

# Phase 1: Build BusyBox
bash /src/build-busybox.sh

# Phase 2: Build kernel with new initramfs
bash /src/rebuild-kernel.sh

# Phase 3: Create combined boot image
echo "=== Creating combined boot image ==="
cd /src

# busybox-boot.bin = fw_jump_pie_dtb.bin (padded to 4MB) + Image
dd if=/dev/zero bs=1 count=4194304 of=busybox-boot.bin 2>/dev/null
dd if=fw_jump_pie_dtb.bin of=busybox-boot.bin conv=notrunc 2>/dev/null
cat Image >> busybox-boot.bin

echo "Boot image: $(ls -lh busybox-boot.bin | awk '{print $5}')"

# Gzip the boot image
gzip -9 -f busybox-boot.bin
echo "Compressed: $(ls -lh busybox-boot.bin.gz | awk '{print $5}')"

echo "=== All done ==="
