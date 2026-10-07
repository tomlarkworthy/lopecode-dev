import "./shim.js";
import { Runtime } from "./rt/index.js";
import define from "./m/@tom/a.js";
import { DurableObject } from "cloudflare:workers";
export class State extends DurableObject { async fetch() { return new Response("do"); } }
const runtime = new Runtime();
const main = runtime.module(define);
main.variable({}).define("__handler", ["fetch"], (f) => f);
export default { async fetch(request, env, ctx) { return (await main.value("fetch"))(request, env, ctx); } };
