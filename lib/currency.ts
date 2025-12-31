
export interface ExchangeRates {
    USD: number;
    JPY: number;
    TWD: number;
}

const FALLBACK_RATES: ExchangeRates = {
    USD: 32.5,
    JPY: 0.22,
    TWD: 1
};

export async function fetchExchangeRates(): Promise<{ rates: ExchangeRates; isLive: boolean }> {
    try {
        // Using a free API (exchangerate-api.com) based on TWD
        // API Base: https://api.exchangerate-api.com/v4/latest/TWD 
        // Note: TWD base might be less common, let's try USD base and convert?
        // Let's use https://api.exchangerate-api.com/v4/latest/USD

        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!res.ok) throw new Error('Failed to fetch rates');

        const data = await res.json();
        const usdToTwd = data.rates.TWD;
        const usdToJpy = data.rates.JPY; // We need JPY to TWD? Or we just need TWD rates.

        // System uses getExchangeRate(currency) -> returns Rate to TWD.
        // So:
        // USD -> TWD = usdToTwd
        // JPY -> TWD = (1 / usdToJpy) * usdToTwd  (Cross Rate)
        // TWD -> TWD = 1

        if (!usdToTwd || !usdToJpy) throw new Error('Missing rates');

        return {
            rates: {
                USD: usdToTwd,
                JPY: usdToTwd / usdToJpy,
                TWD: 1
            },
            isLive: true
        };

    } catch (error) {
        console.warn('Exchange Rate Fetch Failed, using fallback:', error);
        return {
            rates: FALLBACK_RATES,
            isLive: false // Indicates Fixed
        };
    }
}
