// First differences between two wire-snapshot --dump files.
import { readFileSync } from "node:fs";
const [a, b] = process.argv.slice(2, 4).map((f) => JSON.parse(readFileSync(f, "utf8")).bodies);
let shown = 0;
console.log("requests", a.length, b.length);
for (let i = 0; i < Math.max(a.length, b.length) && shown < 12; i++) {
  const x = a[i], y = b[i];
  if (!x || !y) { console.log("req", i, "only in one"); shown++; continue; }
  const tx = JSON.stringify({ ...x, messages: 0 }), ty = JSON.stringify({ ...y, messages: 0 });
  if (tx !== ty) { console.log("req", i, "non-message fields differ"); shown++; }
  if (x.messages.length !== y.messages.length) { console.log("req", i, "message count", x.messages.length, y.messages.length); shown++; }
  // only the messages new in this request
  for (let j = 0; j < Math.min(x.messages.length, y.messages.length); j++) {
    const p = JSON.stringify(x.messages[j]), q = JSON.stringify(y.messages[j]);
    if (p === q) continue;
    let k = 0; while (p[k] === q[k]) k++;
    console.log(`req ${i} msg ${j} differs at ${k}:\n  A …${p.slice(Math.max(0, k - 80), k + 160)}\n  B …${q.slice(Math.max(0, k - 80), k + 160)}`);
    shown++; break;
  }
  if (shown && i > 0) break;
}
if (!shown) console.log("identical");
