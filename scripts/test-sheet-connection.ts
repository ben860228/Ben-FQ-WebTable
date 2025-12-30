import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Manual .env.local parser to avoid dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('📄 Found .env.local');
    const envConfig = fs.readFileSync(envPath, 'utf8');

    // Improved parsing for basic Key=Value
    // Note: This simple parser fails on multi-line values. 
    // We assume the user followed standard .env practices (single line with \n for newlines)
    envConfig.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
} else {
    console.log('⚠️ .env.local NOT found in ' + envPath);
}

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Crucial: Handle both literal "\n" strings (from .env) and actual newlines
let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
const PRIVATE_KEY = rawKey.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function run() {
    console.log('--- Google Sheet Connection Test (Debug Mode) ---');

    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SHEET_ID) {
        console.error('❌ Missing Environment Variables');
        console.log('Email:', !!SERVICE_ACCOUNT_EMAIL);
        console.log('Key:', !!PRIVATE_KEY);
        console.log('Sheet ID:', !!SHEET_ID);
        return;
    }

    console.log('Debugging Key Format:');
    console.log(`- Raw Key Length: ${rawKey.length}`);
    console.log(`- Processed Key Length: ${PRIVATE_KEY.length}`);
    console.log(`- Starts with BEGIN: ${PRIVATE_KEY.includes('BEGIN PRIVATE KEY')}`);
    console.log(`- Ends with END: ${PRIVATE_KEY.includes('END PRIVATE KEY')}`);
    console.log(`- Contains actual newlines: ${PRIVATE_KEY.includes('\n')}`);
    // Print first line safely
    const lines = PRIVATE_KEY.split('\n');
    console.log(`- First Line: ${lines[0]}`);
    console.log(`- Last Line: ${lines[lines.length - 1]}`);

    console.log('\nAuthentication Attempt...');
    const serviceAccountAuth = new JWT({
        email: SERVICE_ACCOUNT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

    try {
        await doc.loadInfo();
        console.log(`✅ SUCCESS! Connected to Sheet: "${doc.title}"`);
        // ... (rest of logging) ...

        const sheetCount = doc.sheetCount;
        console.log(`Found ${sheetCount} sheets (tabs):`);

        for (let i = 0; i < sheetCount; i++) {
            const sheet = doc.sheetsByIndex[i];
            console.log(`\n[Sheet ${i}]: ${sheet.title}`);

            // Limit to first 10 rows just to peek headers and data
            const rows = await sheet.getRows({ limit: 3 });
            const headerValues = sheet.headerValues;

            console.log('  Headers:', headerValues);
            if (rows.length > 0) {
                console.log('  row 1 data:', rows[0].toObject());
            } else {
                console.log('  (No data rows found)');
            }
        }

    } catch (error: any) {
        console.error('❌ Connection Failed:', error.message);
        if (error.message.includes('unsupported')) {
            console.error('>>> HINT: This usually means the PRIVATE_KEY format is invalid.');
            console.error('>>> Ensure it is a single line in .env.local with "\\n" for newlines, OR fully quoted with actual newlines.');
            console.log('>>> Your processed key (first 50 chars):', PRIVATE_KEY.substring(0, 50));
        }
    }
}

run();
