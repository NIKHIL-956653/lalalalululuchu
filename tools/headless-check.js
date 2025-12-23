// tools/headless-check.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => logs.push({type: 'pageerror', text: err.message}));
  page.on('requestfailed', req => logs.push({type: 'requestfailed', url: req.url(), status: req.failure().errorText}));

  try {
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
    // give some time for scripts to run
    await page.waitForTimeout(2000);

    // perform a few checks
    const result = await page.evaluate(() => {
      return {
        title: document.title,
        hasBoard: !!document.getElementById('board'),
        scripts: Array.from(document.scripts).map(s => s.src || '(inline)'),
        audioElements: Array.from(document.querySelectorAll('audio')).map(a => a.src),
        themeClass: document.body.className || null,
        loaderHidden: document.getElementById('loader')?.style?.display === 'none'
      };
    });

    console.log(JSON.stringify({ status: 'ok', result, logs }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ status: 'error', message: err.message, logs }, null, 2));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();