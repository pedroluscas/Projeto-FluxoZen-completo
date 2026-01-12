import React from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { formatCurrency, getCategoryIcon, getBankAbbreviation } from '../utils';
import { Transaction, Category, Account, Anomaly } from '../types';

interface TransactionItemProps {
    transaction: Transaction;
    category?: Category;
    account?: Account;
    anomaly?: Anomaly;
    onEdit?: (tx: Transaction) => void;
    onDelete?: (id: string) => void;
    variant?: 'compact' | 'full';
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    transaction,
    category,
    account,
    anomaly,
    onEdit,
    onDelete,
    variant = 'full'
}) => {
    const Icon = getCategoryIcon(category?.iconKey);
    const isIncome = transaction.type === 'INCOME';

    return (
        <div className={`
      flex items-center justify-between group transition-colors cursor-default
      ${variant === 'full'
                ? 'bg-white dark:bg-[#0f1115] border border-corporate-200 dark:border-corporate-800 rounded-xl p-4 hover:border-corporate-300 dark:hover:border-corporate-700 shadow-sm'
                : 'px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }
      ${anomaly ? 'border-orange-300 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-900/10' : ''}
    `}>
            <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ backgroundColor: category?.color || '#94a3b8' }}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </div>

                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base text-corporate-900 dark:text-white">
                            {transaction.description}
                        </span>
                        {anomaly && (
                            <div className="relative group/tooltip">
                                <AlertTriangle size={14} className="text-orange-500 animate-pulse" />
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-orange-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-10 pointer-events-none">
                                    {anomaly.message}
                                </div>
                            </div>
                        )}
                        {transaction.installments && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Parc. {transaction.installments.current}/{transaction.installments.total}
                            </span>
                        )}
                        {transaction.isRecurring && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Fixa
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-corporate-500 mt-1">
                        <span>{category?.name}</span>
                        <span className="text-corporate-300">•</span>
                        {variant === 'full' ? (
                            <div
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                                style={{ backgroundColor: account?.bankColor || '#64748b' }}
                            >
                                {getBankAbbreviation(account?.name || '')}
                            </div>
                        ) : (
                            <span className="uppercase font-medium tracking-wide text-slate-600 dark:text-slate-400">
                                {account?.type === 'CREDIT_CARD' ? 'NU' : (account ? getBankAbbreviation(account.name) : 'CONTA')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className={`flex items-center gap-2 font-bold text-base ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    <span>{formatCurrency(transaction.amount)}</span>
                </div>

                {variant === 'full' && (onEdit || onDelete) && (
                    <div className="flex gap-3 text-corporate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(transaction)}
                                className="hover:text-corporate-900 dark:hover:text-white transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(transaction.id)}
                                className="hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
