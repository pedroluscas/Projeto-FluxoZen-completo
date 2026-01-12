import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Inputs';
import { formatCurrency, formatDate, getBankAbbreviation, getCategoryIcon, AVAILABLE_ICONS } from '../utils';
import { Transaction, TransactionType, Frequency } from '../types';
import Tesseract from 'tesseract.js';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { TransactionItem } from '../components/TransactionItem';

import {
    Plus, Trash2, Edit2, Search, Calendar, CreditCard, ChevronLeft, ChevronRight,
    ArrowUpRight, ArrowDownRight, SlidersHorizontal, X, Filter, Check,
    Camera, Paperclip, Loader2, FileCheck, UploadCloud
} from 'lucide-react';

// --- Types for Advanced Filters ---
interface FilterState {
    startDate: string;
    endDate: string;
    minAmount: string;
    maxAmount: string;
    selectedTypes: TransactionType[];
    selectedCategoryIds: string[];
    selectedAccountIds: string[];
}

const INITIAL_FILTERS: FilterState = {
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    selectedTypes: [],
    selectedCategoryIds: [],
    selectedAccountIds: []
};

const CATEGORY_COLORS = [
    '#10B981', '#34D399', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#EC4899', '#F43F5E', '#EA580C', '#CA8A04', '#64748B', '#9CA3AF'
];

export const Transactions: React.FC = () => {
    const {
        transactions,
        filteredTransactions: globalMonthTransactions,
        accounts, categories,
        selectedDate, nextMonth, prevMonth,
        addTransaction, updateTransaction, deleteTransaction, restoreTransaction,
        importTransactions,
        anomalies, addCategory
    } = useFinancial();

    const { addToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- UI States ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- Filter Logic States ---
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);
    const filterRef = useRef<HTMLDivElement>(null);

    // --- Transaction Form State ---
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
    const [hasInstallments, setHasInstallments] = useState(false);
    const [totalInstallments, setTotalInstallments] = useState('');

    // --- Quick Category Creation State ---
    const [isCatCreatorOpen, setIsCatCreatorOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
    const [newCatIcon, setNewCatIcon] = useState('Tag');

    // --- OCR / Smart Scan State ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatus, setScanStatus] = useState('Iniciando...');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [highlightInputs, setHighlightInputs] = useState(false);

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setIsFormOpen(true);
            resetForm();
            setIsFormOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [filterRef]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const toggleType = (type: TransactionType) => {
        setTempFilters(prev => ({
            ...prev,
            selectedTypes: prev.selectedTypes.includes(type)
                ? prev.selectedTypes.filter(t => t !== type)
                : [...prev.selectedTypes, type]
        }));
    };

    const toggleCategory = (id: string) => {
        setTempFilters(prev => ({
            ...prev,
            selectedCategoryIds: prev.selectedCategoryIds.includes(id)
                ? prev.selectedCategoryIds.filter(cid => cid !== id)
                : [...prev.selectedCategoryIds, id]
        }));
    };

    const toggleAccount = (id: string) => {
        setTempFilters(prev => ({
            ...prev,
            selectedAccountIds: prev.selectedAccountIds.includes(id)
                ? prev.selectedAccountIds.filter(aid => aid !== id)
                : [...prev.selectedAccountIds, id]
        }));
    };

    const applyFilters = () => {
        setActiveFilters(tempFilters);
        setIsFilterMenuOpen(false);
    };

    const clearFilters = () => {
        setTempFilters(INITIAL_FILTERS);
        setActiveFilters(INITIAL_FILTERS);
    };

    const finalDisplayedTransactions = useMemo(() => {
        let baseData = (activeFilters.startDate || activeFilters.endDate)
            ? transactions
            : globalMonthTransactions;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        return baseData.filter(t => {
            if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (activeFilters.startDate && t.date < activeFilters.startDate) return false;
            if (activeFilters.endDate && t.date > activeFilters.endDate) return false;
            if (activeFilters.minAmount && t.amount < parseFloat(activeFilters.minAmount)) return false;
            if (activeFilters.maxAmount && t.amount > parseFloat(activeFilters.maxAmount)) return false;
            if (activeFilters.selectedTypes.length > 0 && !activeFilters.selectedTypes.includes(t.type)) return false;
            if (activeFilters.selectedAccountIds.length > 0 && !activeFilters.selectedAccountIds.includes(t.accountId)) return false;
            if (activeFilters.selectedCategoryIds.length > 0 && !activeFilters.selectedCategoryIds.includes(t.categoryId)) return false;
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, globalMonthTransactions, searchTerm, activeFilters]);

    const transactionGroups = useMemo(() => {
        const groups: { dateKey: string; items: Transaction[] }[] = [];
        const dateMap = new Map<string, Transaction[]>();

        finalDisplayedTransactions.forEach(t => {
            const date = new Date(t.date);
            const today = new Date();
            const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
            const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);

            let key = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date);

            const dStr = t.date;
            const tStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            const tomStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            if (dStr === tStr) key = 'Hoje';
            else if (dStr === yStr) key = 'Ontem';
            else if (dStr === tomStr) key = 'Amanhã';

            if (!dateMap.has(key)) {
                const newGroup = { dateKey: key, items: [] };
                groups.push(newGroup);
                dateMap.set(key, newGroup.items);
            }
            dateMap.get(key)!.push(t);
        });
        return groups;
    }, [finalDisplayedTransactions]);

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setType('EXPENSE');

        // Pre-select first options if available to avoid empty state bugs
        if (categories.length > 0) {
            const firstCat = categories.find(c => c.type === 'EXPENSE');
            setCategoryId(firstCat?.id || '');
        } else {
            setCategoryId('');
        }

        if (accounts.length > 0) {
            setAccountId(accounts[0].id);
        } else {
            setAccountId('');
        }

        setIsRecurring(false);
        setHasInstallments(false);
        setEditingId(null);
        setIsFormOpen(false);
        setAttachedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setIsScanning(false);
        setScanProgress(0);
        setHighlightInputs(false);
    };

    const handleEdit = (tx: Transaction) => {
        setDescription(tx.description);
        setAmount(tx.amount.toString());
        setDate(tx.date);
        setType(tx.type);
        setCategoryId(tx.categoryId);
        setAccountId(tx.accountId);
        setIsRecurring(!!tx.isRecurring);
        setHasInstallments(!!tx.installments);
        setTotalInstallments(tx.installments?.total.toString() || '');
        setEditingId(tx.id);
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation with feedback
        if (!description.trim()) { addToast({ title: 'Descrição obrigatória', type: 'error' }); return; }
        if (!amount) { addToast({ title: 'Valor obrigatório', type: 'error' }); return; }
        if (!categoryId) { addToast({ title: 'Selecione uma categoria', type: 'error' }); return; }
        if (!accountId) { addToast({ title: 'Selecione uma conta', type: 'error' }); return; }

        // Handle Comma as decimal separator (PT-BR)
        const cleanAmount = amount.replace(',', '.');
        const numericAmount = parseFloat(cleanAmount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            addToast({ title: 'Valor inválido', description: 'Por favor, insira um número válido.', type: 'error' });
            return;
        }

        const payload: any = {
            description,
            amount: numericAmount,
            date,
            type,
            categoryId,
            accountId,
            isRecurring
        };

        if (editingId) {
            const success = await updateTransaction({ ...payload, id: editingId });
            if (success) {
                addToast({ title: 'Transação atualizada', type: 'success' });
            } else {
                addToast({ title: 'Erro ao atualizar', description: 'Ocorreu um problema ao salvar as alterações.', type: 'error' });
            }
        } else if (hasInstallments && totalInstallments) {
            const total = parseInt(totalInstallments);
            if (isNaN(total) || total < 2) {
                addToast({ title: 'Nº de parcelas inválido', type: 'error' });
                return;
            }

            const installmentTxs: Omit<Transaction, 'id'>[] = [];

            // Create a base date from the selected date
            // Using a date string splitter to avoid timezone issues with new Date(date)
            const [year, month, day] = date.split('-').map(Number);

            for (let i = 1; i <= total; i++) {
                const currentMonthDate = new Date(year, month - 1 + (i - 1), day);
                const dateStr = currentMonthDate.toISOString().split('T')[0];

                installmentTxs.push({
                    ...payload,
                    description: `${description} (${i}/${total})`,
                    date: dateStr,
                    installments: { current: i, total: total }
                });
            }

            await importTransactions(installmentTxs);
            addToast({ title: 'Parcelas criadas', description: `${total} parcelas foram geradas com sucesso.`, type: 'success' });
        } else {
            const success = await addTransaction(payload);
            if (success) {
                // Check Visibility
                const tDate = new Date(date);
                const isVisible = tDate.getMonth() === selectedDate.getMonth() && tDate.getFullYear() === selectedDate.getFullYear();

                if (isVisible) {
                    addToast({ title: 'Transação salva', type: 'success' });
                } else {
                    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(tDate);
                    addToast({
                        title: 'Transação salva!',
                        description: `Ela foi registrada em ${monthName}. Mude o filtro de data para visualizá-la.`,
                        type: 'info'
                    });
                }
            } else {
                addToast({ title: 'Erro ao salvar', description: 'Não foi possível conectar ao servidor.', type: 'error' });
            }
        }
        resetForm();
    };

    const handleDelete = async (id: string) => {
        const deletedTx = await deleteTransaction(id);
        if (deletedTx) {
            addToast({
                title: 'Item excluído',
                type: 'info',
                action: {
                    label: 'DESFAZER',
                    onClick: () => restoreTransaction(deletedTx)
                }
            });
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName) return;
        await addCategory({
            name: newCatName,
            type: type,
            color: newCatColor,
            iconKey: newCatIcon
        });
        setIsCatCreatorOpen(false);
        setNewCatName('');
    };

    const processImage = async (file: File) => {
        setIsScanning(true);
        setScanProgress(0);
        setScanStatus("Iniciando motor de IA...");
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setAttachedFile(file);
        try {
            const result = await Tesseract.recognize(file, 'por', { logger: m => { if (m.status === 'recognizing text') { setScanStatus(`Lendo caracteres... ${Math.round(m.progress * 100)}%`); setScanProgress(Math.round(m.progress * 100)); } else { setScanStatus(m.status); } } });
            const { data: { text } } = result;

            // Extract Amount
            const priceRegex = /R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/gi;
            let maxAmount = 0;
            let match;
            while ((match = priceRegex.exec(text)) !== null) {
                const cleanValueStr = match[1].replace(/\./g, '').replace(',', '.');
                const val = parseFloat(cleanValueStr);
                if (!isNaN(val) && val > maxAmount) maxAmount = val;
            }
            if (maxAmount > 0) setAmount(maxAmount.toString());

            // Extract Date
            const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;
            const dateMatch = text.match(dateRegex);
            if (dateMatch) setDate(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);

            // Extract Description
            const lines = text.split('\n').filter(line => line.trim().length > 2);
            if (lines.length > 0) {
                const foundDesc = lines[0].replace(/CNPJ|CPF|NOTA|FISCAL/gi, '').trim();
                setDescription(foundDesc || 'Recibo Digital Scan');
            }

            setHighlightInputs(true);
            addToast({ title: 'Leitura Concluída', description: 'Verifique os dados extraídos.', type: 'success' });
            setTimeout(() => setHighlightInputs(false), 2000);
            setIsScanning(false);
        } catch (err) { setIsScanning(false); }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processImage(e.target.files[0]);
    };

    const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));
    const selectedAccount = accounts.find(a => a.id === accountId);
    const isCreditCard = selectedAccount?.type === 'CREDIT_CARD';
    const PreviewIcon = getCategoryIcon(newCatIcon);

    return (
        <div className="space-y-8 pb-20 md:pb-0">
            <PageHeader
                title="Transações"
                description="Gerencie suas receitas e despesas com precisão."
                action={
                    <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
                        <Plus size={18} className="mr-2" />
                        Nova Transação
                    </Button>
                }
            />

            <div className="flex gap-2 relative">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-corporate-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por descrição..."
                        className="w-full h-11 bg-white dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-700 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-corporate-500/20 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative" ref={filterRef}>
                    <Button variant="secondary" onClick={() => { setTempFilters(activeFilters); setIsFilterMenuOpen(!isFilterMenuOpen); }}>
                        <SlidersHorizontal size={16} className="mr-2" /> Filtros
                    </Button>

                    {isFilterMenuOpen && (
                        <div className="absolute top-12 right-0 z-50 w-full md:w-[420px] bg-white dark:bg-[#0f1115] border border-corporate-200 dark:border-corporate-800 rounded-xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Filter size={18} className="text-corporate-400" />
                                    <h3 className="font-bold text-corporate-900 dark:text-white uppercase tracking-wider text-xs">Filtros Avançados</h3>
                                </div>
                                <button onClick={() => setIsFilterMenuOpen(false)} className="text-corporate-500 hover:text-corporate-900 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Período */}
                                <div>
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-widest block mb-3">Período Específico</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-corporate-500 font-medium ml-1">Início</span>
                                            <input
                                                type="date"
                                                className="w-full bg-corporate-50 dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-corporate-500"
                                                value={tempFilters.startDate}
                                                onChange={e => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-corporate-500 font-medium ml-1">Fim</span>
                                            <input
                                                type="date"
                                                className="w-full bg-corporate-50 dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-corporate-500"
                                                value={tempFilters.endDate}
                                                onChange={e => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Valor */}
                                <div>
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-widest block mb-3">Faixa de Valor (R$)</label>
                                    <div className="grid grid-cols-2 gap-3 flex items-center">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-full bg-corporate-50 dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-corporate-500"
                                            value={tempFilters.minAmount}
                                            onChange={e => setTempFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                        />
                                        <span className="text-corporate-700 dark:text-corporate-500 text-center">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-full bg-corporate-50 dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-corporate-500"
                                            value={tempFilters.maxAmount}
                                            onChange={e => setTempFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Tipo */}
                                <div>
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-widest block mb-3">Tipo de Transação</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => toggleType('INCOME')}
                                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all ${tempFilters.selectedTypes.includes('INCOME') ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-transparent border-corporate-200 dark:border-corporate-800 text-corporate-500 hover:border-corporate-300 dark:hover:border-corporate-700'}`}
                                        >
                                            Receitas
                                        </button>
                                        <button
                                            onClick={() => toggleType('EXPENSE')}
                                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all ${tempFilters.selectedTypes.includes('EXPENSE') ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-transparent border-corporate-200 dark:border-corporate-800 text-corporate-500 hover:border-corporate-300 dark:hover:border-corporate-700'}`}
                                        >
                                            Despesas
                                        </button>
                                    </div>
                                </div>

                                {/* Categorias */}
                                <div>
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-widest block mb-3">Categorias</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${tempFilters.selectedCategoryIds.includes(cat.id) ? 'bg-corporate-900 dark:bg-white text-white dark:text-corporate-950 border-transparent' : 'bg-corporate-50 dark:bg-corporate-900 text-corporate-500 dark:text-corporate-400 border-corporate-200 dark:border-corporate-800'}`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Contas */}
                                <div>
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-widest block mb-3">Contas Bancárias</label>
                                    <div className="flex flex-wrap gap-2">
                                        {accounts.map(acc => (
                                            <button
                                                key={acc.id}
                                                onClick={() => toggleAccount(acc.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-2 ${tempFilters.selectedAccountIds.includes(acc.id) ? 'bg-corporate-900 dark:bg-white text-white dark:text-corporate-950 border-transparent' : 'bg-corporate-50 dark:bg-corporate-900 text-corporate-500 dark:text-corporate-400 border-corporate-200 dark:border-corporate-800'}`}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.bankColor }}></div>
                                                {acc.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-corporate-100 dark:border-corporate-800 flex items-center gap-4">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs font-bold text-corporate-400 hover:text-corporate-600 dark:hover:text-corporate-200 transition-colors"
                                >
                                    Limpar
                                </button>
                                <Button className="flex-1" onClick={applyFilters}>
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {transactionGroups.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-corporate-200 dark:border-corporate-800 rounded-xl">
                        <p className="text-corporate-500">Nenhuma transação encontrada.</p>
                    </div>
                ) : (
                    transactionGroups.map(group => (
                        <div key={group.dateKey}>
                            <div className="flex items-center gap-4 mb-3 px-1">
                                <span className="text-xs font-bold text-corporate-400 uppercase tracking-wider">{group.dateKey}</span>
                                <div className="h-px bg-corporate-200 dark:bg-corporate-800 w-full"></div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {group.items.map(t => (
                                    <TransactionItem
                                        key={t.id}
                                        transaction={t}
                                        category={categories.find(c => c.id === t.categoryId)}
                                        account={accounts.find(a => a.id === t.accountId)}
                                        anomaly={anomalies.find(an => an.transactionId === t.id)}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        variant="full"
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={resetForm}
                title={editingId ? 'Editar Transação' : 'Nova Transação'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!editingId && (
                        <div
                            onClick={() => !isScanning && fileInputRef.current?.click()}
                            className={`border-2 border-dashed transition-all rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer ${isScanning ? 'border-indigo-500 bg-indigo-500/10' : 'border-corporate-700 hover:bg-corporate-800/50'}`}
                        >
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                            {isScanning ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 size={32} className="text-indigo-500 animate-spin mb-2" />
                                    <span className="text-xs text-indigo-400 font-bold">{scanStatus}</span>
                                </div>
                            ) : (
                                <>
                                    <Camera size={24} className="text-corporate-400" />
                                    <p className="text-sm mt-2">Escanear Recibo (IA)</p>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex bg-corporate-950 p-1 rounded-lg border border-corporate-800">
                        <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium ${type === 'INCOME' ? 'bg-emerald-500 text-white' : 'text-corporate-400'}`} onClick={() => setType('INCOME')}>Receita</button>
                        <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium ${type === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-corporate-400'}`} onClick={() => setType('EXPENSE')}>Despesa</button>
                    </div>

                    <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} className={highlightInputs ? 'ring-2 ring-emerald-500/50' : ''} />
                    <Input label="Valor (R$)" inputMode="decimal" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className={highlightInputs ? 'ring-2 ring-emerald-500/50' : ''} />
                    <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} className={highlightInputs ? 'ring-2 ring-emerald-500/50' : ''} />

                    <Select
                        label="Categoria"
                        options={[
                            { value: '', label: 'Selecione...' },
                            ...categories.filter(c => c.type === type).map(c => ({ value: c.id, label: c.name })),
                            { value: '__NEW__', label: '+ Criar Nova...' }
                        ]}
                        value={categoryId}
                        onChange={e => e.target.value === '__NEW__' ? setIsCatCreatorOpen(true) : setCategoryId(e.target.value)}
                    />

                    <Select label="Conta" options={accountOptions} value={accountId} onChange={e => setAccountId(e.target.value)} />

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-corporate-300">Conta Fixa (Mensal)</label>
                            <button
                                type="button"
                                onClick={() => { setIsRecurring(!isRecurring); if (!isRecurring) setHasInstallments(false); }}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isRecurring ? 'bg-corporate-primary' : 'bg-corporate-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isRecurring ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {!editingId && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-corporate-300">Despesa Parcelada</label>
                                <button
                                    type="button"
                                    onClick={() => { setHasInstallments(!hasInstallments); if (!hasInstallments) setIsRecurring(false); }}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${hasInstallments ? 'bg-corporate-primary' : 'bg-corporate-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${hasInstallments ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        )}

                        {hasInstallments && !editingId && (
                            <div className="pl-4 border-l-2 border-corporate-800 animate-in slide-in-from-left duration-200">
                                <Input
                                    label="Número de Parcelas"
                                    type="number"
                                    min="2"
                                    placeholder="Ex: 12"
                                    value={totalInstallments}
                                    onChange={e => setTotalInstallments(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={resetForm}>Cancelar</Button>
                        <Button type="submit" className="flex-1">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isCatCreatorOpen}
                onClose={() => setIsCatCreatorOpen(false)}
                title="Nova Categoria"
                maxWidth="max-w-sm"
            >
                <form onSubmit={handleCreateCategory} className="p-6 space-y-5">
                    <Input label="Nome" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
                    <div>
                        <label className="text-xs font-bold text-corporate-500 uppercase block mb-2">Cor</label>
                        <div className="grid grid-cols-6 gap-2">
                            {CATEGORY_COLORS.map(c => (
                                <button key={c} type="button" onClick={() => setNewCatColor(c)} className={`w-8 h-8 rounded-full ${newCatColor === c ? 'ring-2 ring-offset-2' : ''}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <Button type="submit" className="w-full">Criar Categoria</Button>
                </form>
            </Modal>
        </div>
    );
};