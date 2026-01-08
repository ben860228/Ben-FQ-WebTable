import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Asset, RecurringItem, OneOffEvent, DebtDetail, InsuranceDetail } from './types';

// --- SERVER SIDE ONLY ---
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Module-level cache for the spreadsheet document
let docPromise: Promise<GoogleSpreadsheet | null> | null = null;

async function getDoc() {
    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SHEET_ID) {
        console.warn('Google Sheets Credentials missing');
        return null;
    }

    // Return existing promise if available (Singleton)
    if (docPromise) return docPromise;

    // Initialize new promise
    docPromise = (async () => {
        try {
            const serviceAccountAuth = new JWT({
                email: SERVICE_ACCOUNT_EMAIL,
                key: PRIVATE_KEY,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
            const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
            await doc.loadInfo();
            return doc;
        } catch (error) {
            console.error("Failed to load Google Sheet info:", error);
            docPromise = null; // Reset cache on failure so we can retry
            throw error;
        }
    })();

    return docPromise;
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
        Note: row.get('Note'),
        Unit_Price: parseNumber(row.get('Unit_Price')),
        Real_Estate_Connect: row.get('Real_Estate_Connect') || row.get('Real_Estate_Connet') // Handle potential typo in CSV
    }));
}

export async function fetchRecurringItems(): Promise<RecurringItem[]> {
    const doc = await getDoc();
    if (!doc) return [];

    const sheet = doc.sheetsByTitle['Recurring_Items'] || doc.sheetsByIndex[1];
    const rows = await sheet.getRows();

    if (rows.length > 0) {
        // console.log('Row 1 Category_Name:', rows[0].get('Category_Name'));
    }

    return rows.map((row, index) => {
        const freqVal = row.get('Frequency');
        return {
            ID: row.get('ID') || `R${index}`,
            Type: (row.get('Type') as 'Income' | 'Expense') || 'Expense',
            Category: row.get('Category') || 'General',
            Category_Name: row.get('Category_Name'), // Fetch Chinese mapped name if available
            Name: row.get('Name') || 'Unnamed Item',
            Amount_Base: parseNumber(row.get('Amount_Base')),
            Currency: row.get('Currency') || 'TWD',
            Frequency: freqVal ? String(freqVal) : '12',
            Specific_Month: row.get('Specific_Month'), // Keep as string
            Payment_Day: row.get('Payment_Day') ? parseInt(row.get('Payment_Day')) : undefined,
            Start_Date: row.get('Start_Date'),
            End_Date: row.get('End_Date'),
            Note: row.get('Note')
        };
    });
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
        Date: row.get('Due_Date') || row.get('Date') || '', // Modified to matching CSV header
        Category: row.get('Category') || '',
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

export async function fetchDebtDetails(tableId: string): Promise<DebtDetail[]> {
    const doc = await getDoc();
    if (!doc) return [];

    console.log(`Fetching Debt Table: ${tableId}`);
    const sheet = doc.sheetsByTitle[tableId];
    if (!sheet) {
        console.warn(`Debt Sheet ${tableId} not found. Available sheets:`, Object.keys(doc.sheetsByTitle));
        return [];
    }

    const rows = await sheet.getRows();
    return rows.map(row => ({
        Date: row.get('Payment_Date') || '',
        Principal: parseNumber(row.get('Principal_Amount')),
        Interest: parseNumber(row.get('Interest_Amount')),
        Balance: parseNumber(row.get('Remaining_Principal')),
        Payment: parseNumber(row.get('Payment_Amount')),
        Total_Loan: parseNumber(row.get('Debt_Amount'))
    }));
}

export async function fetchInsuranceDetails(tableId: string): Promise<InsuranceDetail[]> {
    const doc = await getDoc();
    if (!doc) return [];

    console.log(`Fetching Insurance Table: ${tableId}`);
    const sheet = doc.sheetsByTitle[tableId];
    if (!sheet) {
        console.warn(`Insurance Sheet ${tableId} not found. Available sheets:`, Object.keys(doc.sheetsByTitle));
        return [];
    }

    const rows = await sheet.getRows();

    return rows.map(row => {
        // Fallback logic for Cash Value: Actual > Expected > 0
        const actual = parseNumber(row.get('Actual_YearEnd'));
        const expected = parseNumber(row.get('Expected_YearEnd'));
        const cashValue = actual > 0 ? actual : expected;

        return {
            Date: row.get('Payment_Date') || '',
            Premium: parseNumber(row.get('Premium_Total')),
            Cost: parseNumber(row.get('Insurance_Cost')),
            Cash_Value: cashValue,
            Accumulated_Savings: parseNumber(row.get('Accu_Savings_Amount')),
            Year: parseInt(row.get('Year')) || 0,
            Calculation_EXP: parseNumber(row.get('Calculation_EXP')),
            Calculation_SAV: parseNumber(row.get('Calculation_SAV')),
            Calculation_WIN: parseNumber(row.get('Calculation_WIN'))
        };
    });
}
