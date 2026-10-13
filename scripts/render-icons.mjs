// Renders extension/icons/*.png from assets/*.svg using an installed Chrome or
// Edge. Usage: npm install && npm run icons

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

// The 16 px toolbar icon has its own drawing; see assets/icon-16.svg.
const SOURCES = { 16: 'icon-16.svg', 32: 'icon.svg', 48: 'icon.svg', 128: 'icon.svg' };
const root = new URL('../', import.meta.url);

async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch {}
  }
  throw new Error('Rendering icons needs Chrome or Edge installed');
}

const browser = await launch();
const page = await browser.newPage();
for (const [size, source] of Object.entries(SOURCES)) {
  const svg = await readFile(new URL(`assets/${source}`, root));
  const out = `extension/icons/icon-${size}.png`;
  await page.setViewportSize({ width: +size, height: +size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block}</style>` +
      `<img src="data:image/svg+xml;base64,${svg.toString('base64')}" width="${size}" height="${size}">`,
  );
  await page.locator('img').evaluate((img) => img.decode());
  await page.screenshot({ path: fileURLToPath(new URL(out, root)), omitBackground: true });
  console.log(out);
}
await browser.close();
