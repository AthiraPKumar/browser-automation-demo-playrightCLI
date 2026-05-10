import { chromium } from '@playwright/test';
import * as path from 'path';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Navigate and capture the landing page
  console.log('Navigating to Playwright docs...');
  await page.goto('https://playwright.dev/', { waitUntil: 'networkidle' });

  const title = await page.title();
  console.log(`Page title: ${title}`);

  await page.screenshot({ path: path.resolve('demo-01-landing.png'), fullPage: false });
  console.log('Screenshot 1 saved: demo-01-landing.png');

  // 2. Click "Get Started" and capture the intro page
  console.log('Clicking "Get started"...');
  await page.getByRole('link', { name: 'Get started' }).click();
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: path.resolve('demo-02-get-started.png'), fullPage: false });
  console.log('Screenshot 2 saved: demo-02-get-started.png');

  // 3. Extract some text content
  const heading = await page.locator('h1').first().textContent();
  console.log(`Page heading: ${heading}`);

  // 4. Use the search box
  console.log('Opening search...');
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(500);
  await page.keyboard.type('screenshot');
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.resolve('demo-03-search.png'), fullPage: false });
  console.log('Screenshot 3 saved: demo-03-search.png');

  await browser.close();
  console.log('\nDemo complete. Check demo-01*.png, demo-02*.png, demo-03*.png.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
