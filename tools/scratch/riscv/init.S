# Minimal /init for initramfs — prints message then spins
# Built as static RV32IMA binary

.section .text
.globl _start
_start:
    # write(1, msg, 48) — syscall NR_write = 64
    li      a7, 64          # syscall: write
    li      a0, 1           # fd: stdout
    la      a1, msg         # buffer
    li      a2, 48          # length of msg
    ecall

    # Spin forever
1:  wfi
    j       1b

.section .rodata
msg:
    .ascii "\n\n=== Linux booted on lopecode RISC-V SBC! ===\n\n"
    # exactly 48 bytes
