import { chromium } from 'playwright';

const cases = [
  // legacy @-URL that should land on an existing de-@'d notebook, with a hash payload
  'https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_daw.html#view=R100(S100(@tomlarkworthy/daw))',
  'https://tomlarkworthy.github.io/lopecode/notebooks/@ledger.html?a=1#frag=keepme',
  // control: a genuinely missing non-@ path must NOT redirect
  'https://tomlarkworthy.github.io/lopecode/notebooks/definitely-missing.html',
];

const browser = await chromium.launch();
for (const url of cases) {
  const page = await browser.newPage();
  const resp = await page.goto(url, { waitUntil: 'commit', timeout: 45000 }).catch(e => ({ err: e.message }));
  // give the shim's location.replace a moment to fire
  await page.waitForTimeout(2500);
  const final = page.url();
  const title = await page.title().catch(() => '?');
  console.log('FROM  ', url);
  console.log('  ->  ', final);
  console.log('  status(initial)=', resp?.status ? resp.status() : resp?.err ?? '?', ' title=', JSON.stringify(title.slice(0, 60)));
  console.log('  redirected=', final !== url, ' hash=', JSON.stringify(new URL(final).hash));
  console.log('');
  await page.close();
}
await browser.close();
