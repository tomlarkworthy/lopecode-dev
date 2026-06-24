// Capability check: can a vision model READ a screenshot via the OpenRouter chat shape the client uses?
// Sends a real screenshot (ui-fixes.png) as an image_url content part and asks the model to describe it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));

// load key from tools/robocoop-4/.env (same loader as the eval harness)
function loadEnv(p){ try { for (const line of readFileSync(p,"utf8").split("\n")) { const t=line.trim(); if(!t||t.startsWith("#"))continue; const i=t.indexOf("="); if(i<0)continue; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^["']|["']$/g,""); if(k&&!(k in process.env))process.env[k]=v; } } catch {} }
loadEnv(join(here,".env")); loadEnv(join(here,"..","..",".env"));
const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.error("no OPENROUTER_API_KEY"); process.exit(1); }

const img = readFileSync(join(here, "ui-fixes.png"));
const dataUrl = "data:image/png;base64," + img.toString("base64");
const model = process.argv[2] || "anthropic/claude-sonnet-4";

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, "HTTP-Referer": "https://lopecode.com", "X-Title": "robocoop-4" },
  body: JSON.stringify({
    model, max_tokens: 300,
    messages: [{ role: "user", content: [
      { type: "text", text: "This is a screenshot of an app. In one sentence, what UI elements do you see?" },
      { type: "image_url", image_url: { url: dataUrl } },
    ] }],
  }),
});
if (!res.ok) { console.error("HTTP", res.status, (await res.text()).slice(0,300)); process.exit(1); }
const j = await res.json();
const text = j.choices?.[0]?.message?.content ?? "(no content)";
const mentionsUI = /terminal|shell|chat|settings|input|message|console|prompt/i.test(String(text));
console.log(JSON.stringify({ model, mentionsUI, reply: String(text).slice(0, 400) }, null, 2));
