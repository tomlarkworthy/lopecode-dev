// node:tls — inert stub.
import { register } from "./registry.mjs";
import net from "./net.mjs";

export function connect() { return new net.Socket(); }
export function createSecureContext() { return {}; }
export class TLSSocket extends net.Socket {}
export const rootCertificates = [];

const mod = { connect, createSecureContext, TLSSocket, rootCertificates };
register("tls", mod);
export default mod;
