'use server'

import { updateAssetsInSheet, appendHistoryToSheet } from '@/lib/googleSheets';
import { AssetUpdate, HistoryRecord } from '@/lib/types';

export type SubmitResult = {
    success: boolean;
    updates?: number;
    error?: string;
};

export async function submitBatchUpdate(updates: AssetUpdate[]): Promise<SubmitResult> {
    try {
        console.log("Received batch update:", updates.length, "items");

        // 1. Update Assets Inventory
        // Map to { id, quantity } for the update function
        const inventoryUpdates = updates.map(u => ({
            id: u.id,
            quantity: u.quantity
        }));

        const updatedCount = await updateAssetsInSheet(inventoryUpdates);
        console.log("Updated Inventory Count:", updatedCount);

        // 2. Append to History
        const now = new Date();
        const historyRecords: HistoryRecord[] = updates.map(u => ({
            Date: now.toISOString().split('T')[0], // YYYY-MM-DD
            Asset_ID: u.id,
            Name: u.name,
            Category: u.category,
            Type: (u.category === 'Bank' || u.category === 'Cash') ? 'Balance_Update' : 'Holding_Update',
            Value: u.quantity, // New Quantity
            Unit: u.currency, // Use currency or unit
            Unit_Price: u.unitPrice,
            Logged_At: now.toISOString()
        }));

        await appendHistoryToSheet(historyRecords);
        console.log("Appended History Records");

        return { success: true, updates: updatedCount };
    } catch (error) {
        console.error("Batch Update Failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}
