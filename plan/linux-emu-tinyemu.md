# linux-emu: TinyEMU WASM integration

## Context

`lopebooks/notebooks/@tomlarkworthy_linux-emu.html` is a fresh fork of
`@tomlarkworthy/linux-sbc` (RISC-V Linux SBC notebook with a hand-written JS
RV64 emulator). The goal is to swap the JS emulator for Fabrice Bellard's
TinyEMU WASM (much faster) while keeping the existing visualizations
(mode_timeline, terminal_display, etc.) by exposing guest CPU + RAM state as
live typed-array views and eventually via SharedArrayBuffer so lopecode host
can do networking / virtio outside the VM thread.

## User instructions (verbatim, recorded for compaction safety)

- "Copy the linux-sbc notebook to linux-emu and open a pairing session"
- "I would expand and contract, do not delete the old code until you have a
  working tinyEMU boot"
- "We will want virtio and stuff exposed to lopecode host which will do the
  networking at some point. Will SAB help us with that?"
- "yes sounds like a plan. Add necessary tasks lists, you have the ability to
  restart the webpage and run UI commands yourself for testing. Record notes
  in a file so compactions doesn't lose state, for example, you should
  immediately record these instructions and into your plan. Add your tasks
  to the task list. Now go do it fully autonomous. I cannot answer any
  questions going forward, but as this is an isolated file and a fresh fork,
  you can be brave and see how far you get without risk of breaking anything."

Fully autonomous from here. This is a fresh fork, no risk of breaking.

## Pairing session

- Token: `LOPE-57495-QN5U`
- Notebook URL (with hash):
  `file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_linux-emu.html#view=R100(S50(@tomlarkworthy/linux-sbc),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&open=@tomlarkworthy/claude-code-pairing&cc=LOPE-57495-QN5U`
- Current main module displayed: `@tomlarkworthy/linux-sbc` (unchanged from
  the parent; we'll keep this as the edit target — renaming the module would
  require an Observable round-trip).

## Expand / contract strategy

Keep **all** existing cells (`cpu`, `mem`, `advance`, `decode`, `execute`,
`continuous_run`, etc.). Add **new** `tinyemu_*` cells alongside. Only retire
JS emu cells *after* TinyEMU boots and visualizations are driven by it.

## TinyEMU prebuilt artifacts (from bellard.org/tinyemu)

Extracted at `/tmp/jslinux/jslinux-2019-12-21/`:

- `riscvemu64-wasm.wasm` — 220 KB (RV64 emulator core)
- `riscvemu64-wasm.js` — 66 KB (emscripten glue, 4 lines of minified JS)
- `bbl64.bin` — 53 KB (OpenSBI bootloader for RV64)
- `kernel-riscv64.bin` — 3.9 MB (Linux kernel)
- `root-riscv64.bin` — 4 MB (busybox rootfs, split into blk*.bin by `splitimg`)
- `root-riscv64.cfg` — VM config JSON
- Additionally in tarball: x86, riscv32 variants; unneeded.

### Emscripten API surface (from jslinux.js)

```js
Module.cwrap('console_queue_char', null, ['number'])   // stdin → VM
Module.cwrap('fs_import_file', null, ['string','number','number']) // push file in
Module.ccall('vm_start', null, [...types], [url, mem_size, cmdline, pwd, w, h, net, drive_url])
Module.HEAPU8 / _malloc / _free   // heap access
```

VM → JS callbacks (C code calls these as imports):
- Terminal output via `term.write(str)` global (need a shim that routes to
  our terminal widget).
- Network packet via `net_state.recv_packet(buf)` global.
- `update_downloading(flag)` for XHR progress.
- `graphic_display` object (unused, we're in text mode).

### Config file

`root-riscv64.cfg` references external URLs for kernel/bbl/rootfs. For
offline operation we'll either inline the config or override `url:` to
point at blob URLs we construct from FileAttachments.

## Phase 1 — Boot TinyEMU in the notebook

1. Inline `riscvemu64-wasm.wasm`, `riscvemu64-wasm.js`, `bbl64.bin`,
   `kernel-riscv64.bin`, `root-riscv64.bin` as FileAttachments (gzipped where
   useful).
2. Build `tinyemu_cfg` cell that produces a config blob with `blob:` URLs for
   each binary, derived from the FileAttachments.
3. Build `tinyemu_module` cell: dynamically evaluate the emscripten glue with
   a scoped `Module = {}`, locate-wasm override pointing at the attached
   wasm, no `document.getElementById` (shim a headless entry).
4. Build `tinyemu_start` cell: calls `vm_start`, wiring:
   - terminal output → a new `tinyemu_terminal_display` (reuse existing term
     widget or Term lib from the notebook).
   - stdin from a textarea / viewof.
5. Verify boot: watch terminal output for `busybox login:` prompt.

## Phase 2 — Live typed-array views for visualizations

- Locate RAM inside `Module.HEAPU8` (TinyEMU allocates RAM via
  `mallocz()`; we need an exported pointer). The 2019 prebuilt doesn't
  expose one. Workaround options:
  - Patch the emscripten glue to capture the pointer passed to
    `mallocz(mem_size << 20)` — fragile, depends on knowing call order.
  - Better: rebuild TinyEMU with `EMSCRIPTEN_KEEPALIVE int get_ram_ptr()`.
- Slot new `tinyemu_cpu_state` view into `mode_timeline.sample()` adapter.

## Phase 3 — Rebuild with `-pthread` for real SAB

- Fork TinyEMU source (C code), add `get_cpu_state_ptr`, `get_ram_ptr`,
  `get_ram_size` keepalive exports.
- Build with `emcc -pthread -sSHARED_MEMORY=1 -sEXPORTED_FUNCTIONS=...`.
- Requires serving over HTTP with COOP/COEP — notebook over `file://` won't
  get `SharedArrayBuffer`. May need to spin up a local dev server for test.
- This phase is optional pending results of phase 2.

## Open risks

- Emscripten glue might call `document.getElementById` at `preRun` time even
  in text mode — needs shims.
- `vm_start` expects to `fetch()` the cfg URL; we'll provide a blob URL.
- Terminal font / Term.js isn't in the notebook; may reuse `_uart_buffer` +
  `terminal_display.updateTerm()` by feeding VM stdout bytes into it.

## Task list

See TaskCreate entries for live progress.

## Session 2 progress (2026-04-15)

**Phase 3 rebuild attempt — FAILED, reverted**

- Installed emsdk at `/tmp/emsdk` (clone + `./emsdk install latest`).
- Patched TinyEMU source at `/tmp/tinyemu-2019-12-21/`:
  - `jsemu.c` appended `get_ram_ptr/get_ram_size/get_cpu_state` + stubs for
    `fs_import_file/fs_net_init/fs_net_set_pwd/fs_wget` (disabled fs_net path).
  - `riscv_machine.c` appended `te_get_ram_ptr_global/te_get_ram_size_global/te_get_cpu_state_global`.
  - `riscv_cpu.c` appended `te_cpu_get_pc/priv/regs/insn_counter` (guarded `MAX_XLEN==64`
    because file is compiled twice).
  - `Makefile.js`:
    - CFLAGS: removed `--llvm-opts 2`, removed `-DCONFIG_FS_NET`, added `-DEMSCRIPTEN`
      (needed for `USE_BUILTIN_CRYPTO` in block_net — avoids openssl dep).
    - JS_OBJS: removed `fs_net.js.o fs_wget.js.o`.
    - EXPORTED_FUNCTIONS: added all new exports.
    - LDFLAGS: `EXTRA_EXPORTED_RUNTIME_METHODS` → `EXPORTED_RUNTIME_METHODS`.
    - Removed deprecated `--memory-init-file 0` and `BINARYEN_TRAP_MODE=clamp`.
    - Added `-Wl,--no-gc-sections` (without it wasm-ld DCE'd down to 33KB).
  - Build succeeded → 119KB wasm.
- Deploy + boot: `vm_start` aborts immediately with `Aborted()` (no message because
  `-sASSERTIONS` off). Root cause not diagnosed. Likely suspects:
  - fs_net stubs return NULL; config probably wires 9p root which dereferences it.
  - `BINARYEN_TRAP_MODE=clamp` removal — modern emcc traps int-div-by-zero that
    softfp/riscv_cpu probably does.
- **Reverted** to original 2019 220KB wasm. Original boots to busybox shell prompt
  (`~ #`) as before.

**Phase 2 groundwork**

- After reload, MCP-defined cells were lost (they hadn't been re-exported). Redefined:
  - `tinyemu_send`, `tinyemu_term_tail`, `tinyemu_ram_scan`.
- Confirmed boot reaches shell prompt (580 chars, ends with `~ # `).
- Heap grew to 128MB (was 64MB — `ALLOW_MEMORY_GROWTH=1`).
- `"Linux version"` scan found 4 candidates:
  `0x760be0`, `0xb95f80` (docs string, false positive), `0x10f7e30`, `0x124d5f0`.
  All three real matches share same content — they're multiple copies (kernel image
  + cmdline + /proc/version). Lowest `0x760be0` is likely in the kernel's boot copy.
  **Need DTB magic 0xd00dfeed scan or probe-write to disambiguate RAM_BASE reliably.**

**Current blockers**

1. Rebuilt wasm aborts — need `-sASSERTIONS=1` rebuild to get the abort message.
2. Tab appears backgrounded → VM main loop paused (likely rAF-based). stdin chars
   queued via `console_queue_char` don't echo back. Proper fix: run VM in Web Worker
   (Phase 3 task #9 anyway).

## Next steps (whenever continuation happens)

1. Rebuild with `-sASSERTIONS=1` (drop to -O1 link) to diagnose the abort.
2. Alternatively, skip the rebuild: do Phase 2 with the existing original wasm by
   scanning HEAPU8 for the DTB magic `0xd00dfeed` to pin RAM_BASE deterministically.
   The CPU-state pieces of mode_timeline are the only things that strictly need
   Phase 3 exports — RAM-derived metrics work without them.
3. Export the notebook — currently timing out on export, likely because wasm bytes
   are embedded and serialization is slow. Investigate chunked/streamed export or
   smaller snapshot.

## Session 3 resolution (2026-04-15)

**Rebuild abort root-caused and fixed.** With `-sASSERTIONS=1` the abort message was
`vm_start called with 8 args but expects 7`. The 2019 prebuilt wasm had an extra
`drive_url` trailing string arg; the 2019 *source* distribution has only 7
(`url, ram_size, cmdline, pwd, width, height, has_network`).

- Notebook HTML (`@tomlarkworthy_linux-emu.html`) already edited on disk to call
  `vm_start` with 7 args and 7 types.
- Rebuild extended: re-enabled `fs_net.js.o` + `fs_wget.js.o` (they compile fine
  under the EMSCRIPTEN branch — no openssl), added `-DCONFIG_FS_NET` to CFLAGS,
  removed my null stubs from `jsemu.c`. Result: **216KB wasm with all state
  exports present**: `_get_ram_ptr`, `_get_cpu_state`, `_te_cpu_get_pc`,
  `_te_cpu_get_priv`, `_te_cpu_get_regs`, `_te_cpu_get_insn_counter`,
  `_vm_start`, `_console_queue_char`, etc. Deployed to
  `lopebooks/notebooks/tinyemu-assets/riscvemu64-wasm.{js,wasm}`.

**Not yet verified in-browser** (MCP was disconnected when the fix landed). Next
reopen of the notebook should:
1. Boot Linux on the rebuilt wasm.
2. Expose `_get_ram_ptr()` → authoritative RAM_BASE offset in HEAPU8, removing the
   guesswork from the `Linux version` heuristic.
3. Expose `_get_cpu_state()` → the `RISCVCPUState *` pointer, which feeds
   `_te_cpu_get_pc/priv/regs/insn_counter` for mode_timeline sampling.

From there, define cells:
- `tinyemu_ram_base = tinyemu_vm.Module._get_ram_ptr()`
- `tinyemu_ram_view = new Uint8Array(Module.HEAPU8.buffer, ram_base, 128*1024*1024)`
- `tinyemu_cpu_ptr = Module._get_cpu_state()`
- `tinyemu_cpu_sample = () => ({ pc: Module._te_cpu_get_pc(cpu_ptr), priv: Module._te_cpu_get_priv(cpu_ptr), ic: Module._te_cpu_get_insn_counter(cpu_ptr) })`
- adapter that feeds `mode_timeline.sample()` at rAF cadence.

## Useful paths

- Notebook HTML: `lopebooks/notebooks/@tomlarkworthy_linux-emu.html`
- TinyEMU tarball (local): `/tmp/jslinux/jslinux-2019-12-21/`
- Cell list dump (124 KB):
  `/Users/tom.larkworthy/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev/6e54fc32-069f-4388-bb1d-d22e97243a0a/tool-results/mcp-lopecode-list_cells-1776229977831.txt`
- Existing terminal widget implementation: look at `continuous_run` and
  `terminal_display` cells in that dump for reuse hooks.

## Testing approach

- `mcp__lopecode__eval_code` to poke at browser state, trigger reloads,
  inspect `Module`.
- `mcp__lopecode__watch_variable` on a `tinyemu_boot_log` cell to tail
  terminal output.
- `mcp__lopecode__export_notebook` periodically to persist progress against
  file (important for compaction / crash recovery).
- `mcp__lopecode__reply` to log significant milestones so the chat transcript
  acts as a recovery breadcrumb trail.
