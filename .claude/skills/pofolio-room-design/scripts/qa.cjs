// Screenshot QA for the 3D room. Usage: node qa.cjs <out-dir> [base-url]
// Needs puppeteer-core (set PUPPETEER_CORE to its folder if it is not resolvable) and Chrome (set CHROME if not in the default path).
const path = require('path');
const fs = require('fs');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');

const OUT = path.resolve(process.argv[2] || 'qa-shots');
const BASE = process.argv[3] || 'http://localhost:4173/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const desk = { width: 1440, height: 900 };
const phone = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

const SHOTS = [
  ['desk-overview', desk, ''],
  ['desk-products', desk, '#products'],
  ['desk-click-stack', desk, '', (page) => page.click('.marker[data-go="stack"]')],
  ['phone-overview', phone, ''],
  ['phone-tap-products', phone, '', (page) => page.tap('.marker[data-go="products"]')],
  ['phone-contact', phone, '#contact']
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  const errors = [];
  for (const [name, viewport, hash, action] of SHOTS) {
    const page = await browser.newPage();
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${name}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    // Reduced motion skips the intro flight so software rendering reaches the resting frame quickly.
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport(viewport);
    await page.goto(BASE + hash, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.waitForSelector('body.is-ready', { timeout: 90000 });
    await wait(2500);
    if (action) {
      await action(page);
      await wait(2500);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(`${name.padEnd(20)} overflowX=${overflow}`);
    await page.close();
  }
  console.log(errors.length ? `\nConsole:\n${errors.join('\n')}` : '\nNo console errors.');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
