import { chromium } from '@playwright/test';

const PAUSE = 700;   // ms between actions — slow enough to watch
const slow = (ms = PAUSE) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const ctx    = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page   = await ctx.newPage();
  const bugs: string[] = [];

  console.log('\n=== Opening form ===');
  await page.goto('http://localhost:3000');
  await slow(1000);

  // ── Helper: take a labelled screenshot ──────────────────────────
  let shot = 0;
  const snap = async (label: string) => {
    await page.screenshot({ path: `screenshots/explore-${String(++shot).padStart(2,'0')}-${label}.png` });
  };

  // ── Helper: assert class ────────────────────────────────────────
  const assertActive = async (slideId: string, label: string) => {
    const cls = await page.locator(`#${slideId}`).getAttribute('class') ?? '';
    if (!cls.includes('active')) {
      bugs.push(`[${label}] Expected #${slideId} to be active but got class: "${cls}"`);
      console.warn(`  BUG: ${bugs[bugs.length-1]}`);
    } else {
      console.log(`  OK  #${slideId} is active`);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CHECK 1 — Initial state
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Check 1: Initial state ---');
  await assertActive('slide-0', 'initial');
  await snap('initial');

  // Verify progress bar exists and has zero width
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pbWidth = await page.locator('#progress-bar').evaluate((el: any) => el.style.width);
  console.log(`  Progress bar initial width: "${pbWidth}"`);
  if (pbWidth !== '0%') bugs.push(`Progress bar should start at 0%, got "${pbWidth}"`);

  // Step counter
  const counter = await page.locator('#step-counter').innerText();
  console.log(`  Step counter: "${counter}"`);
  if (!counter.includes('1')) bugs.push(`Step counter should show "1 / 12", got "${counter}"`);

  // ═══════════════════════════════════════════════════════════════
  // CHECK 2 — Validation on empty first name
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Check 2: Validation (empty Enter) ---');
  await page.keyboard.press('Enter');
  await slow();
  const errText = await page.locator('#err-0').innerText();
  console.log(`  Error message: "${errText}"`);
  if (!errText.toLowerCase().includes('required')) bugs.push('Q1 validation error text missing "required"');
  await assertActive('slide-0', 'validation keeps user on slide-0');
  await snap('validation-error');

  // ═══════════════════════════════════════════════════════════════
  // Q1 — First name (Enter key)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q1: First name ---');
  await page.fill('#slide-0 .q-input', 'Alex');
  await slow();
  await page.keyboard.press('Enter');
  await slow(900);
  await assertActive('slide-1', 'after Q1');
  await snap('q2-last-name');

  // ═══════════════════════════════════════════════════════════════
  // Q2 — Last name (Continue button)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q2: Last name (via Continue button) ---');
  await page.fill('#slide-1 .q-input', 'Rivera');
  await slow();
  await page.click('#slide-1 .btn-continue');
  await slow(900);
  await assertActive('slide-2', 'after Q2');
  await snap('q3-phone');

  // ═══════════════════════════════════════════════════════════════
  // Q3 — Phone number
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q3: Phone number ---');
  await page.fill('#slide-2 .q-input', '+1 (555) 012-3456');
  await slow();
  await page.keyboard.press('Enter');
  await slow(900);
  await assertActive('slide-3', 'after Q3');
  await snap('q4-business');

  // ═══════════════════════════════════════════════════════════════
  // Q4 — Business name
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q4: Business name ---');
  await page.fill('#slide-3 .q-input', 'Nova Labs');
  await slow();
  await page.keyboard.press('Enter');
  await slow(900);
  await assertActive('slide-4', 'after Q4');
  await snap('q5-industry');

  // ═══════════════════════════════════════════════════════════════
  // CHECK 3 — Chip validation (advance without selecting)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Check 3: Chip validation (no selection) ---');
  await page.click('#slide-4 .btn-continue');
  await slow();
  const chipErr = await page.locator('#err-4').innerText();
  console.log(`  Chip error: "${chipErr}"`);
  if (!chipErr.toLowerCase().includes('required')) bugs.push('Q5 chip validation error missing "required"');
  await snap('chip-validation-error');

  // ═══════════════════════════════════════════════════════════════
  // Q5 — Industry (chip + check if Enter on chip auto-advances)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q5: Industry chips ---');
  const techChip = page.locator('#slide-4 .chip', { hasText: 'Technology' });
  await techChip.click();
  await slow(500);
  const isSelected = await techChip.getAttribute('class');
  console.log(`  Chip class after click: "${isSelected}"`);
  if (!isSelected?.includes('selected')) bugs.push('Q5: chip click did not add "selected" class');

  // Now check: does pressing Enter on a focused chip stay on the slide?
  console.log('  Testing Enter on focused chip (should NOT auto-advance)...');
  const financeChip = page.locator('#slide-4 .chip', { hasText: 'Finance' });
  await financeChip.focus();
  await slow(400);
  await page.keyboard.press('Enter');
  await slow(600);
  const stillOnQ5 = await page.locator('#slide-4').getAttribute('class');
  if (stillOnQ5?.includes('active')) {
    console.log('  OK  Enter on chip selected it without auto-advancing');
  } else {
    bugs.push('Q5: pressing Enter on a focused chip auto-advanced the form unexpectedly');
    console.warn(`  BUG: Enter on chip caused auto-advance`);
  }
  await snap('q5-chip-selected');

  // Continue to Q6
  await page.click('#slide-4 .btn-continue');
  await slow(900);
  await assertActive('slide-5', 'after Q5');

  // ═══════════════════════════════════════════════════════════════
  // Q6 — Company size
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q6: Company size ---');
  await snap('q6-size');
  await page.locator('#slide-5 .chip', { hasText: '11–50' }).click();
  await slow();
  await page.click('#slide-5 .btn-continue');
  await slow(900);
  await assertActive('slide-6', 'after Q6');

  // ═══════════════════════════════════════════════════════════════
  // Q7 — Primary goal
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q7: Primary goal ---');
  await snap('q7-goal');
  await page.locator('#slide-6 .chip', { hasText: 'Business growth' }).click();
  await slow();
  await page.click('#slide-6 .btn-continue');
  await slow(900);
  await assertActive('slide-7', 'after Q7');

  // ═══════════════════════════════════════════════════════════════
  // Q8 — Textarea: check that plain Enter does NOT advance
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q8: Challenge textarea ---');
  await snap('q8-challenge');
  await page.fill('#slide-7 .q-textarea', 'We need better customer retention.');
  await slow(600);

  // Plain Enter should NOT advance (just insert newline in textarea)
  console.log('  Testing plain Enter in textarea (should add newline, not advance)...');
  await page.locator('#slide-7 .q-textarea').press('Enter');
  await slow(400);
  const stillOnQ8 = await page.locator('#slide-7').getAttribute('class');
  if (stillOnQ8?.includes('active')) {
    console.log('  OK  plain Enter stayed on Q8');
  } else {
    bugs.push('Q8: plain Enter in textarea caused unintended form advance');
    console.warn('  BUG: plain Enter in textarea advanced the form');
  }

  // Ctrl+Enter should advance
  console.log('  Testing Ctrl+Enter to advance from textarea...');
  await page.keyboard.press('Control+Enter');
  await slow(900);
  await assertActive('slide-8', 'after Q8 Ctrl+Enter');
  await snap('q9-source');

  // ═══════════════════════════════════════════════════════════════
  // Q9 — Source
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q9: How did you hear ---');
  await page.locator('#slide-8 .chip', { hasText: 'A referral' }).click();
  await slow();
  await page.click('#slide-8 .btn-continue');
  await slow(900);
  await assertActive('slide-9', 'after Q9');

  // ═══════════════════════════════════════════════════════════════
  // Q10 — Budget
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q10: Budget ---');
  await snap('q10-budget');
  await page.locator('#slide-9 .chip', { hasText: '$1,000 – $5,000' }).click();
  await slow();
  await page.click('#slide-9 .btn-continue');
  await slow(900);
  await assertActive('slide-10', 'after Q10');

  // ═══════════════════════════════════════════════════════════════
  // Q11 — Timeline
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q11: Timeline ---');
  await snap('q11-timeline');
  await page.locator('#slide-10 .chip', { hasText: '1–3 months' }).click();
  await slow();
  await page.click('#slide-10 .btn-continue');
  await slow(900);
  await assertActive('slide-11', 'after Q11');

  // ═══════════════════════════════════════════════════════════════
  // Q12 — Optional textarea (submit blank)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Q12: Optional notes (skip blank) ---');
  await snap('q12-notes');
  await page.click('#slide-11 .btn-continue');
  await slow(1200);

  const confirmActive = await page.locator('#confirm-slide').getAttribute('class');
  if (confirmActive?.includes('active')) {
    const title = await page.locator('#confirm-title').innerText();
    console.log(`\n  Confirmation title: "${title}"`);
    if (!title.toLowerCase().includes('alex')) bugs.push(`Confirmation should include first name "Alex", got "${title}"`);
    await snap('confirmation');
  } else {
    bugs.push('Did not reach confirmation screen after Q12');
    console.warn('  BUG: confirmation screen not shown');
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECK — Restart button
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- Check: Restart button ---');
  await page.click('#restart-btn');
  await slow(800);
  await assertActive('slide-0', 'after restart');
  const firstInput = await page.locator('#slide-0 .q-input').inputValue();
  if (firstInput !== '') bugs.push(`After restart, Q1 input was not cleared (value: "${firstInput}")`);
  else console.log('  OK  Q1 input cleared on restart');
  await snap('after-restart');

  // ═══════════════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(56));
  if (bugs.length === 0) {
    console.log('  ALL CHECKS PASSED — no bugs found');
  } else {
    console.log(`  ${bugs.length} BUG(S) FOUND:`);
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
  }
  console.log('═'.repeat(56) + '\n');

  await slow(2000);
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
