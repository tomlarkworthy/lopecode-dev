const [model, mode] = process.argv.slice(2);
const body = { model, max_tokens: 2000, stream: true, messages: [{ role: 'user', content: process.env.PROMPT || 'Reply with the single word pong.' }] };
if (mode === 'off') body.reasoning = { enabled: false };
if (mode === 'low') body.reasoning = { effort: 'low' };
const t0 = Date.now(); const at = () => ((Date.now() - t0) / 1000).toFixed(1);
const r = await fetch('https://openrouter-gateway.endpointservices.workers.dev/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const headers = at(); let firstByte, firstReason, firstContent, usage, provider, buf = '';
const dec = new TextDecoder();
for await (const chunk of r.body) {
  firstByte ??= at(); buf += dec.decode(chunk, { stream: true });
  let i; while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    const j = JSON.parse(line.slice(6)); provider ??= j.provider;
    const d = j.choices?.[0]?.delta || {};
    if (d.reasoning) firstReason ??= at();
    if (d.content) firstContent ??= at();
    if (j.usage) usage = j.usage;
  }
}
const secs = (firstContent && usage) ? (at() - (firstReason ?? firstContent)) : null; console.log(JSON.stringify({ model, mode, tokPerSec: secs ? (usage.completion_tokens / secs).toFixed(0) : null, provider, status: r.status, headers, firstByte, firstReason, firstContent, done: at(), completion: usage?.completion_tokens, reasoning: usage?.completion_tokens_details?.reasoning_tokens, cost: usage?.cost }));
