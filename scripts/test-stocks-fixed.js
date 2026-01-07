const YahooFinance = require('yahoo-finance2').default;

// Create instance with Browser User-Agent to avoid 429
const yf = new YahooFinance({
    // In later versions, you can pass logging/etc here
    logger: { info: console.log, warn: console.warn, error: console.error, debug: () => { } },
    // Only works if the library version supports passing fetchOptions to node-fetch/global fetch
    fetchOptions: {
        headers: {
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
    }
});

const symbols = ['AAPL', '006208.TW'];

async function testFetch() {
    console.log('Testing Yahoo Finance Fetch with Custom User-Agent...');
    try {
        const result = await yf.quote(symbols);
        console.log('Fetch Success!');
        console.log(`Got ${result.length} results.`);
    } catch (error) {
        console.error('Fetch Failed!');
        console.error('Message:', error.message);
        // console.error(JSON.stringify(error, null, 2));
    }
}

testFetch();
