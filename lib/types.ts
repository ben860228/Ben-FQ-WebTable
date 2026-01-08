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
