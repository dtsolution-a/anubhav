const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`Browser Console [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('Page Error:', error.message);
  });

  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  
  // Type owner code and login
  await page.type('input', 'DT');
  await page.click('button');
  
  // Wait a few seconds for routing and rendering to finish or crash
  await new Promise(r => setTimeout(r, 4000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Took screenshot');
  await browser.close();
})();
