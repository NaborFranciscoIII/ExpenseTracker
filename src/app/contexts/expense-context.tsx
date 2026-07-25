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
interface RecurringTx { id: string; type: 'income' | 'expense'; amount: number; label: string; category: string; accountId: string; nextDueDate: string; }

interface ExpenseContextType {
  months: MonthData[];
  accounts: AccountData[];
  transactions: Transaction[];
  categories: string[];
  budgets: CategoryBudget[];
  recurring: RecurringTx[];
  loading: boolean;
  addMonth: (month: string, year: number) => Promise<void>;
  addAccount: (name: string) => Promise<void>;
  addTransaction: (accountId: string, monthId: string, tx: Omit<Transaction, 'id' | 'monthId' | 'accountId'>) => Promise<void>;
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
}

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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => { localStorage.setItem('local_months', JSON.stringify(months)); }, [months]);
  useEffect(() => { localStorage.setItem('local_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('local_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('local_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('local_recurring', JSON.stringify(recurring)); }, [recurring]);

  const fetchFinanceData = async () => { setLoading(false); };
  useEffect(() => { fetchFinanceData(); }, [isAuthenticated]);

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

  const addTransaction = async (accountId: string, monthId: string, tx: any) => {
    const newTxData: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 5)}`,
      type: tx.type, amount: tx.amount, date: tx.date, label: tx.label, category: tx.category || 'Other', monthId, accountId
    };
    setTransactions((prev) => [...prev, newTxData]);
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

  const getPendingRecurring = () => {
    const today = new Date().toISOString().split('T')[0];
    return recurring.filter(r => r.nextDueDate <= today);
  };

  // Auto-processes bills that passed their due date, creating the month if it doesn't exist
  const approvePendingRecurring = async () => {
    const pending = getPendingRecurring();
    if (pending.length === 0) return;

    let updatedMonths = [...months];
    const newTransactions: Transaction[] = [];
    const updatedRecurring = [...recurring];

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

      newTransactions.push({
        id: `tx-${Math.random().toString(36).substr(2, 5)}`,
        type: rec.type, amount: rec.amount, date: rec.nextDueDate, label: rec.label, category: rec.category,
        monthId: targetMonth.id, accountId: rec.accountId
      });

      // Push next due date exactly 1 month forward
      d.setMonth(d.getMonth() + 1);
      const recIndex = updatedRecurring.findIndex(r => r.id === rec.id);
      if (recIndex >= 0) updatedRecurring[recIndex].nextDueDate = d.toISOString().split('T')[0];
    });

    setMonths(sortMonthsChronologically(updatedMonths));
    setTransactions(prev => [...prev, ...newTransactions]);
    setRecurring(updatedRecurring);
  };

  const getMonthCategoryBreakdown = (monthId: string) => {
      // BUG 1 FIX: Filter out any transaction categorized as 'Transfer'
      const list = transactions.filter(t => t.monthId === monthId && t.type === 'expense' && t.category !== 'Transfer');
      
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
    const list = transactions.filter(t => t.monthId === monthId);
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
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
      months, accounts, transactions, categories: DEFAULT_CATEGORIES, budgets, recurring, loading, 
      addMonth, addAccount, addTransaction, addTransfer, updateTransaction, deleteTransaction, 
      setCategoryBudget, addRecurring, deleteRecurring, getPendingRecurring, approvePendingRecurring, getMonthCategoryBreakdown,
      getAccountTransactions, getAccountMonthTotals, getMonthTotals, getTotalSavings, getMonthlySavingsHistory, 
      getMonthlyCumulativeHistory, getAllRecentTransactions, getAccountAllTimeBalance, getAccountLatestTransaction, 
      renameAccount, removeAccount, fetchFinanceData
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