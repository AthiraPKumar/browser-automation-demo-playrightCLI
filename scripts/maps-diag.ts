import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('https://www.google.com/maps/search/dentist+in+Berlin', { waitUntil: 'domcontentloaded' });

  // Accept cookies
  for (const sel of ['button:has-text("Accept all")', 'button:has-text("Alle akzeptieren")', 'form[action*="consent"] button']) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(1500); break; }
  }
  await page.waitForTimeout(4000);

  // Click first result card
  const card = page.locator('[role="feed"] > div').filter({ has: page.locator('a[href*="/maps/place/"]') }).first();
  await card.click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.resolve('diag-detail.png'), fullPage: false });

  // Dump detail panel HTML
  const main = page.locator('[role="main"]');
  const html = await main.innerHTML().catch(() => 'not found');
  fs.writeFileSync(path.resolve('diag-detail.html'), html, 'utf8');
  console.log('Saved diag-detail.png and diag-detail.html');

  // Try common selectors and report what's found
  const selectors = [
    'button[data-item-id="address"]',
    '[data-item-id="address"]',
    'button[aria-label*="Adresse"], button[aria-label*="Address"]',
    '[data-tooltip="Adresse kopieren"], [data-tooltip="Copy address"]',
    'button[data-item-id^="phone"]',
    '[data-item-id^="phone"]',
    'button[aria-label*="Telefon"], button[aria-label*="Phone"]',
    'a[data-item-id="authority"]',
    '.fontBodyMedium',
    '.rogA2c',
    '.Io6YTe',
    '.CsEnBe',
  ];

  for (const sel of selectors) {
    const loc = page.locator(sel);
    const count = await loc.count();
    if (count > 0) {
      const text = await loc.first().textContent().catch(() => '');
      const attr = await loc.first().getAttribute('aria-label').catch(() => '');
      console.log(`✓ "${sel}" → count=${count}  text="${text?.trim()}"  aria-label="${attr}"`);
    } else {
      console.log(`✗ "${sel}" → 0 matches`);
    }
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
