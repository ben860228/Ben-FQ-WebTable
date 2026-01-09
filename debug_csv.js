
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const filePath = path.join(process.cwd(), 'Ben-FQ-table - (SYS_AUTO)Raw_Transactions.csv');

try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
    });

    console.log(`Parsed ${records.length} records.`);
    if (records.length > 0) {
        console.log('Headers:', Object.keys(records[0]));
        console.log('First Record:', records[0]);
    }

    // Filter for potential exchanges
    const potentialExchanges = records.filter(r => {
        return r['MOZE_Type'] === '轉帳' || r['MOZE_Type'] === 'Transfer' || r['MOZE_Category'] === '轉帳'; // Check Category too
    });

    console.log(`Found ${potentialExchanges.length} Transfer records.`);

    // Check SubCategory
    potentialExchanges.forEach((r, idx) => {
        // Log specifically items that might look like exchange
        if (r['MOZE_SubCategory'] && r['MOZE_SubCategory'].includes('兌換')) {
            console.log(`[MATCH] SubCat: '${r['MOZE_SubCategory']}', Project: '${r['MOZE_Project']}', Type: '${r['MOZE_Type']}', Curr: '${r['MOZE_Currency']}', Amt: ${r['MOZE_Amount']}`);
        } else if (idx < 50) { // Check more
            // console.log(`[Sample] SubCat: '${r['MOZE_SubCategory']}', Project: '${r['MOZE_Project']}'`);
        }
    });

} catch (err) {
    console.error(err);
}
