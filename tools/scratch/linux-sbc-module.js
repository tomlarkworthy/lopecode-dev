const _caemsf = function _doc_architecture(md) {return (md`# RISC-V Linux BusyBox Single Board Computer

A complete RISC-V system emulator running in the browser, capable of booting Linux 6.1 with a BusyBox userspace shell. The emulator implements **rv32imafdc** — the 32-bit RISC-V base integer ISA with multiply, atomic, single/double floating-point, and compressed extensions.

## Architecture

| Component | Address | Description |
|-----------|---------|-------------|
| **OpenSBI** | \`0x80000000\` | M-mode firmware, SBI v3.0, trap delegation |
| **DTB** | \`0x80200000\` | Device tree blob (generated at runtime) |
| **Linux kernel** | \`0x80400000\` | Linux 6.1 Image with embedded initramfs |
| **UART** | \`0x10000000\` | ns16550a serial console |
| **CLINT** | \`0x02000000\` | Core-local interruptor (timer + IPI) |
| **PLIC** | \`0x0C000000\` | Platform-level interrupt controller |
| **RAM** | \`0x80000000\` | 48 MB |

The boot flow: CPU starts in M-mode at \`0x80000000\` → OpenSBI initializes, delegates traps to S-mode, jumps to \`0x80400000\` → Linux kernel boots, enables Sv32 paging, mounts initramfs → BusyBox \`/init\` runs, drops to interactive shell.

## C (Compressed) Extension

The emulator supports RV32C compressed instructions — 16-bit encodings of common operations. The \`decompress\` cell expands them to 32-bit equivalents before decode/execute. This allows running firmware compiled with \`-march=rv32imafdc\` (the standard "gc" profile), eliminating the need for special \`-march=rv32ima\` compiler flags.
`);};
const _edv3hy = function _firmware(Inputs){return(
Inputs.select(["Busybox", "OpenSBI"], { label: "firmware" })
)};
const _mt1 = function _mode_timeline() {
    // Sliding window mode timeline — 1 minute, canvas strip
    // WFI/idle = transparent (alpha), active modes = opaque color
    // Colors in linear RGB for perceptual blending
    const MODE_COLORS = {
        0: [0.031, 0.533, 0.094],  // User — green
        1: [0.737, 0.471, 0.008],  // Supervisor — amber
        3: [0.675, 0.031, 0.031]   // Machine — red
    };
    const W = 600, H = 24;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'width:100%;height:24px;border-radius:4px;display:block;image-rendering:pixelated;background:#111';
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(W, H);
    const px = imgData.data;
    const SAMPLES = W;
    const ring = new Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) ring[i] = null;
    let writeIdx = 0;
    let lastHist = null;
    const toSRGB = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    const sample = (cpu) => {
        if (!cpu.modeHist) return;
        const h = cpu.modeHist;
        if (!lastHist) {
            lastHist = [h[0], h[1], h[2], h[3]];
            return;
        }
        const d = [h[0] - lastHist[0], h[1] - lastHist[1], h[2] - lastHist[2], h[3] - lastHist[3]];
        lastHist = [h[0], h[1], h[2], h[3]];
        const total = d[0] + d[1] + d[2] + d[3];
        if (total === 0) return;
        ring[writeIdx % SAMPLES] = [d[0] / total, d[1] / total, d[2] / total, d[3] / total];
        writeIdx++;
        render();
    };
    const render = () => {
        for (let x = 0; x < W; x++) {
            const idx = (writeIdx - W + x + SAMPLES * W) % SAMPLES;
            const s = ring[idx];
            let sr = 0, sg = 0, sb = 0, barH = 0;
            if (s) {
                // Active proportion = everything except WFI (index 2)
                const active = s[0] + s[1] + s[3];
                // Bar height = fraction of non-idle cycles
                barH = Math.round(active * H);
                // Blend active mode colors (renormalized to exclude WFI)
                let r = 0, g = 0, b = 0;
                if (active > 0) {
                    for (const m of [0, 1, 3]) {
                        const w = s[m] / active;
                        const col = MODE_COLORS[m];
                        r += w * col[0];
                        g += w * col[1];
                        b += w * col[2];
                    }
                }
                sr = Math.round(toSRGB(r) * 255);
                sg = Math.round(toSRGB(g) * 255);
                sb = Math.round(toSRGB(b) * 255);
            }
            // Draw bar from bottom up
            for (let y = 0; y < H; y++) {
                const off = (y * W + x) * 4;
                const inBar = y >= (H - barH);
                px[off] = inBar ? sr : 0;
                px[off + 1] = inBar ? sg : 0;
                px[off + 2] = inBar ? sb : 0;
                px[off + 3] = inBar ? 255 : 0;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };
    // Legend
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:12px;font:11px monospace;color:#999;margin-top:2px;justify-content:center';
    const cols = { 'M-mode': '#ac0808', 'S-mode': '#bc7802', 'User': '#089018', 'idle': 'transparent' };
    for (const [label, color] of Object.entries(cols)) {
        const s = document.createElement('span');
        const bg = color === 'transparent' ? 'background:#111;border:1px solid #444' : `background:${color}`;
        s.innerHTML = `<span style="display:inline-block;width:10px;height:10px;${bg};border-radius:2px;vertical-align:middle;margin-right:3px"></span>${label}`;
        legend.appendChild(s);
    }
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:6px';
    wrap.appendChild(canvas);
    wrap.appendChild(legend);
    render();
    return { element: wrap, sample, reset() { ring.fill(null); writeIdx = 0; lastHist = null; render(); } };
};
const _12tjadh = function _continuous_run(terminal_display,uart_state,_uart_buffer,advance,cpu,mem,clint,tickTimer,memRead,memWrite,execute,decode,plic_state,initSystem,mode_timeline)
{
    const div = document.createElement('div');
    // Controls
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.alignItems = 'center';
    controls.style.marginBottom = '8px';
    const bootBtn = document.createElement('button');
    bootBtn.textContent = '\u23FB Boot & Run';
    bootBtn.style.cssText = 'padding:6px 16px;font-size:14px;font-weight:bold;background:#4a4;color:#fff;border:none;border-radius:4px;cursor:pointer';
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = '\u23F8 Pause';
    pauseBtn.style.cssText = 'padding:6px 12px;font-size:14px;background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer;display:none';
    const status = document.createElement('span');
    status.style.cssText = 'font-family:monospace;font-size:13px;color:#aaa';
    status.textContent = 'stopped';
    controls.appendChild(bootBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(status);
    div.appendChild(controls);
    // Mode timeline strip
    div.appendChild(mode_timeline.element);
    // Terminal display
    div.appendChild(terminal_display.element);
    // Wire input to UART rx
    const rx = uart_state.rx;
    terminal_display.input.onkeydown = e => {
        if (e.key === 'Enter') {
            const text = terminal_display.input.value;
            for (const ch of text)
                rx.push(ch.charCodeAt(0));
            rx.push(10);
            terminal_display.input.value = '';
            e.preventDefault();
        }
    };
    // Run loop
    let running = false;
    let rafId = null;
    let cyclesPerFrame = 50000;
    const TARGET_MS = 12;
    const pause = () => {
        running = false;
        if (rafId)
            cancelAnimationFrame(rafId);
        rafId = null;
        pauseBtn.textContent = '\u25B6 Resume';
        pauseBtn.style.background = '#4a4';
        terminal_display.updateTerm(_uart_buffer);
    };
    const resume = () => {
        running = true;
        pauseBtn.textContent = '\u23F8 Pause';
        pauseBtn.style.background = '#a44';
        startLoop();
    };
    const startLoop = () => {
        const loop = () => {
            if (!running || !div.isConnected)
                return;
            const t0 = performance.now();
            const batch = advance(cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, plic_state, uart_state, rx, cyclesPerFrame);
            const elapsed = performance.now() - t0;
            if (elapsed > 0)
                cyclesPerFrame = batch * (TARGET_MS / elapsed);
            const mhz = (batch / elapsed / 1000).toFixed(1);
            status.textContent = `cycle ${ cpu.cycle.toLocaleString() } | ${ mhz } MHz | ${ batch.toLocaleString() } cyc/frame`;
            mode_timeline.sample(cpu);
            terminal_display.updateTerm(_uart_buffer);
            if (cpu.halted) {
                pause();
                status.textContent += ' (halted)';
                return;
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
    };
    bootBtn.onclick = () => {
        initSystem.init();
        mode_timeline.reset();
        running = true;
        terminal_display.resetTerm();
        pauseBtn.style.display = '';
        pauseBtn.textContent = '\u23F8 Pause';
        pauseBtn.style.background = '#a44';
        status.textContent = 'booting...';
        startLoop();
    };
    pauseBtn.onclick = () => running ? pause() : resume();
    return div;
};
const _1mgl4ec = function _4(downloadAnchor,md){return(
md`## Why I made this

I always wanted to know what people meant by _compiling Linux for a new architecture_. I understand microcontrollers and registers, but not the leap from compiled programs to operating systems. I have watched the wall of text scroll on boot, but I do not understand what boot really _is_. Inspired by Fabrice Bellard's [JSLinux](https://bellard.org/jslinux/) I knew Linux on JS was possible, so I made this to understand the extra stuff that goes on when starting a computer. 

While the outcome is similar to Fabrice's, the path here is different. We made a pure JS emulator of RISC-V instructions, then filled in the missing pieces to boot linux. This is all done on the main JS thread in JS, whereas \`jslinux\` is WASM and cross-compiling. \`jslinux\` is much more featureful, but this emulator boots a full BusyBox userspace — you can run \`vi\`, \`ls\`, \`cat\` and other standard Unix tools from the interactive shell.

When I started, I did not know what \`S-mode\`, a \`dtb\` table or a PLIC were. But you need them to boot linux, and in the process creating this I have learn a lot about low-level fundamentals e.g. what the MMU does. I could not have made this without the assistence of an [pair programming adapter for Claude Code](https://observablehq.com/@tomlarkworthy/claude-code-pairing).

The actual linux kernel that runs was compiled outside of the notebook, but has been gzipped and included into the Notebook file. No network dependancies are required to run this, you can ${downloadAnchor()} a copy to run locally on your computer, it is 7Mb which is mostly the linux build, the actual RISC-V emulator is quite small.
`
)};
const _p98yey = function _doc_emulator(md){return(
md`## Emulator Software Architecture

### Key Cells

| Cell | Purpose |
|------|---------|
| \`cpu\` | CPU state — \`x[0..31]\` registers, \`pc\`, \`priv\` (0=U, 1=S, 3=M), \`csrs\` Map, \`cycle\`, \`lr_addr/lr_valid\` for atomics |
| \`mem\` | Flat physical memory — \`Uint8Array(MEMORY_SIZE)\`, 48 MB |
| \`clint\` | CLINT state — \`mtime_lo/hi\`, \`mtimecmp_lo/hi\`, \`msip\` |
| \`uart_state\` | NS16550A UART registers — \`ier\`, \`iir\`, \`lcr\`, \`mcr\`, \`rx\` queue, \`thre_ip\` |
| \`plic_state\` | PLIC — \`priority[32]\`, \`pending\`, \`enable[2]\`, \`threshold[2]\`, \`claimed[2]\` |
| \`decode\` | Decodes a 32-bit instruction → \`{opcode, rd, funct3, rs1, rs2, funct7, imm}\` |
| \`execute\` | Executes one decoded instruction, modifies cpu/mem. RV32IMA + all CSR ops |
| \`trap\` | Exception/interrupt handler — delegates to S-mode via \`medeleg\`/\`mideleg\` |
| \`translate\` | Sv32 MMU — virtual→physical address translation, 2-level page walk, hardware A/D bit management |
| \`memRead\` / \`memWrite\` | Memory access with MMIO dispatch (UART, CLINT, PLIC) + Sv32 translation |
| \`memReadRaw\` | Raw physical memory access (bypasses MMIO, used by page table walker) |
| \`tickTimer\` | Increments CLINT \`mtime\`, checks timer/software/external interrupts |
| \`checkPLIC\` | Sets PLIC pending bits from UART RX, resolves interrupt claims |
| \`advance\` | Pure function: runs N cycles of execute+tickTimer, increments \`mutable advances\` |
| \`continuous_run\` | UI: boot/pause/reset buttons + \`requestAnimationFrame\` loop calling \`advance()\` |
| \`terminal_display\` | Renders \`_uart_buffer\` as a scrolling terminal \`<pre>\` element |
| \`buildDTB\` | Generates FDT binary at runtime describing cpus, memory, CLINT, UART, PLIC, chosen |
| \`buildInitramfs\` | Generates a CPIO initramfs overlay in-browser — adds /dev nodes (console, ttyS0, null, zero, tty), /tmp, and an /init script that mounts filesystems and sets TERM/HOME/PATH |
| \`initSystem\` | Resets CPU/mem/clint, loads firmware + DTB + initramfs into memory |
| \`disassemble\` | Disassembles a 32-bit instruction to human-readable string |
| \`runUntil\` | Runs until a target PC is reached (for debugging) |

### Data Flow

\`\`\`
cpu, mem, clint, uart_state, plic_state    (plain cells, stable object refs mutated in place)
advance(cpu, mem, clint, ..., n)            → pure function, increments mutable advances
mutable advances                            → counter, display cells react to it
continuous_run                              → thin UI (boot/pause/reset), rAF loop calls advance()
terminal_display                            → separate cell, renders _uart_buffer
\`\`\`

### CSR Numbers

\`mstatus\`=0x300, \`misa\`=0x301, \`medeleg\`=0x302, \`mideleg\`=0x303, \`mie\`=0x304, \`mtvec\`=0x305, \`mscratch\`=0x340, \`mepc\`=0x341, \`mcause\`=0x342, \`mtval\`=0x343, \`mip\`=0x344, \`satp\`=0x180, \`sstatus\`=0x100, \`stvec\`=0x105, \`sepc\`=0x141, \`scause\`=0x142

### Performance

~18–25 MIPS in the browser. OpenSBI banner appears in ~10M cycles. Full Linux boot to shell takes ~1B+ cycles (~40 seconds at full speed).
`
)};
const _exl42o = function _advances(){return(
0
)};
const _12zcn4c = function _terminal_display()
{
    const div = document.createElement('div');
    const term = document.createElement('pre');
    term.style.cssText = 'font-family:"Courier New",monospace;font-size:14px;line-height:1.4;background:#000;color:#0f0;padding:16px;border-radius:6px;min-height:120px;max-height:400px;overflow-y:auto;white-space:pre-wrap;border:1px solid #333;border-bottom:none;border-bottom-left-radius:0;border-bottom-right-radius:0;margin:0';
    term.textContent = '(no output yet)';
    div.appendChild(term);
    const ANSI_COLORS = [
        '#000',
        '#a00',
        '#0a0',
        '#a50',
        '#00a',
        '#a0a',
        '#0aa',
        '#aaa',
        '#555',
        '#f55',
        '#5f5',
        '#ff5',
        '#55f',
        '#f5f',
        '#5ff',
        '#fff'
    ];
    function renderAnsi(text) {
        const parts = [];
        let fg = null, bg = null, bold = false;
        let i = 0;
        let current = '';
        const flush = () => {
            if (!current)
                return;
            const escaped = current.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (fg !== null || bg !== null || bold) {
                let style = '';
                if (fg !== null)
                    style += `color:${ ANSI_COLORS[fg + (bold && fg < 8 ? 8 : 0)] };`;
                if (bg !== null)
                    style += `background:${ ANSI_COLORS[bg] };`;
                if (bold && fg === null)
                    style += 'font-weight:bold;';
                parts.push(`<span style="${ style }">${ escaped }</span>`);
            } else {
                parts.push(escaped);
            }
            current = '';
        };
        while (i < text.length) {
            if (text[i] === '\x1B' && text[i + 1] === '[') {
                flush();
                const end = text.indexOf('m', i);
                if (end === -1) {
                    current += text[i];
                    i++;
                    continue;
                }
                const seq = text.slice(i + 2, end);
                const codes = seq === '' ? [0] : seq.split(';').map(Number);
                for (let c = 0; c < codes.length; c++) {
                    const code = codes[c];
                    if (code === 0) {
                        fg = null;
                        bg = null;
                        bold = false;
                    } else if (code === 1)
                        bold = true;
                    else if (code === 22)
                        bold = false;
                    else if (code >= 30 && code <= 37)
                        fg = code - 30;
                    else if (code === 39)
                        fg = null;
                    else if (code >= 40 && code <= 47)
                        bg = code - 40;
                    else if (code === 49)
                        bg = null;
                    else if (code >= 90 && code <= 97) {
                        fg = code - 90;
                        bold = true;
                    } else if (code >= 100 && code <= 107)
                        bg = code - 100 + 8;
                }
                i = end + 1;
            } else {
                current += text[i];
                i++;
            }
        }
        flush();
        return parts.join('');
    }
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;background:#000;border:1px solid #333;border-top:1px solid #222;border-bottom-left-radius:6px;border-bottom-right-radius:6px;padding:4px 8px;align-items:center;gap:6px';
    const prompt = document.createElement('span');
    prompt.style.cssText = 'color:#0f0;font-family:"Courier New",monospace;font-size:14px';
    prompt.textContent = '>';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type command, press Enter...';
    input.style.cssText = 'flex:1;font-family:"Courier New",monospace;font-size:14px;padding:4px 6px;background:#0a0a0a;color:#0f0;border:1px solid #333;border-radius:3px;outline:none';
    inputRow.appendChild(prompt);
    inputRow.appendChild(input);
    div.appendChild(inputRow);
    let lastTermLen = 0;
    return {
        element: div,
        term,
        input,
        renderAnsi,
        updateTerm(buffer) {
            const len = buffer.length;
            if (len === lastTermLen)
                return;
            const atBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 80;
            const raw = buffer.join('');
            term.innerHTML = renderAnsi(raw) || '(no output yet)';
            lastTermLen = len;
            if (atBottom)
                term.scrollTop = term.scrollHeight;
        },
        resetTerm() {
            lastTermLen = 0;
        }
    };
};
const _130fe2x = function _firmware_bytes(firmware,unzip,busybox,fw_jump_pie_dtb){return(
firmware == "Busybox" ? unzip(busybox) : unzip(fw_jump_pie_dtb)
)};
const _1dyoswu = function _unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).arrayBuffer()
)};
const _nexewq = function _MEMORY_SIZE(){return(
48 * 1024 * 1024
)};
const _g6bi8n = function _RAM_BASE(){return(
2147483648
)};
const _sw1fz7 = function _UART_BASE(){return(
268435456
)};
const _hw4aln = function _CLINT_BASE(){return(
33554432
)};
const _1lpxlik = function _PLIC_BASE(){return(
201326592
)};
const _17llt2p = function _DTB_ADDR(){return(
2149580800
)};
const _igp0q3 = function _INITRD_ADDR(){return(
2176843776
)};
const _1y0t3b0 = function _REG_NAMES(){return(
[
    'zero',
    'ra',
    'sp',
    'gp',
    'tp',
    't0',
    't1',
    't2',
    's0',
    's1',
    'a0',
    'a1',
    'a2',
    'a3',
    'a4',
    'a5',
    'a6',
    'a7',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    't3',
    't4',
    't5',
    't6'
]
)};
const _ezjmx9 = function _cpu(){return(
{
    x: new Int32Array(32),
    pc: 2147483648,
    priv: 3,
    csrs: new Map([
        [
            768,
            0
        ],
        [
            769,
            1075056897
        ],
        [
            770,
            0
        ],
        [
            771,
            0
        ],
        [
            772,
            0
        ],
        [
            773,
            0
        ],
        [
            832,
            0
        ],
        [
            833,
            0
        ],
        [
            834,
            0
        ],
        [
            835,
            0
        ],
        [
            836,
            0
        ],
        [
            256,
            0
        ],
        [
            260,
            0
        ],
        [
            261,
            0
        ],
        [
            320,
            0
        ],
        [
            321,
            0
        ],
        [
            322,
            0
        ],
        [
            323,
            0
        ],
        [
            324,
            0
        ],
        [
            384,
            0
        ],
        [
            3857,
            0
        ],
        [
            3858,
            0
        ],
        [
            3859,
            0
        ],
        [
            3860,
            0
        ]
    ]),
    cycle: 0,
    halted: false,
    lr_addr: -1,
    lr_valid: false
}
)};
const _qte512 = function _mem(MEMORY_SIZE){return(
new Uint8Array(MEMORY_SIZE)
)};
const _1h4qqn4 = function _advance(decompress) {
    const _decompress = decompress;
    return (cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, plic, uart, rx, n) => {
        const batch = Math.max(1000, Math.min(n | 0, 5000000));
        for (let i = 0; i < batch && !cpu.halted; i++) {
            tickTimer(cpu, clint, plic, uart, rx);
            const savedPC = cpu.pc;
            const raw = memRead(cpu, mem, cpu.pc, 4, 0) >>> 0;
            if (cpu.pc !== savedPC)
                continue;
            let inst, instLen;
            if ((raw & 3) !== 3) {
                inst = _decompress(raw & 65535);
                instLen = 2;
            } else {
                inst = raw;
                instLen = 4;
            }
            const d = decode(inst);
            d.len = instLen;
            execute(d, cpu, mem, memRead, memWrite);
            if (cpu.wfi) {
                // Fast-forward mtime to mtimecmp — skip idle cycles
                const mtime = (clint.mtime_hi >>> 0) * 0x100000000 + (clint.mtime_lo >>> 0);
                const mtimecmp = (clint.mtimecmp_hi >>> 0) * 0x100000000 + (clint.mtimecmp_lo >>> 0);
                if (mtimecmp > mtime) {
                    // Cap skip to prevent overflow when mtime/mtimecmp diverge wildly
                    const skip = Math.min(mtimecmp - mtime, 1000000);
                    clint.mtime_lo = (clint.mtime_lo + skip) | 0;
                    if ((clint.mtime_lo >>> 0) < (mtime & 0xFFFFFFFF) >>> 0)
                        clint.mtime_hi = clint.mtime_hi + 1 | 0;
                    cpu.modeHist[2] += skip;
                    cpu.cycle += skip;
                    i += Math.min(skip, batch - i);
                } else {
                    cpu.modeHist[2]++;
                }
                cpu.wfi = false;
            } else {
                cpu.modeHist[cpu.priv]++;
            }
        }
        return batch;
    };
};
const _15n1eyw = function _clint(){return(
{
    msip: 0,
    mtimecmp_lo: 4294967295,
    mtimecmp_hi: 2147483647,
    mtime_lo: 0,
    mtime_hi: 0
}
)};
const _1yezvkf = function _uart_state(_uart_buffer)
{
    const s = {
        ier: 0,
        iir: 1,
        lcr: 0,
        mcr: 0,
        scr: 0,
        dll: 1,
        dlm: 0,
        thre_ip: false,
        tx: _uart_buffer,
        rx: []
    };
    return s;
};
const _fc76lw = function __uart_buffer(){return(
[]
)};
const _10ymqgw = function _plic_state(){return(
{
    priority: new Uint32Array(32),
    pending: 0,
    enable: [
        0,
        0
    ],
    threshold: [
        0,
        0
    ],
    claimed: [
        0,
        0
    ]
}
)};
const _1d3xnb6 = function _decode()
{
    return inst => {
        const opcode = inst & 127;
        const rd = inst >>> 7 & 31;
        const funct3 = inst >>> 12 & 7;
        const rs1 = inst >>> 15 & 31;
        const rs2 = inst >>> 20 & 31;
        const funct7 = inst >>> 25 & 127;
        // Immediate decoding per format
        let imm = 0;
        const type = opcode === 55 || opcode === 23 ? 'U' : opcode === 111 ? 'J' : opcode === 99 ? 'B' : opcode === 35 || opcode === 39 ? 'S' : opcode === 51 || opcode === 83 || opcode === 67 || opcode === 71 || opcode === 75 || opcode === 79 ? 'R' : 'I';
        switch (type) {
        case 'I':
            imm = inst >> 20;
            break;
        case 'S':
            imm = inst >> 20 & ~31 | rd;
            break;
        case 'B':
            imm = inst >> 19 & ~4095 | inst << 4 & 2048 | inst >>> 20 & 2016 | inst >>> 7 & 30;
            break;
        case 'U':
            imm = inst & 4294963200;
            break;
        case 'J':
            imm = inst >> 11 & ~1048575 | inst & 1044480 | inst >>> 9 & 2048 | inst >>> 20 & 2046;
            break;
        case 'R':
            imm = 0;
            break;
        }
        return {
            inst,
            opcode,
            rd,
            funct3,
            rs1,
            rs2,
            funct7,
            imm,
            type
        };
    };
};
const _sgo4nt = function _execute(trap) {
    const _trap = trap;
    return (d, cpu, mem, memRead, memWrite) => {
        const x = cpu.x;
        const rs1v = x[d.rs1], rs2v = x[d.rs2];
        const instLen = d.len || 4;
        let nextPC = cpu.pc + instLen;
        const startPC = cpu.pc;
        switch (d.opcode) {
        case 55:
            x[d.rd] = d.imm;
            break;
        case 23:
            x[d.rd] = cpu.pc + d.imm | 0;
            break;
        case 111:
            x[d.rd] = cpu.pc + instLen;
            nextPC = cpu.pc + d.imm | 0;
            break;
        case 103:
            x[d.rd] = cpu.pc + instLen;
            nextPC = rs1v + d.imm & ~1;
            break;
        case 99: {
                const taken = d.funct3 === 0 ? rs1v === rs2v : d.funct3 === 1 ? rs1v !== rs2v : d.funct3 === 4 ? rs1v < rs2v : d.funct3 === 5 ? rs1v >= rs2v : d.funct3 === 6 ? rs1v >>> 0 < rs2v >>> 0 : d.funct3 === 7 ? rs1v >>> 0 >= rs2v >>> 0 : false;
                if (taken)
                    nextPC = cpu.pc + d.imm | 0;
            }
            break;
        case 3: {
                const addr = rs1v + d.imm | 0;
                const sz = d.funct3 & 3;
                const bytes = sz === 0 ? 1 : sz === 1 ? 2 : 4;
                let val = memRead(cpu, mem, addr, bytes, 1);
                if (cpu.pc !== startPC) {
                    nextPC = cpu.pc;
                    break;
                }
                if (d.funct3 & 4 && bytes < 4)
                    val = val & (bytes === 1 ? 255 : 65535);
                x[d.rd] = val;
            }
            break;
        case 35: {
                const addr = rs1v + d.imm | 0;
                const sz = d.funct3 & 3;
                const bytes = sz === 0 ? 1 : sz === 1 ? 2 : 4;
                memWrite(cpu, mem, addr, bytes, rs2v);
                if (cpu.pc !== startPC) {
                    nextPC = cpu.pc;
                    break;
                }
            }
            break;
        case 19: {
                const shamt = d.imm & 31;
                x[d.rd] = d.funct3 === 0 ? rs1v + d.imm | 0 : d.funct3 === 1 ? rs1v << shamt : d.funct3 === 2 ? rs1v < d.imm ? 1 : 0 : d.funct3 === 3 ? rs1v >>> 0 < d.imm >>> 0 ? 1 : 0 : d.funct3 === 4 ? rs1v ^ d.imm : d.funct3 === 5 ? d.funct7 & 32 ? rs1v >> shamt : rs1v >>> shamt : d.funct3 === 6 ? rs1v | d.imm : rs1v & d.imm;
            }
            break;
        case 51: {
                if (d.funct7 === 1) {
                    const a = rs1v, b = rs2v;
                    const au = a >>> 0, bu = b >>> 0;
                    switch (d.funct3) {
                    case 0:
                        x[d.rd] = Math.imul(a, b);
                        break;
                    case 1: {
                            const r = BigInt(a) * BigInt(b);
                            x[d.rd] = Number(r >> 32n & 4294967295n);
                        }
                        break;
                    case 2: {
                            const r = BigInt(a) * BigInt(bu);
                            x[d.rd] = Number(r >> 32n & 4294967295n);
                        }
                        break;
                    case 3: {
                            const r = BigInt(au) * BigInt(bu);
                            x[d.rd] = Number(r >> 32n & 4294967295n);
                        }
                        break;
                    case 4:
                        x[d.rd] = b === 0 ? -1 : a === -2147483648 && b === -1 ? -2147483648 : a / b | 0;
                        break;
                    case 5:
                        x[d.rd] = bu === 0 ? 4294967295 : au / bu >>> 0 | 0;
                        break;
                    case 6:
                        x[d.rd] = b === 0 ? a : a === -2147483648 && b === -1 ? 0 : a % b;
                        break;
                    case 7:
                        x[d.rd] = bu === 0 ? a : au % bu >>> 0 | 0;
                        break;
                    }
                } else {
                    x[d.rd] = d.funct3 === 0 ? d.funct7 & 32 ? rs1v - rs2v | 0 : rs1v + rs2v | 0 : d.funct3 === 1 ? rs1v << (rs2v & 31) : d.funct3 === 2 ? rs1v < rs2v ? 1 : 0 : d.funct3 === 3 ? rs1v >>> 0 < rs2v >>> 0 ? 1 : 0 : d.funct3 === 4 ? rs1v ^ rs2v : d.funct3 === 5 ? d.funct7 & 32 ? rs1v >> (rs2v & 31) : rs1v >>> (rs2v & 31) : d.funct3 === 6 ? rs1v | rs2v : rs1v & rs2v;
                }
            }
            break;
        case 47: {
                if (d.funct3 === 2) {
                    const addr = rs1v;
                    const f5 = d.funct7 >> 2;
                    if (f5 === 2) {
                        x[d.rd] = memRead(cpu, mem, addr, 4, 1);
                        if (cpu.pc !== startPC) {
                            nextPC = cpu.pc;
                            break;
                        }
                        cpu.lr_addr = addr;
                        cpu.lr_valid = true;
                    } else if (f5 === 3) {
                        if (cpu.lr_valid && cpu.lr_addr === addr) {
                            memWrite(cpu, mem, addr, 4, rs2v);
                            if (cpu.pc !== startPC) {
                                nextPC = cpu.pc;
                                break;
                            }
                            x[d.rd] = 0;
                        } else {
                            x[d.rd] = 1;
                        }
                        cpu.lr_valid = false;
                    } else {
                        const old = memRead(cpu, mem, addr, 4, 1);
                        if (cpu.pc !== startPC) {
                            nextPC = cpu.pc;
                            break;
                        }
                        let result;
                        switch (f5 & 31) {
                        case 1:
                            result = rs2v;
                            break;
                        case 0:
                            result = old + rs2v | 0;
                            break;
                        case 4:
                            result = old ^ rs2v;
                            break;
                        case 12:
                            result = old & rs2v;
                            break;
                        case 8:
                            result = old | rs2v;
                            break;
                        case 16:
                            result = old < rs2v ? old : rs2v;
                            break;
                        case 20:
                            result = old >= rs2v ? old : rs2v;
                            break;
                        case 24:
                            result = old >>> 0 < rs2v >>> 0 ? old : rs2v;
                            break;
                        case 28:
                            result = old >>> 0 >= rs2v >>> 0 ? old : rs2v;
                            break;
                        default:
                            result = old;
                            break;
                        }
                        memWrite(cpu, mem, addr, 4, result);
                        if (cpu.pc !== startPC) {
                            nextPC = cpu.pc;
                            break;
                        }
                        x[d.rd] = old;
                    }
                } else {
                    _trap(cpu, 2, d.inst);
                    nextPC = cpu.pc;
                }
            }
            break;
        case 115: {
                const csr = d.imm & 4095;
                if (d.funct3 === 0) {
                    if (d.inst === 807403635) {
                        const mstatus = cpu.csrs.get(768) || 0;
                        const mpie = mstatus >> 7 & 1;
                        const mpp = mstatus >> 11 & 3;
                        cpu.csrs.set(768, mstatus & ~6280 | mpie << 3 | 1 << 7 | 0 << 11);
                        cpu.priv = mpp;
                        nextPC = cpu.csrs.get(833) || 0;
                    } else if (d.inst === 270532723) {
                        const mstatus = cpu.csrs.get(768) || 0;
                        const spie = mstatus >> 5 & 1;
                        const spp = mstatus >> 8 & 1;
                        cpu.csrs.set(768, mstatus & ~290 | spie << 1 | 1 << 5 | 0 << 8);
                        cpu.priv = spp;
                        nextPC = cpu.csrs.get(321) || 0;
                    } else if (d.imm === 0) {
                        _trap(cpu, cpu.priv === 0 ? 8 : cpu.priv === 1 ? 9 : 11, 0);
                        nextPC = cpu.pc;
                    } else if (d.imm === 1) {
                        _trap(cpu, 3, cpu.pc);
                        nextPC = cpu.pc;
                    } else if (d.inst === 273678451 || d.inst >>> 25 === 9) {
                        cpu.wfi = true;
                    }
                } else {
                    if (csr === 21) {
                        x[d.rd] = 3221225472 | Math.random() * 65535 >>> 0;
                    } else {
                        const csrPriv = csr >> 8 & 3;
                        if (cpu.priv < csrPriv) {
                            _trap(cpu, 2, d.inst);
                            nextPC = cpu.pc;
                        } else {
                            const SSTATUS_MASK = 909602;
                            let csrVal;
                            if (csr === 256) {
                                csrVal = (cpu.csrs.get(768) || 0) & SSTATUS_MASK;
                            } else {
                                csrVal = cpu.csrs.get(csr) || 0;
                            }
                            const wval = d.funct3 & 4 ? d.rs1 : rs1v;
                            let newVal;
                            if (d.funct3 === 1 || d.funct3 === 5) {
                                x[d.rd] = csrVal;
                                newVal = wval;
                            } else if (d.funct3 === 2 || d.funct3 === 6) {
                                x[d.rd] = csrVal;
                                newVal = csrVal | wval;
                            } else if (d.funct3 === 3 || d.funct3 === 7) {
                                x[d.rd] = csrVal;
                                newVal = csrVal & ~wval;
                            }
                            if (newVal !== undefined) {
                                if (csr === 256) {
                                    const ms = cpu.csrs.get(768) || 0;
                                    cpu.csrs.set(768, ms & ~SSTATUS_MASK | newVal & SSTATUS_MASK);
                                } else if (csr === 768) {
                                    cpu.csrs.set(768, newVal);
                                } else {
                                    cpu.csrs.set(csr, newVal);
                                }
                            }
                        }
                    }
                }
            }
            break;
        case 15:
            break;
        case 7: {
                const ms = cpu.csrs.get(768) || 0;
                if ((ms >> 13 & 3) === 0) {
                    cpu.csrs.set(768, ms | 1 << 13);
                }
                const addr = rs1v + d.imm | 0;
                if (d.funct3 === 2) {
                    const bits = memRead(cpu, mem, addr, 4) >>> 0;
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                    const buf = new ArrayBuffer(4);
                    new DataView(buf).setUint32(0, bits, true);
                    cpu.f[d.rd] = new DataView(buf).getFloat32(0, true);
                } else if (d.funct3 === 3) {
                    const lo = memRead(cpu, mem, addr, 4) >>> 0;
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                    const hi = memRead(cpu, mem, addr + 4, 4) >>> 0;
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                    const buf = new ArrayBuffer(8);
                    const dv = new DataView(buf);
                    dv.setUint32(0, lo, true);
                    dv.setUint32(4, hi, true);
                    cpu.f[d.rd] = dv.getFloat64(0, true);
                }
                cpu.csrs.set(768, (cpu.csrs.get(768) || 0) | 3 << 13);
                break;
            }
        case 39: {
                const ms = cpu.csrs.get(768) || 0;
                if ((ms >> 13 & 3) === 0) {
                    cpu.csrs.set(768, ms | 1 << 13);
                }
                const addr = rs1v + d.imm | 0;
                if (d.funct3 === 2) {
                    const buf = new ArrayBuffer(4);
                    new DataView(buf).setFloat32(0, cpu.f[d.rs2], true);
                    memWrite(cpu, mem, addr, 4, new DataView(buf).getUint32(0, true));
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                } else if (d.funct3 === 3) {
                    const buf = new ArrayBuffer(8);
                    new DataView(buf).setFloat64(0, cpu.f[d.rs2], true);
                    const dv = new DataView(buf);
                    memWrite(cpu, mem, addr, 4, dv.getUint32(0, true));
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                    memWrite(cpu, mem, addr + 4, 4, dv.getUint32(4, true));
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                }
                cpu.csrs.set(768, (cpu.csrs.get(768) || 0) | 3 << 13);
                break;
            }
        case 67:
        case 71:
        case 75:
        case 79: {
                const ms = cpu.csrs.get(768) || 0;
                if ((ms >> 13 & 3) === 0) {
                    cpu.csrs.set(768, ms | 1 << 13);
                }
                const fmt = d.funct7 & 3;
                const rs3 = d.funct7 >> 2;
                const f = cpu.f;
                let a = f[d.rs1], b = f[d.rs2], c = f[rs3];
                if (fmt === 0) {
                    a = Math.fround(a);
                    b = Math.fround(b);
                    c = Math.fround(c);
                }
                let r;
                switch (d.opcode) {
                case 67:
                    r = a * b + c;
                    break;
                case 71:
                    r = a * b - c;
                    break;
                case 75:
                    r = -(a * b) + c;
                    break;
                case 79:
                    r = -(a * b) - c;
                    break;
                }
                f[d.rd] = fmt === 0 ? Math.fround(r) : r;
                cpu.csrs.set(768, (cpu.csrs.get(768) || 0) | 3 << 13);
                break;
            }
        case 83: {
                const ms = cpu.csrs.get(768) || 0;
                if ((ms >> 13 & 3) === 0) {
                    cpu.csrs.set(768, ms | 1 << 13);
                }
                const f = cpu.f;
                const frd = d.rd, frs1 = d.rs1, frs2 = d.rs2;
                const funct7 = d.funct7;
                switch (funct7) {
                case 0:
                    f[frd] = Math.fround(Math.fround(f[frs1]) + Math.fround(f[frs2]));
                    break;
                case 1:
                    f[frd] = f[frs1] + f[frs2];
                    break;
                case 4:
                    f[frd] = Math.fround(Math.fround(f[frs1]) - Math.fround(f[frs2]));
                    break;
                case 5:
                    f[frd] = f[frs1] - f[frs2];
                    break;
                case 8:
                    f[frd] = Math.fround(Math.fround(f[frs1]) * Math.fround(f[frs2]));
                    break;
                case 9:
                    f[frd] = f[frs1] * f[frs2];
                    break;
                case 12:
                    f[frd] = Math.fround(Math.fround(f[frs1]) / Math.fround(f[frs2]));
                    break;
                case 13:
                    f[frd] = f[frs1] / f[frs2];
                    break;
                case 44:
                    f[frd] = Math.fround(Math.sqrt(Math.fround(f[frs1])));
                    break;
                case 45:
                    f[frd] = Math.sqrt(f[frs1]);
                    break;
                case 16: {
                        const buf = new ArrayBuffer(4);
                        const dv = new DataView(buf);
                        dv.setFloat32(0, f[frs1], true);
                        const a = dv.getUint32(0, true);
                        dv.setFloat32(0, f[frs2], true);
                        const b = dv.getUint32(0, true);
                        let r;
                        if (d.funct3 === 0)
                            r = a & 2147483647 | b & 2147483648;
                        else if (d.funct3 === 1)
                            r = a & 2147483647 | ~b & 2147483648;
                        else
                            r = a & 2147483647 | (a ^ b) & 2147483648;
                        dv.setUint32(0, r, true);
                        f[frd] = dv.getFloat32(0, true);
                        break;
                    }
                case 17: {
                        const buf = new ArrayBuffer(8);
                        const dv = new DataView(buf);
                        dv.setFloat64(0, f[frs1], true);
                        const alo = dv.getUint32(0, true), ahi = dv.getUint32(4, true);
                        dv.setFloat64(0, f[frs2], true);
                        const bhi = dv.getUint32(4, true);
                        let rhi;
                        if (d.funct3 === 0)
                            rhi = ahi & 2147483647 | bhi & 2147483648;
                        else if (d.funct3 === 1)
                            rhi = ahi & 2147483647 | ~bhi & 2147483648;
                        else
                            rhi = ahi & 2147483647 | (ahi ^ bhi) & 2147483648;
                        dv.setUint32(0, alo, true);
                        dv.setUint32(4, rhi, true);
                        f[frd] = dv.getFloat64(0, true);
                        break;
                    }
                case 20: {
                        const a = Math.fround(f[frs1]), b = Math.fround(f[frs2]);
                        f[frd] = d.funct3 === 0 ? isNaN(a) ? b : isNaN(b) ? a : Math.min(a, b) : isNaN(a) ? b : isNaN(b) ? a : Math.max(a, b);
                        break;
                    }
                case 21: {
                        const a = f[frs1], b = f[frs2];
                        f[frd] = d.funct3 === 0 ? isNaN(a) ? b : isNaN(b) ? a : Math.min(a, b) : isNaN(a) ? b : isNaN(b) ? a : Math.max(a, b);
                        break;
                    }
                case 32:
                    f[frd] = Math.fround(f[frs1]);
                    break;
                case 33:
                    f[frd] = Math.fround(f[frs1]);
                    break;
                case 80: {
                        const a = Math.fround(f[frs1]), b = Math.fround(f[frs2]);
                        if (d.funct3 === 2)
                            x[d.rd] = a === b ? 1 : 0;
                        else if (d.funct3 === 1)
                            x[d.rd] = a < b ? 1 : 0;
                        else
                            x[d.rd] = a <= b ? 1 : 0;
                        break;
                    }
                case 81: {
                        const a = f[frs1], b = f[frs2];
                        if (d.funct3 === 2)
                            x[d.rd] = a === b ? 1 : 0;
                        else if (d.funct3 === 1)
                            x[d.rd] = a < b ? 1 : 0;
                        else
                            x[d.rd] = a <= b ? 1 : 0;
                        break;
                    }
                case 96: {
                        const a = Math.fround(f[frs1]);
                        if (frs2 === 0)
                            x[d.rd] = isNaN(a) ? 2147483647 : Math.trunc(Math.max(-2147483648, Math.min(2147483647, a)));
                        else
                            x[d.rd] = isNaN(a) ? 4294967295 : Math.trunc(Math.max(0, Math.min(4294967295, a)));
                        break;
                    }
                case 97: {
                        const a = f[frs1];
                        if (frs2 === 0)
                            x[d.rd] = isNaN(a) ? 2147483647 : Math.trunc(Math.max(-2147483648, Math.min(2147483647, a)));
                        else
                            x[d.rd] = isNaN(a) ? 4294967295 : Math.trunc(Math.max(0, Math.min(4294967295, a)));
                        break;
                    }
                case 104:
                    if (frs2 === 0)
                        f[frd] = Math.fround(rs1v);
                    else
                        f[frd] = Math.fround(rs1v >>> 0);
                    break;
                case 105:
                    if (frs2 === 0)
                        f[frd] = rs1v;
                    else
                        f[frd] = rs1v >>> 0;
                    break;
                case 112: {
                        if (d.funct3 === 0) {
                            const buf = new ArrayBuffer(4);
                            new DataView(buf).setFloat32(0, f[frs1], true);
                            x[d.rd] = new DataView(buf).getInt32(0, true);
                        } else {
                            const v = Math.fround(f[frs1]);
                            const buf = new ArrayBuffer(4);
                            new DataView(buf).setFloat32(0, v, true);
                            const bits = new DataView(buf).getUint32(0, true);
                            const sign = bits >> 31, exp = bits >> 23 & 255, mant = bits & 8388607;
                            let cls = 0;
                            if (exp === 255 && mant)
                                cls = mant & 4194304 ? 512 : 256;
                            else if (exp === 255)
                                cls = sign ? 1 : 128;
                            else if (exp === 0 && mant === 0)
                                cls = sign ? 8 : 16;
                            else if (exp === 0)
                                cls = sign ? 4 : 32;
                            else
                                cls = sign ? 2 : 64;
                            x[d.rd] = cls;
                        }
                        break;
                    }
                case 113: {
                        if (d.funct3 === 1) {
                            const v = f[frs1];
                            const buf = new ArrayBuffer(8);
                            new DataView(buf).setFloat64(0, v, true);
                            const lo = new DataView(buf).getUint32(0, true);
                            const hi = new DataView(buf).getUint32(4, true);
                            const sign = hi >> 31, exp = hi >> 20 & 2047, mantHi = hi & 1048575;
                            let cls = 0;
                            if (exp === 2047 && (mantHi || lo))
                                cls = mantHi & 524288 ? 512 : 256;
                            else if (exp === 2047)
                                cls = sign ? 1 : 128;
                            else if (exp === 0 && mantHi === 0 && lo === 0)
                                cls = sign ? 8 : 16;
                            else if (exp === 0)
                                cls = sign ? 4 : 32;
                            else
                                cls = sign ? 2 : 64;
                            x[d.rd] = cls;
                        }
                        break;
                    }
                case 120: {
                        const buf = new ArrayBuffer(4);
                        new DataView(buf).setInt32(0, rs1v, true);
                        f[frd] = new DataView(buf).getFloat32(0, true);
                        break;
                    }
                default:
                    _trap(cpu, 2, d.inst);
                    nextPC = cpu.pc;
                    break;
                }
                cpu.csrs.set(768, (cpu.csrs.get(768) || 0) | 3 << 13);
                break;
            }
        default:
            _trap(cpu, 2, d.inst);
            nextPC = cpu.pc;
            break;
        }
        x[0] = 0;
        cpu.pc = nextPC;
        cpu.cycle++;
        return {
            opcode: d.opcode,
            type: d.type,
            rd: d.rd,
            rs1: d.rs1,
            rs2: d.rs2,
            imm: d.imm,
            funct3: d.funct3
        };
    };
};
const _1yb74p8 = function _trap()
{
    return (cpu, cause, tval) => {
        const isInterrupt = cause < 0;
        // bit 31 set
        const excCode = cause & 2147483647;
        // Check delegation: should this trap go to S-mode?
        // Traps from M-mode always stay in M-mode
        // Traps from S/U mode are delegated if the corresponding bit is set in medeleg/mideleg
        const delegToS = cpu.priv < 3 && (isInterrupt ? (cpu.csrs.get(771) || 0) >>> excCode & 1    // mideleg
 : (cpu.csrs.get(770) || 0) >>> excCode & 1    // medeleg
);
        if (delegToS) {
            // S-mode trap
            cpu.csrs.set(321, cpu.pc);
            // sepc
            cpu.csrs.set(322, cause);
            // scause
            cpu.csrs.set(323, tval || 0);
            // stval
            // Update mstatus (sstatus is a view): save SIE→SPIE, save priv→SPP, clear SIE
            const mstatus = cpu.csrs.get(768) || 0;
            const sie = mstatus >> 1 & 1;
            cpu.csrs.set(768, mstatus & ~290 | sie << 5 | cpu.priv << 8);
            cpu.priv = 1;
            // Enter S-mode
            const stvec = cpu.csrs.get(261) || 0;
            const mode = stvec & 3;
            cpu.pc = mode === 0 ? stvec & ~3 : (stvec & ~3) + excCode * 4;
        } else {
            // M-mode trap
            cpu.csrs.set(833, cpu.pc);
            // mepc
            cpu.csrs.set(834, cause);
            // mcause
            cpu.csrs.set(835, tval || 0);
            // mtval
            // Update mstatus: save MIE (bit 3) to MPIE (bit 7), save priv to MPP (bits 12:11), clear MIE
            const mstatus = cpu.csrs.get(768) || 0;
            const mie = mstatus >> 3 & 1;
            cpu.csrs.set(768, mstatus & ~6280 | mie << 7 | cpu.priv << 11);
            // MPP, MPIE, MIE=0
            cpu.priv = 3;
            // Enter M-mode
            const mtvec = cpu.csrs.get(773) || 0;
            const mode = mtvec & 3;
            cpu.pc = mode === 0 ? mtvec & ~3 : (mtvec & ~3) + excCode * 4;
        }
    };
};
const _c256r5 = function _translate()
{
    const RAM_BASE = 2147483648;
    const updatePTE = (mem, pteAddr, newPte) => {
        const off = (pteAddr - RAM_BASE) >>> 0;
        if (off + 4 <= mem.length) {
            const v = new DataView(mem.buffer, off, 4);
            v.setUint32(0, newPte, true);
        }
    };
    return (cpu, mem, vaddr, accessType, memReadRaw) => {
        // accessType: 0=fetch, 1=load, 2=store
        // Fault codes: 12=inst page fault, 13=load page fault, 15=store page fault
        const pageFault = [
            12,
            13,
            15
        ][accessType];
        const satp = cpu.csrs.get(384) || 0;
        const mode = satp >>> 31 & 1;
        if (cpu.priv === 3 || mode === 0)
            return {
                pa: vaddr,
                ok: true
            };
        const ppn = satp & 4194303;
        let ptBase = ppn << 12;
        const vpn1 = vaddr >>> 22 & 1023;
        const vpn0 = vaddr >>> 12 & 1023;
        const offset = vaddr & 4095;
        // Level 1: read root PTE
        const pte1Addr = ptBase + vpn1 * 4;
        const pte1 = memReadRaw(mem, pte1Addr, 4) >>> 0;
        if (!(pte1 & 1))
            return {
                pa: 0,
                ok: false,
                fault: pageFault
            };
        // V=0
        const r1 = pte1 >> 1 & 1, w1 = pte1 >> 2 & 1, x1 = pte1 >> 3 & 1;
        if (r1 || x1) {
            // Superpage (4MB) leaf at level 1
            if (accessType === 0 && !x1)
                return {
                    pa: 0,
                    ok: false,
                    fault: 12
                };
            if (accessType === 1 && !r1)
                return {
                    pa: 0,
                    ok: false,
                    fault: 13
                };
            if (accessType === 2 && !w1)
                return {
                    pa: 0,
                    ok: false,
                    fault: 15
                };
            const u1 = pte1 >> 4 & 1;
            if (cpu.priv === 0 && !u1)
                return {
                    pa: 0,
                    ok: false,
                    fault: pageFault
                };
            if (cpu.priv === 1 && u1) {
                const _ms = cpu.csrs.get(768) || 0;
                if (!(_ms & 1 << 18))
                    return {
                        pa: 0,
                        ok: false,
                        fault: pageFault
                    };    // SUM
            }
            // Misaligned superpage: PPN[0] must be 0
            if (pte1 >> 10 & 1023)
                return {
                    pa: 0,
                    ok: false,
                    fault: pageFault
                };
            // Hardware A/D bit management
            if (!((pte1 >> 6) & 1) || (accessType === 2 && !((pte1 >> 7) & 1))) {
                updatePTE(mem, pte1Addr, pte1 | (1 << 6) | (accessType === 2 ? (1 << 7) : 0));
            }
            const ppn1 = pte1 >>> 20 & 4095;
            const pa = ppn1 << 22 | vpn0 << 12 | offset;
            return {
                pa,
                ok: true
            };
        }
        // Non-leaf: walk to level 0
        const ptBase0 = (pte1 >>> 10 & 4194303) << 12;
        const pte0Addr = ptBase0 + vpn0 * 4;
        const pte0 = memReadRaw(mem, pte0Addr, 4) >>> 0;
        if (!(pte0 & 1))
            return {
                pa: 0,
                ok: false,
                fault: pageFault
            };
        // V=0
        const r0 = pte0 >> 1 & 1, w0 = pte0 >> 2 & 1, x0 = pte0 >> 3 & 1;
        if (!r0 && !x0)
            return {
                pa: 0,
                ok: false,
                fault: pageFault
            };
        // Non-leaf at level 0
        if (accessType === 0 && !x0)
            return {
                pa: 0,
                ok: false,
                fault: 12
            };
        if (accessType === 1 && !r0)
            return {
                pa: 0,
                ok: false,
                fault: 13
            };
        if (accessType === 2 && !w0)
            return {
                pa: 0,
                ok: false,
                fault: 15
            };
        const u0 = pte0 >> 4 & 1;
        if (cpu.priv === 0 && !u0)
            return {
                pa: 0,
                ok: false,
                fault: pageFault
            };
        if (cpu.priv === 1 && u0) {
            const _ms0 = cpu.csrs.get(768) || 0;
            if (!(_ms0 & 1 << 18))
                return {
                    pa: 0,
                    ok: false,
                    fault: pageFault
                };    // SUM
        }
        // Hardware A/D bit management
        if (!((pte0 >> 6) & 1) || (accessType === 2 && !((pte0 >> 7) & 1))) {
            updatePTE(mem, pte0Addr, pte0 | (1 << 6) | (accessType === 2 ? (1 << 7) : 0));
        }
        const ppn_full = pte0 >>> 10 & 4194303;
        const pa = ppn_full << 12 | offset;
        return {
            pa,
            ok: true
        };
    };
};
const _7m3vc = function _memReadRaw(RAM_BASE){return(
(mem, addr, size) => {
    const offset = addr - RAM_BASE >>> 0;
    if (offset + size > mem.length)
        return 0;
    const view = new DataView(mem.buffer, offset, size);
    switch (size) {
    case 1:
        return view.getInt8(0);
    case 2:
        return view.getInt16(0, true);
    case 4:
        return view.getInt32(0, true);
    default:
        return 0;
    }
}
)};
const _rcs98h = function _memRead(uart_state,plic_state,translate,memReadRaw,trap,UART_BASE,PLIC_BASE,CLINT_BASE,clint)
{
    const uart = uart_state;
    const _rx = uart.rx;
    const plic = plic_state;
    return (cpu, mem, addr, size, accessType) => {
        const t = translate(cpu, mem, addr, accessType !== undefined ? accessType : 1, memReadRaw);
        if (!t.ok) {
            trap(cpu, t.fault, addr);
            return 0;
        }
        const pa = t.pa;
        const upa = pa >>> 0;
        // UART
        if (upa >= UART_BASE >>> 0 && upa < UART_BASE + 8 >>> 0) {
            const reg = upa - (UART_BASE >>> 0);
            const dlab = uart.lcr >> 7 & 1;
            if (reg === 0) {
                if (dlab)
                    return uart.dll;
                return _rx.length > 0 ? _rx.shift() : 0;
            }
            if (reg === 1)
                return dlab ? uart.dlm : uart.ier;
            if (reg === 2) {
                if (_rx.length > 0 && uart.ier & 1)
                    return 4;
                if (uart.thre_ip && uart.ier & 2) {
                    uart.thre_ip = false;
                    return 2;
                }
                return 1;
            }
            if (reg === 3)
                return uart.lcr;
            if (reg === 4)
                return uart.mcr;
            if (reg === 5)
                return (_rx.length > 0 ? 1 : 0) | 96;
            if (reg === 6)
                return 176;
            if (reg === 7)
                return uart.scr;
            return 0;
        }
        // PLIC
        if (upa >= PLIC_BASE >>> 0 && upa < PLIC_BASE + 67108864 >>> 0) {
            const off = upa - (PLIC_BASE >>> 0);
            if (off < 4096) {
                const src = off >> 2;
                return src < 32 ? plic.priority[src] : 0;
            }
            if (off === 4096)
                return plic.pending;
            if (off === 8192)
                return plic.enable[0];
            if (off === 8320)
                return plic.enable[1];
            if (off === 2097152)
                return plic.threshold[0];
            if (off === 2097156) {
                const enabled = plic.pending & plic.enable[0];
                for (let i = 1; i < 32; i++) {
                    if (enabled >> i & 1) {
                        plic.pending &= ~(1 << i);
                        plic.claimed[0] = i;
                        return i;
                    }
                }
                return 0;
            }
            if (off === 2101248)
                return plic.threshold[1];
            if (off === 2101252) {
                const enabled = plic.pending & plic.enable[1];
                for (let i = 1; i < 32; i++) {
                    if (enabled >> i & 1) {
                        plic.pending &= ~(1 << i);
                        plic.claimed[1] = i;
                        return i;
                    }
                }
                return 0;
            }
            return 0;
        }
        // CLINT
        if (upa >= CLINT_BASE >>> 0 && upa < CLINT_BASE + 65536 >>> 0) {
            const off = upa - (CLINT_BASE >>> 0);
            if (off === 0)
                return clint.msip;
            if (off === 16384)
                return clint.mtimecmp_lo;
            if (off === 16388)
                return clint.mtimecmp_hi;
            if (off === 49144)
                return clint.mtime_lo;
            if (off === 49148)
                return clint.mtime_hi;
            return 0;
        }
        return memReadRaw(mem, pa, size);
    };
};
const _19sxnxs = function _memWrite(uart_state,plic_state,translate,memReadRaw,trap,UART_BASE,_uart_buffer,PLIC_BASE,CLINT_BASE,clint,RAM_BASE)
{
    const uart = uart_state;
    const plic = plic_state;
    // let storeFaultLog = window._storeFaultLog = []; // DEBUG: commented out for performance
    return (cpu, mem, addr, size, val) => {
        const t = translate(cpu, mem, addr, 2, memReadRaw);
        if (!t.ok) {
            /* DEBUG: store fault PTE walk dump — commented out for performance
            if (t.fault === 15 && storeFaultLog.length < 200) {
                const satp = cpu.csrs.get(384) || 0;
                const ppn = satp & 0x3FFFFF;
                const ptBase = ppn << 12;
                const vpn1 = (addr >>> 22) & 0x3FF;
                const vpn0 = (addr >>> 12) & 0x3FF;
                const pte1Addr = ptBase + vpn1 * 4;
                const pte1 = memReadRaw(mem, pte1Addr, 4) >>> 0;
                let pte0 = 0, pte0Addr = 0;
                const r1 = (pte1>>1)&1, x1 = (pte1>>3)&1;
                if ((pte1&1) && !r1 && !x1) {
                    const ptBase0 = ((pte1 >>> 10) & 0x3FFFFF) << 12;
                    pte0Addr = ptBase0 + vpn0 * 4;
                    pte0 = memReadRaw(mem, pte0Addr, 4) >>> 0;
                }
                const entry = {
                    addr: '0x' + (addr>>>0).toString(16),
                    pc: '0x' + (cpu.pc>>>0).toString(16),
                    priv: cpu.priv,
                    satp: '0x' + (satp>>>0).toString(16),
                    vpn1, vpn0,
                    pte1: '0x' + pte1.toString(16),
                    pte1Addr: '0x' + (pte1Addr>>>0).toString(16),
                    pte1_V: pte1&1, pte1_R: (pte1>>1)&1, pte1_W: (pte1>>2)&1, pte1_X: (pte1>>3)&1, pte1_U: (pte1>>4)&1, pte1_A: (pte1>>6)&1, pte1_D: (pte1>>7)&1,
                    pte0: '0x' + pte0.toString(16),
                    pte0Addr: '0x' + (pte0Addr>>>0).toString(16),
                    pte0_V: pte0&1, pte0_R: (pte0>>1)&1, pte0_W: (pte0>>2)&1, pte0_X: (pte0>>3)&1, pte0_U: (pte0>>4)&1, pte0_A: (pte0>>6)&1, pte0_D: (pte0>>7)&1
                };
                storeFaultLog.push(entry);
                if (storeFaultLog.length <= 5 || storeFaultLog.length % 50 === 0) {
                    console.log('[STORE FAULT #' + storeFaultLog.length + ']', JSON.stringify(entry, null, 2));
                }
            } */
            trap(cpu, t.fault, addr);
            return;
        }
        const pa = t.pa;
        const upa = pa >>> 0;
        // UART
        if (upa >= UART_BASE >>> 0 && upa < UART_BASE + 8 >>> 0) {
            const reg = upa - (UART_BASE >>> 0);
            const dlab = uart.lcr >> 7 & 1;
            if (reg === 0) {
                if (dlab) {
                    uart.dll = val & 255;
                    return;
                }
                _uart_buffer.push(String.fromCharCode(val & 255));
                uart.thre_ip = true;
                return;
            }
            if (reg === 1) {
                if (dlab) {
                    uart.dlm = val & 255;
                    return;
                }
                const oldIer = uart.ier;
                uart.ier = val & 15;
                if (uart.ier & 2 && !(oldIer & 2)) {
                    uart.thre_ip = true;
                    if (plic.claimed[0] !== 1 && plic.claimed[1] !== 1)
                        plic.pending |= 2;
                }
                return;
            }
            if (reg === 2)
                return;
            if (reg === 3) {
                uart.lcr = val & 255;
                return;
            }
            if (reg === 4) {
                uart.mcr = val & 31;
                return;
            }
            if (reg === 7) {
                uart.scr = val & 255;
                return;
            }
            return;
        }
        // PLIC
        if (upa >= PLIC_BASE >>> 0 && upa < PLIC_BASE + 67108864 >>> 0) {
            const off = upa - (PLIC_BASE >>> 0);
            if (off < 4096) {
                const src = off >> 2;
                if (src < 32)
                    plic.priority[src] = val;
                return;
            }
            if (off === 4096) {
                plic.pending = val;
                return;
            }
            if (off >= 8192 && off < 12288) {
                const ctx = off - 8192 >> 7;
                if (ctx < 2)
                    plic.enable[ctx] = val;
                return;
            }
            if (off >= 2097152 && off < 2162688) {
                const ctx = off - 2097152 >> 12;
                const reg = off - 2097152 & 4095;
                if (ctx < 2) {
                    if (reg === 0)
                        plic.threshold[ctx] = val;
                    if (reg === 4)
                        plic.claimed[ctx] = 0;
                }
                return;
            }
            return;
        }
        // CLINT
        if (upa >= CLINT_BASE >>> 0 && upa < CLINT_BASE + 65536 >>> 0) {
            const off = upa - (CLINT_BASE >>> 0);
            if (off === 0)
                clint.msip = val;
            else if (off === 16384)
                clint.mtimecmp_lo = val;
            else if (off === 16388)
                clint.mtimecmp_hi = val;
            else if (off === 49144)
                clint.mtime_lo = val;
            else if (off === 49148)
                clint.mtime_hi = val;
            return;
        }
        // RAM
        const offset = pa - RAM_BASE >>> 0;
        if (offset + size > mem.length)
            return;
        const view = new DataView(mem.buffer, offset, size);
        switch (size) {
        case 1:
            view.setInt8(0, val);
            break;
        case 2:
            view.setInt16(0, val, true);
            break;
        case 4:
            view.setInt32(0, val, true);
            break;
        }
    };
};
const _cqhb58 = function _checkPLIC()
{
    return (cpu, plic, uart, rx) => {
        // Set PLIC pending for RX data (not THRE)
        if (rx.length > 0 && uart.ier & 1 && plic.claimed[0] !== 1 && plic.claimed[1] !== 1) {
            plic.pending |= 2;
        }
        const s_enabled = plic.pending & plic.enable[1];
        let hasInt = false;
        for (let i = 1; i < 32 && !hasInt; i++) {
            if (s_enabled >> i & 1 && plic.priority[i] > plic.threshold[1])
                hasInt = true;
        }
        if (hasInt)
            cpu.csrs.set(836, (cpu.csrs.get(836) || 0) | 512);
        else
            cpu.csrs.set(836, (cpu.csrs.get(836) || 0) & ~512);
    };
};
const _1jid5rm = function _tickTimer(checkPLIC,trap)
{
    let prevMtimecmpLo = -1, prevMtimecmpHi = -1;
    let csrUpdateCounter = 0;
    return (cpu, clint, plic, uart, rx) => {
        clint.mtime_lo = clint.mtime_lo + 1 | 0;
        if (clint.mtime_lo === 0)
            clint.mtime_hi = clint.mtime_hi + 1 | 0;
        if ((++csrUpdateCounter & 63) === 0) {
            cpu.csrs.set(3073, clint.mtime_lo);
            cpu.csrs.set(3201, clint.mtime_hi);
            cpu.csrs.set(3072, cpu.cycle | 0);
            cpu.csrs.set(3200, 0);
        }
        if (clint.mtimecmp_lo !== prevMtimecmpLo || clint.mtimecmp_hi !== prevMtimecmpHi) {
            cpu.csrs.set(836, (cpu.csrs.get(836) || 0) & ~32);
            prevMtimecmpLo = clint.mtimecmp_lo;
            prevMtimecmpHi = clint.mtimecmp_hi;
        }
        // Delegate PLIC handling
        if (plic && uart && rx) {
            checkPLIC(cpu, plic, uart, rx);
        }
        // Timer interrupt
        const timerPending = clint.mtime_hi >>> 0 > clint.mtimecmp_hi >>> 0 || clint.mtime_hi >>> 0 === clint.mtimecmp_hi >>> 0 && clint.mtime_lo >>> 0 >= clint.mtimecmp_lo >>> 0;
        if (timerPending) {
            const mip = cpu.csrs.get(836) || 0;
            cpu.csrs.set(836, mip | 128);
            if (!(mip & 32)) {
                cpu.csrs.set(836, (cpu.csrs.get(836) || 0) | 32);
                clint.mtimecmp_lo = clint.mtime_lo + 100000 | 0;
                clint.mtimecmp_hi = clint.mtime_hi;
                if (clint.mtimecmp_lo >>> 0 < clint.mtime_lo >>> 0)
                    clint.mtimecmp_hi++;
                prevMtimecmpLo = clint.mtimecmp_lo;
                prevMtimecmpHi = clint.mtimecmp_hi;
            }
        }
        const newMip = cpu.csrs.get(836) || 0;
        const sie = cpu.csrs.get(260) || 0;
        const _msSie = cpu.csrs.get(768) || 0;
        const sieGlobal = _msSie >> 1 & 1;
        const canFireS = cpu.priv < 1 || cpu.priv === 1 && sieGlobal;
        if (!canFireS)
            return false;
        if (newMip & 512 && sie & 512) {
            trap(cpu, 2147483648 | 9 | 0, 0);
            return true;
        }
        if (newMip & 32 && sie & 32) {
            cpu.csrs.set(3073, clint.mtime_lo);
            cpu.csrs.set(3201, clint.mtime_hi);
            trap(cpu, 2147483648 | 5 | 0, 0);
            return true;
        }
        if (newMip & 2 && sie & 2) {
            trap(cpu, 2147483648 | 1 | 0, 0);
            return true;
        }
        return false;
    };
};
const _1i5bxuy = function _buildDTB(INITRD_ADDR,initramfs,MEMORY_SIZE) {
    const initrdEnd = INITRD_ADDR + initramfs.length;
    return () => {
        const strings = [];
        const strOff = {};
        const addStr = s => {
            if (!(s in strOff)) {
                strOff[s] = strings.reduce((a, b) => a + b.length + 1, 0);
                strings.push(s);
            }
            return strOff[s];
        };
        const FDT_BEGIN_NODE = 1, FDT_END_NODE = 2, FDT_PROP = 3, FDT_END = 9;
        const struct = [];
        const u32 = v => struct.push(v >>> 0);
        const beginNode = name => {
            u32(FDT_BEGIN_NODE);
            const b = new TextEncoder().encode(name + '\0');
            const pad = (4 - b.length % 4) % 4;
            const a = new Uint8Array(b.length + pad);
            a.set(b);
            for (let i = 0; i < a.length; i += 4)
                u32(a[i] << 24 | a[i + 1] << 16 | a[i + 2] << 8 | a[i + 3]);
        };
        const endNode = () => u32(FDT_END_NODE);
        const prop = (name, data) => {
            u32(FDT_PROP);
            u32(data.length);
            u32(addStr(name));
            const pad = (4 - data.length % 4) % 4;
            const a = new Uint8Array(data.length + pad);
            a.set(data);
            for (let i = 0; i < a.length; i += 4)
                u32(a[i] << 24 | a[i + 1] << 16 | a[i + 2] << 8 | a[i + 3]);
        };
        const propU32 = (name, v) => prop(name, new Uint8Array([
            v >>> 24 & 255,
            v >>> 16 & 255,
            v >>> 8 & 255,
            v & 255
        ]));
        const propStr = (name, s) => prop(name, new TextEncoder().encode(s + '\0'));
        const propEmpty = name => prop(name, new Uint8Array(0));
        const propCells = (name, cells) => {
            const d = new Uint8Array(cells.length * 4);
            const dv = new DataView(d.buffer);
            cells.forEach((c, i) => dv.setUint32(i * 4, c));
            prop(name, d);
        };
        beginNode('');
        propU32('#address-cells', 2);
        propU32('#size-cells', 2);
        propStr('compatible', 'riscv-lopecode');
        propStr('model', 'lopecode-sbc');
        beginNode('chosen');
        propStr('bootargs', 'earlycon=sbi console=ttyS0');
        propStr('stdout-path', '/soc/serial@10000000');
        propU32('linux,initrd-start', INITRD_ADDR);
        propU32('linux,initrd-end', initrdEnd);
        endNode();
        beginNode('cpus');
        propU32('#address-cells', 1);
        propU32('#size-cells', 0);
        propU32('timebase-frequency', 10000000);
        beginNode('cpu@0');
        propStr('device_type', 'cpu');
        propU32('reg', 0);
        propStr('compatible', 'riscv');
        propStr('riscv,isa', 'rv32imafdc');
        propStr('mmu-type', 'riscv,sv32');
        propStr('status', 'okay');
        beginNode('interrupt-controller');
        propU32('#interrupt-cells', 1);
        propEmpty('interrupt-controller');
        propStr('compatible', 'riscv,cpu-intc');
        propU32('phandle', 1);
        endNode();
        endNode();
        endNode();
        beginNode('memory@80000000');
        propStr('device_type', 'memory');
        propCells('reg', [
            0,
            2147483648,
            0,
            MEMORY_SIZE
        ]);
        endNode();
        beginNode('soc');
        propU32('#address-cells', 2);
        propU32('#size-cells', 2);
        propStr('compatible', 'simple-bus');
        propEmpty('ranges');
        beginNode('plic@c000000');
        propStr('compatible', 'sifive,plic-1.0.0');
        propU32('#interrupt-cells', 1);
        propEmpty('interrupt-controller');
        propCells('reg', [
            0,
            201326592,
            0,
            67108864
        ]);
        propU32('riscv,ndev', 31);
        propCells('interrupts-extended', [
            1,
            11,
            1,
            9
        ]);
        propU32('phandle', 2);
        endNode();
        beginNode('clint@2000000');
        propStr('compatible', 'riscv,clint0');
        propCells('reg', [
            0,
            33554432,
            0,
            65536
        ]);
        propCells('interrupts-extended', [
            1,
            3,
            1,
            7
        ]);
        endNode();
        beginNode('serial@10000000');
        propStr('compatible', 'ns16550a');
        propCells('reg', [
            0,
            268435456,
            0,
            256
        ]);
        propU32('clock-frequency', 3686400);
        propU32('interrupt-parent', 2);
        propCells('interrupts', [1]);
        endNode();
        endNode();
        endNode();
        u32(FDT_END);
        const strBytes = new TextEncoder().encode(strings.join('\0') + '\0');
        const structBytes = new Uint8Array(struct.length * 4);
        const sv = new DataView(structBytes.buffer);
        struct.forEach((v, i) => sv.setUint32(i * 4, v));
        const rsvMap = new Uint8Array(16);
        const headerSize = 40;
        const rsvMapOff = headerSize;
        const structOff = rsvMapOff + rsvMap.length;
        const strOff2 = structOff + structBytes.length;
        const totalSize = strOff2 + strBytes.length;
        const fdt = new Uint8Array(totalSize + (4 - totalSize % 4) % 4);
        const fdv = new DataView(fdt.buffer);
        fdv.setUint32(0, 3490578157);
        fdv.setUint32(4, fdt.length);
        fdv.setUint32(8, structOff);
        fdv.setUint32(12, strOff2);
        fdv.setUint32(16, rsvMapOff);
        fdv.setUint32(20, 17);
        fdv.setUint32(24, 16);
        fdv.setUint32(28, 0);
        fdv.setUint32(32, strBytes.length);
        fdv.setUint32(36, structBytes.length);
        fdt.set(rsvMap, rsvMapOff);
        fdt.set(structBytes, structOff);
        fdt.set(strBytes, strOff2);
        return fdt;
    };
};
const _kjmtnn = function _dtb(buildDTB){return(
buildDTB()
)};
const _fdi2ix = function _buildInitramfs()
{
    const cpioEntry = (name, mode, nlink, devmajor, devminor, rdevmajor, rdevminor, data) => {
        const nameBytes = new TextEncoder().encode(name);
        const namesize = nameBytes.length + 1;
        const filesize = data ? data.length : 0;
        const header = `070701` + `00000000` + `${ mode.toString(16).padStart(8, '0') }` + `00000000` + `00000000` + `${ nlink.toString(16).padStart(8, '0') }` + `00000000` + `${ filesize.toString(16).padStart(8, '0') }` + `${ devmajor.toString(16).padStart(8, '0') }` + `${ devminor.toString(16).padStart(8, '0') }` + `${ rdevmajor.toString(16).padStart(8, '0') }` + `${ rdevminor.toString(16).padStart(8, '0') }` + `${ namesize.toString(16).padStart(8, '0') }` + `00000000`;
        const headerBytes = new TextEncoder().encode(header);
        const nameAligned = Math.ceil((110 + namesize) / 4) * 4;
        const dataAligned = Math.ceil(filesize / 4) * 4;
        const total = nameAligned + dataAligned;
        const buf = new Uint8Array(total);
        buf.set(headerBytes, 0);
        buf.set(nameBytes, 110);
        if (data)
            buf.set(data, nameAligned);
        return buf;
    };
    return () => {
        const entries = [];
        // /dev directory
        entries.push(cpioEntry('dev', 16877, 2, 0, 0, 0, 0, null));
        // /dev/console - char device major=5, minor=1
        entries.push(cpioEntry('dev/console', 8576, 1, 0, 0, 5, 1, null));
        // /dev/ttyS0 - char device major=4, minor=64
        entries.push(cpioEntry('dev/ttyS0', 8630, 1, 0, 0, 4, 64, null));
        // /dev/null - char device major=1, minor=3
        entries.push(cpioEntry('dev/null', 8630, 1, 0, 0, 1, 3, null));
        // /dev/zero - char device major=1, minor=5
        entries.push(cpioEntry('dev/zero', 8630, 1, 0, 0, 1, 5, null));
        // /dev/tty - char device major=5, minor=0
        entries.push(cpioEntry('dev/tty', 8630, 1, 0, 0, 5, 0, null));
        // /tmp directory
        entries.push(cpioEntry('tmp', 16877, 2, 0, 0, 0, 0, null));
        // Override /init with a script that properly opens the console and starts a shell
        const initScript = `#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev 2>/dev/null

export TERM=linux
export HOME=/
export PATH=/bin:/sbin:/usr/bin:/usr/sbin

echo
echo "=== Linux booted ==="
echo

exec setsid /bin/sh -l </dev/console >/dev/console 2>/dev/console
`;
        const initData = new TextEncoder().encode(initScript);
        entries.push(cpioEntry('init', 33261, 1, 0, 0, 0, 0, initData));
        // TRAILER
        entries.push(cpioEntry('TRAILER!!!', 0, 1, 0, 0, 0, 0, null));
        // Concat and pad to 512-byte boundary
        const totalLen = entries.reduce((s, e) => s + e.length, 0);
        const padded = Math.ceil(totalLen / 512) * 512;
        const result = new Uint8Array(padded);
        let offset = 0;
        for (const e of entries) {
            result.set(e, offset);
            offset += e.length;
        }
        return result;
    };
};
const _1k0g7cd = function _initramfs(buildInitramfs){return(
buildInitramfs()
)};
const _1co3qd5 = function _initSystem(cpu,RAM_BASE,DTB_ADDR,mem,firmware_bytes,dtb,initramfs,INITRD_ADDR,clint,_uart_buffer) {
    const MISA = 1075056941;
    /* rv32imafdcsu: added C(bit2) — was 1075056937 */
    const _cpu = cpu, _RAM_BASE = RAM_BASE, _DTB_ADDR = DTB_ADDR, _mem = mem;
    const _firmware_bytes = firmware_bytes, _dtb = dtb, _initramfs = initramfs;
    const _INITRD_ADDR = INITRD_ADDR, _clint = clint, _buf = _uart_buffer;
    const init = () => {
        _cpu.x = new Int32Array(32);
        _cpu.pc = _RAM_BASE;
        _cpu.priv = 3;
        _cpu.csrs = new Map([
            [
                768,
                0
            ],
            [
                769,
                MISA
            ],
            [
                770,
                0
            ],
            [
                771,
                0
            ],
            [
                772,
                0
            ],
            [
                773,
                0
            ],
            [
                832,
                0
            ],
            [
                833,
                0
            ],
            [
                834,
                0
            ],
            [
                835,
                0
            ],
            [
                836,
                0
            ],
            [
                256,
                0
            ],
            [
                260,
                0
            ],
            [
                261,
                0
            ],
            [
                320,
                0
            ],
            [
                321,
                0
            ],
            [
                322,
                0
            ],
            [
                323,
                0
            ],
            [
                324,
                0
            ],
            [
                384,
                0
            ],
            [
                3857,
                0
            ],
            [
                3858,
                0
            ],
            [
                3859,
                0
            ],
            [
                3860,
                0
            ],
            [
                1,
                0
            ],
            [
                2,
                0
            ],
            [
                3,
                0
            ]
        ]);
        _cpu.f = new Float64Array(32);
        _cpu.x[10] = 0;
        _cpu.x[11] = _DTB_ADDR;
        _cpu.cycle = 0;
        _cpu.halted = false;
        _cpu.lr_addr = -1;
        _cpu.lr_valid = false;
        _cpu.modeHist = [0, 0, 0, 0]; // [0]=user, [1]=supervisor, [2]=wfi, [3]=machine
        _cpu.wfi = false;
        _mem.fill(0);
        if (_firmware_bytes)
            _mem.set(new Uint8Array(_firmware_bytes), 0);
        _mem.set(_dtb, _DTB_ADDR - _RAM_BASE);
        _mem.set(_initramfs, _INITRD_ADDR - _RAM_BASE);
        _clint.msip = 0;
        _clint.mtimecmp_lo = 4294967295;
        _clint.mtimecmp_hi = 2147483647;
        _clint.mtime_lo = 0;
        _clint.mtime_hi = 0;
        _buf.length = 0;
    };
    const getState = () => ({
        cpu: _cpu,
        mem: _mem,
        clint: _clint
    });
    return {
        init,
        getState
    };
};
const _deblkp = function _disassemble(decode,REG_NAMES){return(
inst => {
    if (inst === 807403635)
        return 'mret';
    if (inst === 270532723)
        return 'sret';
    if (inst === 115)
        return 'ecall';
    if (inst === 1048691)
        return 'ebreak';
    if (inst === 273678451)
        return 'wfi';
    const d = decode(inst);
    const rd = REG_NAMES[d.rd], rs1 = REG_NAMES[d.rs1], rs2 = REG_NAMES[d.rs2];
    switch (d.opcode) {
    case 55:
        return `lui ${ rd }, ${ d.imm >>> 12 }`;
    case 23:
        return `auipc ${ rd }, ${ d.imm >>> 12 }`;
    case 111:
        return `jal ${ rd }, ${ d.imm }`;
    case 103:
        return `jalr ${ rd }, ${ rs1 }, ${ d.imm }`;
    case 99: {
            const op = [
                'beq',
                'bne',
                '?',
                '?',
                'blt',
                'bge',
                'bltu',
                'bgeu'
            ][d.funct3];
            return `${ op } ${ rs1 }, ${ rs2 }, ${ d.imm }`;
        }
    case 3: {
            const op = [
                'lb',
                'lh',
                'lw',
                '?',
                'lbu',
                'lhu'
            ][d.funct3] || 'l?';
            return `${ op } ${ rd }, ${ d.imm }(${ rs1 })`;
        }
    case 35: {
            const op = [
                'sb',
                'sh',
                'sw'
            ][d.funct3] || 's?';
            return `${ op } ${ rs2 }, ${ d.imm }(${ rs1 })`;
        }
    case 19: {
            const ops = [
                'addi',
                'slli',
                'slti',
                'sltiu',
                'xori',
                'srli',
                'ori',
                'andi'
            ];
            let name = ops[d.funct3];
            if (d.funct3 === 5 && d.funct7 & 32)
                name = 'srai';
            return `${ name } ${ rd }, ${ rs1 }, ${ d.funct3 === 1 || d.funct3 === 5 ? d.imm & 31 : d.imm }`;
        }
    case 51: {
            const ops = [
                'add',
                'sll',
                'slt',
                'sltu',
                'xor',
                'srl',
                'or',
                'and'
            ];
            let name = ops[d.funct3];
            if (d.funct3 === 0 && d.funct7 & 32)
                name = 'sub';
            if (d.funct3 === 5 && d.funct7 & 32)
                name = 'sra';
            return `${ name } ${ rd }, ${ rs1 }, ${ rs2 }`;
        }
    case 15:
        return 'fence';
    case 115: {
            const CSR_NAMES = {
                768: 'mstatus',
                769: 'misa',
                770: 'medeleg',
                771: 'mideleg',
                772: 'mie',
                773: 'mtvec',
                832: 'mscratch',
                833: 'mepc',
                834: 'mcause',
                835: 'mtval',
                836: 'mip',
                256: 'sstatus',
                260: 'sie',
                261: 'stvec',
                320: 'sscratch',
                321: 'sepc',
                322: 'scause',
                323: 'stval',
                324: 'sip',
                384: 'satp'
            };
            const csr = d.imm & 4095;
            const csrName = CSR_NAMES[csr] || `0x${ csr.toString(16) }`;
            const op = [
                '?',
                'csrrw',
                'csrrs',
                'csrrc',
                '?',
                'csrrwi',
                'csrrsi',
                'csrrci'
            ][d.funct3];
            return `${ op } ${ rd }, ${ csrName }, ${ d.funct3 & 4 ? d.rs1 : rs1 }`;
        }
    default:
        return `??? (0x${ (inst >>> 0).toString(16) })`;
    }
}
)};
const _1gabbd9 = function _memdump(memReadRaw,mem){return(
(addr, count) => {
    const lines = [];
    for (let i = 0; i < count; i += 4) {
        const a = addr + i;
        const val = memReadRaw(mem, a, 4);
        lines.push('0x' + (a >>> 0).toString(16).padStart(8, '0') + ': 0x' + (val >>> 0).toString(16).padStart(8, '0') + ' (' + val + ')');
    }
    return lines.join('\n');
}
)};
const _cz866a = function _doc_compiling(md){return(
md`## Compiling the Firmware

All builds run inside Docker on \`debian:bookworm\` because macOS lacks a Linux-targeting RISC-V cross-compiler with **PIE support** — a hard requirement for OpenSBI's self-relocation.

### Architecture: rv32imafdc (ilp32d)

The emulator implements the full **rv32imafdc** ISA — 32-bit RISC-V with multiply, atomic, single/double floating-point, and compressed (16-bit) instruction extensions. The firmware is compiled with \`-march=rv32imafdc -mabi=ilp32d\`, producing smaller binaries thanks to compressed instructions and enabling hardware FPU usage in userspace.

**Compressed extension (C):** The \`decompress\` cell in the emulator expands 16-bit RV32C instructions to their 32-bit equivalents at runtime. This covers all three quadrants (Q0/Q1/Q2), including integer, float, and double-precision compressed variants (C.FLD, C.FSD, C.FLDSP, C.FSDSP, C.FLW, C.FSW, C.FLWSP, C.FSWSP).

**FPU (F+D):** With \`ilp32d\` ABI, the system uses hardware double-precision floating-point. BusyBox utilities like \`awk\` can perform floating-point math correctly (e.g. \`awk 'BEGIN {print 1.5}'\` outputs \`1.5\`). A custom \`softfloat.c\` library provides 128-bit quad-precision \`long double\` builtins that neither clang compiler-rt nor GCC libgcc ship for rv32.

This architecture applies to all components: OpenSBI (\`rv32imafdc_zifencei\`), the Linux kernel (\`CONFIG_RISCV_ISA_C=y\`, \`CONFIG_FPU=y\`), and BusyBox (clang with \`-march=rv32imafdc\`).
`
)};
const _8ueawl = function _doc_opensbi(md){return(
md`### Milestone 1: OpenSBI (\`fw_jump_pie_dtb.bin\`)

OpenSBI is the Supervisor Binary Interface firmware. It runs in M-mode, initializes CSRs, delegates traps to S-mode, and jumps to the kernel. Our binary is ~270 KB.

**Why PIE?** OpenSBI is linked at address 0 but loaded at \`0x80000000\`. It self-relocates at runtime using Position-Independent Executable relocation entries (~630 entries). Without PIE, all absolute pointers in platform data structures remain 0-based and OpenSBI silently hangs in \`sbi_hart_hang()\`. The bare-metal \`riscv64-elf\` toolchain on macOS does not support PIE — the Linux-targeting \`riscv64-linux-gnu-gcc\` in Ubuntu does.

**Why \`FW_JUMP_FDT_ADDR\`?** OpenSBI's \`fw_jump\` computes the DTB address as \`fw_start + offset\`. The default places it at \`0x82200000\`, beyond our RAM. The FDT parser reads zeroed memory and fails. We override to \`0x80200000\` where the notebook places its runtime-generated DTB.

#### Build command

~~~bash
docker run --rm -v \$PWD/opensbi:/src/opensbi ubuntu:22.04 bash -c '
  apt-get update -qq && apt-get install -y -qq gcc-riscv64-linux-gnu make
  cd /src/opensbi && make clean
  make CROSS_COMPILE=riscv64-linux-gnu- PLATFORM=generic \\
       PLATFORM_RISCV_XLEN=32 PLATFORM_RISCV_ISA=rv32imafdc_zifencei \\
       PLATFORM_RISCV_ABI=ilp32d FW_PIC=y \\
       FW_JUMP=y FW_JUMP_FDT_ADDR=0x80200000 FW_JUMP_ADDR=0x80400000 -j\$(nproc)
  cp build/platform/generic/firmware/fw_jump.bin /src/opensbi/../fw_jump_pie_dtb.bin
'
~~~

#### Debugging history

Getting OpenSBI to boot required fixing five issues:

1. **Seed CSR** (\`0x015\`) returning 0 → infinite stack guard loop. *Fix: return random values.*
2. **misa CSR** (\`0x301\`) missing extension bits → \`cold_boot_allowed\` failed. *Fix: return \`0x40141101\`.*
3. **No PIE relocations** → platform pointers stuck at 0-based addresses. *Fix: Docker build with riscv64-linux-gnu-gcc.*
4. **Compressed C-extension instructions** → illegal instruction at PC 0. *Originally fixed by disabling C ext; now the emulator supports rv32imafdc natively via the \`decompress\` cell.*
5. **Wrong DTB address** → FDT parser reads zeroed memory → hang. *Fix: \`FW_JUMP_FDT_ADDR=0x80200000\`.*
`
)};
const _b629oh = function _fw_jump_pie_dtb(FileAttachment){return(
FileAttachment("fw_jump_pie_dtb.bin.gz")
)};
const _1yobcy4 = function _doc_busybox(md){return(
md`### Milestone 2: BusyBox Boot Image (\`busybox-boot.bin\`)

This is the combined boot image: OpenSBI + Linux 6.1 kernel with a BusyBox initramfs providing an interactive shell (~25.8 MB).

#### Step 1: Build BusyBox (static, rv32imafdc, musl + clang)

**Why musl + clang?** Ubuntu's \`riscv64-linux-gnu-gcc\` ships 64-bit glibc only. Musl is easy to cross-compile, and clang natively supports \`--target=riscv32-linux-musl\`.

**Why softfloat?** rv32 with \`ilp32d\` ABI uses 128-bit quad-precision \`long double\`. Neither clang's compiler-rt nor GCC's libgcc ship prebuilt quad-precision builtins for rv32. We compile a minimal \`softfloat.c\` providing \`__divdi3\`, quad-precision arithmetic, and type conversions.

**Why \`-DBB_GLOBAL_CONST=\`?** BusyBox declares \`ptr_to_globals\` as \`const\` so GCC can optimize reads. Clang on RISC-V caches the old (NULL) value in a register after \`SET_PTR_TO_GLOBALS\`, even through BusyBox's inline-asm barrier workaround. This causes segfaults in any applet started via \`fork+exec\` (e.g. \`vi\`) because the fresh process has \`ptr_to_globals=NULL\` in BSS and clang reuses the stale register instead of reloading. Defining \`BB_GLOBAL_CONST\` as empty removes the \`const\` qualifier, forcing the compiler to always reload from memory. BusyBox documents this flag at \`include/libbb.h:379\` for exactly this class of issue.

**Why \`PREFER_APPLETS\` + \`SH_STANDALONE\`?** These make the shell run NOFORK/NOEXEC applets in-process (no \`exec\`), avoiding the NULL \`ptr_to_globals\` issue entirely for those applets. Regular applets like \`vi\` still need the \`BB_GLOBAL_CONST\` fix.

~~~bash
docker run --rm -v \$PWD:/src debian:bookworm bash -c '
set -e
apt-get update -qq
apt-get install -y -qq clang lld llvm binutils-riscv64-linux-gnu gcc make wget xz-utils cpio bzip2 file bc flex bison libssl-dev rsync

for tool in llvm-ar llvm-ranlib llvm-nm llvm-objdump llvm-readelf llvm-strip; do
    command -v \$tool > /dev/null 2>&1 || { v=\$(ls /usr/bin/\${tool}-* 2>/dev/null | head -1); [ -n "\$v" ] && ln -sf "\$v" /usr/local/bin/\$tool; }
done

BUSYBOX_VERSION=1.36.1; MUSL_VERSION=1.2.5; SYSROOT=/opt/musl-rv32
ARCH_FLAGS="--target=riscv32-linux-musl -march=rv32imafdc -mabi=ilp32d"
cd /src

# 1. Build musl libc
if [ ! -f \${SYSROOT}/lib/libc.a ]; then
    [ ! -f musl-\${MUSL_VERSION}.tar.gz ] && wget -q https://musl.libc.org/releases/musl-\${MUSL_VERSION}.tar.gz
    rm -rf musl-\${MUSL_VERSION} && tar xf musl-\${MUSL_VERSION}.tar.gz && cd musl-\${MUSL_VERSION}
    CC="clang \${ARCH_FLAGS}" AR=llvm-ar RANLIB=llvm-ranlib ./configure --target=riscv32-linux-musl --prefix=\${SYSROOT} --disable-shared --enable-static
    make -j\$(nproc) && make install && cd /src
fi

# 2. Kernel headers
[ ! -f \${SYSROOT}/include/linux/kd.h ] && { cd /src/linux-6.1; make ARCH=riscv INSTALL_HDR_PATH=\${SYSROOT} headers_install; cd /src; }

# 3. Clang wrapper + BusyBox
[ ! -d busybox-\${BUSYBOX_VERSION} ] && tar xf busybox-\${BUSYBOX_VERSION}.tar.bz2
GCC_INTERNAL=\$(clang \${ARCH_FLAGS} -print-resource-dir)/include
cat > /usr/local/bin/rv32-gcc << W
#!/bin/bash
exec clang --target=riscv32-linux-musl -march=rv32imafdc -mabi=ilp32d --sysroot=\${SYSROOT} -nostdinc -isystem \${SYSROOT}/include -isystem \${GCC_INTERNAL} "\\\$@"
W
chmod +x /usr/local/bin/rv32-gcc
for t in ar nm objcopy objdump ranlib readelf strip; do ln -sf \$(which llvm-\$t 2>/dev/null || echo /usr/bin/riscv64-linux-gnu-\$t) /usr/local/bin/rv32-\$t; done
ln -sf /usr/local/bin/rv32-gcc /usr/local/bin/rv32-ld

cd busybox-\${BUSYBOX_VERSION}; make distclean || true; make ARCH=riscv CROSS_COMPILE=rv32- defconfig
sed -i "s/# CONFIG_STATIC is not set/CONFIG_STATIC=y/" .config
sed -i "s|CONFIG_CROSS_COMPILER_PREFIX=\\"\\"|CONFIG_CROSS_COMPILER_PREFIX=\\"rv32-\\"|" .config

rv32-gcc -O2 -c -o /tmp/softfloat.o /src/softfloat.c
llvm-ar rcs \${SYSROOT}/lib/libsoftfloat.a /tmp/softfloat.o
echo "" | rv32-gcc -x c -c -o \${SYSROOT}/lib/crtbeginT.o -
echo "" | rv32-gcc -x c -c -o \${SYSROOT}/lib/crtend.o -
sed -i "s|CONFIG_EXTRA_LDFLAGS=\\"\\"|CONFIG_EXTRA_LDFLAGS=\\"-fuse-ld=lld -nodefaultlibs -static -L\${SYSROOT}/lib -Wl,--start-group -lc -lsoftfloat -Wl,--end-group\\"|" .config
sed -i "s/CONFIG_HWCLOCK=y/# CONFIG_HWCLOCK is not set/" .config
# Disable const on ptr_to_globals — clang on rv32 caches stale NULL (see above)
sed -i "s|CONFIG_EXTRA_CFLAGS=\\"\\"|CONFIG_EXTRA_CFLAGS=\\"-DBB_GLOBAL_CONST=\\"|" .config
# Run applets in-process where safe (NOFORK/NOEXEC applets skip fork+exec)
sed -i "s/# CONFIG_FEATURE_PREFER_APPLETS is not set/CONFIG_FEATURE_PREFER_APPLETS=y/" .config
sed -i "s/# CONFIG_FEATURE_SH_STANDALONE is not set/CONFIG_FEATURE_SH_STANDALONE=y/" .config
yes "" | make ARCH=riscv oldconfig > /dev/null 2>&1
make ARCH=riscv -j\$(nproc)

rm -rf /src/initramfs-busybox; make ARCH=riscv CONFIG_PREFIX=/src/initramfs-busybox install
cd /src/initramfs-busybox; mkdir -p dev proc sys tmp etc
printf "#!/bin/sh\\nmount -t proc proc /proc\\nmount -t sysfs sysfs /sys\\nmount -t devtmpfs devtmpfs /dev 2>/dev/null\\necho \\"=== Linux booted on lopecode RISC-V SBC! ==="\\necho \\"Welcome to BusyBox shell.\\"\\nexec /bin/sh\\n" > init; chmod +x init

gcc -o /tmp/gen_init_cpio /src/linux-6.1/usr/gen_init_cpio.c
printf "nod /dev/console 0622 0 0 c 5 1\\nnod /dev/null 0666 0 0 c 1 3\\nnod /dev/zero 0666 0 0 c 1 5\\nnod /dev/urandom 0444 0 0 c 1 9\\nnod /dev/ttyS0 0666 0 0 c 4 64\\n" > /tmp/devnodes.list
find . | cpio -o -H newc > /src/initramfs-busybox.cpio
/tmp/gen_init_cpio /tmp/devnodes.list >> /src/initramfs-busybox.cpio
'
~~~

Output: \`initramfs-busybox.cpio\` (~1.6 MB)

#### Debugging history

Getting BusyBox applets to run required fixing one critical issue:

1. **\`vi\` segfault at address 0x24** — clang cached stale NULL \`ptr_to_globals\` in a register after \`SET_PTR_TO_GLOBALS\`. BusyBox declares \`ptr_to_globals\` as \`const\` (\`BB_GLOBAL_CONST\`) and uses an inline-asm barrier (\`not_const_pp()\`) to work around clang's tendency to drop stores to const storage. On RISC-V rv32ima, clang still cached the pre-assignment value in a callee-saved register (s3) and reused it for all subsequent field accesses. The fix: \`-DBB_GLOBAL_CONST=\` removes the \`const\` qualifier entirely, forcing the compiler to reload. This is BusyBox's documented escape hatch for "weird arches or toolchains" (see \`include/libbb.h:379\`).
`
)};
const _uh7g8a = function _doc_kernel(md){return(
md`#### Step 2: Build the Linux kernel

**Why Linux 6.1?** Last LTS with full rv32 support — 6.2+ dropped rv32.

The kernel is built with \`CONFIG_RISCV_ISA_C=y\` so the compiler emits compressed instructions, reducing kernel image size.

~~~bash
docker run --rm -v \$PWD:/src debian:bookworm bash -c '
set -e
apt-get update -qq && apt-get install -y -qq gcc-riscv64-linux-gnu gcc make bc flex bison libssl-dev xz-utils cpio
cd /src/linux-6.1
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- rv32_defconfig
scripts/kconfig/merge_config.sh -m .config /src/linux-minimal.config
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig
scripts/config --set-str INITRAMFS_SOURCE "/src/initramfs-busybox.cpio"
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- olddefconfig
# Verify C extension is enabled (emulator supports rv32imafdc)
sed -i "s/# CONFIG_RISCV_ISA_C is not set/CONFIG_RISCV_ISA_C=y/" .config
grep -q "CONFIG_RISCV_ISA_C=y" .config || { echo "ERROR: C ext not enabled!"; exit 1; }
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- clean || true
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- -j\$(nproc) Image
cp arch/riscv/boot/Image /src/Image
'
~~~

Key overrides in \`linux-minimal.config\`:

~~~
CONFIG_ARCH_RV32I=y            # 32-bit
CONFIG_RISCV_ISA_C=y           # Compressed instructions (emulator supports C ext)
CONFIG_FPU=y                   # Hardware floating-point (F+D extensions)
# CONFIG_SMP is not set         # Single hart
# CONFIG_MODULES is not set     # All built-in
# CONFIG_NET is not set          # No network hardware
# CONFIG_BLOCK is not set        # Initramfs only, no disk
# CONFIG_EFI is not set          # EFI stub has compressed instructions
CONFIG_CC_OPTIMIZE_FOR_SIZE=y   # Fit in 48 MB RAM
CONFIG_SERIAL_8250=y            # ns16550a UART
CONFIG_CLINT_TIMER=y            # CLINT at 0x02000000
~~~

Output: \`Image\` (~21.6 MB with embedded initramfs)
`
)};
const _1cf8dqk = function _doc_combined(md){return(
md`#### Step 3: Create the combined boot image

~~~bash
dd if=/dev/zero bs=1 count=4194304 of=busybox-boot.bin
dd if=fw_jump_pie_dtb.bin of=busybox-boot.bin conv=notrunc
cat Image >> busybox-boot.bin  # ~25.8 MB total
~~~

The DTB is **not** in this file — the notebook generates it via \`buildDTB()\` at \`0x80200000\`.

#### Loading and running

1. Use the firmware file input to load \`busybox-boot.bin\`
2. Press **Boot** to start
3. Linux boot takes 50–100M+ emulated cycles — be patient

#### Expected boot log

~~~
OpenSBI v1.8
   ...
[    0.000000] Linux version 6.1.0 ...
[    0.000000] Machine model: lopecode-sbc
[    0.000000] SBI specification v3.0 detected
   ...
=== Linux booted on lopecode RISC-V SBC! ===
Welcome to BusyBox shell.
/ #
~~~
`
)};
const _1753c = function _busybox(FileAttachment){return(
FileAttachment("busybox-boot.bin.gz")
)};
const _46dl6k = function identity(x) {
  return x;
};
const _1c67zte = function _decompress() {
    const sext = (val, bits) => {
        const m = 1 << bits - 1;
        return (val ^ m) - m;
    };
    const itype = (imm, rs1, f3, rd, op) => (imm & 4095) << 20 | rs1 << 15 | f3 << 12 | rd << 7 | op;
    const stype = (imm, rs2, rs1, f3, op) => (imm >> 5 & 127) << 25 | rs2 << 20 | rs1 << 15 | f3 << 12 | (imm & 31) << 7 | op;
    const rtype = (f7, rs2, rs1, f3, rd, op) => f7 << 25 | rs2 << 20 | rs1 << 15 | f3 << 12 | rd << 7 | op;
    const utype = (imm20, rd, op) => (imm20 & 1048575) << 12 | rd << 7 | op;
    const btype = (imm, rs1, rs2, f3, op) => (imm >> 12 & 1) << 31 | (imm >> 5 & 63) << 25 | rs2 << 20 | rs1 << 15 | f3 << 12 | (imm >> 1 & 15) << 8 | (imm >> 11 & 1) << 7 | op;
    const jtype = (imm, rd, op) => (imm >> 20 & 1) << 31 | (imm >> 1 & 1023) << 21 | (imm >> 11 & 1) << 20 | (imm >> 12 & 255) << 12 | rd << 7 | op;
    const cjOff = c => {
        const off = c >> 1 & 2048 | c >> 7 & 16 | c >> 1 & 768 | c << 2 & 1024 | c >> 1 & 64 | c << 1 & 128 | c >> 2 & 14 | c << 3 & 32;
        return sext(off, 12);
    };
    const cbOff = c => {
        const off = c >> 4 & 256 | c >> 7 & 24 | c << 1 & 192 | c >> 2 & 6 | c << 3 & 32;
        return sext(off, 9);
    };
    return c => {
        const op = c & 3;
        const funct3 = c >> 13 & 7;
        const rd_p = (c >> 2 & 7) + 8;
        const rs1_p = (c >> 7 & 7) + 8;
        const rs2_p = (c >> 2 & 7) + 8;
        const rd = c >> 7 & 31;
        const rs2 = c >> 2 & 31;
        if (op === 0) {
            switch (funct3) {
            case 0: {
                    // C.ADDI4SPN
                    const nzuimm = c >> 1 & 960 | c >> 7 & 48 | c >> 2 & 8 | c >> 4 & 4;
                    if (nzuimm === 0)
                        return 0;
                    return itype(nzuimm, 2, 0, rd_p, 19);
                }
            case 1: {
                    // C.FLD — fld rd', offset(rs1')
                    const off = c >> 7 & 56 | c << 1 & 192;
                    return itype(off, rs1_p, 3, rd_p, 7);    // fld: funct3=3, opcode=0x07
                }
            case 2: {
                    // C.LW
                    const off = c >> 7 & 56 | c >> 4 & 4 | c << 1 & 64;
                    return itype(off, rs1_p, 2, rd_p, 3);
                }
            case 3: {
                    // C.FLW — flw rd', offset(rs1')
                    const off = c >> 7 & 56 | c >> 4 & 4 | c << 1 & 64;
                    return itype(off, rs1_p, 2, rd_p, 7);    // flw: funct3=2, opcode=0x07
                }
            case 5: {
                    // C.FSD — fsd rs2', offset(rs1')
                    const off = c >> 7 & 56 | c << 1 & 192;
                    return stype(off, rs2_p, rs1_p, 3, 39);    // fsd: funct3=3, opcode=0x27
                }
            case 6: {
                    // C.SW
                    const off = c >> 7 & 56 | c >> 4 & 4 | c << 1 & 64;
                    return stype(off, rs2_p, rs1_p, 2, 35);
                }
            case 7: {
                    // C.FSW — fsw rs2', offset(rs1')
                    const off = c >> 7 & 56 | c >> 4 & 4 | c << 1 & 64;
                    return stype(off, rs2_p, rs1_p, 2, 39);    // fsw: funct3=2, opcode=0x27
                }
            default:
                return 0;
            }
        }
        if (op === 1) {
            switch (funct3) {
            case 0: {
                    // C.ADDI / C.NOP
                    const imm = sext(c >> 7 & 32 | c >> 2 & 31, 6);
                    return itype(imm & 4095, rd, 0, rd, 19);
                }
            case 1: {
                    // C.JAL (rv32 only)
                    return jtype(cjOff(c), 1, 111);
                }
            case 2: {
                    // C.LI
                    const imm = sext(c >> 7 & 32 | c >> 2 & 31, 6);
                    return itype(imm & 4095, 0, 0, rd, 19);
                }
            case 3: {
                    // C.LUI / C.ADDI16SP
                    if (rd === 2) {
                        // C.ADDI16SP
                        const imm = sext(c >> 3 & 512 | c >> 2 & 16 | c << 1 & 64 | c << 4 & 384 | c << 3 & 32, 10);
                        if (imm === 0)
                            return 0;
                        return itype(imm & 4095, 2, 0, 2, 19);
                    } else {
                        // C.LUI
                        const imm = sext(c >> 7 & 32 | c >> 2 & 31, 6);
                        if (imm === 0)
                            return 0;
                        return utype(imm & 1048575, rd, 55);
                    }
                }
            case 4: {
                    // ALU group
                    const funct2 = c >> 10 & 3;
                    const shamt = c >> 7 & 32 | c >> 2 & 31;
                    switch (funct2) {
                    case 0:
                        return rtype(0, shamt, rs1_p, 5, rs1_p, 19);
                    // C.SRLI
                    case 1:
                        return rtype(32, shamt, rs1_p, 5, rs1_p, 19);
                    // C.SRAI
                    case 2: {
                            // C.ANDI
                            const imm = sext(c >> 7 & 32 | c >> 2 & 31, 6);
                            return itype(imm & 4095, rs1_p, 7, rs1_p, 19);
                        }
                    case 3: {
                            const funct1 = c >> 12 & 1;
                            const funct2b = c >> 5 & 3;
                            if (funct1 === 0) {
                                switch (funct2b) {
                                case 0:
                                    return rtype(32, rs2_p, rs1_p, 0, rs1_p, 51);
                                // C.SUB
                                case 1:
                                    return rtype(0, rs2_p, rs1_p, 4, rs1_p, 51);
                                // C.XOR
                                case 2:
                                    return rtype(0, rs2_p, rs1_p, 6, rs1_p, 51);
                                // C.OR
                                case 3:
                                    return rtype(0, rs2_p, rs1_p, 7, rs1_p, 51);
                                // C.AND
                                default:
                                    return 0;
                                }
                            }
                            return 0;
                        }
                    default:
                        return 0;
                    }
                }
            case 5:
                return jtype(cjOff(c), 0, 111);
            // C.J
            case 6:
                return btype(cbOff(c), rs1_p, 0, 0, 99);
            // C.BEQZ
            case 7:
                return btype(cbOff(c), rs1_p, 0, 1, 99);
            // C.BNEZ
            default:
                return 0;
            }
        }
        if (op === 2) {
            switch (funct3) {
            case 0: {
                    // C.SLLI
                    const shamt = c >> 7 & 32 | c >> 2 & 31;
                    return rtype(0, shamt, rd, 1, rd, 19);
                }
            case 1: {
                    // C.FLDSP — fld rd, offset(sp)
                    const off = c >> 7 & 32 | c >> 2 & 24 | c << 4 & 448;
                    return itype(off, 2, 3, rd, 7);    // fld: funct3=3, opcode=0x07
                }
            case 2: {
                    // C.LWSP
                    const off = c >> 7 & 32 | c >> 2 & 28 | c << 4 & 192;
                    if (rd === 0)
                        return 0;
                    return itype(off, 2, 2, rd, 3);
                }
            case 3: {
                    // C.FLWSP — flw rd, offset(sp)
                    const off = c >> 7 & 32 | c >> 2 & 28 | c << 4 & 192;
                    return itype(off, 2, 2, rd, 7);    // flw: funct3=2, opcode=0x07
                }
            case 4: {
                    // C.JR / C.MV / C.JALR / C.ADD / C.EBREAK
                    const bit12 = c >> 12 & 1;
                    if (bit12 === 0) {
                        if (rs2 === 0) {
                            // C.JR
                            if (rd === 0)
                                return 0;
                            return itype(0, rd, 0, 0, 103);
                        } else {
                            // C.MV
                            return rtype(0, rs2, 0, 0, rd, 51);
                        }
                    } else {
                        if (rs2 === 0 && rd === 0) {
                            // C.EBREAK
                            return 1048691;
                        } else if (rs2 === 0) {
                            // C.JALR
                            return itype(0, rd, 0, 1, 103);
                        } else {
                            // C.ADD
                            return rtype(0, rs2, rd, 0, rd, 51);
                        }
                    }
                }
            case 5: {
                    // C.FSDSP — fsd rs2, offset(sp)
                    const off = c >> 7 & 56 | c >> 1 & 448;
                    return stype(off, rs2, 2, 3, 39);    // fsd: funct3=3, opcode=0x27
                }
            case 6: {
                    // C.SWSP
                    const off = c >> 7 & 60 | c >> 1 & 192;
                    return stype(off, rs2, 2, 2, 35);
                }
            case 7: {
                    // C.FSWSP — fsw rs2, offset(sp)
                    const off = c >> 7 & 60 | c >> 1 & 192;
                    return stype(off, rs2, 2, 2, 39);    // fsw: funct3=2, opcode=0x27
                }
            default:
                return 0;
            }
        }
        return 0;
    };
};
const _1lvtswj = function __test_decompress() {return (undefined);};
const _9hvr4b = function __test_mutable() {return (undefined);};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["busybox-boot.bin.gz","fw_jump_pie_dtb.bin.gz"].map((name) => {
    const module_name = "@tomlarkworthy/linux-sbc";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_caemsf", "doc_architecture", ["md"], _caemsf);  
  $def("_edv3hy", "viewof firmware", ["Inputs"], _edv3hy);  
  main.variable(observer("firmware")).define("firmware", ["Generators", "viewof firmware"], (G, _) => G.input(_));  
  $def("_mt1", "mode_timeline", [], _mt1);
  $def("_12tjadh", "continuous_run", ["terminal_display","uart_state","_uart_buffer","advance","cpu","mem","clint","tickTimer","memRead","memWrite","execute","decode","plic_state","initSystem","mode_timeline"], _12tjadh);  
  $def("_1mgl4ec", null, ["downloadAnchor","md"], _1mgl4ec);  
  $def("_p98yey", "doc_emulator", ["md"], _p98yey);  
  $def("_exl42o", "initial advances", [], _exl42o);  
  main.variable(observer("mutable advances")).define("mutable advances", ["Mutable", "initial advances"], (M, _) => new M(_));  
  main.variable(observer("advances")).define("advances", ["mutable advances"], _ => _.generator);  
  $def("_12zcn4c", "terminal_display", [], _12zcn4c);  
  $def("_130fe2x", "firmware_bytes", ["firmware","unzip","busybox","fw_jump_pie_dtb"], _130fe2x);  
  $def("_1dyoswu", "unzip", ["Response","DecompressionStream"], _1dyoswu);  
  $def("_nexewq", "MEMORY_SIZE", [], _nexewq);  
  $def("_g6bi8n", "RAM_BASE", [], _g6bi8n);  
  $def("_sw1fz7", "UART_BASE", [], _sw1fz7);  
  $def("_hw4aln", "CLINT_BASE", [], _hw4aln);  
  $def("_1lpxlik", "PLIC_BASE", [], _1lpxlik);  
  $def("_17llt2p", "DTB_ADDR", [], _17llt2p);  
  $def("_igp0q3", "INITRD_ADDR", [], _igp0q3);  
  $def("_1y0t3b0", "REG_NAMES", [], _1y0t3b0);  
  $def("_ezjmx9", "cpu", [], _ezjmx9);  
  $def("_qte512", "mem", ["MEMORY_SIZE"], _qte512);  
  $def("_1h4qqn4", "advance", ["decompress"], _1h4qqn4);  
  $def("_15n1eyw", "clint", [], _15n1eyw);  
  $def("_1yezvkf", "uart_state", ["_uart_buffer"], _1yezvkf);  
  $def("_fc76lw", "_uart_buffer", [], _fc76lw);  
  $def("_10ymqgw", "plic_state", [], _10ymqgw);  
  $def("_1d3xnb6", "decode", [], _1d3xnb6);  
  $def("_sgo4nt", "execute", ["trap"], _sgo4nt);  
  $def("_1yb74p8", "trap", [], _1yb74p8);  
  $def("_c256r5", "translate", [], _c256r5);  
  $def("_7m3vc", "memReadRaw", ["RAM_BASE"], _7m3vc);  
  $def("_rcs98h", "memRead", ["uart_state","plic_state","translate","memReadRaw","trap","UART_BASE","PLIC_BASE","CLINT_BASE","clint"], _rcs98h);  
  $def("_19sxnxs", "memWrite", ["uart_state","plic_state","translate","memReadRaw","trap","UART_BASE","_uart_buffer","PLIC_BASE","CLINT_BASE","clint","RAM_BASE"], _19sxnxs);  
  $def("_cqhb58", "checkPLIC", [], _cqhb58);  
  $def("_1jid5rm", "tickTimer", ["checkPLIC","trap"], _1jid5rm);  
  $def("_1i5bxuy", "buildDTB", ["INITRD_ADDR","initramfs","MEMORY_SIZE"], _1i5bxuy);  
  $def("_kjmtnn", "dtb", ["buildDTB"], _kjmtnn);  
  $def("_fdi2ix", "buildInitramfs", [], _fdi2ix);  
  $def("_1k0g7cd", "initramfs", ["buildInitramfs"], _1k0g7cd);  
  $def("_1co3qd5", "initSystem", ["cpu","RAM_BASE","DTB_ADDR","mem","firmware_bytes","dtb","initramfs","INITRD_ADDR","clint","_uart_buffer"], _1co3qd5);  
  $def("_deblkp", "disassemble", ["decode","REG_NAMES"], _deblkp);  
  $def("_1gabbd9", "memdump", ["memReadRaw","mem"], _1gabbd9);  
  $def("_cz866a", "doc_compiling", ["md"], _cz866a);  
  $def("_8ueawl", "doc_opensbi", ["md"], _8ueawl);  
  $def("_b629oh", "fw_jump_pie_dtb", ["FileAttachment"], _b629oh);  
  $def("_1yobcy4", "doc_busybox", ["md"], _1yobcy4);  
  $def("_uh7g8a", "doc_kernel", ["md"], _uh7g8a);  
  $def("_1cf8dqk", "doc_combined", ["md"], _1cf8dqk);  
  $def("_1753c", "busybox", ["FileAttachment"], _1753c);  
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("downloadAnchor", _));  
  $def("_1c67zte", "decompress", [], _1c67zte);  
  $def("_1lvtswj", "_test_decompress", [], _1lvtswj);  
  $def("_9hvr4b", "_test_mutable", [], _9hvr4b);
  return main;
}
