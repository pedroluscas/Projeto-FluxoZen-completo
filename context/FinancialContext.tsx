import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Transaction, Account, Category, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, Anomaly } from '../types';
import { generateId, isSameMonth } from '../utils';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

interface FinancialContextType {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];

  // Auth State
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;

  // Company / SaaS Settings
  companyName: string;
  setCompanyName: (name: string) => void;
  cnpj: string;
  setCnpj: (cnpj: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
  userName: string;
  userEmail: string;

  // Date Context
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;

  // Data Access
  filteredTransactions: Transaction[]; // Transactions for the selected month

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<boolean>;
  importTransactions: (txs: Omit<Transaction, 'id'>[]) => Promise<boolean>;
  updateTransaction: (tx: Transaction) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<Transaction | undefined>;
  restoreTransaction: (tx: Transaction) => void;

  addAccount: (acc: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (acc: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<{ success: boolean, message?: string }>;

  // Metrics
  getAccountBalance: (accountId: string) => number;
  totalBalance: number; // Current snapshot (all time)
  monthlyIncome: number; // For selected month
  monthlyExpense: number; // For selected month
  fixedCostProjection: number; // Sum of recurring expenses for selected month

  // Security / Anomalies
  anomalies: Anomaly[];
  dismissAnomaly: (transactionId: string) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = () => {
    // Handled by Supabase internally after redirect or login
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userProfile');
    // Clear local state on logout
    setTransactions([]);
    setAccounts([]);
    setCategories([]);
  };

  const [companyName, setCompanyName] = useState('FluxoZen');
  const [cnpj, setCnpj] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    setUserEmail(session.user.email || '');

    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setCompanyName(data.company_name || 'FluxoZen');
      setCnpj(data.cnpj || '');
      setLogo(data.logo_url || null);
      setUserName(data.full_name || session.user.user_metadata?.full_name || 'Usuário');
    } else {
      setUserName(session.user.user_metadata?.full_name || 'Usuário');
    }
  };

  const updateProfile = async (updates: any) => {
    if (!session?.user?.id) return;
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id);
  };

  // Global Month State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const nextMonth = () => {
    setSelectedDate(prev => {
      const n = new Date(prev);
      n.setMonth(n.getMonth() + 1);
      return n;
    });
  };

  const prevMonth = () => {
    setSelectedDate(prev => {
      const n = new Date(prev);
      n.setMonth(n.getMonth() - 1);
      return n;
    });
  };

  // State for data
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchData = async () => {
    if (!session?.user?.id) return;

    // Fetch Categories
    const { data: cats } = await supabase.from('categories').select('*');
    if (cats) {
      setCategories(cats.map(c => ({ id: c.id, name: c.name, type: c.type, color: c.color, iconKey: c.icon_key })));
    }

    // Fetch Accounts
    const { data: accs } = await supabase.from('accounts').select('*');
    if (accs) {
      setAccounts(accs.map(a => ({ id: a.id, name: a.name, institution: a.institution, type: a.type, bankColor: a.bank_color, initialBalance: Number(a.initial_balance) })));
    }

    // Fetch Transactions
    const { data: txs } = await supabase.from('transactions').select('*');
    if (txs) {
      setTransactions(txs.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        type: t.type,
        categoryId: t.category_id,
        accountId: t.account_id,
        isRecurring: t.is_recurring,
        frequency: t.frequency,
        installments: t.installments_current ? { current: t.installments_current, total: t.installments_total } : undefined,
        tags: t.tags || [],
        isImported: t.is_imported
      })));
    }

    fetchProfile();
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // --- Transaction Actions ---
  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (!session?.user?.id) return false;
    const dbTx = {
      user_id: session.user.id,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      type: tx.type,
      category_id: tx.categoryId,
      account_id: tx.accountId,
      is_recurring: tx.isRecurring,
      frequency: tx.frequency,
      installments_current: tx.installments?.current,
      installments_total: tx.installments?.total,
      tags: tx.tags,
      is_imported: tx.isImported
    };
    const { data, error } = await supabase.from('transactions').insert(dbTx).select().single();
    if (error) {
      console.error('Error adding transaction:', error);
      return false;
    }
    if (data) {
      setTransactions(prev => [{ ...tx, id: data.id }, ...prev]);
      return true;
    }
    return false;
  };

  const importTransactions = async (txs: Omit<Transaction, 'id'>[]) => {
    if (!session?.user?.id) return false;
    const dbTxs = txs.map(tx => ({
      user_id: session.user.id,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      type: tx.type,
      category_id: tx.categoryId,
      account_id: tx.accountId,
      is_recurring: tx.isRecurring,
      frequency: tx.frequency,
      installments_current: tx.installments?.current,
      installments_total: tx.installments?.total,
      tags: tx.tags,
      is_imported: tx.isImported
    }));
    const { data, error } = await supabase.from('transactions').insert(dbTxs).select();
    if (error) {
      console.error('Error importing transactions:', error);
      return false;
    }
    if (data) {
      const newTxs = data.map((d, i) => ({ ...txs[i], id: d.id }));
      setTransactions(prev => [...newTxs, ...prev]);
      return true;
    }
    return false;
  };

  const updateTransaction = async (tx: Transaction) => {
    const { error } = await supabase.from('transactions').update({
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      type: tx.type,
      category_id: tx.categoryId,
      account_id: tx.accountId,
      is_recurring: tx.isRecurring,
      frequency: tx.frequency,
      installments_current: tx.installments?.current,
      installments_total: tx.installments?.total,
      tags: tx.tags,
      is_imported: tx.isImported
    }).eq('id', tx.id);

    if (error) {
      console.error('Error updating transaction:', error);
      return false;
    }

    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    return true;
  };

  const deleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
    return txToDelete;
  };

  const restoreTransaction = (tx: Transaction) => {
    addTransaction(tx);
  };

  // --- Account Actions ---
  const addAccount = async (acc: Omit<Account, 'id'>) => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('accounts').insert({
      user_id: session.user.id,
      name: acc.name,
      institution: acc.institution,
      type: acc.type,
      bank_color: acc.bankColor,
      initial_balance: acc.initialBalance
    }).select().single();
    if (data) {
      setAccounts((prev) => [...prev, { ...acc, id: data.id }]);
    }
  };

  const updateAccount = async (acc: Account) => {
    await supabase.from('accounts').update({
      name: acc.name,
      institution: acc.institution,
      type: acc.type,
      bank_color: acc.bankColor,
      initial_balance: acc.initialBalance
    }).eq('id', acc.id);
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? acc : a)));
  };

  const deleteAccount = async (id: string) => {
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // --- Category Actions ---
  const addCategory = async (cat: Omit<Category, 'id'>) => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon_key: cat.iconKey
    }).select().single();
    if (data) {
      setCategories(prev => [...prev, { ...cat, id: data.id }]);
    }
  };

  const updateCategory = async (cat: Category) => {
    await supabase.from('categories').update({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon_key: cat.iconKey
    }).eq('id', cat.id);
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
  };

  const deleteCategory = async (id: string) => {
    const isUsed = transactions.some(t => t.categoryId === id);
    if (isUsed) {
      return { success: false, message: 'Esta categoria possui transações vinculadas e não pode ser excluída.' };
    }
    await supabase.from('categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };

  // --- Filtering Logic ---
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === selectedDate.getMonth() &&
      tDate.getFullYear() === selectedDate.getFullYear();
  });

  // --- Metrics ---
  const monthlyIncome = filteredTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = filteredTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const fixedCostProjection = filteredTransactions
    .filter(t => t.type === 'EXPENSE' && t.isRecurring)
    .reduce((sum, t) => sum + t.amount, 0);

  const getAccountBalance = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return 0;

    const txs = transactions.filter((t) => t.accountId === accountId);
    const income = txs.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

    if (account.type === 'CREDIT_CARD') {
      return account.initialBalance + expense - income;
    }
    return account.initialBalance + income - expense;
  };

  const totalBalance = accounts.reduce((acc, curr) => {
    const bal = getAccountBalance(curr.id);
    if (curr.type === 'CREDIT_CARD') return acc - bal;
    return acc + bal;
  }, 0);

  // --- FINANCIAL SENTINEL (ANOMALY DETECTION) ---
  const [dismissedAnomalyIds, setDismissedAnomalyIds] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  const dismissAnomaly = useCallback((transactionId: string) => {
    setDismissedAnomalyIds(prev => [...prev, transactionId]);
  }, []);

  // Run Detection Logic whenever transactions change
  useEffect(() => {
    const detected: Anomaly[] = [];
    const expenseTxs = transactions.filter(t => t.type === 'EXPENSE' && !dismissedAnomalyIds.includes(t.id));

    // 1. DUPLICITY CHECK
    const lookup: Record<string, string[]> = {};
    expenseTxs.forEach(t => {
      const key = `${t.amount}-${t.date}-${t.description.toLowerCase().trim()}`;
      if (!lookup[key]) lookup[key] = [];
      lookup[key].push(t.id);
    });

    Object.values(lookup).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => {
          detected.push({
            id: `dup_${id}`,
            transactionId: id,
            type: 'DUPLICATE',
            severity: 'HIGH',
            message: 'Pagamento duplicado identificado (mesmo valor, data e descrição).'
          });
        });
      }
    });

    // 2. WEEKEND / OFF-PATTERN CHECK
    expenseTxs.forEach(t => {
      const d = new Date(t.date);
      const day = d.getDay(); // 0 = Sun, 6 = Sat
      if ((day === 0 || day === 6) && (t.accountId === 'acc_1' || t.accountId === 'acc_2')) {
        detected.push({
          id: `week_${t.id}`,
          transactionId: t.id,
          type: 'WEEKEND',
          severity: 'MEDIUM',
          message: 'Gasto corporativo realizado em fim de semana.'
        });
      }
    });

    // 3. OUTLIER CHECK
    expenseTxs.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (t.amount > 10000) {
        detected.push({
          id: `out_${t.id}`,
          transactionId: t.id,
          type: 'OUTLIER',
          severity: 'HIGH',
          message: `Valor de ${t.amount} é atípico para o perfil da empresa.`
        });
      } else if (t.amount > 3000 && cat?.name === 'Outros') {
        detected.push({
          id: `out_${t.id}`,
          transactionId: t.id,
          type: 'OUTLIER',
          severity: 'MEDIUM',
          message: 'Valor alto classificado como "Outros". Recomendado categorizar.'
        });
      }
    });

    setAnomalies(detected);
  }, [transactions, dismissedAnomalyIds, categories]);

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        accounts,
        categories,
        isAuthenticated,
        login,
        logout,
        companyName,
        setCompanyName: (name: string) => { setCompanyName(name); updateProfile({ company_name: name }); },
        cnpj,
        setCnpj: (cnpj: string) => { setCnpj(cnpj); updateProfile({ cnpj }); },
        logo,
        setLogo: (logo: string | null) => { setLogo(logo); updateProfile({ logo_url: logo }); },
        userName,
        userEmail,
        selectedDate,
        setSelectedDate,
        nextMonth,
        prevMonth,
        filteredTransactions,
        addTransaction,
        importTransactions,
        updateTransaction,
        deleteTransaction,
        restoreTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        addCategory,
        updateCategory,
        deleteCategory,
        getAccountBalance,
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        fixedCostProjection,
        anomalies,
        dismissAnomaly
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};