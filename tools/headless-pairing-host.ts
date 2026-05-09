#!/usr/bin/env bun
// Launch a notebook in headless Chromium and hold the page open so a Claude Code
// pairing session can drive it without a foreground browser window. Reads
// LOPE_PAIRING_TOKEN (or --token) and constructs the standard pairing hash URL.

import { chromium, type Browser } from "playwright";
import { resolve, basename, dirname, join } from "path";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { fileURLToPath } from "url";

interface Options {
  notebook: string;
  token: string;
  open: string;
  layout: string;
  verbose: boolean;
}

interface OptionsExtended extends Options {
  pidFile?: string;
  fakefsRoot?: string;
}

function parseArgs(argv: string[]): OptionsExtended {
  const opts: Partial<OptionsExtended> = {
    open: "@tomlarkworthy/claude-code-pairing",
    layout:
      "R100(S50(@tomlarkworthy/blank-notebook),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))",
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--token" && argv[i + 1]) opts.token = argv[++i];
    else if (a === "--open" && argv[i + 1]) opts.open = argv[++i];
    else if (a === "--layout" && argv[i + 1]) opts.layout = argv[++i];
    else if (a === "--pid-file" && argv[i + 1]) opts.pidFile = argv[++i];
    else if (a === "--fakefs-root" && argv[i + 1]) opts.fakefsRoot = argv[++i];
    else if (a === "--verbose") opts.verbose = true;
    else if (!a.startsWith("--") && !opts.notebook) opts.notebook = a;
  }
  if (!opts.notebook) {
    console.error(
      "Usage: bun tools/headless-pairing-host.ts <notebook.html> [--token LOPE-PORT-XXXX] [--open module] [--layout HASH] [--pid-file PATH] [--fakefs-root PATH] [--verbose]",
    );
    process.exit(2);
  }
  opts.token ??= process.env.LOPE_PAIRING_TOKEN;
  if (!opts.token) {
    console.error(
      "Missing pairing token. Pass --token LOPE-PORT-XXXX or set LOPE_PAIRING_TOKEN.",
    );
    process.exit(2);
  }
  return opts as OptionsExtended;
}

function portFromToken(token: string): number | null {
  const m = /^LOPE-(\d+)-/i.exec(token);
  return m ? Number(m[1]) : null;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const notebookPath = resolve(opts.notebook);
  if (!existsSync(notebookPath)) {
    console.error(`Notebook not found: ${notebookPath}`);
    process.exit(2);
  }

  // If fakefs is on, ensure the file-sync pane is in the layout so its viewof
  // directory cell is observed and renders the picker button we'll auto-click.
  let layout = opts.layout;
  if (opts.fakefsRoot && !/@tomlarkworthy\/file-sync\b/.test(layout)) {
    layout = layout.replace(/\)$/, ",S20(@tomlarkworthy/file-sync))");
    console.error(`[headless-pairing] fakefs on: amended layout to include file-sync: ${layout}`);
  }

  const url = `file://${notebookPath}#view=${layout}&open=${opts.open}&cc=${opts.token}`;
  console.error(`[headless-pairing] launching: ${url}`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: [
      // Belt-and-suspenders against background-tab throttling. Headless
      // Chromium does not normally apply these throttles, but the flags are
      // harmless and prevent regressions if the harness is later run headed.
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const context = await browser.newContext();

  // If --fakefs-root is set, inject the same init script the channel uses for QA pages so
  // window.showDirectoryPicker is replaced with a synthetic handle proxied to the channel.
  // The caller must have called the `enable_fakefs` MCP tool to authorise the channel side
  // (currentFakefsRoot must be non-null when the page sends `fs-pair`).
  if (opts.fakefsRoot) {
    const channelPort = portFromToken(opts.token);
    if (channelPort == null) {
      console.error("[headless-pairing] cannot derive channel port from token; --fakefs-root requires LOPE-<PORT>-<RAND> tokens.");
      process.exit(2);
    }
    const here = dirname(fileURLToPath(import.meta.url));
    const initScriptPath = join(here, "channel", "fakefs-init.js");
    if (!existsSync(initScriptPath)) {
      console.error(`[headless-pairing] fakefs-init.js not found at ${initScriptPath}`);
      process.exit(2);
    }
    const initScript = readFileSync(initScriptPath, "utf8");
    const cfg = {
      port: channelPort,
      token: opts.token,
      rootName: basename(resolve(opts.fakefsRoot)),
    };
    await context.addInitScript({
      content: `window.__lopecode_fakefs = ${JSON.stringify(cfg)};\n${initScript}`,
    });
    console.error(
      `[headless-pairing] fakefs init injected; sandbox rootName=${cfg.rootName}. Make sure enable_fakefs has been called on the channel.`,
    );
  }

  const page = await context.newPage();

  // Always surface page errors; they're rare and almost always actionable.
  page.on("pageerror", (e) => console.error(`[browser error] ${e.message}`));
  if (opts.verbose) {
    page.on("console", (m) => console.error(`[browser ${m.type()}] ${m.text()}`));
    page.on("requestfailed", (r) =>
      console.error(`[browser reqfail] ${r.url()} ${r.failure()?.errorText}`),
    );
  }

  // Shutdown plumbing — declared up front so close handlers can reference it
  // without TDZ hazards if events fire before we finish wiring everything up.
  let shuttingDown = false;
  async function shutdown(reason: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`[headless-pairing] shutdown (${reason})`);
    if (opts.pidFile) {
      try {
        unlinkSync(opts.pidFile);
      } catch {}
    }
    try {
      await browser.close();
    } finally {
      process.exit(0);
    }
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Watchdog: track every WebSocket the page opens to the channel port. Arm
  // the shutdown trigger only after a `paired` reply is observed — until then
  // any transient close (e.g. fakefs's fs-pair failing during startup) is not
  // a sign the channel is gone, just that this particular handshake failed.
  // Once armed, exit when the *last* matching ws closes.
  const channelPort = portFromToken(opts.token);
  const liveWses = new Set<unknown>();
  let pairingArmed = false;
  page.on("websocket", (ws) => {
    const wsUrl = ws.url();
    const isChannel =
      channelPort != null &&
      (wsUrl.includes(`127.0.0.1:${channelPort}`) ||
        wsUrl.includes(`localhost:${channelPort}`));
    if (!isChannel) return;
    liveWses.add(ws);
    if (opts.verbose)
      console.error(
        `[headless-pairing] channel ws opened: ${wsUrl} (now ${liveWses.size} live)`,
      );
    if (opts.verbose) {
      ws.on("framesent", (f) => {
        const p = typeof f.payload === "string" ? f.payload : "[binary]";
        console.error(`[headless-pairing] ws→server: ${p.slice(0, 200)}`);
      });
    }
    ws.on("framereceived", (f) => {
      const payload = typeof f.payload === "string" ? f.payload : "";
      if (opts.verbose && payload)
        console.error(`[headless-pairing] ws←server: ${payload.slice(0, 200)}`);
      if (!pairingArmed && payload.includes('"type":"paired"')) {
        pairingArmed = true;
        if (opts.verbose) console.error("[headless-pairing] watchdog armed (paired)");
      }
    });
    ws.on("close", () => {
      liveWses.delete(ws);
      if (opts.verbose)
        console.error(
          `[headless-pairing] channel ws closed: ${wsUrl} (${liveWses.size} live, armed=${pairingArmed})`,
        );
      if (!pairingArmed) return;
      if (liveWses.size === 0) {
        console.error(
          "[headless-pairing] all channel WebSockets closed; channel gone, exiting.",
        );
        shutdown("ws-close").catch(() => process.exit(0));
      }
    });
  });

  // Use "load" not "networkidle": the pairing WebSocket keeps the network busy.
  await page.goto(url, { waitUntil: "load", timeout: 30000 });

  // Also exit if the page itself closes or the browser disconnects.
  page.on("close", () => {
    console.error("[headless-pairing] page closed, exiting.");
    shutdown("page-close").catch(() => process.exit(0));
  });
  browser.on("disconnected", () => {
    console.error("[headless-pairing] browser disconnected, exiting.");
    process.exit(0);
  });

  if (opts.pidFile) {
    writeFileSync(opts.pidFile, String(process.pid));
  }

  console.error(
    `[headless-pairing] page loaded (pid ${process.pid}); holding open. Ctrl+C to exit.`,
  );

  // If fakefs is on, auto-pick the sync directory once the file-sync UI has
  // rendered. Without this the user would need to manually click "Pick sync
  // directory" — which defeats the headless ergonomic.
  if (opts.fakefsRoot) {
    page
      .waitForFunction(
        () => {
          const r = (window as any).__ojs_runtime;
          if (!r) return false;
          for (const v of r._variables) {
            if (
              v._name === "viewof directory" &&
              v._value instanceof HTMLElement &&
              v._value.querySelector(".main") &&
              !/Loading/.test(v._value.querySelector(".main").textContent || "")
            ) {
              return true;
            }
          }
          return false;
        },
        { timeout: 30000 },
      )
      .then(() =>
        page.evaluate(() => {
          const r = (window as any).__ojs_runtime;
          for (const v of r._variables) {
            if (v._name === "viewof directory" && v._value?.querySelector?.(".main")) {
              const btn = v._value.querySelector(".main") as HTMLButtonElement;
              if (/Pick/.test(btn.textContent || "")) btn.click();
              return btn.textContent;
            }
          }
          return null;
        }),
      )
      .then((label) =>
        console.error(`[headless-pairing] fakefs auto-pick: ${label ?? "(none)"}`),
      )
      .catch((e) =>
        console.error(`[headless-pairing] fakefs auto-pick failed: ${e?.message ?? e}`),
      );
  }

  // If pairing hasn't completed within a generous window, surface that
  // instead of hanging silently.
  setTimeout(() => {
    if (!pairingArmed) {
      console.error(
        "[headless-pairing] WARNING: pairing did not complete after 15s. Check the channel server and hash URL.",
      );
    }
  }, 15000);

  // Hold the process forever (something else will trigger shutdown).
  await new Promise(() => {});
}

main().catch((e) => {
  console.error("[headless-pairing] fatal:", e);
  process.exit(1);
});
