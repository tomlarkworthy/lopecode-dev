const _te_tui = function(terminal_display, tinyemu_worker) {
  const td = terminal_display;
  const factory = tinyemu_worker;
  const div = document.createElement("div");
  let w = null;

  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:8px";

  const bootBtn = document.createElement("button");
  bootBtn.textContent = "\u23FB Boot";
  bootBtn.style.cssText = "padding:6px 16px;font-size:14px;font-weight:bold;background:#4a4;color:#fff;border:none;border-radius:4px;cursor:pointer";

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "\u23F8 Pause";
  pauseBtn.style.cssText = "padding:6px 12px;font-size:14px;font-weight:bold;background:#a44;color:#fff;border:none;border-radius:4px;cursor:pointer;display:none";

  const status = document.createElement("span");
  status.style.cssText = "font-family:monospace;font-size:13px;color:#aaa";
  status.textContent = "stopped";

  controls.appendChild(bootBtn);
  controls.appendChild(pauseBtn);
  controls.appendChild(status);
  div.appendChild(controls);
  div.appendChild(td.element);

  let lastIc = 0;
  let lastCpuT = 0;
  let curMhz = "—";
  let peakMhz = 0;
  let runTimeMs = 0;
  let lastRunT = 0;
  let polling = false;
  const poll = () => {
    if (!w || !polling) return;
    const now = performance.now();
    if (w.running && lastRunT > 0) runTimeMs += now - lastRunT;
    lastRunT = w.running ? now : 0;
    if (w.cpuState) {
      const ic = Number(w.cpuState.insn_counter);
      if (ic !== lastIc && lastCpuT > 0) {
        const dt = now - lastCpuT;
        if (dt > 0) {
          const m = (ic - lastIc) / dt / 1000;
          curMhz = m.toFixed(1);
          if (m > peakMhz) peakMhz = m;
        }
      }
      if (ic !== lastIc) { lastIc = ic; lastCpuT = now; }
      if (runTimeMs > 0) {
        const elapsed = (runTimeMs / 1000).toFixed(1);
        const avgMhz = (ic / runTimeMs / 1000).toFixed(1);
        status.textContent = ic.toLocaleString() + " insn | " + curMhz + " / " + peakMhz.toFixed(1) + " peak / " + avgMhz + " avg MHz | " + elapsed + "s";
      }
    }
    td.updateTerm(factory.termState.out);
    requestAnimationFrame(poll);
  };

  const boot = () => {
    if (w) w.terminate();
    factory.termState.out.length = 0;
    factory.termState.version = 0;
    factory.dbg.length = 0;
    td.resetTerm();
    td.term.textContent = "(booting...)";
    status.textContent = "booting...";
    bootBtn.textContent = "\u21BB Restart";
    pauseBtn.style.display = "";
    pauseBtn.textContent = "\u23F8 Pause";
    pauseBtn.style.background = "#a44";
    lastIc = 0;
    lastCpuT = 0;
    curMhz = "—";
    peakMhz = 0;
    runTimeMs = 0;
    lastRunT = 0;
    w = factory.createWorker();
    w.onStateChange = (state) => {
      if (state === "running" && lastRunT === 0) lastRunT = performance.now();
      if (state === "running") {
        pauseBtn.textContent = "\u23F8 Pause";
        pauseBtn.style.background = "#a44";
      } else if (state === "paused") {
        pauseBtn.textContent = "\u25B6 Resume";
        pauseBtn.style.background = "#4a4";
      }
    };
    polling = true;
    requestAnimationFrame(poll);
  };

  bootBtn.onclick = boot;
  pauseBtn.onclick = () => {
    if (!w) return;
    if (w.running) w.pause();
    else w.resume();
  };

  td.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && w) {
      const cmd = td.input.value;
      td.input.value = "";
      w.send(cmd + "\n");
    }
  });

  return div;
};
const _y5mpqe = function _anonymous(md) {return (md`# Linux Emulator
Boot a full **RISC-V 64-bit** Linux 6.1 kernel to a BusyBox shell — entirely in the browser. No server required. Based on [Fabrice Bellard's TinyEMU](https://bellard.org/tinyemu/).`);};
const _docs_overview = function _docs_overview(md) {return (md`## Overview

This notebook boots a complete **Linux 6.1 RISC-V 64-bit** system inside the browser using [Fabrice Bellard's TinyEMU](https://bellard.org/tinyemu/) compiled to WebAssembly. Everything — the bootloader, kernel, root filesystem, emulator, and networking stack — is embedded in this single HTML file. No server required; it works from \`file://\` URLs.

Unlike the original [JSLinux](https://bellard.org/jslinux/) which requires a web server to serve assets and has no offline networking, this notebook is **fully self-contained and portable**. All binary assets are gzip-compressed, base64-encoded, and stored as FileAttachments inside the HTML (~5.6 MB total).

### Boot sequence

1. **BBL** (Berkeley Boot Loader) initializes the RISC-V machine via SBI
2. **Linux 6.1** kernel boots with virtio console and networking
3. **BusyBox initramfs** provides a minimal shell environment (ash, ls, cat, wget, grep, sed, etc.)
4. **Auto network config** runs on first shell prompt — IP, gateway, DNS, and HTTP proxy are set up automatically
`);};
const _docs_changes = function _docs_changes(md) {return (md`## What We Changed from JSLinux

| | JSLinux (2018) | This Notebook |
|---|---|---|
| **Bootloader** | BBL from 2018 riscv-pk | Modern riscv-pk (2023) with HTIF patches |
| **Kernel** | Linux ~4.15 (patched) | Linux 6.1 mainline |
| **Root filesystem** | 4 MB ext2 image + glibc | 159 KB initramfs + musl BusyBox |
| **Asset delivery** | Server-hosted, XHR block-splitting | Embedded FileAttachments, blob URLs |
| **Networking** | None offline | Full JS networking stack |
| **Total size** | ~7.3 MB | ~5.6 MB |

**Why musl instead of glibc?** — glibc's static RISC-V binaries use the \`rdtime\` CSR instruction in user mode for \`clock_gettime\`. TinyEMU traps this as an illegal instruction. musl uses the \`gettimeofday\` syscall instead, avoiding the crash entirely.

**Why not OpenSBI?** — TinyEMU expects HTIF (Host-Target Interface) at fixed memory addresses (\`0x40008000\`/\`0x40008008\`). We patch riscv-pk's BBL to use these addresses via \`#define\` rather than ELF section placement. This is the same approach used by [container2wasm](https://github.com/aspect-build/container2wasm).
`);};
const _docs_networking = function _docs_networking(md) {return (md`## How Networking Works

TinyEMU emulates a **virtio network device**. The guest OS sends/receives raw Ethernet frames. On the JS side, we implement a complete networking stack inside the Web Worker:

**ARP** — Responds to guest ARP requests for the gateway (\`10.0.2.2\`) and DNS (\`10.0.2.3\`) IPs, providing MAC addresses so the guest can route packets.

**DHCP** — Not used. Instead, the shell auto-configures the network on first prompt:
~~~
ifconfig eth0 10.0.2.15 netmask 255.255.255.0 up
route add default gw 10.0.2.2
echo nameserver 10.0.2.3 > /etc/resolv.conf
export http_proxy=http://10.0.2.2:3128
~~~

**DNS-over-HTTPS** — Guest UDP DNS queries to \`10.0.2.3\` are intercepted and resolved via Cloudflare's DoH API (\`1.1.1.1/dns-query\`). No UDP forwarding needed.

**TCP HTTP Proxy** — The guest's \`wget\` connects to \`10.0.2.2:3128\`. The JS proxy parses the HTTP CONNECT/request, upgrades to HTTPS where possible, and fetches via the browser's native \`fetch()\` API. Responses are drip-fed back one chunk per event-loop tick to avoid overwhelming the virtio ring buffer.

**CORS limitation** — Since we use browser \`fetch()\`, only CORS-enabled sites work. Try: \`wget http://httpbin.org/html\`
`);};
const _docs_build = function _docs_build(md) {return (md`## Building the Firmware

Build scripts are in \`tools/scratch/riscv/\` and run in Docker containers. See \`knowledge/tinyemu-build-chain.md\` for full details.

### BBL (Bootloader)
\`\`\`bash
docker run --rm -v $PWD/out-rv64:/out -v $PWD/build-modern-bbl.sh:/build.sh \\
  ubuntu:22.04 bash /build.sh
\`\`\`
Clones riscv-pk at commit \`7e9b671c\`, patches \`machine/htif.c\` to use fixed HTIF addresses, builds with \`riscv64-linux-gnu\` cross-compiler. Output: 22 KB gzipped.

### Kernel (Linux 6.1)
\`\`\`bash
docker run --rm -v $PWD/out-rv64:/out -v $PWD/build-rv64-kernel-6.1.sh:/build.sh \\
  -v /tmp/container2wasm/config/tinyemu:/config ubuntu:22.04 bash /build.sh
\`\`\`
Uses container2wasm's proven \`linux_rv64_config\` with initramfs support added. Critical: \`CONFIG_VIRTIO_CONSOLE=y\`, \`CONFIG_HVC_DRIVER=y\`, \`CONFIG_RISCV_SBI_V01=y\`. Output: 2.2 MB gzipped.

### Initramfs (musl BusyBox)
\`\`\`bash
docker run --rm -v $PWD/out-rv64:/out -v $PWD/build-busybox-musl.sh:/build.sh \\
  ubuntu:22.04 bash /build.sh
\`\`\`
Downloads \`riscv64-linux-musl-cross\` toolchain from musl.cc, builds BusyBox 1.36.1 with ~40 applets. The initramfs \`/init\` mounts proc/sys/devtmpfs and execs \`/bin/sh\`. Output: 159 KB gzipped.

### TinyEMU WASM
The emulator WASM/JS files are from TinyEMU 2019-12-21 (unchanged). Custom \`_te_cpu_*\` exports are patched in for CPU state inspection.
`);};
const _te_ttl = function(tinyemu_term_state) {
  void tinyemu_term_state.version;
  return tinyemu_term_state.out.join("").slice(-1200);
};
const _te_dbgtxt = function(tinyemu_worker, tinyemu_debug_log) {
  void tinyemu_worker;
  return tinyemu_debug_log.join("\n");
};
const _te_termtxt = function(tinyemu_worker, tinyemu_term_state) {
  void tinyemu_worker;
  return tinyemu_term_state.out.join("");
};
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
const _te_dlog = function() { return []; };
const _te_term = function() { return { out: [], append(s){this.out.push(s); this.version=(this.version||0)+1;}, version: 0 }; };
const _te_worker = async function(tinyemu_worker_script, tinyemu_term_state, tinyemu_debug_log, FileAttachment) {
  // Decompress gzipped file attachments
  async function gunzip(attachment) {
    const stream = (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).arrayBuffer();
  }
  const glueCode = new TextDecoder().decode(await gunzip(FileAttachment("riscvemu64-wasm.js")));
  const wasmBuf = await gunzip(FileAttachment("riscvemu64-wasm.wasm"));
  const cfgBuf = await FileAttachment("tinyemu.cfg").arrayBuffer();
  const biosBuf = await gunzip(FileAttachment("bbl64.bin"));
  const kernelBuf = await gunzip(FileAttachment("kernel.bin"));
  const initrdBuf = await gunzip(FileAttachment("initramfs.bin"));
  const assets = { glueCode, wasmBuf, cfgBuf, biosBuf, kernelBuf, initrdBuf };
  const termState = tinyemu_term_state;
  const dbg = tinyemu_debug_log;

  function createWorker() {
    const blob = new Blob([tinyemu_worker_script], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);
    const cpuState = { pc: 0, priv: 0, insn_counter: 0 };
    const handle = {
      worker, cpuState, running: false,
      send: (str) => worker.postMessage({ type: "input", text: str }),
      pause: () => worker.postMessage({ type: "pause" }),
      resume: () => worker.postMessage({ type: "resume" }),
      terminate: () => { handle.running = false; worker.terminate(); },
      onStateChange: null
    };
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "term") termState.append(msg.data);
      else if (msg.type === "debug") dbg.push(msg.data);
      else if (msg.type === "cpu") {
        cpuState.pc = msg.pc; cpuState.priv = msg.priv; cpuState.insn_counter = msg.insn_counter;
      }
      else if (msg.type === "started") {
        handle.running = true;
        dbg.push("[main] worker VM started");
        if (handle.onStateChange) handle.onStateChange("running");
      }
      else if (msg.type === "paused") {
        handle.running = false;
        if (handle.onStateChange) handle.onStateChange("paused");
      }
      else if (msg.type === "resumed") {
        handle.running = true;
        if (handle.onStateChange) handle.onStateChange("running");
      }
      else if (msg.type === "fetch") {
        // Relay fetch from Worker to main thread (blob: Workers can't fetch cross-origin)
        // Target must be CORS-enabled (Access-Control-Allow-Origin: *)
        const safeHeaders = {};
        if (msg.init.headers && msg.init.headers["Accept"]) safeHeaders["Accept"] = msg.init.headers["Accept"];
        dbg.push("[main] fetch relay " + msg.init.method + " " + msg.url);
        fetch(msg.url, { method: msg.init.method, headers: safeHeaders }).then(resp => {
          return resp.text().then(body => {
            dbg.push("[main] fetch done: status=" + resp.status + " len=" + body.length);
            worker.postMessage({ type: "fetchResult", id: msg.id, status: resp.status, statusText: resp.statusText, body: body });
          });
        }).catch(err => {
          dbg.push("[main] fetch error: " + err.message);
          worker.postMessage({ type: "fetchResult", id: msg.id, error: err.message });
        });
      }
      else if (msg.type === "error") {
        dbg.push("[worker error] " + msg.message);
      }
    };
    worker.onerror = (e) => { dbg.push("[worker onerror] " + e.message); };
    const wb = assets.wasmBuf.slice(0);
    const cb = assets.cfgBuf.slice(0);
    const bb = assets.biosBuf.slice(0);
    const kb = assets.kernelBuf.slice(0);
    const rb = assets.initrdBuf.slice(0);
    worker.postMessage({
      type: "init", glueCode: assets.glueCode,
      wasmBinary: wb, cfgBytes: cb, bblBytes: bb, kernelBytes: kb, initrdBytes: rb
    }, [wb, cb, bb, kb, rb]);
    result.lastHandle = handle;
    return handle;
  }
  const result = { createWorker, termState, dbg, lastHandle: null,
    send(text) { if (result.lastHandle) result.lastHandle.send(text); }
  };
  return result;
};
const _te_wscript = function() {
  return [
    'var __paused = false;',
    'var __pendingRAF = null;',
    'self.requestAnimationFrame = function(fn) {',
    '  if (__paused) { __pendingRAF = fn; return -1; }',
    '  return setTimeout(fn, 0);',
    '};',
    'self.cancelAnimationFrame = function(id) { if (id !== -1) clearTimeout(id); };',
    'self.window = self;',
    'self.document = { createElement: function() { return { style: {} }; } };',
    '',
    'var __termBuf = "";',
    'var __netAutoConfigDone = false;',
    'function __autoConfigNet() {',
    '  if (__netAutoConfigDone) return;',
    '  __netAutoConfigDone = true;',
    '  __netDebug("Auto-configuring network...");',
    '  var M = self.__te_Module;',
    '  if (!M) return;',
    '  var qc = M.cwrap("console_queue_char", null, ["number"]);',
    '  var cmds = [',
    '    "ifconfig eth0 10.0.2.15 netmask 255.255.255.0 up",',
    '    "route add default gw 10.0.2.2",',
    '    "echo nameserver 10.0.2.3 > /etc/resolv.conf",',
    '    "export http_proxy=http://10.0.2.2:3128",',
    '    "echo \\\"[net] auto-config done\\\""',
    '  ].join(" && ") + "\\n";',
    '  for (var i = 0; i < cmds.length; i++) qc(cmds.charCodeAt(i));',
    '}',
    'self.term = {',
    '  write: function(str) {',
    '    self.postMessage({ type: "term", data: str });',
    '    if (!__netAutoConfigDone) {',
    '      __termBuf += str;',
    '      if (__termBuf.indexOf("# ") !== -1) __autoConfigNet();',
    '    }',
    '  },',
    '  getSize: function() { return [80, 25]; }',
    '};',
    'self.update_downloading = function() {};',
    'self.show_loading = function() {};',
    'self.graphic_display = function() {};',
    '// === Networking: JS-side Ethernet stack ===',
    'var __netDebug = function(msg) { self.postMessage({ type: "debug", data: "[net] " + msg }); };',
    'var __wasm_heapu8 = null;',
    '',
    '// MAC/IP config',
    'var GW_MAC  = [0x52,0x54,0x00,0x12,0x34,0x56];',
    'var GW_IP   = [10,0,2,2];',
    'var DNS_IP  = [10,0,2,3];',
    'var GUEST_IP= [10,0,2,15];',
    'var MASK    = [255,255,255,0];',
    'var GUEST_MAC = null;',
    '',
    '// Helpers',
    'function ipEq(a,b) { return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===b[3]; }',
    'function macEq(a,b) { return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===b[3]&&a[4]===b[4]&&a[5]===b[5]; }',
    'function u16(hi,lo) { return (hi<<8)|lo; }',
    'function wr16(buf,off,v) { buf[off]=v>>8; buf[off+1]=v&0xff; }',
    'function wr32(buf,off,v) { buf[off]=(v>>24)&0xff; buf[off+1]=(v>>16)&0xff; buf[off+2]=(v>>8)&0xff; buf[off+3]=v&0xff; }',
    'function rd16(buf,off) { return (buf[off]<<8)|buf[off+1]; }',
    'function rd32(buf,off) { return (buf[off]<<24)|(buf[off+1]<<16)|(buf[off+2]<<8)|buf[off+3]; }',
    '',
    '// Checksum',
    'function ipChecksum(buf, off, len) {',
    '  var sum = 0;',
    '  for (var i = 0; i < len; i += 2) {',
    '    sum += (buf[off+i] << 8) | (i+1 < len ? buf[off+i+1] : 0);',
    '  }',
    '  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >> 16);',
    '  return (~sum) & 0xffff;',
    '}',
    '',
    '// Build Ethernet frame',
    'function ethFrame(dstMac, srcMac, etherType, payload) {',
    '  var f = new Uint8Array(14 + payload.length);',
    '  f.set(dstMac, 0); f.set(srcMac, 6);',
    '  wr16(f, 12, etherType);',
    '  f.set(payload, 14);',
    '  return f;',
    '}',
    '',
    '// Build IP packet',
    'function ipPacket(srcIp, dstIp, proto, payload) {',
    '  var hdr = new Uint8Array(20 + payload.length);',
    '  hdr[0] = 0x45; hdr[1] = 0;',
    '  wr16(hdr, 2, 20 + payload.length);',
    '  wr16(hdr, 4, Math.random()*0xffff|0);',
    '  hdr[6] = 0x40; hdr[7] = 0;',
    '  hdr[8] = 64; hdr[9] = proto;',
    '  hdr.set(srcIp, 12); hdr.set(dstIp, 16);',
    '  var ck = ipChecksum(hdr, 0, 20);',
    '  wr16(hdr, 10, ck);',
    '  hdr.set(payload, 20);',
    '  return hdr;',
    '}',
    '',
    '// Send raw frame to VM',
    'function netInject(frame) {',
    '  var M = self.__te_Module;',
    '  if (!M || !__wasm_heapu8) return;',
    '  var ptr = M._malloc(frame.length);',
    '  __wasm_heapu8.set(frame, ptr);',
    '  M._net_write_packet(ptr, frame.length);',
    '  M._free(ptr);',
    '}',
    '',
    '// === ARP handler ===',
    'function handleARP(pkt) {',
    '  if (pkt.length < 28) return;',
    '  var op = rd16(pkt, 6);',
    '  if (op !== 1) return;',
    '  var senderMac = pkt.subarray(8, 14);',
    '  var senderIp = pkt.subarray(14, 18);',
    '  var targetIp = pkt.subarray(24, 28);',
    '  GUEST_MAC = Array.from(senderMac);',
    '  if (ipEq(targetIp, GW_IP) || ipEq(targetIp, DNS_IP)) {',
    '    var reply = new Uint8Array(28);',
    '    wr16(reply, 0, 1); wr16(reply, 2, 0x0800);',
    '    reply[4] = 6; reply[5] = 4; wr16(reply, 6, 2);',
    '    reply.set(GW_MAC, 8);',
    '    reply.set(targetIp, 14);',
    '    reply.set(senderMac, 18);',
    '    reply.set(senderIp, 24);',
    '    netInject(ethFrame(GUEST_MAC, GW_MAC, 0x0806, reply));',
    '    __netDebug("ARP reply for " + targetIp.join("."));',
    '  }',
    '}',
    '',
    '// === DHCP handler ===',
    'function handleDHCP(udpPayload) {',
    '  if (udpPayload.length < 240) return;',
    '  var msgType = udpPayload[0];',
    '  if (msgType !== 1) return;',
    '  var xid = udpPayload.subarray(4, 8);',
    '  var clientMac = udpPayload.subarray(28, 34);',
    '  GUEST_MAC = Array.from(clientMac);',
    '  var magic = rd32(udpPayload, 236);',
    '  if (magic !== 0x63825363) return;',
    '  var dhcpMsgType = 0;',
    '  var i = 240;',
    '  while (i < udpPayload.length) {',
    '    var opt = udpPayload[i]; if (opt === 0xff) break;',
    '    if (opt === 0) { i++; continue; }',
    '    var olen = udpPayload[i+1];',
    '    if (opt === 53) dhcpMsgType = udpPayload[i+2];',
    '    i += 2 + olen;',
    '  }',
    '  var replyType = dhcpMsgType === 1 ? 2 : dhcpMsgType === 3 ? 5 : 0;',
    '  if (!replyType) return;',
    '  __netDebug("DHCP " + (replyType===2?"OFFER":"ACK"));',
    '  var r = new Uint8Array(300);',
    '  r[0] = 2; r[1] = 1; r[2] = 6;',
    '  r.set(xid, 4);',
    '  r.set(GUEST_IP, 16);',
    '  r.set(GW_IP, 20);',
    '  r.set(clientMac, 28);',
    '  wr32(r, 236, 0x63825363);',
    '  var p = 240;',
    '  r[p++]=53; r[p++]=1; r[p++]=replyType;',
    '  r[p++]=1; r[p++]=4; r.set(MASK, p); p+=4;',
    '  r[p++]=3; r[p++]=4; r.set(GW_IP, p); p+=4;',
    '  r[p++]=6; r[p++]=4; r.set(DNS_IP, p); p+=4;',
    '  r[p++]=51; r[p++]=4; wr32(r, p, 86400); p+=4;',
    '  r[p++]=54; r[p++]=4; r.set(GW_IP, p); p+=4;',
    '  r[p++]=0xff;',
    '  var udp = new Uint8Array(8 + p);',
    '  wr16(udp, 0, 67); wr16(udp, 2, 68);',
    '  wr16(udp, 4, 8 + p); wr16(udp, 6, 0);',
    '  udp.set(r.subarray(0, p), 8);',
    '  var ip = ipPacket(GW_IP, [255,255,255,255], 17, udp);',
    '  netInject(ethFrame([0xff,0xff,0xff,0xff,0xff,0xff], GW_MAC, 0x0800, ip));',
    '}',
    '',
    '// === DNS handler (via DNS-over-HTTPS) ===',
    'function handleDNS(srcIp, srcPort, udpPayload) {',
    '  var txid = rd16(udpPayload, 0);',
    '  var qdcount = rd16(udpPayload, 4);',
    '  if (qdcount < 1) return;',
    '  var name = "", pos = 12;',
    '  while (pos < udpPayload.length) {',
    '    var len = udpPayload[pos++];',
    '    if (len === 0) break;',
    '    if (name) name += ".";',
    '    for (var j = 0; j < len; j++) name += String.fromCharCode(udpPayload[pos++]);',
    '  }',
    '  var qtype = rd16(udpPayload, pos);',
    '  __netDebug("DNS query: " + name + " type=" + qtype);',
    '  var dohUrl = "https://1.1.1.1/dns-query?name=" + encodeURIComponent(name) + "&type=" + (qtype===28?"AAAA":"A");',
    '  __OrigFetch(dohUrl, { headers: { "Accept": "application/dns-json" } })',
    '    .then(function(r) { return r.json(); })',
    '    .then(function(json) {',
    '      var answers = (json.Answer || []).filter(function(a) { return a.type === 1; });',
    '      if (answers.length === 0) { __netDebug("DNS: no A record for " + name); return; }',
    '      var ip4 = answers[0].data.split(".").map(Number);',
    '      __netDebug("DNS resolved " + name + " -> " + answers[0].data);',
    '      var resp = new Uint8Array(udpPayload.length + 16);',
    '      wr16(resp, 0, txid);',
    '      wr16(resp, 2, 0x8180);',
    '      wr16(resp, 4, qdcount);',
    '      wr16(resp, 6, 1);',
    '      resp.set(udpPayload.subarray(12), 12);',
    '      var ap = 12 + (pos - 12) + 4;',
    '      wr16(resp, ap, 0xc00c);',
    '      wr16(resp, ap+2, 1);',
    '      wr16(resp, ap+4, 1);',
    '      wr32(resp, ap+6, 300);',
    '      wr16(resp, ap+10, 4);',
    '      resp.set(ip4, ap+12);',
    '      var rLen = ap + 16;',
    '      var udpR = new Uint8Array(8 + rLen);',
    '      wr16(udpR, 0, 53); wr16(udpR, 2, srcPort);',
    '      wr16(udpR, 4, 8 + rLen); wr16(udpR, 6, 0);',
    '      udpR.set(resp.subarray(0, rLen), 8);',
    '      var ipR = ipPacket(DNS_IP, srcIp, 17, udpR);',
    '      netInject(ethFrame(GUEST_MAC, GW_MAC, 0x0800, ipR));',
    '    }).catch(function(e) { __netDebug("DNS error: " + e.message); });',
    '}',
    '',
    '// === TCP state machine ===',
    'var __tcpConns = new Map();',
    'var __tcpNextId = 1;',
    '',
    'function tcpChecksum(srcIp, dstIp, tcpBuf) {',
    '  var plen = tcpBuf.length;',
    '  var pseudo = new Uint8Array(12 + plen + (plen%2));',
    '  pseudo.set(srcIp, 0); pseudo.set(dstIp, 4);',
    '  pseudo[8] = 0; pseudo[9] = 6;',
    '  wr16(pseudo, 10, plen);',
    '  pseudo.set(tcpBuf, 12);',
    '  return ipChecksum(pseudo, 0, pseudo.length);',
    '}',
    '',
    'function tcpSend(conn, flags, payload) {',
    '  var hdrLen = 20;',
    '  var tcp = new Uint8Array(hdrLen + (payload ? payload.length : 0));',
    '  wr16(tcp, 0, conn.dstPort);',
    '  wr16(tcp, 2, conn.srcPort);',
    '  wr32(tcp, 4, conn.sendSeq);',
    '  wr32(tcp, 8, conn.sendAck);',
    '  tcp[12] = (hdrLen/4) << 4;',
    '  tcp[13] = flags;',
    '  wr16(tcp, 14, 65535);',
    '  if (payload) tcp.set(payload, hdrLen);',
    '  var ck = tcpChecksum(conn.dstIp, conn.srcIp, tcp);',
    '  wr16(tcp, 16, ck);',
    '  if (payload) conn.sendSeq = (conn.sendSeq + payload.length) >>> 0;',
    '  if (flags & 0x02) conn.sendSeq = (conn.sendSeq + 1) >>> 0;',
    '  if (flags & 0x01) conn.sendSeq = (conn.sendSeq + 1) >>> 0;',
    '  var ip = ipPacket(conn.dstIp, conn.srcIp, 6, tcp);',
    '  netInject(ethFrame(GUEST_MAC, GW_MAC, 0x0800, ip));',
    '}',
    '',
    '// Drip-feed chunks to guest: send 1 chunk, wait for VM to process, repeat',
    'function tcpDrainQueue(conn) {',
    '  if (conn._drainTimer) return;',
    '  function step() {',
    '    conn._drainTimer = 0;',
    '    if (!conn.sendQueue || conn.sendQueue.length === 0) {',
    '      if (conn.sendFIN) {',
    '        conn.sendFIN = false;',
    '        tcpSend(conn, 0x11, null);',
    '        __tcpConns.delete(conn.key);',
    '        __netDebug("TCP send complete, FIN sent");',
    '      }',
    '      return;',
    '    }',
    '    tcpSend(conn, 0x10, conn.sendQueue.shift());',
    '    conn._drainTimer = setTimeout(step, 0);',
    '  }',
    '  step();',
    '}',
    '',
    'function handleTCP(srcIp, dstIp, tcpBuf) {',
    '  var srcPort = rd16(tcpBuf, 0);',
    '  var dstPort = rd16(tcpBuf, 2);',
    '  var seq = rd32(tcpBuf, 4) >>> 0;',
    '  var ack = rd32(tcpBuf, 8) >>> 0;',
    '  var dataOff = ((tcpBuf[12] >> 4) * 4);',
    '  var flags = tcpBuf[13];',
    '  var payload = tcpBuf.subarray(dataOff);',
    '  var key = srcIp.join(".")+":"+srcPort+"->"+dstIp.join(".")+":"+dstPort;',
    '',
    '  if (flags & 0x02) {',
    '    var conn = { id: __tcpNextId++, srcIp: Array.from(srcIp), srcPort: srcPort,',
    '      dstIp: Array.from(dstIp), dstPort: dstPort,',
    '      recvSeq: (seq+1)>>>0, sendSeq: (Math.random()*0x7fffffff|0)>>>0, sendAck: (seq+1)>>>0,',
    '      state: "syn_rcvd", httpBuf: "", key: key };',
    '    __tcpConns.set(key, conn);',
    '    tcpSend(conn, 0x12, null);',
    '    __netDebug("TCP SYN-ACK " + key);',
    '    return;',
    '  }',
    '',
    '  var conn = __tcpConns.get(key);',
    '  if (!conn) return;',
    '',
    '  if (flags & 0x10) {',
    '    conn.recvSeq = (seq + payload.length) >>> 0;',
    '    conn.sendAck = conn.recvSeq;',
    '    // Drive send queue when ACK arrives',
    '    if (conn.sendQueue && conn.sendQueue.length > 0) tcpDrainQueue(conn);',
    '  }',
    '',
    '  if (payload.length > 0 && (conn.dstPort === 80 || conn.dstPort === 443 || conn.dstPort === 3128)) {',
    '    conn.httpBuf += new TextDecoder().decode(payload);',
    '    __netDebug("TCP data len=" + payload.length + " httpBuf=" + JSON.stringify(conn.httpBuf.substring(0,120)));',
    '    var endOfHeaders = conn.httpBuf.indexOf("\\r\\n\\r\\n");',
    '    __netDebug("endOfHeaders=" + endOfHeaders);',
    '    if (endOfHeaders === -1) return;',
    '    var reqLine = conn.httpBuf.split("\\r\\n")[0];',
    '    var hostMatch = conn.httpBuf.match(/Host:\\s*([^\\r\\n]+)/i);',
    '    var host = hostMatch ? hostMatch[1].trim() : conn.dstIp.join(".");',
    '    var parts = reqLine.split(" ");',
    '    var method = parts[0];',
    '    var path = parts[1] || "/";',
    '    var url;',
    '    if (/^https?:\\/\\//.test(path)) {',
    '      var urlHost = path.replace(/^https?:\\/\\//, "").split("/")[0].split(":")[0];',
    '      var hostIsIP = /^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(urlHost);',
    '      url = hostIsIP ? path : path.replace(/^http:/, "https:");',
    '    } else {',
    '      var isIP = /^\\d+\\.\\d+\\.\\d+\\.\\d+/.test(host.split(":")[0]);',
    '      var scheme = isIP ? "http://" : "https://";',
    '      url = scheme + host + path;',
    '    }',
    '    __netDebug("HTTP " + method + " " + url);',
    '    conn.httpBuf = "";',
    '    var c = conn;',
    '    tcpSend(c, 0x10, null);',
    '    __netDebug("fetch start: " + method + " " + url);',
    '    __OrigFetch(url, {',
    '      method: method,',
    '      headers: { "User-Agent": "wget", "Accept": "*/*" },',
    '      redirect: "follow"',
    '    }).then(function(resp) {',
    '      __netDebug("fetch resp: status=" + resp.status + " type=" + resp.type);',
    '      return resp.text().then(function(body) {',
    '        var statusLine = "HTTP/1.0 " + resp.status + " " + resp.statusText + "\\r\\n";',
    '        var hdrs = "Content-Length: " + body.length + "\\r\\nConnection: close\\r\\n\\r\\n";',
    '        var full = statusLine + hdrs + body;',
    '        var enc = new TextEncoder().encode(full);',
    '        var MTU = 1400;',
    '        var chunks = [];',
    '        for (var off = 0; off < enc.length; off += MTU) {',
    '          chunks.push(enc.subarray(off, Math.min(off + MTU, enc.length)));',
    '        }',
    '        __netDebug("TCP send queue: " + chunks.length + " chunks, " + enc.length + " bytes");',
    '        c.sendQueue = chunks;',
    '        c.sendFIN = true;',
    '        tcpDrainQueue(c);',
    '      });',
    '    }).catch(function(e) {',
    '      __netDebug("fetch error: " + e.message);',
    '      var errBody = "HTTP/1.0 502 Bad Gateway\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n";',
    '      tcpSend(c, 0x10, new TextEncoder().encode(errBody));',
    '      tcpSend(c, 0x11, null);',
    '      __tcpConns.delete(c.key);',
    '    });',
    '  }',
    '',
    '  if (flags & 0x01) {',
    '    conn.sendAck = (seq + 1) >>> 0;',
    '    tcpSend(conn, 0x11, null);',
    '    __tcpConns.delete(key);',
    '  }',
    '}',
    '',
    '// === Main packet dispatcher ===',
    'var __netPktCount = 0;',
    'self.net_state = {',
    '  recv_packet: function(pkt) {',
    '    if (!__wasm_heapu8 || __wasm_heapu8.buffer !== pkt.buffer) __wasm_heapu8 = new Uint8Array(pkt.buffer);',
    '    __netPktCount++;',
    '    __netDebug("recv_packet #" + __netPktCount + " len=" + pkt.length + " etherType=0x" + (pkt.length>=14?rd16(pkt,12).toString(16):"?") + " first6=" + Array.from(pkt.subarray(0,6)).map(function(b){return b.toString(16)}).join(":"));',
    '    if (pkt.length < 14) return;',
    '    var etherType = rd16(pkt, 12);',
    '    if (etherType === 0x0806) {',
    '      handleARP(pkt.subarray(14));',
    '      return;',
    '    }',
    '    if (etherType !== 0x0800) return;',
    '    var ip = pkt.subarray(14);',
    '    if (ip.length < 20) return;',
    '    var ihl = (ip[0] & 0x0f) * 4;',
    '    var proto = ip[9];',
    '    __netDebug("IP proto=" + proto + " src=" + Array.from(ip.subarray(12,16)).join(".") + " dst=" + Array.from(ip.subarray(16,20)).join("."));',
    '    var srcIp = ip.subarray(12, 16);',
    '    var dstIp = ip.subarray(16, 20);',
    '    var body = ip.subarray(ihl);',
    '    if (proto === 17) {',
    '      var udpSrcPort = rd16(body, 0);',
    '      var udpDstPort = rd16(body, 2);',
    '      var udpPayload = body.subarray(8);',
    '      if (udpDstPort === 67 || udpDstPort === 68) { handleDHCP(udpPayload); return; }',
    '      if (udpDstPort === 53) { handleDNS(srcIp, udpSrcPort, udpPayload); return; }',
    '    }',
    '    if (proto === 6) {',
    '      handleTCP(srcIp, dstIp, body);',
    '    }',
    '  }',
    '};',
    '',
    'self.Browser = {',
    '  wgetRequests: {},',
    '  fbuf_table: {},',
    '  fbuf_next_handle: 1,',
    '  _wgetN: 0,',
    '  getNextWgetRequestHandle: function() { return ++this._wgetN; },',
    '  requestAnimationFrame: function(fn) { return self.requestAnimationFrame(fn); },',
    '  safeRequestAnimationFrame: function(fn) { return self.requestAnimationFrame(fn); },',
    '  safeSetTimeout: function(fn, t) { return setTimeout(fn, t); },',
    '  safeSetInterval: function(fn, t) { return setInterval(fn, t); },',
    '  getMimetype: function() { return ""; },',
    '  hasBlobConstructor: true,',
    '  BlobBuilder: null',
    '};',
    '',
    'self.Runtime = {',
    '  dynCall: function(sig, ptr, args) {',
    '    var t = self.__te_wasmTable;',
    '    if (!t) throw new Error("wasmTable not captured");',
    '    return t.get(ptr).apply(null, args || []);',
    '  }',
    '};',
    '',
    'self.addEventListener("error", function(e) {',
    '  try { self.postMessage({ type: "debug", data: "[uncaught] " + e.message + " at " + (e.filename || "?") + ":" + (e.lineno || "?") + " col " + (e.colno || "?") }); } catch(x){}',
    '});',
    'self.addEventListener("unhandledrejection", function(e) {',
    '  try { self.postMessage({ type: "debug", data: "[unhandled-reject] " + String(e.reason) }); } catch(x){}',
    '});',
    '',
    'var __blobUrls = new Map();',
    'var __SHIM_BASE = "http://tinyemu-shim/__te_fa__/";',
    'function __getAsset(url) {',
    '  if (typeof url === "string" && url.startsWith(__SHIM_BASE)) {',
    '    return __blobUrls.get(url.slice(__SHIM_BASE.length)) || null;',
    '  }',
    '  return null;',
    '}',
    'var __OrigXHR = XMLHttpRequest;',
    'function __MockXHR() {',
    '  this._headers = {};',
    '  this._asset = null;',
    '  this._method = "";',
    '  this._url = "";',
    '  this._async = true;',
    '  this._listeners = {};',
    '  this.readyState = 0;',
    '  this.status = 0;',
    '  this.statusText = "";',
    '  this.response = null;',
    '  this.responseText = "";',
    '  this.responseType = "";',
    '  this.onreadystatechange = null;',
    '  this.onload = null;',
    '  this.onerror = null;',
    '  this.onprogress = null;',
    '  this.onloadend = null;',
    '  this._real = null;',
    '}',
    '__MockXHR.prototype.open = function(method, url, async) {',
    '  this._method = method;',
    '  this._url = url;',
    '  this._async = async !== false;',
    '  this._asset = __getAsset(url);',
    '  if (this._asset) {',
    '    this.readyState = 1;',
    '  } else {',
    '    this._real = new __OrigXHR();',
    '    this._real.open(method, url, async);',
    '  }',
    '};',
    '__MockXHR.prototype.send = function(body) {',
    '  if (this._asset) {',
    '    var xhr = this;',
    '    var data = this._asset.data;',
    '    var deliver = function() {',
    '      xhr.readyState = 4;',
    '      xhr.status = 200;',
    '      xhr.statusText = "OK";',
    '      if (xhr.responseType === "arraybuffer") {',
    '        xhr.response = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);',
    '      } else if (xhr.responseType === "text" || xhr.responseType === "") {',
    '        xhr.response = new TextDecoder().decode(data);',
    '        xhr.responseText = xhr.response;',
    '      } else {',
    '        xhr.response = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);',
    '      }',
    '      if (xhr.onreadystatechange) xhr.onreadystatechange();',
    '      if (xhr.onload) xhr.onload();',
    '      var evt = { type: "load", target: xhr };',
    '      if (xhr._listeners.load) xhr._listeners.load.forEach(function(fn) { fn(evt); });',
    '      if (xhr.onloadend) xhr.onloadend();',
    '      if (xhr._listeners.loadend) xhr._listeners.loadend.forEach(function(fn) { fn(evt); });',
    '    };',
    '    if (this._async) { setTimeout(deliver, 0); } else { deliver(); }',
    '  } else if (this._real) {',
    '    var xhr = this;',
    '    this._real.onreadystatechange = function() {',
    '      xhr.readyState = xhr._real.readyState;',
    '      xhr.status = xhr._real.status;',
    '      xhr.response = xhr._real.response;',
    '      xhr.responseText = xhr._real.responseText || "";',
    '      if (xhr.onreadystatechange) xhr.onreadystatechange();',
    '    };',
    '    this._real.onload = function() { if (xhr.onload) xhr.onload(); };',
    '    this._real.onerror = function() { if (xhr.onerror) xhr.onerror(); };',
    '    this._real.send(body);',
    '  }',
    '};',
    '__MockXHR.prototype.setRequestHeader = function(k, v) {',
    '  this._headers[k] = v;',
    '  if (this._real) this._real.setRequestHeader(k, v);',
    '};',
    '__MockXHR.prototype.addEventListener = function(type, fn) {',
    '  if (!this._listeners[type]) this._listeners[type] = [];',
    '  this._listeners[type].push(fn);',
    '  if (this._real) this._real.addEventListener(type, fn);',
    '};',
    '__MockXHR.prototype.removeEventListener = function(type, fn) {',
    '  if (this._listeners[type]) this._listeners[type] = this._listeners[type].filter(function(f) { return f !== fn; });',
    '  if (this._real) this._real.removeEventListener(type, fn);',
    '};',
    '__MockXHR.prototype.getResponseHeader = function(k) {',
    '  if (this._asset) {',
    '    if (k.toLowerCase() === "content-type") return this._asset.type;',
    '    if (k.toLowerCase() === "content-length") return String(this._asset.data.byteLength);',
    '    return null;',
    '  }',
    '  if (this._real) return this._real.getResponseHeader(k);',
    '  return null;',
    '};',
    '__MockXHR.prototype.getAllResponseHeaders = function() {',
    '  if (this._asset) return "content-type: " + this._asset.type + "\\r\\ncontent-length: " + this._asset.data.byteLength + "\\r\\n";',
    '  if (this._real) return this._real.getAllResponseHeaders();',
    '  return "";',
    '};',
    '__MockXHR.prototype.abort = function() { if (this._real) this._real.abort(); };',
    '__MockXHR.prototype.overrideMimeType = function() {};',
    '__MockXHR.DONE = 4;',
    '__MockXHR.LOADING = 3;',
    '__MockXHR.HEADERS_RECEIVED = 2;',
    '__MockXHR.OPENED = 1;',
    '__MockXHR.UNSENT = 0;',
    'self.XMLHttpRequest = __MockXHR;',
    '',
    '// Relay fetch to main thread (Workers from blob: URLs have null origin, CORS blocks them)',
    'var __fetchId = 0;',
    'var __fetchCallbacks = {};',
    'var __OrigFetch = function(url, init) {',
    '  var id = ++__fetchId;',
    '  return new Promise(function(resolve, reject) {',
    '    __fetchCallbacks[id] = { resolve: resolve, reject: reject };',
    '    self.postMessage({ type: "fetch", id: id, url: String(url), init: { method: (init && init.method) || "GET", headers: (init && init.headers) || {} } });',
    '  });',
    '};',
    'self.fetch = function(input, init) {',
    '  if (typeof input === "string") {',
    '    var asset = __getAsset(input);',
    '    if (asset) {',
    '      return Promise.resolve(new Response(asset.data, { status: 200, headers: { "content-type": asset.type } }));',
    '    }',
    '  }',
    '  return __OrigFetch(input, init);',
    '};',
    '',
    'self.onmessage = async function(e) {',
    '  if (e.data.type === "init") {',
    '    try {',
    '      var glueCode = e.data.glueCode;',
    '      var wasmBinary = e.data.wasmBinary;',
    '      var cfgBytes = e.data.cfgBytes;',
    '      var bblBytes = e.data.bblBytes;',
    '      var kernelBytes = e.data.kernelBytes;',
    '      var initrdBytes = e.data.initrdBytes;',
    '',
    '      function addBlob(key, bytes, type) {',
    '        __blobUrls.set(key, { data: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), type: type });',
    '      }',
    '      var cfgStr = new TextDecoder().decode(new Uint8Array(cfgBytes));',
    '      addBlob("tinyemu.cfg", new TextEncoder().encode(cfgStr), "text/plain");',
    '      addBlob("bbl64.bin", new Uint8Array(bblBytes), "application/octet-stream");',
    '      addBlob("kernel.bin", new Uint8Array(kernelBytes), "application/octet-stream");',
    '      addBlob("initramfs.bin", new Uint8Array(initrdBytes), "application/octet-stream");',
    '',
    '      self.postMessage({ type: "debug", data: "[worker] assets ready: " + __blobUrls.size });',
    '      self.postMessage({ type: "debug", data: "[worker] cfg content: " + cfgStr.substring(0, 500) });',
    '',
    '      var factory = (new Function("var module = undefined; var exports = undefined; " + glueCode + "\\nreturn TinyEMU;"))();',
    '',
    '      var Module = await factory({',
    '        wasmBinary: new Uint8Array(wasmBinary),',
    '        print: function(str) { self.postMessage({ type: "term", data: str + "\\n" }); },',
    '        printErr: function(str) { self.postMessage({ type: "debug", data: str }); },',
    '        locateFile: function(path) { return path; },',
    '        onAbort: function(what) { self.postMessage({ type: "debug", data: "[onAbort] " + what }); }',
    '      });',
    '',
    '      self.__te_wasmTable = Module.wasmTable;',
    '      self.__te_Module = Module;',
    '',
    '      var cfgUrl = __SHIM_BASE + "tinyemu.cfg";',
    '      self.postMessage({ type: "debug", data: "[worker] vm_start cfgUrl=" + cfgUrl });',
    '',
    '      self.postMessage({ type: "debug", data: "[net] net_state=" + (self.net_state ? "SET" : "null") });',
    '',
    '      Module.ccall("vm_start", null,',
    '        ["string", "number", "string", "string", "number", "number", "number"],',
    '        [cfgUrl, 64, "", "", 0, 0, 1]);',
    '',
    '      if (typeof Module._net_set_carrier === "function") {',
    '        Module._net_set_carrier(1);',
    '        self.postMessage({ type: "debug", data: "[net] carrier UP (post-vm_start)" });',
    '      }',
    '',
    '      self.postMessage({ type: "started" });',
    '',
    '      if (typeof Module._get_cpu_state === "function") {',
    '        setInterval(function() {',
    '          var ptr = Module._get_cpu_state();',
    '          if (ptr) {',
    '            self.postMessage({',
    '              type: "cpu",',
    '              pc: Module._te_cpu_get_pc(ptr),',
    '              priv: Module._te_cpu_get_priv(ptr),',
    '              insn_counter: Number(Module._te_cpu_get_insn_counter(ptr))',
    '            });',
    '          }',
    '        }, 200);',
    '      }',
    '    } catch(err) {',
    '      self.postMessage({ type: "error", message: err.message, stack: (err.stack || "").slice(0, 1000) });',
    '    }',
    '  }',
    '',
    '  if (e.data.type === "input") {',
    '    var M = self.__te_Module;',
    '    if (M) {',
    '      var qc = M.cwrap("console_queue_char", null, ["number"]);',
    '      var text = String(e.data.text);',
    '      for (var j = 0; j < text.length; j++) qc(text.charCodeAt(j));',
    '    }',
    '  }',
    '',
    '  if (e.data.type === "fetchResult") {',
    '    var cb = __fetchCallbacks[e.data.id];',
    '    if (cb) {',
    '      delete __fetchCallbacks[e.data.id];',
    '      if (e.data.error) cb.reject(new Error(e.data.error));',
    '      else cb.resolve({ status: e.data.status, statusText: e.data.statusText, type: "basic",',
    '        text: function() { return Promise.resolve(e.data.body); },',
    '        json: function() { return Promise.resolve(JSON.parse(e.data.body)); }',
    '      });',
    '    }',
    '  }',
    '',
    '  if (e.data.type === "pause") {',
    '    __paused = true;',
    '    self.postMessage({ type: "paused" });',
    '  }',
    '',
    '  if (e.data.type === "resume") {',
    '    __paused = false;',
    '    if (__pendingRAF) {',
    '      var fn = __pendingRAF;',
    '      __pendingRAF = null;',
    '      setTimeout(fn, 0);',
    '    }',
    '    self.postMessage({ type: "resumed" });',
    '  }',
    '};'
  ].join('\n');
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["riscvemu64-wasm.wasm","riscvemu64-wasm.js","tinyemu.cfg","bbl64.bin","kernel.bin","initramfs.bin"].map((name) => {
    const module_name = "@tomlarkworthy/linux-emu";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_y5mpqe", "_y5mpqe", ["md"], _y5mpqe);
  $def("_te_tui", "tinyemu_terminal", ["terminal_display","tinyemu_worker"], _te_tui);
  $def("_docs_overview", "docs_overview", ["md"], _docs_overview);
  $def("_docs_changes", "docs_changes", ["md"], _docs_changes);
  $def("_docs_networking", "docs_networking", ["md"], _docs_networking);
  $def("_docs_build", "docs_build", ["md"], _docs_build);
  $def("_te_ttl", "tinyemu_term_tail", ["tinyemu_term_state"], _te_ttl);
  $def("_te_dbgtxt", "tinyemu_debug_text", ["tinyemu_worker","tinyemu_debug_log"], _te_dbgtxt);
  $def("_te_termtxt", "tinyemu_term_text", ["tinyemu_worker","tinyemu_term_state"], _te_termtxt);
  $def("_5c9fyq", "terminal_display", [], _5c9fyq);
  $def("_te_dlog", "tinyemu_debug_log", [], _te_dlog);
  $def("_te_term", "tinyemu_term_state", [], _te_term);
  $def("_te_worker", "tinyemu_worker", ["tinyemu_worker_script","tinyemu_term_state","tinyemu_debug_log","FileAttachment"], _te_worker);
  $def("_te_wscript", "tinyemu_worker_script", [], _te_wscript);
  return main;
}