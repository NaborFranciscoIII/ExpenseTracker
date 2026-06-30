import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from './auth-context';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  label: string;
  monthId: string;
  accountId: string;
}

interface MonthData {
  id: string;
  month: string;
  year: number;
}

interface AccountData {
  id: string;
  name: string;
}

interface ExpenseContextType {
  months: MonthData[];
  accounts: AccountData[];
  transactions: Transaction[];
  loading: boolean;
  addMonth: (month: string, year: number) => Promise<void>;
  addAccount: (name: string) => Promise<void>;
  addTransaction: (accountId: string, monthId: string, tx: MyTx) => Promise<void>;
  updateTransaction: (accountId: string, monthId: string, txId: string, tx: any) => Promise<void>;
  deleteTransaction: (accountId: string, monthId: string, txId: string) => Promise<void>;
  getAccountTransactions: (accountId: string, monthId: string) => Transaction[];
  getAccountMonthTotals: (accountId: string, monthId: string) => { income: number; expenses: number; savings: number };
  getMonthTotals: (monthId: string) => { income: number; expenses: number; savings: number };
  getTotalSavings: () => number;
  getMonthlySavingsHistory: () => any[];
  getAllRecentTransactions: (limit: number) => any[];
  renameAccount: (id: string, name: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  fetchFinanceData: () => Promise<void>;
}

type MyTx = Omit<Transaction, 'id' | 'monthId' | 'accountId'>;

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // Initialize states directly from localStorage fallbacks so they load instantly on phone boot
  const [months, setMonths] = useState<MonthData[]>(() => {
    const saved = localStorage.getItem('local_months');
    return saved ? JSON.parse(saved) : [];
  });
  const [accounts, setAccounts] = useState<AccountData[]>(() => {
    const saved = localStorage.getItem('local_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('local_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Sync state data changes to localStorage automatically whenever arrays change
  useEffect(() => {
    localStorage.setItem('local_months', JSON.stringify(months));
  }, [months]);

  useEffect(() => {
    localStorage.setItem('local_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('local_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const fetchFinanceData = async () => {
    // If you are bypassing auth for testing, we let local storage act as the source of truth
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [monthsRes, accountsRes, txRes] = await Promise.all([
        api.get('/months'),
        api.get('/accounts'),
        api.get('/transactions'),
      ]);
      setMonths(monthsRes.data);
      setAccounts(accountsRes.data);
      setTransactions(txRes.data || []);
    } catch (err) {
      console.warn('Backend server offline. Relying securely on local persistent storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchFinanceData(); 
  }, [isAuthenticated]);

  const addMonth = async (month: string, year: number) => {
    const newMonthData = { 
      id: `${month.toLowerCase()}-${year}-${Math.random().toString(36).substr(2, 4)}`, 
      month, 
      year 
    };

    try {
      const response = await api.post('/months', { month, year });
      setMonths((prev) => [...prev, response.data]);
    } catch (error) {
      setMonths((prev) => [...prev, newMonthData]);
    }
  };

  const addAccount = async (name: string) => {
    const newAccountData = { 
      id: `account-${Math.random().toString(36).substr(2, 5)}`, 
      name 
    };

    try {
      const response = await api.post('/accounts', { name });
      setAccounts((prev) => [...prev, response.data]);
    } catch (error) {
      setAccounts((prev) => [...prev, newAccountData]);
    }
  };

  const renameAccount = async (id: string, name: string) => {
    try {
      await api.put(`/accounts/${id}`, { name });
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
    } catch (error) {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
    }
  };

  const removeAccount = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    } catch (error) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setTransactions((prev) => prev.filter((t) => t.accountId !== id));
    }
  };

  const addTransaction = async (accountId: string, monthId: string, tx: any) => {
    const newTxData = {
      id: `tx-${Math.random().toString(36).substr(2, 5)}`,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      label: tx.label,
      monthId,
      accountId
    };

    try {
      const response = await api.post(`/accounts/${accountId}/months/${monthId}/transactions`, tx);
      setTransactions((prev) => [...prev, response.data]);
    } catch (error) {
      setTransactions((prev) => [...prev, newTxData]);
    }
  };

  const updateTransaction = async (accountId: string, monthId: string, txId: string, tx: any) => {
    try {
      const response = await api.put(`/transactions/${txId}`, tx);
      setTransactions((prev) => prev.map((t) => (t.id === txId ? response.data : t)));
    } catch (error) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                type: tx.type,
                amount: parseFloat(tx.amount) || t.amount,
                date: tx.date || t.date,
                label: tx.label || t.label,
              }
            : t
        )
      );
    }
  };

  const deleteTransaction = async (accountId: string, monthId: string, txId: string) => {
    try {
      await api.delete(`/transactions/${txId}`);
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
    } catch (error) {
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
    }
  };

  const getAccountTransactions = (accountId: string, monthId: string) =>
    transactions.filter(t => t.accountId === accountId && t.monthId === monthId);

  const getAccountMonthTotals = (accountId: string, monthId: string) => {
    const list = getAccountTransactions(accountId, monthId);
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, savings: income - expenses };
  };

  const getMonthTotals = (monthId: string) => {
    const list = transactions.filter(t => t.monthId === monthId);
    const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, savings: income - expenses };
  };

  const getTotalSavings = () =>
    transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
    transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const getMonthlySavingsHistory = () =>
    months.map(m => ({
      monthId: m.id,
      month: m.month,
      year: m.year,
      savings: getMonthTotals(m.id).savings,
    }));

  const getAllRecentTransactions = (limit: number) =>
    [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map(t => ({
        ...t,
        accountName: accounts.find(a => a.id === t.accountId)?.name || 'Unknown',
      }));

  return (
    <ExpenseContext.Provider value={{
      months, accounts, transactions, loading, addMonth, addAccount, addTransaction,
      updateTransaction, deleteTransaction, getAccountTransactions, getAccountMonthTotals,
      getMonthTotals, getTotalSavings, getMonthlySavingsHistory, getAllRecentTransactions,
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