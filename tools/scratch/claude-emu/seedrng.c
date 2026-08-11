/* Credit entropy to the kernel CRNG so getrandom() doesn't block.
 * Needed in deterministic emulators (TinyEMU) where the kernel can't
 * self-init the CRNG from timing jitter. */
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <stdint.h>
/* from <linux/random.h>: _IOW('R', 0x03, int[2]) */
#define RNDADDENTROPY 0x40085203

int main(void) {
    struct { int entropy_count; int buf_size; unsigned char buf[256]; } rp;
    int fd = open("/dev/urandom", O_RDONLY);
    if (fd >= 0) { read(fd, rp.buf, sizeof rp.buf); close(fd); }
    /* mix in a little more variability */
    for (int i = 0; i < (int)sizeof rp.buf; i++) rp.buf[i] ^= (unsigned char)(i * 31 + 7);
    rp.buf_size = sizeof rp.buf;
    rp.entropy_count = sizeof rp.buf * 8; /* credit full 2048 bits */

    fd = open("/dev/random", O_RDWR);
    if (fd < 0) { perror("open /dev/random"); return 1; }
    for (int i = 0; i < 4; i++) {
        if (ioctl(fd, RNDADDENTROPY, &rp) < 0) { perror("RNDADDENTROPY"); close(fd); return 1; }
    }
    close(fd);
    return 0;
}
