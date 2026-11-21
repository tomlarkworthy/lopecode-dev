#!/usr/bin/env bun
// Sends one command to a running `live.ts --serve` and prints its report; exits 1 if any line is a failure.
//   bun tools/lang-experiment/bun-live/ask.ts [--socket path] check|tests [filter]|verdict <cell>|status|quit
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCRATCH } from "./root.ts";

const argv = process.argv.slice(2);
let socket = join(SCRATCH, "live.sock");
if (argv[0] === "--socket") { socket = resolve(argv[1]); argv.splice(0, 2); }

export async function ask(command: string, path = socket): Promise<{ lines: string[]; code: number }> {
  let buf = "";
  await new Promise<void>((res, rej) => {
    Bun.connect({
      unix: path,
      socket: {
        open(s) { s.write(command + "\n"); },
        data(_s, d) { buf += d.toString(); },
        close() { res(); },
        error(_s, e) { rej(e); },
      },
    }).catch(rej);
  });
  const lines = buf.split("\n").filter(Boolean);
  const last = lines.pop() ?? "__exit 2";
  return { lines, code: Number(last.split(" ")[1] ?? 2) };
}

if (import.meta.main) {
  if (!argv.length) { console.error("ask.ts check|tests [filter]|verdict <cell>|status|quit"); process.exit(2); }
  if (!existsSync(socket)) { console.error(`no live.ts --serve at ${socket}`); process.exit(2); }
  const r = await ask(argv.join(" "));
  for (const l of r.lines) process.stdout.write(l + "\n");
  process.exit(r.code);
}
