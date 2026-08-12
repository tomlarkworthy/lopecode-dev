// node:os stub.
import { register } from "./registry.mjs";

export const EOL = "\n";
export function homedir() { return "/home/user"; }
export function tmpdir() { return "/tmp"; }
export function hostname() { return "browser"; }
export function platform() { return "linux"; }
export function arch() { return "x64"; }
export function type() { return "Linux"; }
export function release() { return "6.0.0"; }
export function version() { return "#1 browser-native"; }
export function machine() { return "x86_64"; }
export function cpus() { return Array.from({ length: navigator.hardwareConcurrency || 4 }, () => ({ model: "browser", speed: 1000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } })); }
export function totalmem() { return 8 * 1024 * 1024 * 1024; }
export function freemem() { return 4 * 1024 * 1024 * 1024; }
export function loadavg() { return [0, 0, 0]; }
export function uptime() { return 3600; }
export function networkInterfaces() { return {}; }
export function userInfo() { return { username: "user", uid: 1000, gid: 1000, shell: "/bin/bash", homedir: "/home/user" }; }
export function endianness() { return "LE"; }
export function availableParallelism() { return navigator.hardwareConcurrency || 4; }
export const constants = { signals: { SIGINT: 2, SIGTERM: 15, SIGKILL: 9, SIGHUP: 1 }, errno: {}, priority: {} };
export const devNull = "/dev/null";
export const tmpDir = tmpdir;

const mod = { EOL, homedir, tmpdir, hostname, platform, arch, type, release, version, machine, cpus, totalmem, freemem, loadavg, uptime, networkInterfaces, userInfo, endianness, availableParallelism, constants, devNull };
register("os", mod);
export default mod;
