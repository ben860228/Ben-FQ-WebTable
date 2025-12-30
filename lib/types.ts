export type Currency = 'TWD' | 'USD' | 'JPY';
export type AssetType = 'Fiat' | 'Stock' | 'Crypto';
export type CashFlowType = 'Income' | 'Expense';
export type EventStatus = 'Pending' | 'Paid';

export interface Asset {
    ID: string;
    Type: AssetType; // 'Fiat' | 'Stock' | 'Crypto' (or string/Other)
    Category: string; // 'Cash', 'Invest', etc.
    Name: string;
    Quantity: number;
    Currency: string; // Changed from Currency type to string to be safe with incoming data
    Location?: string;
    Note?: string;
}

export interface RecurringItem {
    ID: string;
    Name: string;
    Type: CashFlowType; // 'Income' | 'Expense'
    Frequency: string; // Sheet returns string like "12", let's keep as string for now to avoid parsing errors in types
    Amount_Base: number;
    Currency: string;
    Payment_Day?: number;
    Specific_Month?: number;
    Start_Date?: string;
    End_Date?: string;
    Category: string;
    Category_Name?: string; // Chinese Name from Sheet
    Note?: string;
}

export interface OneOffEvent {
    ID: string;
    Name: string;
    Date: string; // Renamed from Due_Date to match Sheet logic
    Type: CashFlowType; // Added Type (Income/Expense)
    Amount: number;
    Status?: EventStatus;
    Note?: string;
}
