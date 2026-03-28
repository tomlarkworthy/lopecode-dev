#!/usr/bin/env bun
/**
 * Sync version from package.json to plugin.json and marketplace.json.
 *
 * Usage:
 *   bun run tools/channel/sync-version.ts          # sync versions
 *   bun run tools/channel/sync-version.ts --check   # exit 1 if out of sync
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const __dirname = dirname(new URL(import.meta.url).pathname);

const files: Record<string, string> = {
  "package.json": join(__dirname, "package.json"),
  "plugin.json": join(__dirname, ".claude-plugin/plugin.json"),
  "marketplace.json": join(__dirname, ".claude-plugin/marketplace.json"),
};

const checkOnly = process.argv.includes("--check");

const pkg = JSON.parse(readFileSync(files["package.json"], "utf-8"));
const version: string = pkg.version;

let allMatch = true;

for (const [name, filepath] of Object.entries(files)) {
  if (name === "package.json") continue;
  if (!existsSync(filepath)) continue;

  const data = JSON.parse(readFileSync(filepath, "utf-8"));

  // marketplace.json has version inside plugins[0]
  const target = name === "marketplace.json" ? data.plugins?.[0] : data;
  if (!target) continue;

  if (target.version !== version) {
    if (checkOnly) {
      console.error(`Version mismatch: package.json=${version}, ${name}=${target.version}`);
      allMatch = false;
    } else {
      target.version = version;
      writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n");
      console.log(`Updated ${name} to ${version}`);
    }
  } else {
    console.log(`${name} already at ${version}`);
  }
}

if (checkOnly && !allMatch) {
  console.error("\nRun: bun run tools/channel/sync-version.ts");
  process.exit(1);
}
