import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  currency: string;
  rates: Record<string, number> | null;
  lastUpdated: string | null;
  changeCurrency: (newCurrency: string, triggerDatabaseConversion: (multiplier: number) => void) => Promise<boolean>;
  refreshRates: () => Promise<boolean>;
  formatCurrency: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'PHP');
  const [rates, setRates] = useState<Record<string, number> | null>(() => {
    const saved = localStorage.getItem('app_rates');
    return saved ? JSON.parse(saved) : null;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => localStorage.getItem('app_rates_date'));

  // Silently fetch fresh rates on boot if we are online
  const refreshRates = async () => {
    try {
      // Using a free, no-key required open API (Base USD)
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      
      if (data && data.rates) {
        setRates(data.rates);
        setLastUpdated(data.time_last_update_utc);
        localStorage.setItem('app_rates', JSON.stringify(data.rates));
        localStorage.setItem('app_rates_date', data.time_last_update_utc);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Offline: Using cached exchange rates.");
      return false;
    }
  };

  useEffect(() => {
    refreshRates();
  }, []);

  const changeCurrency = async (newCurrency: string, triggerDatabaseConversion: (multiplier: number) => void) => {
    if (newCurrency === currency) return true;
    
    // We need rates to do a conversion.
    if (!rates) {
      const success = await refreshRates();
      if (!success) return false; // Fails if offline and no cache exists
    }

    // Safely pull latest state of rates
    const currentRates = JSON.parse(localStorage.getItem('app_rates') || '{}');
    if (!currentRates[currency] || !currentRates[newCurrency]) return false;

    // Calculate the multiplier (e.g., USD -> PHP)
    const multiplier = currentRates[newCurrency] / currentRates[currency];
    
    // Trigger the sweep function in ExpenseContext
    triggerDatabaseConversion(multiplier);
    
    setCurrency(newCurrency);
    localStorage.setItem('app_currency', newCurrency);
    return true;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

return (
    <SettingsContext.Provider value={{ currency, rates, lastUpdated, changeCurrency, refreshRates, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};