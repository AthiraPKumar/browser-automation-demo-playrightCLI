import { chromium } from '@playwright/test';
import * as path from 'path';

async function main() {
  const url = process.argv[2];
  const outputPath = process.argv[3] ?? 'screenshot.png';

  if (!url) {
    console.error('Usage: npx ts-node scripts/screenshot.ts <url> [output.png]');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });

  const resolved = path.resolve(outputPath);
  await page.screenshot({ path: resolved, fullPage: true });

  console.log(`Screenshot saved to ${resolved}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
