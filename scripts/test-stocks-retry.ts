import YahooFinance from 'yahoo-finance2';

// Try with a User Agent to bypass 429
const yf = new YahooFinance({
    // Global options
    logger: {
        info: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        debug: (...args) => { },
    }
});

// Suppress notices
yf.suppressNotices(['yahooSurvey']);

// IMPORTANT: Set a real browser User Agent
// Yahoo often blocks default node-fetch agents
// We can't set headers directly in the constructor easily in all versions, 
// but let's try via the underlying fetch options if possible, 
// OR relying on the library to handle it if we don't look like a bot.
// Actually, yahoo-finance2 v2+ usually handles crumbs well, but let's try to verify if purely the library call works.

const symbols = ['AAPL', '006208.TW'];

async function testFetch() {
    console.log('Testing Yahoo Finance Fetch (Retry)...');
    try {
        const result = await yf.quote(symbols);
        console.log('Fetch Success!');
        // console.log(JSON.stringify(result, null, 2));
        console.log(`Got ${result.length} results.`);
    } catch (error: any) {
        console.error('Fetch Failed!');
        console.error('Message:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    }
}

testFetch();
