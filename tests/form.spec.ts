import { test, expect } from '@playwright/test';

test.describe('Onboarding form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('shows first question on load', async ({ page }) => {
    await expect(page.locator('#slide-0')).toHaveClass(/active/);
    await expect(page.locator('#slide-0 .q-title')).toContainText('first name');
    // Progress bar starts at 0% width — verify it exists in DOM
    await expect(page.locator('#progress-bar')).toBeAttached();
  });

  test('advances to next slide on Enter', async ({ page }) => {
    await page.fill('#slide-0 .q-input', 'Jane');
    await page.keyboard.press('Enter');
    await expect(page.locator('#slide-1')).toHaveClass(/active/);
    await expect(page.locator('#slide-1 .q-title')).toContainText('last name');
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.keyboard.press('Enter');
    await expect(page.locator('#err-0')).toContainText('required');
    await expect(page.locator('#slide-0')).toHaveClass(/active/);
  });

  test('advances via Continue button', async ({ page }) => {
    await page.fill('#slide-0 .q-input', 'Jane');
    await page.click('#slide-0 .btn-continue');
    await expect(page.locator('#slide-1')).toHaveClass(/active/);
  });

  test('chip selection works', async ({ page }) => {
    // Fill through to Q5 (industry chips)
    for (const [i, val] of [['Jane'], ['Smith'], ['555-1234'], ['Acme']].entries()) {
      await page.fill(`#slide-${i} .q-input`, val[0]);
      await page.keyboard.press('Enter');
    }
    const chip = page.locator('#slide-4 .chip', { hasText: 'Technology' });
    await chip.click();
    await expect(chip).toHaveClass(/selected/);
  });

  test('completes full form and shows confirmation', async ({ page }) => {
    // Q1-Q4: text inputs
    const textAnswers = ['Jane', 'Smith', '5551234', 'Acme Corp'];
    for (const [i, val] of textAnswers.entries()) {
      await page.fill(`#slide-${i} .q-input`, val);
      await page.keyboard.press('Enter');
    }
    // Q5-Q7: chip slides (indices 4, 5, 6) — click chip then Continue button
    for (const idx of [4, 5, 6]) {
      await page.locator(`#slide-${idx} .chip`).first().click();
      await page.click(`#slide-${idx} .btn-continue`);
      await expect(page.locator(`#slide-${idx + 1}`)).toHaveClass(/active/);
    }
    // Q8: challenge (textarea, Ctrl+Enter)
    await expect(page.locator('#slide-7')).toHaveClass(/active/);
    await page.fill('#slide-7 .q-textarea', 'Test challenge');
    await page.keyboard.press('Control+Enter');
    // Q9-Q11: chip slides (indices 8, 9, 10)
    for (const idx of [8, 9, 10]) {
      await expect(page.locator(`#slide-${idx}`)).toHaveClass(/active/);
      await page.locator(`#slide-${idx} .chip`).first().click();
      await page.click(`#slide-${idx} .btn-continue`);
    }
    // Q12: optional textarea — just submit
    await expect(page.locator('#slide-11')).toHaveClass(/active/);
    await page.click('#slide-11 .btn-continue');

    await expect(page.locator('#confirm-slide')).toHaveClass(/active/);
    await expect(page.locator('#confirm-title')).toContainText('Jane');
  });
});
