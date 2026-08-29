// Contact sheet of the 16 bank frames, so a baked-in overlay can be spotted by eye in one look.
import { chromium } from 'playwright';
import fs from 'fs';
const names = ['hexcase-159','phone-hexcase-08','hexcase-5ivq-04','phone-hexcase-01','hexcase-02','hexcase-5ivq-08','phone-hexcase-07','hexcase-5ivq-03','phone-hexcase-09','hexcase-5ivq-06','phone-hexcase-04','hexcase-5iap-12','hexcase-5iap-04','phone-hexcase-06','hexcase-04-pre','hexcase-5ivq-07'];
const b64 = (n) => fs.readFileSync(`scratch/hexframes/hexframe-${n}.png`).toString('base64');
const cells = names.map((nm, i) => `<figure><img src="data:image/png;base64,${b64(i + 1)}"><figcaption>${i}: ${nm}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#111;color:#eee;font:12px monospace}
main{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
figure{margin:0}img{width:100%;display:block}figcaption{padding:2px}</style><main>${cells}</main>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent(html);
await page.locator('main').screenshot({ path: 'scratch/hexframes/contact.png' });
await browser.close();
