const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:4175/';
(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(BASE, { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1800);
  fs.writeFileSync(path.join(OUT, 'intro.png'), await desktop.screenshot());
  await desktop.getByRole('button', { name: 'Bắt đầu bay' }).click();
  await desktop.waitForTimeout(2200);
  fs.writeFileSync(path.join(OUT, 'playing.png'), await desktop.screenshot());
  await desktop.goto(BASE + '?demo=panel', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1800);
  fs.writeFileSync(path.join(OUT, 'panel.png'), await desktop.screenshot());
  await desktop.goto(BASE + '?demo=done', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(1500);
  fs.writeFileSync(path.join(OUT, 'done.png'), await desktop.screenshot());
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(BASE + '?demo=joystick', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(1500);
  await mobile.getByRole('button', { name: 'Bắt đầu bay' }).click();
  await mobile.waitForTimeout(2200);
  fs.writeFileSync(path.join(OUT, 'joystick.png'), await mobile.screenshot());
  console.log('shots saved to', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
