#include <unistd.h>
#include <sys/reboot.h>

void _start(void) {
    const char msg[] = "\n\n=== Linux booted on lopecode RISC-V SBC! ===\n\n";
    write(1, msg, sizeof(msg) - 1);

    const char msg2[] = "Init running in userspace.\n";
    write(1, msg2, sizeof(msg2) - 1);

    /* Spin forever */
    for (;;)
        __asm__ volatile("wfi" ::: "memory");
}
