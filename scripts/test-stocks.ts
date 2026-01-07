import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

const symbols = ['AAPL', 'GOOGL', '006208.TW'];

async function testFetch() {
    console.log('Testing Yahoo Finance Fetch for:', symbols);
    try {
        const result = await yf.quote(symbols);
        console.log('Fetch Success!');
        console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('Fetch Failed!');
        console.error('Message:', error.message);
        console.error('Full Error:', error);
    }
}

testFetch();
