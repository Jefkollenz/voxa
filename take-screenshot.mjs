import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/perfil/exemplo');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/demo_profile.png', fullPage: true });
console.log('Screenshot saved to /tmp/demo_profile.png');
await browser.close();
