# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                  # run all tests across Chromium, Firefox, WebKit
npm run test:headed       # run tests with a visible browser window
npm run test:ui           # open Playwright's visual test runner
npm run codegen           # open a browser + code recorder (generates TypeScript from your actions)
npm run screenshot <url> [output.png]   # take a full-page screenshot of any URL
npm run demo              # run the multi-step automation demo script
npm run serve             # serve public/ on http://localhost:3000
```

Run a single test file:
```bash
npx playwright test tests/example.spec.ts
```

Run tests on one browser only:
```bash
npx playwright test --project=chromium
```

## Architecture

Two distinct usage patterns co-exist in this project:

**1. Tests (`tests/`)** — use `@playwright/test`'s `test`/`expect` API with the `page` fixture injected automatically. `playwright.config.ts` drives these: it runs all three browser projects in parallel, saves an HTML report, and captures traces on first retry. Tests are the right place for assertions and multi-browser coverage.

**2. Standalone scripts (`scripts/`)** — executed directly with `ts-node`. They import `chromium` from `@playwright/test` and manage the browser lifecycle manually (`chromium.launch()` → `browser.newPage()` → `browser.close()`). Use this pattern for one-off automation, scraping, or screenshot utilities where the test runner overhead isn't needed. `scripts/serve.ts` is a plain Node.js `http` server that serves the `public/` directory.

**3. Static web app (`public/`)** — a Typeform-style multi-step onboarding form (`index.html`) with 12 questions, slide transitions, chip pickers, and a confirmation screen. All logic is vanilla JS embedded in the single HTML file. Served by `npm run serve`; tested by `tests/form.spec.ts` (requires the server to be running on port 3000 before running tests).

## Key config notes

- `tsconfig.json` sets `"types": ["node"]` — required for `ts-node` scripts to resolve `process`, `path`, etc. without errors.
- `playwright.config.ts` uses `waitUntil: 'networkidle'` is not set globally; scripts set it per-navigation. Tests rely on Playwright's default (`load`).
- Screenshots from scripts are written relative to the working directory (project root). Test failure screenshots go to the Playwright-managed `test-results/` folder.
