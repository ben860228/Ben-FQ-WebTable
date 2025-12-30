import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Asset, RecurringItem, OneOffEvent } from './types';

// --- SERVER SIDE ONLY ---
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getDoc() {
    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SHEET_ID) {
        console.warn('Google Sheets Credentials missing');
        return null;
    }
    const serviceAccountAuth = new JWT({
        email: SERVICE_ACCOUNT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
}

function parseNumber(val: string | undefined): number {
    if (!val) return 0;
    return parseFloat(val.replace(/,/g, '')) || 0;
}

export async function fetchAssets(): Promise<Asset[]> {
    const doc = await getDoc();
    if (!doc) return [];

    // Assumes Sheet 0 is Assets_Inventory. 
    // Safer to find by title but index is often faster if stable.
    const sheet = doc.sheetsByTitle['Assets_Inventory'] || doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    return rows.map((row, index) => ({
        ID: row.get('ID') || `A${index}`,
        Type: row.get('Type') || 'Other',
        Category: row.get('Category') || 'Uncategorized',
        Name: row.get('Name') || 'Unknown Asset',
        Quantity: parseNumber(row.get('Quantity')),
        Currency: row.get('Currency') || 'TWD',
        Location: row.get('Location'),
        Note: row.get('Note')
    }));
}

export async function fetchRecurringItems(): Promise<RecurringItem[]> {
    const doc = await getDoc();
    if (!doc) return [];

    const sheet = doc.sheetsByTitle['Recurring_Items'] || doc.sheetsByIndex[1];
    const rows = await sheet.getRows();

    if (rows.length > 0) {
        console.log('--- DEBUG: First Row Headers/Data ---');
        console.log('Available Headers:', sheet.headerValues);
        console.log('Row 1 Category_Name:', rows[0].get('Category_Name'));
        console.log('Row 1 Category:', rows[0].get('Category'));
    }

    return rows.map((row, index) => ({
        ID: row.get('ID') || `R${index}`,
        Type: (row.get('Type') as 'Income' | 'Expense') || 'Expense',
        Category: row.get('Category') || 'General',
        Category_Name: row.get('Category_Name'), // Fetch Chinese mapped name if available
        Name: row.get('Name') || 'Unnamed Item',
        Amount_Base: parseNumber(row.get('Amount_Base')),
        Currency: row.get('Currency') || 'TWD',
        Frequency: (parseNumber(row.get('Frequency')) || 12).toString(), // Default to monthly (12/yr) logic if missing? Or keep as string? Types says string.
        Specific_Month: row.get('Specific_Month') ? parseInt(row.get('Specific_Month')) : undefined,
        Payment_Day: row.get('Payment_Day') ? parseInt(row.get('Payment_Day')) : undefined,
        Start_Date: row.get('Start_Date'),
        End_Date: row.get('End_Date'),
        Note: row.get('Note')
    }));
}

export async function fetchOneOffEvents(): Promise<OneOffEvent[]> {
    const doc = await getDoc();
    if (!doc) return [];

    const sheet = doc.sheetsByTitle['One_Off_Events'] || doc.sheetsByIndex[2];
    if (!sheet) return []; // Might not exist

    const rows = await sheet.getRows();

    return rows.map((row, index) => ({
        ID: row.get('ID') || `E${index}`,
        Type: (row.get('Type') as 'Income' | 'Expense') || 'Expense',
        Name: row.get('Name') || 'Unnamed Event',
        Amount: parseNumber(row.get('Amount')),
        Date: row.get('Date'),
        Note: row.get('Note')
    }));
}

export async function fetchCategoryMap(): Promise<Record<string, string>> {
    const doc = await getDoc();
    if (!doc) return {};

    // Try finding by title first
    const sheet = doc.sheetsByTitle['Category_Name'];
    if (!sheet) {
        console.warn('Category_Name sheet not found');
        return {};
    }

    const rows = await sheet.getRows();
    const map: Record<string, string> = {};

    rows.forEach(row => {
        const eng = row.get('ENG');
        const cht = row.get('CHT');
        if (eng && cht) {
            map[eng] = cht;
        }
    });

    console.log('Fetched Dynamic Category Map:', Object.keys(map).length, 'entries');
    return map;
}
