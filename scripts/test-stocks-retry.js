const YahooFinance = require('yahoo-finance2').default;

const yf = new YahooFinance();

// Attempt to suppress survey
yf.suppressNotices(['yahooSurvey']);

// Testing symbols
const symbols = ['AAPL', '006208.TW'];

async function testFetch() {
    console.log('Testing Yahoo Finance Fetch (JS)...');
    try {
        const result = await yf.quote(symbols);
        console.log('Fetch Success!', result.length);
    } catch (error) {
        console.error('Fetch Failed!');
        console.error('Message:', error.message);
        // console.error(JSON.stringify(error, null, 2));
    }
}

testFetch();
