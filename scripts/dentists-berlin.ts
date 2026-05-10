import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface DentistContact {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: string;
  reviews: string;
}

async function acceptCookies(page: import('@playwright/test').Page) {
  const selectors = [
    'button[aria-label*="Accept all"]',
    'button:has-text("Accept all")',
    'button:has-text("Alle akzeptieren")',
    'form[action*="consent"] button',
  ];
  for (const sel of selectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1500);
      return;
    }
  }
}

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Google Maps search for dentists in Berlin
  console.log('Opening Google Maps...');
  await page.goto('https://www.google.com/maps/search/dentist+in+Berlin', {
    waitUntil: 'domcontentloaded',
  });
  await acceptCookies(page);
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.resolve('dentists-berlin-maps.png') });
  console.log('Screenshot saved: dentists-berlin-maps.png');

  const contacts: DentistContact[] = [];
  const seen = new Set<string>();

  // Wait for results panel to appear
  await page.waitForTimeout(4000);

  // Probe the DOM using Playwright locators (no DOM globals needed)
  const hasFeed    = await page.locator('[role="feed"]').isVisible({ timeout: 8000 }).catch(() => false);
  const feedCount  = await page.locator('[role="feed"] > div').count();
  const linkCount  = await page.locator('[role="feed"] a[href*="/maps/place/"]').count();
  const articleCnt = await page.locator('[role="article"]').count();
  const headings   = await page.locator('[role="heading"]').allTextContents();
  console.log(`feed visible=${hasFeed}  feedChildren=${feedCount}  placeLinks=${linkCount}  articles=${articleCnt}`);
  console.log('Headings:', headings.slice(0, 6));

  const panel = page.locator('[role="feed"]');

  async function scrapeVisible() {
    // Primary selector: result entries in the feed (each is a div with a nested <a>)
    const cards = page.locator('[role="feed"] > div').filter({ has: page.locator('a[href*="/maps/place/"]') });
    const count = await cards.count();
    console.log(`  Scraping ${count} cards...`);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // Name is in the heading-level span or div
      const name = (await card.locator('.fontHeadlineSmall, [role="heading"]').first().textContent().catch(() => ''))?.trim() ?? '';
      if (!name || seen.has(name)) continue;
      seen.add(name);

      // Quick inline info (address / type / hours shown in card)
      const spans = await card.locator('.W4Efsd span, .UY7F9 span').allTextContents();
      const address = spans.find(s => /\d/.test(s) && s.length > 6) ?? '';
      const phone   = spans.find(s => /^\+?[\d\s\-().]{7,}$/.test(s)) ?? '';

      // Click to open detail panel
      await card.click().catch(() => {});
      await page.waitForTimeout(2500);

      // Detail panel selectors (text is directly on the button, no child class needed)
      const detail = page.locator('[role="main"]');
      const detailAddress = (await detail.locator('button[data-item-id="address"]').first().textContent().catch(() => ''))?.trim() ?? address;
      const detailPhone   = (await detail.locator('button[data-item-id^="phone"]').first().textContent().catch(() => ''))?.trim() ?? phone;
      const detailWebsite = (await detail.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => ''))?.trim() ?? '';
      const rating        = (await detail.locator('.fontDisplayLarge').first().textContent().catch(() => ''))?.trim() ?? '';
      const reviews       = (await detail.locator('button[aria-label*="Bewertung"], button[aria-label*="review"]').first().getAttribute('aria-label').catch(() => ''))?.trim() ?? '';

      contacts.push({ name, address: detailAddress, phone: detailPhone, website: detailWebsite, rating, reviews });
      console.log(`  [${contacts.length}] ${name} | ${detailAddress} | ${detailPhone}`);

      // Back to list
      await page.locator('button[aria-label="Back"], button[aria-label="Zurück"]').first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  for (let scroll = 0; scroll < 6; scroll++) {
    await scrapeVisible();
    if (contacts.length >= 60) break;
    const feedEl = await page.$('[role="feed"]');
    if (feedEl) {
      await feedEl.evaluate(el => el.scrollBy(0, 1000));
    } else {
      await page.mouse.wheel(0, 1000);
    }
    await page.waitForTimeout(2500);
  }

  console.log(`\nTotal contacts collected: ${contacts.length}`);

  // ── Save results ──────────────────────────────────────────────────────────
  const jsonPath = path.resolve('dentists-berlin.json');
  fs.writeFileSync(jsonPath, JSON.stringify(contacts, null, 2), 'utf8');
  console.log(`Saved JSON: ${jsonPath}`);

  const csvPath = path.resolve('dentists-berlin.csv');
  const header = 'Name,Address,Phone,Website,Rating,Reviews\n';
  const rows = contacts.map(c =>
    [c.name, c.address, c.phone, c.website, c.rating, c.reviews]
      .map(v => `"${(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  fs.writeFileSync(csvPath, header + rows.join('\n'), 'utf8');
  console.log(`Saved CSV:  ${csvPath}`);

  console.log('\n── Preview (first 10) ──');
  contacts.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    if (c.address) console.log(`   Address : ${c.address}`);
    if (c.phone)   console.log(`   Phone   : ${c.phone}`);
    if (c.website) console.log(`   Website : ${c.website}`);
    if (c.rating)  console.log(`   Rating  : ${c.rating}`);
  });

  await browser.close();
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
