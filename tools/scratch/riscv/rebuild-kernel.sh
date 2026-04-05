#!/bin/bash
set -e

echo "=== Rebuilding Linux kernel with BusyBox initramfs ==="

apt-get update -qq
apt-get install -y -qq gcc-riscv64-linux-gnu gcc make bc flex bison libssl-dev xz-utils cpio

cd /src

echo "--- Configuring kernel ---"
cd linux-6.1
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- rv32_defconfig
scripts/kconfig/merge_config.sh -m .config /src/linux-minimal.config
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig

# Set initramfs source to our busybox cpio
scripts/config --set-str INITRAMFS_SOURCE "/src/initramfs-busybox.cpio"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig

# Disable C extension (our emulator is rv32ima only)
sed -i 's/CONFIG_RISCV_ISA_C=y/# CONFIG_RISCV_ISA_C is not set/' .config

if grep -q "CONFIG_RISCV_ISA_C=y" .config; then
    echo "ERROR: CONFIG_RISCV_ISA_C is still enabled!"
    exit 1
fi
echo "Verified: CONFIG_RISCV_ISA_C is disabled"

echo "--- Cleaning previous build ---"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- clean || true

echo "--- Building kernel ---"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- -j4 Image

echo "--- Done ---"
cp arch/riscv/boot/Image /src/Image
ls -la /src/Image
echo "Kernel size: $(ls -lh /src/Image | awk '{print $5}')"
echo "=== Kernel build complete ==="
