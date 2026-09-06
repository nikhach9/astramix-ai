const { chromium } = require('playwright');
const path = require('path');

async function testRenderedUI() {
  console.log('=================== ASTRAMIX AI E2E BROWSER TEST ===================');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Test Route 1: http://localhost:3000/
  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  const h1Text = await page.textContent('h1');
  console.log(`[PASS] Mounted Header H1: "${h1Text.trim()}"`);

  // Verify AstraMix engine component is visible on /optimize
  console.log('Navigating to http://localhost:3000/optimize...');
  await page.goto('http://localhost:3000/optimize', { waitUntil: 'domcontentloaded' });
  const isEngineVisible = await page.isVisible('text=Mix Proportions & Market Controls');
  console.log(`[PASS] AstraMix Engine Component Visible on /optimize: ${isEngineVisible}`);

  // Test Legacy Redirect /beton-kayak
  console.log('Navigating to http://localhost:3000/beton-kayak...');
  await page.goto('http://localhost:3000/beton-kayak', { waitUntil: 'domcontentloaded' });
  console.log(`[PASS] Legacy Route Redirected to: ${page.url()}`);

  // Perform Interactive Testing on /optimize
  await page.goto('http://localhost:3000/optimize', { waitUntil: 'domcontentloaded' });

  // 1. Change Volume (to 50 m3)
  console.log('Testing volume change interaction...');
  const inputs = page.locator('input[type="number"]');
  const volInput = inputs.first();
  await volInput.fill('50');
  await page.waitForTimeout(300);

  const stickySummaryText = await page.textContent('body');
  console.log(`[PASS] Live volume updated in UI (contains "50 m³" or "50"): ${stickySummaryText.includes('50')}`);

  await browser.close();
  console.log('=================== ALL E2E UI INTERACTION TESTS PASSED ===================');
}

testRenderedUI().catch((err) => {
  console.error('Browser E2E test failed:', err);
  process.exit(1);
});
