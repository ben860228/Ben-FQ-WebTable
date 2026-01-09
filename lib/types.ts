export type Currency = 'TWD' | 'USD' | 'JPY';
export type AssetType = 'Fiat' | 'Stock' | 'Crypto' | 'Real Estate' | 'Other';
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
    Unit_Price?: number;
    Real_Estate_Connect?: string; // Links to Recurring_Items/One_Off_Events IDs or Names
}

export interface RecurringItem {
    ID: string;
    Name: string;
    Type: CashFlowType; // 'Income' | 'Expense'
    Frequency: string; // Sheet returns string like "12", let's keep as string for now to avoid parsing errors in types
    Amount_Base: number;
    Currency: string;
    Payment_Day?: number;
    Specific_Month?: string; // Changed to string to support '1;4;7;10'
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
    Category?: string; // Added for Asset Logic (e.g. 'House')
    Status?: EventStatus;
    Note?: string;
}

export interface DebtDetail {
    Date: string; // Mapped from 'Payment_Date'
    Principal: number; // Mapped from 'Principal_Amount'
    Interest: number; // Mapped from 'Interest_Amount'
    Balance: number; // Mapped from 'Remaining_Principal'
    Payment: number; // Mapped from 'Payment_Amount'
    Total_Loan: number; // Mapped from 'Debt_Amount'
}

export interface InsuranceDetail {
    Date: string; // Mapped from 'Payment_Date'
    Premium: number; // Mapped from 'Premium_Total'
    Cash_Value: number; // Mapped from 'Actual_YearEnd' or 'Expected_YearEnd'
    Accumulated_Savings: number; // Mapped from 'Accu_Savings_Amount'
    Cost: number; // Mapped from 'Insurance_Cost' (for R10 logic)
    Year: number; // Explicit Year from CSV
    Calculation_EXP?: number; // Pre-calculated Expense
    Calculation_SAV?: number; // Pre-calculated Savings
    Calculation_WIN?: number; // Pre-calculated Gain
}

export interface HistoryRecord {
    Date: string;
    Asset_ID: string;
    Name: string;
    Category: string;
    Type: 'Balance_Update' | 'Holding_Update';
    Value: number;
    Unit: string;
    Unit_Price?: number;
    Logged_At?: string;
}

export interface AssetUpdate {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    category: string; // e.g., 'Bank', 'Stock'
    currency: string;
}

export interface RawTransaction {
    ID: string;
    YearMonth: string; // '2026-01'
    MOZE_Source_Account: string;
    MOZE_Currency: string;
    MOZE_Type: string; // 'Expense', 'Income', 'Transfer'
    MOZE_Category: string; // MOZE Main Category
    MOZE_SubCategory: string;
    MOZE_Amount: number;
    MOZE_Fee: number;
    MOZE_Discount: number;
    MOZE_Name: string;
    MOZE_Merchant: string;
    MOZE_Date: string;
    MOZE_Time: string;
    MOZE_Project: string; // Maps to Budget Category
    MOZE_Description: string;
    MOZE_Tag: string;
    MOZE_Who: string;
    MOZE_Match_Status: string; // "Matched: Rxx" or "Waiting_Rules"
    Manual_Action?: string; // "當作支出", "無視", "結案" etc.
    Action_Options?: string;
    Action_Desc?: string;
}

export interface ExpenseHistoryItem {
    YearMonth: string;
    Recurring_Item_ID: string; // New field
    Name_Category: string; // 'Name-Category' in CSV
    Actual_Amount: number; // Renamed from Total_Amount
    Note: string; // Debug info
}
