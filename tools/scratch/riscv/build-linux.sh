#!/bin/bash
set -e

echo "=== Building minimal Linux for lopecode RISC-V SBC ==="

# Install build deps
apt-get update -qq
apt-get install -y -qq gcc-riscv64-linux-gnu make bc flex bison libssl-dev xz-utils cpio

# Build static init for initramfs
echo "--- Building init ---"
cd /src
riscv64-linux-gnu-gcc -march=rv32ima -mabi=ilp32 -nostdlib -static -o init init.S
mkdir -p initramfs
cp init initramfs/
cd initramfs
echo "init" | cpio -o -H newc > /src/initramfs.cpio
cd /src

# Extract kernel if not already done
if [ ! -d linux-6.1 ]; then
    echo "--- Extracting kernel ---"
    tar xf linux-6.1.tar.xz
fi

cd linux-6.1

# Clean previous build
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- clean || true

# Start with defconfig then apply our minimal config
echo "--- Configuring kernel ---"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- rv32_defconfig

# Override with our minimal settings
scripts/kconfig/merge_config.sh -m .config /src/linux-minimal.config
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig

# Set initramfs source
scripts/config --set-str INITRAMFS_SOURCE "/src/initramfs.cpio"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig

# Force-disable C extension AFTER olddefconfig (it keeps re-enabling it)
# Our emulator is rv32ima only — no compressed instruction support
sed -i 's/CONFIG_RISCV_ISA_C=y/# CONFIG_RISCV_ISA_C is not set/' .config

# Verify C extension is disabled
if grep -q "CONFIG_RISCV_ISA_C=y" .config; then
    echo "ERROR: CONFIG_RISCV_ISA_C is still enabled!"
    exit 1
fi
echo "Verified: CONFIG_RISCV_ISA_C is disabled"

echo "--- Building kernel ---"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- -j$(nproc) Image

echo "--- Done ---"
cp arch/riscv/boot/Image /src/Image
ls -la /src/Image
echo "Kernel built: /src/Image"
