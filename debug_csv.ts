
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'Ben-FQ-table - (SYS_AUTO)Raw_Transactions.csv');

try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
    });

    console.log(`Parsed ${records.length} records.`);

    // Filter for potential exchanges
    // Check for "Transfer" type and look at SubCategory
    const potentialExchanges = records.filter((r: any) => {
        return r['記錄類型'] === '轉帳' || r['記錄類型'] === 'Transfer';
    });

    console.log(`Found ${potentialExchanges.length} Transfer records.`);

    potentialExchanges.forEach((r: any, idx: number) => {
        if (idx < 10) {
            console.log(`[${idx}] Type: ${r['記錄類型']}, SubCat: ${r['子類別']}, Project: ${r['專案']}, Amount: ${r['金額']}, Curr: ${r['幣種']}`);
        }
    });

    // Check strict '兌換' match
    const strictExchanges = potentialExchanges.filter((r: any) => r['子類別'] === '兌換');
    console.log(`Strict '兌換' matches: ${strictExchanges.length}`);

    if (strictExchanges.length > 0) {
        console.log('Sample Exchange:', strictExchanges[0]);
    }

} catch (err) {
    console.error(err);
}
