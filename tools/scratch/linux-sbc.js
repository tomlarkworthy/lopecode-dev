const _4i4zm7 = function _advances() {return (0);};
const _y5mpqe = function _anonymous(md) {return (md`# Linux SBC`);};
const _1inpee3 = function _firmware(Inputs) {return (Inputs.file({
    label: 'Load firmware (.bin)',
    accept: '.bin,.elf'
}));};
const _xrwa1k = function _firmware_bytes(firmware) {return (firmware ? firmware.arrayBuffer() : null);};
const _772pfm = function _cpu() {return ({
    x: new Int32Array(32),
    pc: 2147483648,
    priv: 3,
    csrs: new Map([
        [768, 0], [769, 1075056897], [770, 0], [771, 0], [772, 0], [773, 0],
        [832, 0], [833, 0], [834, 0], [835, 0], [836, 0],
        [256, 0], [260, 0], [261, 0], [320, 0], [321, 0], [322, 0], [323, 0], [324, 0], [384, 0],
        [3857, 0], [3858, 0], [3859, 0], [3860, 0]
    ]),
    cycle: 0,
    halted: false,
    lr_addr: -1,
    lr_valid: false
});};
const _7o8ll7 = function _mem(MEMORY_SIZE) {return (new Uint8Array(MEMORY_SIZE));};
const _zy15gv = function _clint() {return ({
    msip: 0,
    mtimecmp_lo: 4294967295,
    mtimecmp_hi: 2147483647,
    mtime_lo: 0,
    mtime_hi: 0
});};
const _izm6sb = function _initSystem(cpu,RAM_BASE,DTB_ADDR,mem,firmware_bytes,dtb,initramfs,INITRD_ADDR,clint,_uart_buffer) {
    const MISA = 1075056897;
    const init = () => {
        cpu.x = new Int32Array(32);
        cpu.pc = RAM_BASE;
        cpu.priv = 3;
        cpu.csrs = new Map([
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
            ]
        ]);
        cpu.x[10] = 0;
        cpu.x[11] = DTB_ADDR;
        cpu.cycle = 0;
        cpu.halted = false;
        cpu.lr_addr = -1;
        cpu.lr_valid = false;
        mem.fill(0);
        if (firmware_bytes)
            mem.set(new Uint8Array(firmware_bytes), 0);
        mem.set(dtb, DTB_ADDR - RAM_BASE);
        mem.set(initramfs, INITRD_ADDR - RAM_BASE);
        clint.msip = 0;
        clint.mtimecmp_lo = 4294967295;
        clint.mtimecmp_hi = 2147483647;
        clint.mtime_lo = 0;
        clint.mtime_hi = 0;
        _uart_buffer.length = 0;
    };
    const getState = () => ({
        cpu,
        mem,
        clint
    });
    return {
        init,
        getState
    };
};
const _vqev79 = function _continuous_run(terminal_display,uart_state,_uart_buffer,advance,cpu,mem,clint,tickTimer,memRead,memWrite,execute,decode,plic_state,initSystem) {
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
const _o1wodf = function _REG_NAMES() {return ([
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
]);};
const _1bep8s9 = function _MEMORY_SIZE() {return (48 * 1024 * 1024);};
const _4hk4tg = function _RAM_BASE() {return (2147483648);};
const _2jb14w = function _UART_BASE() {return (268435456);};
const _vi6b4o = function _CLINT_BASE() {return (33554432);};
const _bxuhs6 = function _DTB_ADDR() {return (2149580800);};
const _1a07c42 = function _INITRD_ADDR() {return (2176843776);};
const _1jhipsj = function __uart_buffer() {return ([]);};
const _bne2mp = function _decode() {return (inst => {
    const opcode = inst & 127;
    const rd = inst >>> 7 & 31;
    const funct3 = inst >>> 12 & 7;
    const rs1 = inst >>> 15 & 31;
    const rs2 = inst >>> 20 & 31;
    const funct7 = inst >>> 25 & 127;
    // Immediate decoding per format
    let imm = 0;
    const type = opcode === 55 || opcode === 23 ? 'U' : opcode === 111 ? 'J' : opcode === 99 ? 'B' : opcode === 35 ? 'S' : opcode === 51 ? 'R' : 'I';
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
});};
const _1q7elrb = function _disassemble(decode,REG_NAMES) {return (inst => {
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
});};
const _1ez5qqc = function _trap() {return ((cpu, cause, tval) => {
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
        // Update sstatus: save SIE (bit 1) to SPIE (bit 5), save priv to SPP (bit 8), clear SIE
        const sstatus = cpu.csrs.get(256) || 0;
        const sie = sstatus >> 1 & 1;
        const newSstatus = sstatus & ~290 | sie << 5 | cpu.priv << 8;
        // SPP = prev priv, SPIE = old SIE, SIE = 0
        cpu.csrs.set(256, newSstatus);
        // Mirror to mstatus
        const mstatus = cpu.csrs.get(768) || 0;
        cpu.csrs.set(768, mstatus & ~290 | newSstatus & 290);
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
});};
const _j38254 = function _translate() {return ((cpu, mem, vaddr, accessType, memReadRaw) => {
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
            const sstatus = cpu.csrs.get(256) || 0;
            if (!(sstatus & 1 << 18))
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
        const sstatus = cpu.csrs.get(256) || 0;
        if (!(sstatus & 1 << 18))
            return {
                pa: 0,
                ok: false,
                fault: pageFault
            };    // SUM
    }
    const ppn_full = pte0 >>> 10 & 4194303;
    const pa = ppn_full << 12 | offset;
    return {
        pa,
        ok: true
    };
});};
const _h84f9j = function _memReadRaw(RAM_BASE) {return ((mem, addr, size) => {
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
});};
const _1906fzv = function _memRead(uart_state,plic_state,translate,memReadRaw,trap,UART_BASE,PLIC_BASE,CLINT_BASE,clint) {
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
const _1enwif7 = function _memWrite(uart_state,plic_state,translate,memReadRaw,trap,UART_BASE,_uart_buffer,PLIC_BASE,CLINT_BASE,clint,RAM_BASE) {
    const uart = uart_state;
    const plic = plic_state;
    return (cpu, mem, addr, size, val) => {
        const t = translate(cpu, mem, addr, 2, memReadRaw);
        if (!t.ok) {
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
const _1ii1fdo = function _execute(trap) {return ((d, cpu, mem, memRead, memWrite) => {
    const x = cpu.x;
    const rs1v = x[d.rs1], rs2v = x[d.rs2];
    let nextPC = cpu.pc + 4;
    const startPC = cpu.pc;
    // save to detect traps during mem access
    switch (d.opcode) {
    case 55:
        x[d.rd] = d.imm;
        break;
    // LUI
    case 23:
        x[d.rd] = cpu.pc + d.imm | 0;
        break;
    // AUIPC
    case 111:
        x[d.rd] = cpu.pc + 4;
        nextPC = cpu.pc + d.imm | 0;
        break;
    // JAL
    case 103:
        x[d.rd] = cpu.pc + 4;
        nextPC = rs1v + d.imm & ~1;
        break;
    // JALR
    case 99: {
            // BRANCH
            const taken = d.funct3 === 0 ? rs1v === rs2v : d.funct3 === 1 ? rs1v !== rs2v : d.funct3 === 4 ? rs1v < rs2v : d.funct3 === 5 ? rs1v >= rs2v : d.funct3 === 6 ? rs1v >>> 0 < rs2v >>> 0 : d.funct3 === 7 ? rs1v >>> 0 >= rs2v >>> 0 : false;
            if (taken)
                nextPC = cpu.pc + d.imm | 0;
        }
        break;
    case 3: {
            // LOAD
            const addr = rs1v + d.imm | 0;
            const sz = d.funct3 & 3;
            const bytes = sz === 0 ? 1 : sz === 1 ? 2 : 4;
            let val = memRead(cpu, mem, addr, bytes, 1);
            if (cpu.pc !== startPC) {
                nextPC = cpu.pc;
                break;
            }
            // trap during load
            if (d.funct3 & 4 && bytes < 4)
                val = val & (bytes === 1 ? 255 : 65535);
            x[d.rd] = val;
        }
        break;
    case 35: {
            // STORE
            const addr = rs1v + d.imm | 0;
            const sz = d.funct3 & 3;
            const bytes = sz === 0 ? 1 : sz === 1 ? 2 : 4;
            memWrite(cpu, mem, addr, bytes, rs2v);
            if (cpu.pc !== startPC) {
                nextPC = cpu.pc;
                break;
            }    // trap during store
        }
        break;
    case 19: {
            // OP-IMM
            const shamt = d.imm & 31;
            x[d.rd] = d.funct3 === 0 ? rs1v + d.imm | 0 : d.funct3 === 1 ? rs1v << shamt : d.funct3 === 2 ? rs1v < d.imm ? 1 : 0 : d.funct3 === 3 ? rs1v >>> 0 < d.imm >>> 0 ? 1 : 0 : d.funct3 === 4 ? rs1v ^ d.imm : d.funct3 === 5 ? d.funct7 & 32 ? rs1v >> shamt : rs1v >>> shamt : d.funct3 === 6 ? rs1v | d.imm : rs1v & d.imm;
        }
        break;
    case 51: {
            // OP
            if (d.funct7 === 1) {
                // M extension
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
            // ATOMIC
            if (d.funct3 === 2) {
                const addr = rs1v;
                const f5 = d.funct7 >> 2;
                if (f5 === 2) {
                    // LR.W
                    x[d.rd] = memRead(cpu, mem, addr, 4, 1);
                    if (cpu.pc !== startPC) {
                        nextPC = cpu.pc;
                        break;
                    }
                    cpu.lr_addr = addr;
                    cpu.lr_valid = true;
                } else if (f5 === 3) {
                    // SC.W
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
                    // AMO
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
                trap(cpu, 2, d.inst);
                nextPC = cpu.pc;
            }
        }
        break;
    case 115: {
            // SYSTEM
            const csr = d.imm & 4095;
            if (d.funct3 === 0) {
                if (d.inst === 807403635) {
                    // mret
                    const mstatus = cpu.csrs.get(768) || 0;
                    const mpie = mstatus >> 7 & 1;
                    const mpp = mstatus >> 11 & 3;
                    cpu.csrs.set(768, mstatus & ~6280 | mpie << 3 | 1 << 7 | 0 << 11);
                    cpu.priv = mpp;
                    nextPC = cpu.csrs.get(833) || 0;
                } else if (d.inst === 270532723) {
                    // sret
                    const sstatus = cpu.csrs.get(256) || 0;
                    const spie = sstatus >> 5 & 1;
                    const spp = sstatus >> 8 & 1;
                    cpu.csrs.set(256, sstatus & ~290 | spie << 1 | 1 << 5 | 0 << 8);
                    const mstatus = cpu.csrs.get(768) || 0;
                    cpu.csrs.set(768, mstatus & ~290 | (cpu.csrs.get(256) || 0) & 290);
                    cpu.priv = spp;
                    nextPC = cpu.csrs.get(321) || 0;
                } else if (d.imm === 0) {
                    // ecall
                    trap(cpu, cpu.priv === 0 ? 8 : cpu.priv === 1 ? 9 : 11, 0);
                    nextPC = cpu.pc;
                } else if (d.imm === 1) {
                    // ebreak
                    trap(cpu, 3, cpu.pc);
                    nextPC = cpu.pc;
                } else if (d.inst === 273678451 || d.inst >>> 25 === 9) {
                }
            } else {
                if (csr === 21) {
                    // seed CSR
                    x[d.rd] = 3221225472 | Math.random() * 65535 >>> 0;
                } else {
                    const csrPriv = csr >> 8 & 3;
                    if (cpu.priv < csrPriv) {
                        trap(cpu, 2, d.inst);
                        nextPC = cpu.pc;
                    } else {
                        const csrVal = cpu.csrs.get(csr) || 0;
                        const wval = d.funct3 & 4 ? d.rs1 : rs1v;
                        if (d.funct3 === 1 || d.funct3 === 5) {
                            x[d.rd] = csrVal;
                            cpu.csrs.set(csr, wval);
                        } else if (d.funct3 === 2 || d.funct3 === 6) {
                            x[d.rd] = csrVal;
                            cpu.csrs.set(csr, csrVal | wval);
                        } else if (d.funct3 === 3 || d.funct3 === 7) {
                            x[d.rd] = csrVal;
                            cpu.csrs.set(csr, csrVal & ~wval);
                        }
                    }
                }
            }
        }
        break;
    case 15:
        break;
    // FENCE
    default:
        trap(cpu, 2, d.inst);
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
});};
const _1qlsaqt = function _tickTimer(checkPLIC,trap) {
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
        const sstatus = cpu.csrs.get(256) || 0;
        const sieGlobal = sstatus >> 1 & 1;
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
const _dl9wv8 = function _buildDTB(INITRD_ADDR,initramfs,MEMORY_SIZE) {
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
        // phandle 1 = cpu-intc, phandle 2 = plic
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
        propStr('riscv,isa', 'rv32ima');
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
        // PLIC
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
        // interrupts-extended: context 0 = M-mode ext (11), context 1 = S-mode ext (9)
        propCells('interrupts-extended', [
            1,
            11,
            1,
            9
        ]);
        propU32('phandle', 2);
        endNode();
        // CLINT
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
        // Serial with PLIC interrupt
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
        // phandle of PLIC
        propCells('interrupts', [1]);
        // IRQ 1
        endNode();
        endNode();
        // soc
        endNode();
        // root
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
const _kkhz14 = function _dtb(buildDTB) {return (buildDTB());};
const _1pfm3qb = function _buildInitramfs() {
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
        // Override /init with a script that properly opens the console and starts a shell
        const initScript = `#!/bin/sh
mount -t proc proc /proc 2>/dev/null
mount -t sysfs sysfs /sys 2>/dev/null
mount -t devtmpfs devtmpfs /dev 2>/dev/null

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
const _qa8b6o = function _initramfs(buildInitramfs) {return (buildInitramfs());};
const _wj13w2 = function _memdump(memReadRaw,mem) {return ((addr, count) => {
    const lines = [];
    for (let i = 0; i < count; i += 4) {
        const a = addr + i;
        const val = memReadRaw(mem, a, 4);
        lines.push('0x' + (a >>> 0).toString(16).padStart(8, '0') + ': 0x' + (val >>> 0).toString(16).padStart(8, '0') + ' (' + val + ')');
    }
    return lines.join('\n');
});};
const _1qgesup = function _runUntil(cpu,tickTimer,clint,plic_state,uart_state,memRead,mem,execute,decode,memWrite) {return ((targetPC, maxCycles) => {
    const max = maxCycles || 10000000;
    let i = 0;
    for (; i < max && !cpu.halted; i++) {
        if (cpu.pc === targetPC && i > 0)
            break;
        tickTimer(cpu, clint, plic_state, uart_state, uart_state.rx);
        const inst = memRead(cpu, mem, cpu.pc, 4, 0) >>> 0;
        execute(decode(inst), cpu, mem, memRead, memWrite);
    }
    cpu.value = cpu;
    mem.value = mem;
    clint.value = clint;
    return {
        pc: '0x' + (cpu.pc >>> 0).toString(16),
        cycle: cpu.cycle,
        ran: i,
        regs: {
            a0: cpu.x[10],
            a1: cpu.x[11],
            a5: cpu.x[15],
            s0: cpu.x[8],
            s1: cpu.x[9],
            s2: cpu.x[18],
            s3: cpu.x[19],
            sp: cpu.x[2],
            ra: '0x' + (cpu.x[1] >>> 0).toString(16)
        }
    };
});};
const _fh1tex = function _anonymous(md) {return (md`:::writing{variant="standard" id="48152"}

## Linux SBC — RISC-V Emulator

A browser-based RV32IMA emulator built to boot real firmware (OpenSBI) and eventually Linux. Everything runs in Observable reactive cells — no backend required.

### Architecture

| Component | Detail |
|-----------|--------|
| **CPU** | RV32IMA — base integer + multiply/divide + atomics |
| **Privilege modes** | M (machine), S (supervisor), U (user) |
| **MMU** | Sv32 — 2-level page tables, 4KB/4MB pages |
| **RAM** | 32 MB at \`0x80000000\` |
| **UART** | NS16550A-style at \`0x10000000\` — write-only terminal |
| **CLINT** | Core Local Interruptor at \`0x02000000\` — mtime/mtimecmp + software interrupt |
| **DTB** | Auto-generated FDT at \`0x80200000\` describing the hardware |

### Memory Map

\`\`\`
0x02000000  CLINT (timer + software interrupt)
0x10000000  UART (terminal output)
0x80000000  RAM start — firmware loads here
0x80200000  Device Tree Blob (DTB)
0x80400000  Kernel jump target (FW_JUMP_ADDR)
0x82000000  RAM end (32 MB)
\`\`\`

### Boot Protocol (RISC-V SBI)

On reset the CPU starts in M-mode at \`0x80000000\` with:
- \`a0 = 0\` (hart ID)
- \`a1 = 0x80200000\` (DTB address)

OpenSBI firmware (\`fw_jump.bin\`) initializes M-mode, sets up trap delegation, then jumps to \`0x80400000\` in S-mode where a kernel would be loaded.

### Firmware

Upload a \`.bin\` file via the file picker. The recommended binary is **\`fw_jump_pie_dtb.bin\`** (270 KB) in \`tools/scratch/riscv/\`. It was built with:

\`\`\`
# Docker (needs riscv64-linux-gnu-gcc for PIE support)
make CROSS_COMPILE=riscv64-linux-gnu- PLATFORM=generic \\
     PLATFORM_RISCV_XLEN=32 PLATFORM_RISCV_ISA=rv32ima \\
     FW_JUMP=y FW_JUMP_FDT_ADDR=0x80200000 \\
     FW_JUMP_ADDR=0x80400000 -j4
\`\`\`

Key build requirements:
- **PIE** — OpenSBI self-relocates at runtime (631 relocation entries)
- **No C extension** — our CPU is RV32IMA, not RV32IMAC
- **FW_JUMP_FDT_ADDR=0x80200000** — must match where we place the DTB in RAM

### Key Cells

| Cell | Purpose |
|------|---------|
| \`cpu\` | Mutable CPU state (registers, PC, privilege, CSRs, cycle count) |
| \`mem\` | Mutable 32MB Uint8Array — flat physical memory |
| \`clint\` | Mutable CLINT state (mtime, mtimecmp, msip) |
| \`execute\` | Executes one decoded instruction, modifies cpu/mem |
| \`decode\` | Decodes a 32-bit instruction into fields (opcode, rd, rs1, etc.) |
| \`trap\` | Handles traps — delegates to S-mode via medeleg/mideleg |
| \`translate\` | Sv32 virtual→physical address translation |
| \`memRead\` / \`memWrite\` | Memory access with MMIO dispatch + translation |
| \`tickTimer\` | Increments CLINT mtime, checks for timer/software interrupts |
| \`buildDTB\` | Generates the FDT binary describing our hardware |
| \`step\` | Single-steps one instruction (tied to Step button) |
| \`viewof runN\` | Run 100 / Run 10K / Run 1M / Boot 10M buttons |
| \`viewof reset\` | Resets CPU + loads firmware + DTB into memory |

### Notes for a Connected Claude Session

When paired via claude-code-pairing, you can interact with the emulator through MCP tools:

1. **Reading state** — Use \`get_variable\` for \`cpu\`, \`_uart_buffer\`, \`clint\`, etc.
2. **Running cycles** — Click buttons via \`eval_code\`: \`document.querySelectorAll('button').forEach(b => { if (b.textContent.includes('Run 1M')) b.click() })\`
3. **Circular dependency warning** — Observable's reactive system fights with imperative mutation. The Boot 10M button uses LOCAL state (its own \`c\`, \`m\`, \`cl\` objects) to avoid this. Don't try to write \`mutable cpu\` inside a cell that also reads \`cpu\`.
4. **Firmware upload** — The user must select the file via the browser file picker. You cannot programmatically load files due to browser security. Guide the user to \`tools/scratch/riscv/fw_jump_pie_dtb.bin\`.
5. **Debugging** — The Boot 10M button resets with local state, runs 10M cycles, then writes results back. Check \`_uart_buffer\` for console output and \`cpu.pc\` / \`cpu.csrs\` for CPU state.
6. **Performance** — ~18-25 MIPS in the browser. OpenSBI banner appears in ~10M cycles. Full boot will need 50-100M+.
7. **Adding instructions** — New opcodes go in the \`execute\` cell's switch statement. CSRs are in \`cpu.csrs\` Map keyed by CSR number.

:::`);};
const _1e6r34e = function _anonymous(md) {return (md`
## RISC-V SBC Emulator — System Documentation

### Architecture

| Property | Value |
|----------|-------|
| ISA | RV32IMA (Integer + Multiply/Divide + Atomics) |
| Privilege modes | M-mode, S-mode, U-mode |
| RAM | 32 MB at \`0x80000000–0x81FFFFFF\` |
| MMU | Sv32 (2-level page tables) |
| Timer/IPI | CLINT at \`0x02000000\` |
| Console | UART (16550-style) at \`0x10000000\` |

### Memory Map

| Address | Size | Device |
|---------|------|--------|
| \`0x02000000\` | 64 KB | CLINT (timer + software interrupt) |
| \`0x10000000\` | 8 bytes | UART (TX at +0, LSR at +5) |
| \`0x80000000\` | 32 MB | RAM (firmware loaded here) |
| \`0x80200000\` | ~4 KB | DTB (generated in-browser by buildDTB) |

### Boot Protocol

1. CPU starts in M-mode at \`PC = 0x80000000\`
2. \`a0 = 0\` (hart ID), \`a1 = DTB_ADDR (0x80200000)\`
3. OpenSBI (fw_jump PIE) boots, initializes M-mode, prints banner
4. OpenSBI jumps to S-mode payload address (default \`0x80400000\`)

### Key Cells

| Cell | Purpose |
|------|---------|
| \`cpu\` | Mutable CPU state (x0-x31, pc, priv, csrs, cycle) |
| \`mem\` | Mutable 32MB RAM (Uint8Array) |
| \`clint\` | Mutable CLINT state (msip, mtime, mtimecmp) |
| \`execute\` | Main ALU — dispatches all RV32IMA instructions |
| \`decode\` | Instruction decoder (R/I/S/B/U/J formats) |
| \`trap\` | Exception/interrupt handler with M/S delegation |
| \`translate\` | Sv32 MMU — virtual→physical address translation |
| \`memRead/memWrite\` | Memory access with MMIO dispatch + translation |
| \`tickTimer\` | CLINT timer tick + interrupt check |
| \`buildDTB\` | Generates FDT binary (cpus, memory, CLINT, UART, chosen) |
| \`viewof runN\` | Run buttons (Step 1/10/100/1K/10K + Boot 10M) |
| \`viewof reset\` | Reset CPU/memory/CLINT, reload firmware |
| \`viewof firmware\` | File input to load .bin firmware |
| \`hello_program\` | Built-in test program (M→S mode transition + UART) |

### Firmware: OpenSBI fw_jump (PIE)

The emulator boots **OpenSBI fw_jump** compiled as a Position Independent Executable.
The firmware binary lives at \`tools/scratch/riscv/fw_jump_pie_dtb.bin\`.

**Critical build parameters:**
- \`FW_JUMP_FDT_ADDR=0x80200000\` — must point within our 32MB RAM
- \`FW_TEXT_START=0x80000000\` — load address = RAM base
- \`PLATFORM_RISCV_ISA=rv32ima\` — no compressed (C) instructions
- PIE build required — uses \`riscv64-linux-gnu-gcc\` (not bare-metal \`riscv64-elf-gcc\`)

---

### Off-Notebook Toolchain (Building Boot Images)

#### Prerequisites

- **Docker** (required for cross-compilation with PIE support)
- **macOS Homebrew \`riscv64-elf-gcc\`** — useful for objdump/disassembly but NOT sufficient for PIE builds (bare-metal toolchain lacks Linux ELF support needed for PIE relocations)

#### OpenSBI Source

\`\`\`
tools/scratch/riscv/opensbi/     # Full OpenSBI source tree
tools/scratch/riscv/opensbi/build/platform/generic/firmware/
  fw_jump.bin                     # Raw binary output
  fw_jump.elf                     # ELF with debug symbols (for objdump)
\`\`\`

#### Docker Build Command

\`\`\`bash
# From tools/scratch/riscv/opensbi/
docker run --rm -v "\$(pwd):/src" -w /src ubuntu:22.04 bash -c "
  apt-get update && apt-get install -y gcc-riscv64-linux-gnu make &&
  make clean &&
  make CROSS_COMPILE=riscv64-linux-gnu- \\
       PLATFORM=generic \\
       PLATFORM_RISCV_XLEN=32 \\
       PLATFORM_RISCV_ISA=rv32ima \\
       FW_TEXT_START=0x80000000 \\
       FW_JUMP_ADDR=0x80400000 \\
       FW_JUMP_FDT_ADDR=0x80200000 \\
       FW_PIC=y \\
       -j\$(nproc)
"
\`\`\`

**Important:** Always run \`make clean\` first when changing build parameters like \`FW_JUMP_FDT_ADDR\`.

⚠️ Do NOT use \`CFLAGS='-march=rv32ima'\` — this overrides the compiler's include paths and causes missing header errors. Use \`PLATFORM_RISCV_ISA=rv32ima\` instead.

#### Verifying the Build

\`\`\`bash
# Check fw_next_arg1 returns correct DTB address
riscv64-elf-objdump -d build/platform/generic/firmware/fw_jump.elf | grep -A 20 "fw_next_arg1"
# Should show: lui loads 0x80200 (DTB at 0x80200000)

# Verify no compressed (C) instructions — all instructions should be 4 bytes
riscv64-elf-objdump -d fw_jump.elf | grep -c "\\.[0-9a-f]\\{4\\} "
# Should be 0 (no 2-byte instructions)

# Check relocation count (PIE build should have many)
riscv64-elf-readelf -r fw_jump.elf | tail -5
\`\`\`

#### Test Programs

\`\`\`
tools/scratch/riscv/
  hello.bin         # Compiled bare-metal RISC-V test binary
  start.S           # Assembly startup code
  hello.c           # C test program
  link.ld           # Linker script for bare-metal at 0x80000000
\`\`\`

Built with: \`riscv64-elf-gcc -march=rv32ima -mabi=ilp32 -nostdlib -T link.ld -o hello.elf start.S hello.c && riscv64-elf-objcopy -O binary hello.elf hello.bin\`

---

### Notes for Connected Claude Sessions

1. **Use \`runUntil(targetPC)\`** to run to a specific address — much faster for debugging than stepping
2. **Use \`memdump(addr, byteCount)\`** to inspect memory regions
3. **The \`_uart_buffer\`** array accumulates all UART output — check it to see what firmware printed
4. **CSR numbers:** mstatus=0x300, misa=0x301, medeleg=0x302, mideleg=0x303, mie=0x304, mtvec=0x305, mscratch=0x340, mepc=0x341, mcause=0x342, mtval=0x343, mip=0x344, satp=0x180
5. **The DTB is generated in JS** — changes to buildDTB take effect after Reset
6. **Firmware is loaded via file input** — click "Load firmware" and select \`fw_jump_pie_dtb.bin\`, then "Boot 10M"
7. **If boot hangs at wfi:** likely a CSR value issue — check misa bits, or DTB being read as zeros (wrong DTB address)
8. **Disassemble OpenSBI symbols** with: \`riscv64-elf-objdump -d tools/scratch/riscv/opensbi/build/platform/generic/firmware/fw_jump.elf | grep -A 30 "<function_name>"\`
`);};
const _1golzpf = function _PLIC_BASE() {return (201326592);};
const _1q11fqu = function _uart_state(_uart_buffer) {
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
const _x6qj5i = function _plic_state() {return ({
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
});};
const _cvy9fv = function _anonymous(md) {return (md`## Refactoring Plan

### Goal
Clean architecture: fixed object references for state, \`mutable reset\` for reinitialization, \`mutable tick\` for display updates, \`advance()\` as a pure function.

### Current State (2026-04-05)
- **31 dead cells removed** (debug forensics, old step debugger, unused stubs, old ARM spec, docs)
- **\`uart_state\` + \`plic_state\` bridge cells added** — own the state AND sync with \`globalThis\` for backward compat
- **\`memRead\` + \`memWrite\` rewired** to use \`uart_state\`/\`plic_state\` cell references instead of \`globalThis\`
- **\`tickTimer\` stays on \`globalThis\`** — cell reference version caused SIGILL at init (see below)
- **Boot verified working** throughout all changes

### Known Issue: tickTimer + cell references
When \`tickTimer\` was rewritten to close over \`uart_state\`/\`plic_state\` cell values instead of reading \`globalThis.__plic_state\` fresh each call, the BusyBox init crashed with SIGILL at \`0xc0001d9c\`. Root cause unclear — possibly because \`continuous_run\` depends on \`tickTimer\`, so redefining it causes \`continuous_run\` to recompute (creating overlapping rAF loops). The original reads from \`globalThis\` inside the returned closure (fresh each call), while the cell version closed over the reference at definition time. The objects should be identical but something breaks ~24 seconds into boot.

### Remaining Steps
1. **Investigate tickTimer issue** — try making tickTimer read from \`uart_state\`/\`plic_state\` INSIDE the returned function (not closed over), or break the \`continuous_run → tickTimer\` dependency
2. **Extract \`advance()\`** as a pure function — takes \`(cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, n)\` as params, no reactive deps
3. **Add \`mutable reset\`** — all state cells depend on it, incrementing gives fresh objects
4. **Add \`mutable tick\`** — \`advance()\` increments it after each batch, display cells depend on it
5. **Convert state to plain cells** — \`cpu\`, \`mem\`, \`uart\`, \`plic\`, \`clint\` depend only on \`reset\`, return stable object refs mutated in place
6. **Separate \`continuous_run\` into controls + display** — controls manage rAF loop, display cells (terminal, status bar) react to \`tick\` via \`this\` pattern for DOM reuse
7. **Delete remaining dead cells** — \`hello_program\`, \`runUntil\`, \`mutable uart_output\`, \`initial uart_output\`, etc.
8. **Remove \`globalThis\` side-channels** — once tickTimer is rewired

### Architecture Target
\`\`\`
mutable reset (counter) → cpu, mem, uart, plic, clint (plain cells, stable refs)
mutable tick (counter) → terminal, status_bar (display cells, use "this" for DOM reuse)
advance(cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, n)
  → pure function, increments mutable tick after each batch
continuous_run → thin UI (boot/pause/reset buttons), rAF loop calls advance()
\`\`\`

### Important Lessons
- **Never bulk-delete cells** — refactor one cell at a time, test boot between each
- **CPU state must include \`lr_addr: -1, lr_valid: false\`** — needed for atomic LR/SC instructions
- **Test past init** (~24s / ~1B cycles) — early boot (10M cycles) doesn't catch UART/PLIC/interrupt bugs
- **\`viewof\` cells don't export via \`export_notebook\`** — filed as issue #15, workaround: patch HTML manually
`);};
const _lqh1bp = function _anonymous(md) {return (md`## Refactoring Plan

### Goal
Clean architecture: fixed object references for state, \`advance()\` as a pure function, separated controls from display.

### Completed
- **31 dead cells removed** (debug forensics, old step debugger, unused stubs, old ARM spec, docs)
- **\`uart_state\` + \`plic_state\`** — plain cells, no globalThis
- **\`memRead\` + \`memWrite\`** — use cell references
- **\`tickTimer\`** — no globalThis, receives plic/uart/rx as call-site args from continuous_run
- **\`cpu\`, \`mem\`, \`clint\`** — replaced mutables with plain cells (stable object refs mutated in place)
- **\`initSystem\`** — uses plain cell values directly, no mutable $0/$1/$2
- **Dead cells removed** — hello_program, mutable/initial uart_output, uart_output, _uart_rx_buffer, viewof keyboard, keyboard, globalThis, Mutable
- **Boot verified working** after every change

### Remaining Steps
1. **Extract \`advance()\`** as a pure function — takes \`(cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, plic_state, uart_state, n)\`, returns cycle count
2. **Separate \`continuous_run\` into controls + display** — controls manage rAF loop calling advance(), display cells react via \`this\` pattern for DOM reuse
3. **Add \`mutable tick\`** — advance() increments after each batch, display cells depend on it

### Architecture Target
\`\`\`
cpu, mem, clint, uart_state, plic_state (plain cells, stable refs)
advance(cpu, mem, clint, ...) → pure function, called by rAF loop
continuous_run → thin UI (boot/pause/reset buttons), rAF loop calls advance()
display cells → react to mutable tick for terminal, status updates
\`\`\`

### Important Lessons
- **Never bulk-delete cells** — refactor one cell at a time, test boot between each
- **CPU state must include \`lr_addr: -1, lr_valid: false\`** — needed for atomic LR/SC instructions
- **Test past init** (~24s / ~1B cycles) — early boot (10M cycles) doesn't catch UART/PLIC/interrupt bugs
- **\`viewof\` cells don't export via \`export_notebook\`** — filed as issue #15, workaround: patch HTML manually
- **New plain cells need manual HTML patching** — exporter doesn't persist brand-new runtime cells, only updates existing ones
`);};
const _b11owz = function _advance($0) {return ((cpu, mem, clint, tickTimer, memRead, memWrite, execute, decode, plic, uart, rx, n) => {
    const batch = Math.max(1000, Math.min(n | 0, 5000000));
    for (let i = 0; i < batch && !cpu.halted; i++) {
        tickTimer(cpu, clint, plic, uart, rx);
        const savedPC = cpu.pc;
        const inst = memRead(cpu, mem, cpu.pc, 4, 0) >>> 0;
        if (cpu.pc !== savedPC)
            continue;
        execute(decode(inst), cpu, mem, memRead, memWrite);
    }
    $0.value = $0.value + 1;
    return batch;
});};
const _dazl2z = function _anonymous(md) {return (md`## Refactoring Plan

### Goal
Clean architecture: pure \`advance()\` function, separated controls from display, reactive visualization via \`mutable advances\`.

### Completed
- **31+ dead cells removed** (debug forensics, old step debugger, unused stubs, old ARM spec, hello_program, mutable/initial uart_output, _uart_rx_buffer, viewof keyboard, globalThis, Mutable)
- **\`uart_state\` + \`plic_state\`** — plain cells, no globalThis
- **\`memRead\` + \`memWrite\`** — use cell references
- **\`tickTimer\`** — no globalThis, receives plic/uart/rx as call-site args
- **\`cpu\`, \`mem\`, \`clint\`** — replaced mutables with plain cells (stable object refs mutated in place)
- **\`initSystem\`** — uses plain cell values directly, no mutable refs
- **\`advance()\`** — pure function extracted from continuous_run, increments \`mutable advances\`
- **No cell in linux-sbc uses globalThis anymore**
- **Boot verified working** after every change

### Remaining Steps
1. **Separate \`continuous_run\` into controls + display** — pull terminal rendering into its own cell reacting to \`advances\`. Controls become thin boot/pause UI + rAF loop calling \`advance()\`.
2. **Add uart/plic reset to \`initSystem\`** — currently doesn't reset uart_state or plic_state on reboot
3. **Update \`runUntil\` to use \`advance()\`** — for consistency
4. **Visualization cells** — reactive displays (register view, memory inspector, etc.) that observe \`advances\`

### Architecture
\`\`\`
cpu, mem, clint, uart_state, plic_state (plain cells, stable refs)
advance(cpu, mem, ..., n) → pure function, increments mutable advances
mutable advances → counter, display/viz cells react to it
continuous_run → thin UI (boot/pause/reset), rAF loop calls advance()
terminal → separate cell, reacts to advances, renders _uart_buffer
visualizations → separate cells, react to advances
\`\`\`

### Important Lessons
- **Never bulk-delete cells** — refactor one cell at a time, test boot between each
- **CPU state must include \`lr_addr: -1, lr_valid: false\`** — needed for atomic LR/SC instructions
- **Test past init** (~24s / ~1B cycles) — early boot (10M cycles) doesn't catch UART/PLIC/interrupt bugs
- **\`viewof\` cells don't export via \`export_notebook\`** — filed as issue #15, workaround: patch HTML manually
- **New runtime-defined cells need manual HTML patching** — exporter doesn't persist brand-new cells, only updates existing ones
`);};
const _5c9fyq = function _terminal_display() {
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
const _qn43an = function _checkPLIC() {return ((cpu, plic, uart, rx) => {
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
});};

// --- TinyEMU cells ---
const _tinyemu_asset_base = function(location) { return new URL("tinyemu-assets/", location.href).href; };
const _tinyemu_debug_log = function() { return []; };
const _tinyemu_xhr_log = function() { return []; };
const _tinyemu_term_state = function() { return { out: [], append(s){this.out.push(s); this.version=(this.version||0)+1;}, version: 0 }; };
const _tinyemu_xhr_hook = function(tinyemu_xhr_log) {
  if (!window.__xhrHookInstalled) {
    window.__xhrHookInstalled = true;
    const log = tinyemu_xhr_log;
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u) {
      this.__url = u;
      log.push("[open] " + m + " " + u);
      const r = origOpen.apply(this, arguments);
      this.addEventListener("load", () => {
        try {
          let head = "";
          if (this.response && this.response.byteLength !== undefined) head = "(binary " + this.response.byteLength + " bytes)";
          else if (typeof this.response === "string") head = JSON.stringify(this.response.slice(0, 80));
          log.push("[load " + this.status + "] " + this.__url + " " + head);
        } catch(e) { log.push("[load " + this.status + "] " + this.__url); }
      });
      this.addEventListener("error", () => log.push("[err] " + this.__url));
      return r;
    };
  }
  return { hooked: true };
};
const _tinyemu_globals_stub = function(tinyemu_xhr_hook, tinyemu_term_state) {
  void tinyemu_xhr_hook;
  const term = tinyemu_term_state;
  window.term = { write: (str) => { term.append(str); }, getSize: () => [80, 25] };
  window.update_downloading = () => {};
  window.show_loading = () => {};
  window.graphic_display = () => {};
  window.net_state = null;
  return { installed: true };
};
const _tinyemu_glue = async function(tinyemu_globals_stub, tinyemu_asset_base) {
  void tinyemu_globals_stub;
  const r = await fetch(tinyemu_asset_base + "riscvemu64-wasm.js");
  return await r.text();
};
const _tinyemu_module = async function(tinyemu_globals_stub, tinyemu_glue, tinyemu_debug_log, tinyemu_asset_base, tinyemu_term_state) {
  void tinyemu_globals_stub;
  const glue = tinyemu_glue;
  const dbg = tinyemu_debug_log;
  const wasmResp = await fetch(tinyemu_asset_base + "riscvemu64-wasm.wasm");
  const wasmBinary = new Uint8Array(await wasmResp.arrayBuffer());
  return new Promise((resolve, reject) => {
    const Module = {};
    Module.wasmBinary = wasmBinary;
    Module.print = (str) => { dbg.push("[print] " + str); tinyemu_term_state.append(str + "\n"); };
    Module.printErr = (str) => { dbg.push("[err] " + str); };
    Module.locateFile = (path) => tinyemu_asset_base + path;
    Module.onAbort = (what) => { dbg.push("[onAbort] " + what); reject(new Error("abort: " + what)); };
    Module.onRuntimeInitialized = () => { dbg.push("[runtime] initialized"); resolve(Module); };
    try {
      const fn = new Function("Module", "window", "self", "document", glue + "\n;return Module;");
      fn(Module, window, window, document);
    } catch (e) { dbg.push("[construct err] " + e.message); reject(e); }
  });
};
const _tinyemu_vm = async function(tinyemu_module, tinyemu_debug_log, tinyemu_asset_base) {
  const Module = await tinyemu_module;
  const dbg = tinyemu_debug_log;
  const baseUrl = tinyemu_asset_base + "root-riscv64.cfg";
  dbg.push("[vm_start] calling with baseUrl=" + baseUrl);
  try {
    Module.ccall("vm_start", null,
      ["string", "number", "string", "string", "number", "number", "number", "string"],
      [baseUrl, 64, "", "", 0, 0, 0, ""]);
    dbg.push("[vm_start] returned");
  } catch (e) { dbg.push("[vm_start err] " + e.message); throw e; }
  return { started: true, at: Date.now(), Module };
};
const _tinyemu_term_text = function(tinyemu_vm, tinyemu_term_state) {
  void tinyemu_vm;
  return tinyemu_term_state.out.join("");
};
const _tinyemu_debug_text = function(tinyemu_vm, tinyemu_debug_log) {
  void tinyemu_vm;
  return tinyemu_debug_log.join("\n");
};
const _tinyemu_xhr_log_dump = function(tinyemu_xhr_log) {
  return tinyemu_xhr_log.join("\n");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/linux-sbc";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  // --- Title & UI ---
  $def("_y5mpqe", "_y5mpqe", ["md"], _y5mpqe);
  $def("_5c9fyq", "terminal_display", [], _5c9fyq);
  $def("_vqev79", "continuous_run", ["terminal_display","uart_state","_uart_buffer","advance","cpu","mem","clint","tickTimer","memRead","memWrite","execute","decode","plic_state","initSystem"], _vqev79);
  $def("_1inpee3", "viewof firmware", ["Inputs"], _1inpee3);
  main.variable(observer("firmware")).define("firmware", ["Generators", "viewof firmware"], (G, _) => G.input(_));
  $def("_xrwa1k", "firmware_bytes", ["firmware"], _xrwa1k);

  // --- Constants ---
  $def("_1bep8s9", "MEMORY_SIZE", [], _1bep8s9);
  $def("_4hk4tg", "RAM_BASE", [], _4hk4tg);
  $def("_2jb14w", "UART_BASE", [], _2jb14w);
  $def("_vi6b4o", "CLINT_BASE", [], _vi6b4o);
  $def("_1golzpf", "PLIC_BASE", [], _1golzpf);
  $def("_bxuhs6", "DTB_ADDR", [], _bxuhs6);
  $def("_1a07c42", "INITRD_ADDR", [], _1a07c42);
  $def("_o1wodf", "REG_NAMES", [], _o1wodf);

  // --- CPU & Hardware State ---
  $def("_772pfm", "cpu", [], _772pfm);
  $def("_7o8ll7", "mem", ["MEMORY_SIZE"], _7o8ll7);
  $def("_zy15gv", "clint", [], _zy15gv);
  $def("_1jhipsj", "_uart_buffer", [], _1jhipsj);
  $def("_1q11fqu", "uart_state", ["_uart_buffer"], _1q11fqu);
  $def("_x6qj5i", "plic_state", [], _x6qj5i);

  // --- Core CPU ---
  $def("_bne2mp", "decode", [], _bne2mp);
  $def("_1ii1fdo", "execute", ["trap"], _1ii1fdo);
  $def("_1ez5qqc", "trap", [], _1ez5qqc);
  $def("_j38254", "translate", [], _j38254);
  $def("_h84f9j", "memReadRaw", ["RAM_BASE"], _h84f9j);
  $def("_1906fzv", "memRead", ["uart_state","plic_state","translate","memReadRaw","trap","UART_BASE","PLIC_BASE","CLINT_BASE","clint"], _1906fzv);
  $def("_1enwif7", "memWrite", ["uart_state","plic_state","translate","memReadRaw","trap","UART_BASE","_uart_buffer","PLIC_BASE","CLINT_BASE","clint","RAM_BASE"], _1enwif7);

  // --- Interrupts & Timing ---
  $def("_qn43an", "checkPLIC", [], _qn43an);
  $def("_1qlsaqt", "tickTimer", ["checkPLIC","trap"], _1qlsaqt);

  // --- Execution ---
  $def("_b11owz", "advance", ["mutable advances"], _b11owz);
  $def("_4i4zm7", "initial advances", [], _4i4zm7);
  main.variable(observer("mutable advances")).define("mutable advances", ["Mutable", "initial advances"], (M, _) => new M(_));
  main.variable(observer("advances")).define("advances", ["mutable advances"], _ => _.generator);

  // --- Boot & Init ---
  $def("_dl9wv8", "buildDTB", ["INITRD_ADDR","initramfs","MEMORY_SIZE"], _dl9wv8);
  $def("_kkhz14", "dtb", ["buildDTB"], _kkhz14);
  $def("_1pfm3qb", "buildInitramfs", [], _1pfm3qb);
  $def("_qa8b6o", "initramfs", ["buildInitramfs"], _qa8b6o);
  $def("_izm6sb", "initSystem", ["cpu","RAM_BASE","DTB_ADDR","mem","firmware_bytes","dtb","initramfs","INITRD_ADDR","clint","_uart_buffer"], _izm6sb);

  // --- Debug & Utility ---
  $def("_1q7elrb", "disassemble", ["decode","REG_NAMES"], _1q7elrb);
  $def("_wj13w2", "memdump", ["memReadRaw","mem"], _wj13w2);
  $def("_1qgesup", "runUntil", ["cpu","tickTimer","clint","plic_state","uart_state","memRead","mem","execute","decode","memWrite"], _1qgesup);

  // --- TinyEMU ---
  $def("_te_base", "tinyemu_asset_base", ["location"], _tinyemu_asset_base);
  $def("_te_dlog", "tinyemu_debug_log", [], _tinyemu_debug_log);
  $def("_te_xlog", "tinyemu_xhr_log", [], _tinyemu_xhr_log);
  $def("_te_term", "tinyemu_term_state", [], _tinyemu_term_state);
  $def("_te_xhook", "tinyemu_xhr_hook", ["tinyemu_xhr_log"], _tinyemu_xhr_hook);
  $def("_te_stub", "tinyemu_globals_stub", ["tinyemu_xhr_hook","tinyemu_term_state"], _tinyemu_globals_stub);
  $def("_te_glue", "tinyemu_glue", ["tinyemu_globals_stub","tinyemu_asset_base"], _tinyemu_glue);
  $def("_te_mod", "tinyemu_module", ["tinyemu_globals_stub","tinyemu_glue","tinyemu_debug_log","tinyemu_asset_base","tinyemu_term_state"], _tinyemu_module);
  $def("_te_vm", "tinyemu_vm", ["tinyemu_module","tinyemu_debug_log","tinyemu_asset_base"], _tinyemu_vm);
  $def("_te_termtxt", "tinyemu_term_text", ["tinyemu_vm","tinyemu_term_state"], _tinyemu_term_text);
  $def("_te_dbgtxt", "tinyemu_debug_text", ["tinyemu_vm","tinyemu_debug_log"], _tinyemu_debug_text);
  $def("_te_xdump", "tinyemu_xhr_log_dump", ["tinyemu_xhr_log"], _tinyemu_xhr_log_dump);

  // --- Documentation ---
  $def("_cvy9fv", "_cvy9fv", ["md"], _cvy9fv);
  $def("_lqh1bp", null, ["md"], _lqh1bp);
  $def("_dazl2z", null, ["md"], _dazl2z);
  $def("_fh1tex", null, ["md"], _fh1tex);
  $def("_1e6r34e", null, ["md"], _1e6r34e);
  return main;
}
