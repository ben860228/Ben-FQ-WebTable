import { google } from 'googleapis';
import { Readable } from 'stream';

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Initialize Drive Client with scoped auth
const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

export async function fetchLatestMozeCsv(): Promise<string | null> {
    try {
        console.log('Searching for latest MOZE CSV in Drive...');

        // generic query for MOZE files
        const res = await drive.files.list({
            q: "name contains 'MOZE' and name contains '.csv' and trashed = false",
            orderBy: 'createdTime desc',
            pageSize: 1,
            fields: 'files(id, name, createdTime)',
        });

        const files = res.data.files;
        if (!files || files.length === 0) {
            console.warn('No MOZE CSV files found.');
            return null;
        }

        const latestFile = files[0];
        console.log(`Found latest file: ${latestFile.name} (ID: ${latestFile.id})`);

        if (!latestFile.id) return null;

        // Download file content
        const fileContent = await drive.files.get(
            { fileId: latestFile.id, alt: 'media' },
            { responseType: 'stream' }
        );

        // Convert stream to string
        const chunks: Buffer[] = [];
        const stream = fileContent.data as Readable;

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });

    } catch (error) {
        console.error('Error fetching MOZE CSV from Drive:', error);
        throw error;
    }
}
