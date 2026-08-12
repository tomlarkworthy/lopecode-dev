// node:https — inert stub delegating to the http shim.
import { register } from "./registry.mjs";
import http, { Agent, ClientRequest, Server, request as hRequest, get as hGet, globalAgent } from "./http.mjs";

export { Agent, ClientRequest, Server, globalAgent };
export function request() { return new ClientRequest(); }
export function get() { return new ClientRequest(); }
export function createServer() { return new Server(); }

const mod = { Agent, ClientRequest, Server, request, get, createServer, globalAgent };
register("https", mod);
export default mod;
