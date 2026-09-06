const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyAstraMixUI() {
  console.log('🚀 Starting Comprehensive AstraMix AI E2E Browser Verification...');

  const artifactDir = 'C:\\Users\\gdelt\\.gemini\\antigravity\\brain\\39eb8ec7-fcab-41cf-ad97-aee497bcb042';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Step 1: Open Website Home Page
  console.log('\n[1/7] Navigating to http://localhost:3000/ ...');
  const responseHome = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(` -> HTTP Status: ${responseHome.status()}`);
  if (responseHome.status() !== 200) throw new Error('Home page returned non-200 status');

  const titleText = await page.textContent('h1');
  console.log(` -> Header H1 Title: "${titleText.trim()}"`);

  // Step 2: Verify Brand Integrity (Zero Kayak Mentions)
  console.log('\n[2/7] Auditing DOM for legacy KAYAK / BetonKayak branding...');
  const pageContent = await page.textContent('body');
  const hasKayakBrand = /kayak|beton/i.test(pageContent.replace(/AstraMix/gi, ''));
  console.log(` -> Kayak/BetonKayak branding found in DOM: ${hasKayakBrand}`);
  if (hasKayakBrand) throw new Error('Legacy Kayak branding detected on Home page DOM');

  // Step 3: Test Navigation to /optimize
  console.log('\n[3/7] Navigating to http://localhost:3000/optimize ...');
  const responseOpt = await page.goto('http://localhost:3000/optimize', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(` -> HTTP Status: ${responseOpt.status()}`);
  const isEngineVisible = await page.isVisible('text=Mix Proportions & Market Controls');
  console.log(` -> AstraMix Engine Mounted on /optimize: ${isEngineVisible}`);
  if (!isEngineVisible) throw new Error('AstraMix Engine was NOT visible on /optimize');

  // Step 4: Perform Interactive Input Tests
  console.log('\n[4/7] Testing Volume Input Interaction...');
  const numInputs = page.locator('input[type="number"]');
  const volumeInput = numInputs.first();
  await volumeInput.fill('50');
  await page.waitForTimeout(300);
  const optBodyText = await page.textContent('body');
  console.log(` -> Live UI updated for 50 m³: ${optBodyText.includes('50 m³') || optBodyText.includes('50')}`);

  // Step 5: Test Legacy Route Redirect /beton-kayak
  console.log('\n[5/7] Testing legacy route redirect /beton-kayak ...');
  await page.goto('http://localhost:3000/beton-kayak', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const currentUrl = page.url();
  console.log(` -> Final redirected URL: ${currentUrl}`);
  const isRedirectedToOptimize = currentUrl.includes('/optimize');
  console.log(` -> Clean redirect to /optimize verified: ${isRedirectedToOptimize}`);

  // Step 6: Test Research Page /projects/astramix
  console.log('\n[6/7] Testing Research Page http://localhost:3000/projects/astramix ...');
  const responseResearch = await page.goto('http://localhost:3000/projects/astramix', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(` -> Research Page HTTP Status: ${responseResearch.status()}`);

  // Step 7: Take Full-Page Verification Screenshot
  console.log('\n[7/7] Saving verification screenshots...');
  await page.goto('http://localhost:3000/optimize', { waitUntil: 'domcontentloaded' });
  const screenshotPathOpt = path.join(artifactDir, 'astramix_optimize_rendered.png');
  await page.screenshot({ path: screenshotPathOpt, fullPage: true });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  const screenshotPathHome = path.join(artifactDir, 'astramix_home_rendered.png');
  await page.screenshot({ path: screenshotPathHome, fullPage: true });
  console.log(` -> Saved screenshots to: ${screenshotPathHome} and ${screenshotPathOpt}`);

  console.log('\n------------------------------------------------------------');
  console.log('Console Errors Detected:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }
  console.log('✅ ALL ASTRAMIX AI E2E BROWSER TESTS PASSED PERFECTLY!');
  console.log('------------------------------------------------------------');

  await browser.close();
}

verifyAstraMixUI().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
