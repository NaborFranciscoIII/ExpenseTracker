import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from './auth-context';

export const DEFAULT_CATEGORIES = [
  "Food", "Transportation", "Entertainment", "Medical", "Bills", "Groceries", "Shopping", "Salary", "Other"
];

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  label: string;
  category?: string;
  monthId: string;
  accountId: string;
}

interface MonthData { id: string; month: string; year: number; }
interface AccountData { id: string; name: string; }
interface CategoryBudget { id: string; category: string; limit: number; }
interface RecurringTx { 
  id: string; 
  type: 'income' | 'expense' | 'transfer'; // 👈 Now supports transfers
  frequency: 'weekly' | 'monthly' | 'yearly' | 'one-time'; // 👈 Now supports exact pacing
  amount: number; 
  label: string; 
  category: string; 
  accountId: string; 
  toAccountId?: string; // 👈 Only used if type is 'transfer'
  nextDueDate: string; 
}

interface ExpenseContextType {
  months: MonthData[];
  accounts: AccountData[];
  transactions: Transaction[];
  categories: string[];
  budgets: CategoryBudget[];
  recurring: RecurringTx[];
  loading: boolean;
  addCategory: (category: string) => void;
  convertAllFinancialData: (multiplier: number) => void;
  addMonth: (month: string, year: number) => Promise<void>;
  addAccount: (name: string) => Promise<void>;
  addTransaction: (accountId: string, monthId: string, tx: any) => Promise<boolean>;
  addTransfer: (fromAccountId: string, toAccountId: string, monthId: string, amount: number, date: string) => Promise<void>;
  updateTransaction: (accountId: string, monthId: string, txId: string, tx: any) => Promise<void>;
  deleteTransaction: (accountId: string, monthId: string, txId: string) => Promise<void>;
  
  
  // New Phase 3 Methods
  setCategoryBudget: (category: string, limit: number) => void;
  addRecurring: (tx: Omit<RecurringTx, 'id'>) => void;
  deleteRecurring: (id: string) => void;
  getPendingRecurring: () => RecurringTx[];
  approvePendingRecurring: () => Promise<void>;
  getMonthCategoryBreakdown: (monthId: string) => any[];

  getAccountTransactions: (accountId: string, monthId: string) => Transaction[];
  getAccountMonthTotals: (accountId: string, monthId: string) => { income: number; expenses: number; savings: number; carryOver: number; currentBalance: number };
  getMonthTotals: (monthId: string) => { income: number; expenses: number; savings: number };
  getTotalSavings: () => number;
  getMonthlySavingsHistory: () => any[];
  getMonthlyCumulativeHistory: () => any[];
  getAllRecentTransactions: (limit: number) => any[];
  getAccountAllTimeBalance: (accountId: string) => number;
  getAccountLatestTransaction: (accountId: string) => Transaction | null;
  renameAccount: (id: string, name: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  fetchFinanceData: () => Promise<void>;

  goals: SavingsGoal[];
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  addMoneyToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  getFinancialHealthScore: (monthId: string) => number;

  getSpendingInsights: (monthId: string) => string[];
  getForecast: (monthId: string) => { predictedBalance: number; dailyBurnRate: number; safeToSpend: number };
}

interface SettingsContextType {
  currency: string;
  rates: Record<string, number> | null;
  lastUpdated: string | null;
  changeCurrency: (newCurrency: string, triggerDatabaseConversion: (multiplier: number) => void) => Promise<boolean>;
  refreshRates: () => Promise<boolean>;
  // 👇 New dynamic formatter
  formatCurrency: (amount: number) => string; 
}

interface SavingsGoal { 
  id: string; 
  name: string; 
  targetAmount: number; 
  currentAmount: number; 
  deadlineDate: string; 
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'PHP');
  const [rates, setRates] = useState<Record<string, number> | null>(() => {
    const saved = localStorage.getItem('app_rates');
    return saved ? JSON.parse(saved) : null;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => localStorage.getItem('app_rates_date'));

  const refreshRates = async () => {
    try {
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

  useEffect(() => { refreshRates(); }, []);

  const changeCurrency = async (newCurrency: string, triggerDatabaseConversion: (multiplier: number) => void) => {
    if (newCurrency === currency) return true;
    if (!rates) {
      const success = await refreshRates();
      if (!success) return false;
    }
    const currentRates = JSON.parse(localStorage.getItem('app_rates') || '{}');
    if (!currentRates[currency] || !currentRates[newCurrency]) return false;

    const multiplier = currentRates[newCurrency] / currentRates[currency];
    triggerDatabaseConversion(multiplier);
    
    setCurrency(newCurrency);
    localStorage.setItem('app_currency', newCurrency);
    return true;
  };

  // 👇 The Centralized Formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);
const MONTHS_ORDER = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Add this under your other useState declarations
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('local_categories');
    return saved ? JSON.parse(saved) : [];
  });

  // Save them when updated
  useEffect(() => { localStorage.setItem('local_categories', JSON.stringify(customCategories)); }, [customCategories]);

  // Combine defaults with custom
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const addCategory = (category: string) => {
    if (category.trim() && !allCategories.includes(category.trim())) {
      setCustomCategories(prev => [...prev, category.trim()]);
    }
  };
  
  const [months, setMonths] = useState<MonthData[]>(() => { const saved = localStorage.getItem('local_months'); return saved ? JSON.parse(saved) : []; });
  const [accounts, setAccounts] = useState<AccountData[]>(() => { const saved = localStorage.getItem('local_accounts'); return saved ? JSON.parse(saved) : []; });
  const [transactions, setTransactions] = useState<Transaction[]>(() => { const saved = localStorage.getItem('local_transactions'); return saved ? JSON.parse(saved) : []; });
  
  // New Local States for Phase 3
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => { const saved = localStorage.getItem('local_budgets'); return saved ? JSON.parse(saved) : []; });
  const [recurring, setRecurring] = useState<RecurringTx[]>(() => { const saved = localStorage.getItem('local_recurring'); return saved ? JSON.parse(saved) : []; });
  const [goals, setGoals] = useState<SavingsGoal[]>(() => { const saved = localStorage.getItem('local_goals'); return saved ? JSON.parse(saved) : []; });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => { localStorage.setItem('local_months', JSON.stringify(months)); }, [months]);
  useEffect(() => { localStorage.setItem('local_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('local_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('local_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('local_recurring', JSON.stringify(recurring)); }, [recurring]);
  useEffect(() => { localStorage.setItem('local_goals', JSON.stringify(goals)); }, [goals]);

  // --- PHASE 3: GOALS & HEALTH ENGINE version 0.3 ---
  const addGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    setGoals(prev => [...prev, { ...goal, id: `goal-${Math.random().toString(36).substr(2, 5)}` }]);
  };

  const addMoneyToGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const getFinancialHealthScore = (monthId: string) => {
    const { income, expenses } = getMonthTotals(monthId);
    if (income === 0 && expenses === 0) return 100; // Default perfect score if no data
    
    let score = 100;
    
    // Metric 1: Savings Rate (Ideal is saving 20% or more of income)
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : -100;
    if (savingsRate < 20 && savingsRate >= 0) score -= (20 - savingsRate); // Deduct points if saving less than 20%
    if (savingsRate < 0) score -= 40; // Heavy penalty for spending more than earning
    
    // Metric 2: Budget Adherence
    const categoryData = getMonthCategoryBreakdown(monthId);
    categoryData.forEach(cat => {
      if (cat.limit > 0 && cat.spent > cat.limit) {
        score -= 5; // Deduct 5 points for every blown budget
      }
    });

    return Math.max(0, Math.min(100, Math.round(score))); // Keep strictly between 0 and 100
  };

  // --- PHASE 4: FORECASTING & INSIGHTS ENGINE ---
  
  const getSpendingInsights = (currentMonthId: string) => {
    const insights: string[] = [];
    const currentIdx = months.findIndex(m => m.id === currentMonthId);
    
    // We need a previous month to compare against
    if (currentIdx > 0) {
      const prevMonthId = months[currentIdx - 1].id;
      const currentCats = getMonthCategoryBreakdown(currentMonthId);
      const prevCats = getMonthCategoryBreakdown(prevMonthId);

      currentCats.forEach(curr => {
        const prev = prevCats.find(p => p.category === curr.category);
        if (prev && prev.spent > 0) {
          const percentChange = ((curr.spent - prev.spent) / prev.spent) * 100;
          if (percentChange > 15 && curr.spent > 100) {
            insights.push(`Your ${curr.category} spending is up ${Math.round(percentChange)}% compared to last month.`);
          } else if (percentChange < -15 && curr.spent > 0) {
            insights.push(`Great job! Your ${curr.category} spending dropped ${Math.round(Math.abs(percentChange))}% from last month.`);
          }
        }
      });
    }

    // Generic insights if no previous month data exists
    const { income, expenses } = getMonthTotals(currentMonthId);
    if (expenses > income && income > 0) {
      insights.push("Warning: You are currently spending more than you are earning this month.");
    } else if (expenses === 0 && income > 0) {
      insights.push("You haven't logged any expenses yet. Keep up the perfect savings rate!");
    }

    return insights.length > 0 ? insights : ["Your spending habits are perfectly stable this month!"];
  };

  const getForecast = (monthId: string) => {
    const { savings: currentBalance, expenses } = getMonthTotals(monthId);
    
    // Get total days in the current month
    const today = new Date();
    const isCurrentMonth = months.find(m => m.id === monthId)?.month === new Date().toLocaleString('default', { month: 'long' });
    
    // If we are looking at a past month, forecasting is irrelevant, just return actuals
    if (!isCurrentMonth) return { predictedBalance: currentBalance, dailyBurnRate: 0, safeToSpend: 0 };

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const daysRemaining = daysInMonth - currentDay;

    // Calculate daily burn rate (how much spent per day so far)
    const dailyBurnRate = currentDay > 0 ? (expenses / currentDay) : 0;
    
    // Predict end of month balance based on current habits
    const predictedBalance = currentBalance - (dailyBurnRate * daysRemaining);
    
    // "Safe to spend" per day to reach exactly 0 (or your baseline)
    const safeToSpend = daysRemaining > 0 ? (currentBalance / daysRemaining) : currentBalance;

    return { 
      predictedBalance: Math.max(0, predictedBalance), 
      dailyBurnRate, 
      safeToSpend: Math.max(0, safeToSpend) 
    };
  };
  // ----------------------------------------------

  const fetchFinanceData = async () => { setLoading(false); };
  useEffect(() => { fetchFinanceData(); }, [isAuthenticated]);

  // 👇 PASTE THIS NEW SMART CORE LOGIC HERE 👇
  const [smartCategories, setSmartCategories] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('local_smart_categories');
    return saved ? JSON.parse(saved) : {
      "mcdonalds": "Food", "grab": "Transportation", "meralco": "Bills",
      "netflix": "Entertainment", "grocery": "Groceries", "salary": "Salary"
    };
  });

  useEffect(() => { localStorage.setItem('local_smart_categories', JSON.stringify(smartCategories)); }, [smartCategories]);

  const autoDetectCategory = (label: string) => {
    const lowerLabel = label.toLowerCase();
    for (const [keyword, category] of Object.entries(smartCategories)) {
      if (lowerLabel.includes(keyword)) return category;
    }
    return null;
  };

  const isDuplicateTransaction = (tx: any) => {
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const txDate = new Date(tx.date).getTime();
    
    return transactions.some(existing => {
      const existingDate = new Date(existing.date).getTime();
      const timeDiff = Math.abs(txDate - existingDate);
      return (
        existing.amount === tx.amount && 
        existing.label.toLowerCase() === tx.label.toLowerCase() &&
        timeDiff <= fortyEightHours
      );
    });
  };

  const sortMonthsChronologically = (monthList: MonthData[]) => {
    return [...monthList].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month);
    });
  };

  const addMonth = async (month: string, year: number) => {
    const newMonthData = { id: `${month.toLowerCase()}-${year}-${Math.random().toString(36).substr(2, 4)}`, month, year };
    setMonths((prev) => sortMonthsChronologically([...prev, newMonthData]));
  };

  const addAccount = async (name: string) => {
    const newAccountData = { id: `account-${Math.random().toString(36).substr(2, 5)}`, name };
    setAccounts((prev) => [...prev, newAccountData]);
  };

  const renameAccount = async (id: string, name: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
  };

  const removeAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
  };

// --- UPDATED: addTransaction with Intelligence ---
  const addTransaction = async (accountId: string, monthId: string, tx: any) => {
    // 1. Check for duplicates
    if (isDuplicateTransaction(tx)) {
      const confirm = window.confirm(`Duplicate Detected: A transaction for ${tx.label} with the same amount was logged recently. Add anyway?`);
      if (!confirm) return false; // Abort if user cancels
    }

    // 2. Apply Smart Categories if the user left it as "Other" or blank
    let finalCategory = tx.category;
    if (!finalCategory || finalCategory === "Other") {
      const detected = autoDetectCategory(tx.label);
      if (detected) finalCategory = detected;
    }

    const newTxData: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 5)}`,
      type: tx.type, 
      amount: tx.amount, 
      date: tx.date, 
      label: tx.label, 
      category: finalCategory || 'Other', 
      monthId, 
      accountId
    };
    
    setTransactions((prev) => [...prev, newTxData]);
    
    // 3. Learn from user behavior! If they manually picked a category, save the first word of the label as a future keyword
    if (tx.category && tx.category !== "Other" && !autoDetectCategory(tx.label)) {
      const firstWord = tx.label.split(" ")[0].toLowerCase();
      if (firstWord.length > 2) { // Ignore tiny words like "a" or "my"
        setSmartCategories(prev => ({ ...prev, [firstWord]: tx.category }));
      }
    }
    
    return true;
  };

  const addTransfer = async (fromAccountId: string, toAccountId: string, monthId: string, amount: number, date: string) => {
    const fromName = accounts.find(a => a.id === fromAccountId)?.name || "Account";
    const toName = accounts.find(a => a.id === toAccountId)?.name || "Account";
    const txFrom: Transaction = { id: `tx-tf-${Math.random().toString(36).substr(2, 5)}`, type: 'expense', amount, date, label: `Transfer to ${toName}`, category: 'Transfer', monthId, accountId: fromAccountId };
    const txTo: Transaction = { id: `tx-tf-${Math.random().toString(36).substr(2, 5)}`, type: 'income', amount, date, label: `Transfer from ${fromName}`, category: 'Transfer', monthId, accountId: toAccountId };
    setTransactions((prev) => [...prev, txFrom, txTo]);
  };

  const updateTransaction = async (accountId: string, monthId: string, txId: string, tx: any) => {
    setTransactions((prev) => prev.map((t) => t.id === txId ? { ...t, ...tx, amount: parseFloat(tx.amount) || t.amount } : t));
  };

  const deleteTransaction = async (accountId: string, monthId: string, txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  // --- PHASE 3: BUDGETS & RECURRING ENGINE ---
  const setCategoryBudget = (category: string, limit: number) => {
    setBudgets(prev => {
      const exists = prev.find(b => b.category === category);
      if (exists) return prev.map(b => b.category === category ? { ...b, limit } : b);
      return [...prev, { id: `bud-${Math.random().toString(36).substr(2,5)}`, category, limit }];
    });
  };

  const addRecurring = (tx: Omit<RecurringTx, 'id'>) => {
    setRecurring(prev => [...prev, { ...tx, id: `rec-${Math.random().toString(36).substr(2,5)}` }]);
  };

  const deleteRecurring = (id: string) => setRecurring(prev => prev.filter(r => r.id !== id));

  // --- PHASE 4: GLOBAL CURRENCY CONVERTER ---
  const convertAllFinancialData = (multiplier: number) => {
    // 1. Convert all historical transactions
    setTransactions(prev => prev.map(t => ({
      ...t,
      amount: t.amount * multiplier
    })));

    // 2. Convert all active category budgets
    setBudgets(prev => prev.map(b => ({
      ...b,
      limit: b.limit * multiplier
    })));

    // 3. Convert all future recurring bill templates
    setRecurring(prev => prev.map(r => ({
      ...r,
      amount: r.amount * multiplier
    })));
  };
  // ------------------------------------------

  const getPendingRecurring = () => {
    const today = new Date().toISOString().split('T')[0];
    return recurring.filter(r => r.nextDueDate <= today);
  };

// Auto-processes bills, transfers, and scheduled events that passed their due date
  const approvePendingRecurring = async () => {
    const pending = getPendingRecurring();
    if (pending.length === 0) return;

    let updatedMonths = [...months];
    const newTransactions: Transaction[] = [];
    let updatedRecurring = [...recurring];

    pending.forEach(rec => {
      const d = new Date(rec.nextDueDate);
      const mName = MONTHS_ORDER[d.getMonth()];
      const year = d.getFullYear();
      
      // Auto-create month if missing
      let targetMonth = updatedMonths.find(m => m.month === mName && m.year === year);
      if (!targetMonth) {
        targetMonth = { id: `${mName.toLowerCase()}-${year}-${Math.random().toString(36).substr(2, 4)}`, month: mName, year };
        updatedMonths.push(targetMonth);
      }

      // --- NEW: Handle Auto-Transfers vs Standard Transactions ---
      if (rec.type === 'transfer' && rec.toAccountId) {
        // A transfer requires TWO transactions (Money out of A, Money into B)
        newTransactions.push({
          id: `tx-tf-${Math.random().toString(36).substr(2, 5)}`,
          type: 'expense', amount: rec.amount, date: rec.nextDueDate, label: rec.label, category: 'Transfer',
          monthId: targetMonth.id, accountId: rec.accountId
        });
        newTransactions.push({
          id: `tx-tf-${Math.random().toString(36).substr(2, 5)}`,
          type: 'income', amount: rec.amount, date: rec.nextDueDate, label: rec.label, category: 'Transfer',
          monthId: targetMonth.id, accountId: rec.toAccountId
        });
      } else {
        // Standard Income/Expense
        newTransactions.push({
          id: `tx-${Math.random().toString(36).substr(2, 5)}`,
          type: rec.type as 'income' | 'expense', amount: rec.amount, date: rec.nextDueDate, label: rec.label, category: rec.category,
          monthId: targetMonth.id, accountId: rec.accountId
        });
      }

      // --- NEW: Handle Scheduling Frequency ---
      if (rec.frequency === 'one-time') {
        // Delete it from the schedule forever since it only happens once
        updatedRecurring = updatedRecurring.filter(r => r.id !== rec.id);
      } else {
        // Push next due date forward based on custom frequency
        if (rec.frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (rec.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (rec.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
        
        const recIndex = updatedRecurring.findIndex(r => r.id === rec.id);
        if (recIndex >= 0) updatedRecurring[recIndex].nextDueDate = d.toISOString().split('T')[0];
      }
    });

    setMonths(sortMonthsChronologically(updatedMonths));
    setTransactions(prev => [...prev, ...newTransactions]);
    setRecurring(updatedRecurring);
  };

  const getMonthCategoryBreakdown = (monthId: string) => {
      // BUG 1 FIX: Filter out any transaction categorized as 'Transfer' 
      const list = transactions.filter(t => {
        if (t.monthId !== monthId || t.type !== 'expense') return false;
        
        const isExplicitTransfer = t.category === 'Transfer';
        const isLegacyTransfer = t.label.toLowerCase().includes('transfer');

        return !isExplicitTransfer && !isLegacyTransfer;
      });
      const breakdown: Record<string, number> = {};
      list.forEach(t => { breakdown[t.category || 'Other'] = (breakdown[t.category || 'Other'] || 0) + t.amount; });
      
      const result: { category: string; spent: number; limit: number }[] = [];
      const processedCats = new Set<string>();

      // BUG 2 FIX: First, map ALL active budgets so they appear even at ₱0 spent
      budgets.forEach(b => {
        result.push({ category: b.category, spent: breakdown[b.category] || 0, limit: b.limit });
        processedCats.add(b.category);
      });

      // Then, append any other categories that had spending but NO budget limit
      Object.keys(breakdown).forEach(cat => {
        if (!processedCats.has(cat)) {
          result.push({ category: cat, spent: breakdown[cat], limit: 0 });
        }
      });

      return result.sort((a, b) => b.spent - a.spent);
    };
  // -------------------------------------------

  const getAccountTransactions = (accountId: string, monthId: string) => transactions.filter(t => t.accountId === accountId && t.monthId === monthId);
  const getAccountAllTimeBalance = (accountId: string) => {
    const list = transactions.filter(t => t.accountId === accountId);
    return list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  };
  const getAccountLatestTransaction = (accountId: string) => {
    const list = transactions.filter(t => t.accountId === accountId);
    return list.length === 0 ? null : [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
  };

  const getAccountMonthTotals = (accountId: string, monthId: string) => {
    const currentMonthData = months.find(m => m.id === monthId);
    const historicalTx = transactions.filter(t => {
      if (t.accountId !== accountId) return false;
      const txMonth = months.find(m => m.id === t.monthId);
      if (!txMonth || !currentMonthData) return false;
      if (txMonth.year !== currentMonthData.year) return txMonth.year < currentMonthData.year;
      return MONTHS_ORDER.indexOf(txMonth.month) < MONTHS_ORDER.indexOf(currentMonthData.month);
    });

    const carryOver = historicalTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - historicalTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const list = getAccountTransactions(accountId, monthId);
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, savings: income - expenses, carryOver, currentBalance: carryOver + (income - expenses) };
  };

  const getMonthTotals = (monthId: string) => {
    let income = 0, expenses = 0;
    // 👇 FIX: Filter out 'Transfer' category so it doesn't inflate your spending/income
    transactions.filter(t => t.monthId === monthId && t.category !== 'Transfer').forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
    });
    return { income, expenses, savings: income - expenses };
  };

  const getTotalSavings = () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const getMonthlySavingsHistory = () => sortMonthsChronologically(months).map(m => ({ monthId: m.id, month: m.month, year: m.year, savings: getMonthTotals(m.id).savings }));
  const getMonthlyCumulativeHistory = () => {
    let runningAccumulation = 0;
    return sortMonthsChronologically(months).map(m => {
      runningAccumulation += getMonthTotals(m.id).savings;
      return { monthId: m.id, month: m.month, year: m.year, savings: runningAccumulation };
    });
  };
  const getAllRecentTransactions = (limit: number) => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit).map(t => ({ ...t, accountName: accounts.find(a => a.id === t.accountId)?.name || 'Unknown' }));

  return (
    <ExpenseContext.Provider value={{
      months, accounts, transactions, categories: DEFAULT_CATEGORIES, budgets, recurring, loading, addCategory, getSpendingInsights, getForecast, goals, addGoal, addMoneyToGoal, deleteGoal, getFinancialHealthScore,
      addMonth, addAccount, addTransaction, addTransfer, updateTransaction, deleteTransaction, 
      setCategoryBudget, addRecurring, deleteRecurring, convertAllFinancialData, getPendingRecurring, approvePendingRecurring, getMonthCategoryBreakdown,
      getAccountTransactions, getAccountMonthTotals, getMonthTotals, getTotalSavings, getMonthlySavingsHistory, 
      getMonthlyCumulativeHistory, getAllRecentTransactions, getAccountAllTimeBalance, getAccountLatestTransaction, 
      renameAccount, removeAccount, fetchFinanceData,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpenses inside Provider error');
  return context;
};

function setGoals(arg0: (prev: any) => any[]) {
  throw new Error('Function not implemented.');
}
