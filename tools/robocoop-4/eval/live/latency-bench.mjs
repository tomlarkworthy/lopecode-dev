// Per-model call latency for the rc4 agent loop. Sends a REPRESENTATIVE step (a ~real system prompt + the
// tool specs + a short task that needs one bash tool call), stream:false, and times the full round-trip
// (what each agent step actually waits on). Median of N sequential calls per model (sequential = uncontended).
// Usage: bun latency-bench.mjs [--n 3] [--json out.json] model1 model2 ...
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url"; import { dirname, join, resolve } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
function loadEnv(){ for (const p of [join(here,"..","..",".env"), join(here,"..","..","..","..",".env")]) { try { for (const line of readFileSync(p,"utf8").split("\n")){ const t=line.trim(); if(!t||t.startsWith("#"))continue; const i=t.indexOf("="); if(i<0)continue; const k=t.slice(0,i).trim(); let v=t.slice(i+1).trim().replace(/^["']|["']$/g,""); if(k&&!(k in process.env))process.env[k]=v; } } catch {} } }
loadEnv();
const key = process.env.OPENROUTER_API_KEY; if (!key) { console.error("no OPENROUTER_API_KEY"); process.exit(1); }

const argv = process.argv.slice(2);
let n = 3, jsonPath = null; const models = [];
for (let i=0;i<argv.length;i++){ const a=argv[i]; if(a==="--n")n=Number(argv[++i]); else if(a==="--json")jsonPath=argv[++i]; else models.push(a); }
if (!models.length) { console.error("pass model ids"); process.exit(2); }

// Representative payload: a chunk of system prompt + 8 tool stubs + a one-step task.
const sys = "You are a coding agent operating a bash shell over a virtual filesystem inside a notebook. "
  + "Take a concrete action (a tool call) every turn. ".repeat(20);
const tool = (id, d) => ({ type:"function", function:{ name:id, description:d, parameters:{ type:"object", properties:{ x:{type:"string"} } } } });
const tools = ["bash","read_file","write_file","edit_file","inspect_value","list_values","eval_js","view_image"].map((t)=>tool(t, t+" tool for the agent to use over the workspace filesystem and runtime"));
const messages = [ { role:"system", content:sys }, { role:"user", content:"List the files under /notebook with the bash tool, then stop." } ];

const callOnce = async (model) => {
  const t0 = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Authorization:"Bearer "+key, "HTTP-Referer":"https://lopecode.com", "X-Title":"rc4-latency" },
    body: JSON.stringify({ model, messages, tools, tool_choice:"auto", max_tokens:512, temperature:0 }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) return { ms, ok:false, err:(await res.text()).slice(0,120) };
  const j = await res.json();
  const msg = j.choices?.[0]?.message;
  const toolCall = Array.isArray(msg?.tool_calls) && msg.tool_calls.length > 0;
  const usage = j.usage || {};
  return { ms, ok:true, toolCall, completionTokens: usage.completion_tokens ?? null };
};

const median = (a) => { const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2); };
const rows = [];
for (const model of models) {
  const samples = [];
  let ok=true, toolOk=false, err=null, tokens=[];
  for (let i=0;i<n;i++){ const r = await callOnce(model); if(!r.ok){ ok=false; err=r.err; samples.push(r.ms); } else { samples.push(r.ms); toolOk = toolOk || r.toolCall; if(r.completionTokens!=null)tokens.push(r.completionTokens); } }
  const med = median(samples), min = Math.min(...samples);
  rows.push({ model, medianMs:med, minMs:min, samples, ok, toolCall:toolOk, medTokens: tokens.length?median(tokens):null, err });
  console.log(`${ok?"  ":"✗ "}${String(med).padStart(6)}ms med  ${String(min).padStart(6)}ms min  tool:${toolOk?"Y":"N"}  tok~${tokens.length?median(tokens):"?"}  ${model}${err?"  ERR:"+err:""}`);
}
rows.sort((a,b)=>a.medianMs-b.medianMs);
console.log("\n=== sorted by median latency ===");
for (const r of rows) console.log(`${String(r.medianMs).padStart(6)}ms  ${r.model}${r.ok?"":"  (ERR)"}`);
if (jsonPath) { const p=resolve(jsonPath); mkdirSync(dirname(p),{recursive:true}); writeFileSync(p, JSON.stringify(rows,null,2)); console.log("\nwrote "+p); }
