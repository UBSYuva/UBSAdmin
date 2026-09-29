const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

let browser = null;

async function getBrowser() {
    if (browser && browser.isConnected()) {
        return browser;
    }

    try {
        const isProduction = process.env.NODE_ENV === 'production';
        let execPath;
        try {
            execPath = await chromium.executablePath();
        } catch (e) {
            execPath = undefined;
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            defaultViewport: chromium.defaultViewport || { width: 800, height: 1000 },
            executablePath: execPath,
            headless: 'new',
        });

        browser.on('disconnected', () => {
            browser = null;
        });

        return browser;
    } catch (err) {
        console.warn('[AI Studio] Puppeteer browser launch warning:', err.message);
        return null;
    }
}

async function closeBrowser() {
    if (browser) {
        try {
            await browser.close();
        } catch (e) {
            // ignore
        }
        browser = null;
    }
}

module.exports = {
    getBrowser,
    closeBrowser
};
