
export type TransactionType = 'INCOME' | 'EXPENSE';
export type AccountType = 'CHECKING' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
export type Frequency = 'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'ONE_TIME';

export interface Account {
  id: string;
  name: string; // Nickname e.g. "Conta Principal"
  institution?: string; // Bank Name e.g. "Nubank"
  type: AccountType;
  bankColor: string; // Hex code for badge
  initialBalance: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Stored as number, handled precisely
  date: string; // ISO Date string
  type: TransactionType;
  categoryId: string;
  accountId: string;
  // New Pro Features
  isRecurring?: boolean;
  frequency?: Frequency;
  installments?: {
    current: number;
    total: number;
  };
  // Import & Tagging Features
  tags?: string[];
  isImported?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  iconKey?: string; // For mapping to Lucide icons
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// --- Security / Anomaly Types ---
export type AnomalyType = 'DUPLICATE' | 'WEEKEND' | 'OUTLIER';

export interface Anomaly {
  id: string; // The anomaly ID (often same as tx id or unique combo)
  transactionId: string;
  type: AnomalyType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  // Receitas (PJ Focus)
  { id: 'cat_inc_1', name: 'Serviços Prestados', type: 'INCOME', color: '#10B981', iconKey: 'Briefcase' },
  { id: 'cat_inc_2', name: 'Venda de Produtos', type: 'INCOME', color: '#34D399', iconKey: 'ShoppingBag' },
  { id: 'cat_inc_3', name: 'Reembolsos', type: 'INCOME', color: '#06B6D4', iconKey: 'RefreshCw' },
  { id: 'cat_inc_4', name: 'Rendimentos', type: 'INCOME', color: '#6366F1', iconKey: 'TrendingUp' },

  // Despesas (PJ Focus)
  { id: 'cat_exp_1', name: 'Aluguel / Condomínio', type: 'EXPENSE', color: '#F43F5E', iconKey: 'Home' },
  { id: 'cat_exp_2', name: 'Fornecedores', type: 'EXPENSE', color: '#EA580C', iconKey: 'Truck' },
  { id: 'cat_exp_3', name: 'Folha / Pro-labore', type: 'EXPENSE', color: '#CA8A04', iconKey: 'Users' },
  { id: 'cat_exp_4', name: 'Impostos (DAS/DARF)', type: 'EXPENSE', color: '#9CA3AF', iconKey: 'FileText' },
  { id: 'cat_exp_5', name: 'Combustível / Transporte', type: 'EXPENSE', color: '#EF4444', iconKey: 'Car' },
  { id: 'cat_exp_6', name: 'Marketing / Ads', type: 'EXPENSE', color: '#8B5CF6', iconKey: 'Megaphone' },
  { id: 'cat_exp_7', name: 'Software / T.I.', type: 'EXPENSE', color: '#3B82F6', iconKey: 'Monitor' },
  { id: 'cat_exp_8', name: 'Material de Escritório', type: 'EXPENSE', color: '#64748B', iconKey: 'Paperclip' },
  { id: 'cat_exp_9', name: 'Entretenimento / Lazer', type: 'EXPENSE', color: '#EC4899', iconKey: 'Coffee' }, // Added for Anomaly
  { id: 'cat_exp_10', name: 'Outros', type: 'EXPENSE', color: '#64748B', iconKey: 'HelpCircle' }, // Added for Anomaly
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_1', name: 'Conta Principal', institution: 'Nubank', type: 'CHECKING', bankColor: '#8B5CF6', initialBalance: 0 },
  { id: 'acc_2', name: 'Conta Empresarial', institution: 'Banco do Brasil', type: 'CHECKING', bankColor: '#FBBF24', initialBalance: 0 },
  { id: 'acc_3', name: 'Reserva', institution: 'Caixa Econômica', type: 'INVESTMENT', bankColor: '#06B6D4', initialBalance: 0 },
  { id: 'acc_4', name: 'Caixa', institution: 'Dinheiro Físico', type: 'CASH', bankColor: '#10B981', initialBalance: 0 },
  { id: 'acc_5', name: 'Nubank Crédito', institution: 'Nubank', type: 'CREDIT_CARD', bankColor: '#8B5CF6', initialBalance: 0 },
];
