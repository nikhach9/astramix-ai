const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function diagnose() {
  console.log('=================== DIAGNOSING ASTRAMIX AI RUNNING WEBSITE ===================');

  const artifactDir = 'C:\\Users\\gdelt\\.gemini\\antigravity\\brain\\39eb8ec7-fcab-41cf-ad97-aee497bcb042';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Test 1: Localhost (http://localhost:3000/)
  console.log('\n--- 1. Testing Localhost Dev Server (http://localhost:3000/) ---');
  try {
    const resLocal = await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`Localhost HTTP Status: ${resLocal.status()}`);
    await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {});
    const localH1 = await page.textContent('h1').catch(() => 'No H1');
    console.log(`Localhost H1: "${localH1.trim()}"`);

    const localHomeScreenshot = path.join(artifactDir, 'localhost_3000_home.png');
    await page.screenshot({ path: localHomeScreenshot, fullPage: true });
    console.log(`Saved Localhost Home Screenshot to: ${localHomeScreenshot}`);
  } catch (err) {
    console.log(`Localhost (http://localhost:3000/) error: ${err.message}`);
  }

  // Test 1b: Localhost /optimize
  console.log('\n--- 1b. Testing Localhost Route http://localhost:3000/optimize ---');
  try {
    const resLocalOpt = await page.goto('http://localhost:3000/optimize', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`Localhost /optimize HTTP Status: ${resLocalOpt.status()}`);
    const isAstraMixOptVisible = await page.isVisible('text=Mix Proportions & Market Controls');
    console.log(`AstraMix Optimizer visible on Localhost /optimize: ${isAstraMixOptVisible}`);

    const localOptScreenshot = path.join(artifactDir, 'localhost_3000_optimize.png');
    await page.screenshot({ path: localOptScreenshot, fullPage: true });
    console.log(`Saved Localhost /optimize Screenshot to: ${localOptScreenshot}`);
  } catch (err) {
    console.log(`Localhost /optimize error: ${err.message}`);
  }

  // Test 2: Live Deployed Website (https://astramix-ai.com/)
  console.log('\n--- 2. Testing Live Deployed Website (https://astramix-ai.com/) ---');
  try {
    const resLive = await page.goto('https://astramix-ai.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`Live site HTTP Status: ${resLive.status()}`);
    const liveTitle = await page.title();
    const liveH1 = await page.textContent('h1').catch(() => 'No H1 found');
    console.log(`Live Title: "${liveTitle}"`);
    console.log(`Live H1: "${liveH1.trim()}"`);

    const liveScreenshotPath = path.join(artifactDir, 'live_astramix_ai_com_home.png');
    await page.screenshot({ path: liveScreenshotPath, fullPage: true });
    console.log(`Saved Live Screenshot to: ${liveScreenshotPath}`);
  } catch (err) {
    console.log(`Error reaching live site https://astramix-ai.com/: ${err.message}`);
  }

  await browser.close();
  console.log('\n=================== DIAGNOSIS COMPLETE ===================');
}

diagnose().catch((err) => {
  console.error('Diagnosis failed:', err);
});
