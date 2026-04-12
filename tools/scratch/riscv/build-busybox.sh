#!/bin/bash
set -e

echo "=== Building BusyBox for lopecode RISC-V SBC (rv32imafdc, static, musl+clang) ==="

apt-get update -qq
apt-get install -y -qq clang lld llvm binutils-riscv64-linux-gnu gcc make wget xz-utils cpio bzip2 file bc flex bison libssl-dev rsync

# Ensure llvm tools are available without version suffix
for tool in llvm-ar llvm-ranlib llvm-nm llvm-objdump llvm-readelf llvm-strip; do
    if ! command -v $tool > /dev/null 2>&1; then
        versioned=$(ls /usr/bin/${tool}-* 2>/dev/null | head -1)
        [ -n "$versioned" ] && ln -sf "$versioned" /usr/local/bin/$tool
    fi
done

BUSYBOX_VERSION=1.36.1
ARCH_FLAGS="--target=riscv32-linux-musl -march=rv32imafdc -mabi=ilp32d"
MUSL_VERSION=1.2.5
SYSROOT=/opt/musl-rv32

cd /src

# Step 1: Build musl libc using clang targeting rv32ima
rm -rf ${SYSROOT}  # Force rebuild for new ABI
if [ ! -f ${SYSROOT}/lib/libc.a ]; then
    echo "--- Building musl libc for rv32imafdc/ilp32d (via clang) ---"
    if [ ! -f musl-${MUSL_VERSION}.tar.gz ]; then
        wget -q https://musl.libc.org/releases/musl-${MUSL_VERSION}.tar.gz
    fi
    rm -rf musl-${MUSL_VERSION}
    tar xf musl-${MUSL_VERSION}.tar.gz
    cd musl-${MUSL_VERSION}

    # Use clang as C compiler — it can target rv32 natively
    CC="clang ${ARCH_FLAGS}" \
    AR=llvm-ar \
    RANLIB=llvm-ranlib \
    ./configure \
        --target=riscv32-linux-musl \
        --prefix=${SYSROOT} \
        --disable-shared \
        --enable-static

    make -j$(nproc)
    make install
    cd /src
fi
echo "musl: $(ls ${SYSROOT}/lib/libc.a)"

# Step 2: Install Linux kernel headers
if [ ! -f ${SYSROOT}/include/linux/kd.h ]; then
    echo "--- Installing kernel headers ---"
    cd /src/linux-6.1
    make ARCH=riscv INSTALL_HDR_PATH=${SYSROOT} headers_install
    cd /src
fi
echo "kernel headers: $(ls ${SYSROOT}/include/linux/kd.h)"

# Step 3: Build BusyBox using clang
echo "--- Configuring BusyBox ---"
if [ ! -d busybox-${BUSYBOX_VERSION} ]; then
    if [ ! -f busybox-${BUSYBOX_VERSION}.tar.bz2 ]; then
        wget -q https://busybox.net/downloads/busybox-${BUSYBOX_VERSION}.tar.bz2
    fi
    tar xf busybox-${BUSYBOX_VERSION}.tar.bz2
fi

# Create clang wrapper script for busybox cross-compile
GCC_INTERNAL=$(clang ${ARCH_FLAGS} -print-resource-dir)/include
cat > /usr/local/bin/rv32-gcc << WRAPPER
#!/bin/bash
exec clang --target=riscv32-linux-musl -march=rv32imafdc -mabi=ilp32d \\
    --sysroot=${SYSROOT} \\
    -nostdinc \\
    -isystem ${SYSROOT}/include \\
    -isystem ${GCC_INTERNAL} \\
    "\$@"
WRAPPER
chmod +x /usr/local/bin/rv32-gcc

# Symlinks for binutils (busybox needs ar, strip, etc.)
for tool in ar nm objcopy objdump ranlib readelf strip; do
    ln -sf $(which llvm-$tool 2>/dev/null || echo /usr/bin/riscv64-linux-gnu-$tool) /usr/local/bin/rv32-$tool
done
# ld needs to be the gcc wrapper (for linking with crt files)
ln -sf /usr/local/bin/rv32-gcc /usr/local/bin/rv32-ld

echo "Test compile:"
echo 'int main(){return 42;}' > /tmp/test.c
rv32-gcc -c -o /tmp/test.o /tmp/test.c
file /tmp/test.o

cd busybox-${BUSYBOX_VERSION}
make distclean || true
make ARCH=riscv CROSS_COMPILE=rv32- defconfig

# Patch config
sed -i 's/# CONFIG_STATIC is not set/CONFIG_STATIC=y/' .config
sed -i 's|CONFIG_CROSS_COMPILER_PREFIX=""|CONFIG_CROSS_COMPILER_PREFIX="rv32-"|' .config
# Use clang's -fuse-ld=lld and link with musl
# Build support library — softfloat.c provides builtins that no standard
# library ships for rv32 ilp32d: quad-precision (128-bit long double) ops,
# 64-bit integer division/shifts, and double/single float fallbacks.
# compiler-rt can't help here — clang doesn't support __int128 on rv32,
# so all quad-precision implementations compile to empty objects.
echo "--- Building soft-float library ---"
rv32-gcc -O2 -c -o /tmp/softfloat.o /src/softfloat.c
llvm-ar rcs ${SYSROOT}/lib/libsoftfloat.a /tmp/softfloat.o
echo "softfloat lib: $(ls -la ${SYSROOT}/lib/libsoftfloat.a)"

# Create empty crtbeginT.o and crtend.o stubs (normally from GCC, not needed for musl)
echo "" | rv32-gcc -x c -c -o ${SYSROOT}/lib/crtbeginT.o -
echo "" | rv32-gcc -x c -c -o ${SYSROOT}/lib/crtend.o -

# -nodefaultlibs: keep crt from sysroot, skip -lgcc
# Put -lc in LDFLAGS (not LDLIBS) since busybox filters LDLIBS through a link test
sed -i "s|CONFIG_EXTRA_LDFLAGS=\"\"|CONFIG_EXTRA_LDFLAGS=\"-fuse-ld=lld --sysroot=${SYSROOT} -B${SYSROOT}/lib -nodefaultlibs -static -L${SYSROOT}/lib -Wl,--start-group -lc -lsoftfloat -Wl,--end-group\"|" .config
# Disable hwclock
sed -i 's/CONFIG_HWCLOCK=y/# CONFIG_HWCLOCK is not set/' .config
# Enable PREFER_APPLETS so ash runs applets in-process (no exec).
sed -i 's/# CONFIG_FEATURE_PREFER_APPLETS is not set/CONFIG_FEATURE_PREFER_APPLETS=y/' .config
sed -i 's/# CONFIG_FEATURE_SH_STANDALONE is not set/CONFIG_FEATURE_SH_STANDALONE=y/' .config
# Disable BB_GLOBAL_CONST — clang on RISC-V caches the old (NULL)
# ptr_to_globals value in a register despite BusyBox's inline-asm
# barrier workaround. Removing 'const' forces the compiler to always
# reload ptr_to_globals from memory after SET_PTR_TO_GLOBALS.
# See include/libbb.h line 379 — BusyBox documents this flag for
# exactly this class of "weird arches or toolchains" issue.
sed -i 's|CONFIG_EXTRA_CFLAGS=""|CONFIG_EXTRA_CFLAGS="-DBB_GLOBAL_CONST="|' .config

yes "" | make ARCH=riscv oldconfig > /dev/null 2>&1

echo "--- Building BusyBox ---"
make ARCH=riscv -j$(nproc) 2>&1

echo "--- Verifying binary ---"
file busybox
llvm-readelf -h busybox | grep -E "Class|Machine|Flags" || riscv64-linux-gnu-readelf -h busybox | grep -E "Class|Machine|Flags"
ls -la busybox

echo "--- Installing BusyBox ---"
rm -rf /src/initramfs-busybox
make ARCH=riscv CONFIG_PREFIX=/src/initramfs-busybox install

echo "--- Building initramfs ---"
cd /src/initramfs-busybox
mkdir -p dev proc sys tmp etc etc/init.d

cat > init << 'INIT'
#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev 2>/dev/null

echo
echo "=== Linux booted on lopecode RISC-V SBC! ==="
echo "Welcome to BusyBox shell."
echo

exec /bin/sh
INIT
chmod +x init

# Create cpio with device nodes via gen_init_cpio
gcc -o /tmp/gen_init_cpio /src/linux-6.1/usr/gen_init_cpio.c
cat > /tmp/devnodes.list << 'LIST'
nod /dev/console 0622 0 0 c 5 1
nod /dev/null 0666 0 0 c 1 3
nod /dev/zero 0666 0 0 c 1 5
nod /dev/urandom 0444 0 0 c 1 9
nod /dev/ttyS0 0666 0 0 c 4 64
LIST

find . | cpio -o -H newc > /src/initramfs-busybox.cpio
/tmp/gen_init_cpio /tmp/devnodes.list >> /src/initramfs-busybox.cpio

ls -la /src/initramfs-busybox.cpio

echo "=== Done ==="
echo "Busybox: $(file /src/initramfs-busybox/bin/busybox)"
echo "Busybox size: $(ls -lh /src/initramfs-busybox/bin/busybox | awk '{print $5}')"
echo "Initramfs size: $(ls -lh /src/initramfs-busybox.cpio | awk '{print $5}')"
