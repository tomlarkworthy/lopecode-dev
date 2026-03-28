import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const notebooks = [
  { slug: '@tomlarkworthy_gallery', file: 'gallery' },
  { slug: '@tomlarkworthy_manipulate', file: 'manipulate' },
  { slug: '@tomlarkworthy_reactive-reflective-testing', file: 'reactive-reflective-testing' },
  { slug: '@tomlarkworthy_sequencer', file: 'sequencer' },
  { slug: '@tomlarkworthy_unaggregating-cloudwatch-metrics', file: 'unaggregating-cloudwatch-metrics' },
  { slug: '@tomlarkworthy_lazer-simulator', file: 'lazer-simulator' },
  { slug: '@tomlarkworthy_lopecode-tour', file: 'lopecode-tour' },
  { slug: '@tomlarkworthy_bulk-jumpgate', file: 'bulk-jumpgate' },
  { slug: '@tomlarkworthy_local-change-history', file: 'local-change-history' },
  { slug: '@tomlarkworthy_svg-boinger', file: 'svg-boinger' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const nb of notebooks) {
    const url = `file://${path.join(projectRoot, 'lopebooks/notebooks/' + nb.slug + '.html')}`;
    console.log(`Screenshotting ${nb.file}...`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // Extra wait for rendering
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: path.join(projectRoot, 'tools/screenshots/' + nb.file + '.png'),
        fullPage: false
      });
      console.log(`  -> saved ${nb.file}.png`);
    } catch (err) {
      console.error(`  -> FAILED ${nb.file}: ${err.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('Done.');
})();
