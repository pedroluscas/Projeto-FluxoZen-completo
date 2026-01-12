import React, { useState, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Inputs';
import { formatCurrency, getBankAbbreviation, formatDate } from '../utils';
import { AccountType, Account } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import {
    Plus, Trash2, Edit2, Upload, FileSpreadsheet, AlertTriangle, ArrowRight, CheckCircle2,
    FileText, Loader2, Lock
} from 'lucide-react';

export const Accounts: React.FC = () => {
    const { accounts, addAccount, updateAccount, deleteAccount, getAccountBalance, importTransactions, categories, addCategory } = useFinancial();
    const { addToast } = useToast();

    // --- Account Form State ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [institution, setInstitution] = useState('');
    const [type, setType] = useState<AccountType>('CHECKING');
    const [color, setColor] = useState('#8B5CF6');
    const [initialBalance, setInitialBalance] = useState('0');

    // --- Import Wizard State ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [importAccount, setImportAccount] = useState<Account | null>(null);
    const [importedFile, setImportedFile] = useState<File | null>(null);
    const [mockParsedData, setMockParsedData] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Account CRUD ---
    const resetForm = () => {
        setName('');
        setInstitution('');
        setType('CHECKING');
        setColor('#8B5CF6');
        setInitialBalance('0');
        setEditingId(null);
        setIsFormOpen(false);
    };

    const handleEdit = (acc: Account) => {
        setName(acc.name);
        setInstitution(acc.institution || '');
        setType(acc.type);
        setColor(acc.bankColor);
        setInitialBalance(acc.initialBalance.toString());
        setEditingId(acc.id);
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const payload: any = {
            name,
            institution,
            type,
            bankColor: color,
            initialBalance: parseFloat(initialBalance)
        };

        if (editingId) {
            await updateAccount({ ...payload, id: editingId });
            addToast({ title: 'Conta atualizada', type: 'success' });
        } else {
            await addAccount(payload);
            addToast({ title: 'Conta criada', type: 'success' });
        }

        resetForm();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza? Isso pode afetar o histórico de transações.')) {
            await deleteAccount(id);
            addToast({ title: 'Conta removida', type: 'info' });
        }
    };

    const getTypeLabel = (type: AccountType) => {
        switch (type) {
            case 'CREDIT_CARD': return 'CARTÃO DE CRÉDITO';
            case 'CASH': return 'DINHEIRO';
            case 'INVESTMENT': return 'INVESTIMENTO';
            default: return 'CONTA CORRENTE';
        }
    };

    // --- Import Wizard Logic ---
    const openImportWizard = (acc: Account) => {
        setImportAccount(acc);
        setImportStep(1);
        setImportedFile(null);
        setMockParsedData([]);

        const importName = "Importação CSV";
        const hasExpense = categories.some(c => c.name === importName && c.type === 'EXPENSE');
        const hasIncome = categories.some(c => c.name === importName && c.type === 'INCOME');

        if (!hasExpense) {
            addCategory({ name: importName, type: 'EXPENSE', color: '#64748b', iconKey: 'FileSpreadsheet' });
        }
        if (!hasIncome) {
            addCategory({ name: importName, type: 'INCOME', color: '#64748b', iconKey: 'FileSpreadsheet' });
        }

        setIsImportModalOpen(true);
    };

    const closeImportWizard = () => {
        setIsImportModalOpen(false);
        setImportAccount(null);
    };

    const handleFileDrop = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        let file: File | null = null;

        if ('dataTransfer' in e) {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                file = e.dataTransfer.files[0];
            }
        } else if ('target' in e && e.target.files) {
            file = e.target.files[0];
        }

        if (file) {
            setImportedFile(file);
            setIsParsing(true);

            try {
                const text = await file.text();
                parseFileContent(text, file.name);
                setIsParsing(false);
                setImportStep(2);
            } catch (error) {
                console.error("Error reading file:", error);
                addToast({ title: 'Erro ao ler arquivo', type: 'error' });
                setIsParsing(false);
            }
        }
    };

    const parseFileContent = (content: string, fileName: string) => {
        const isCSV = fileName.toLowerCase().endsWith('.csv');
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        const parsedData: any[] = [];

        if (isCSV) {
            // Detect separator (usually ; in BR or , in US)
            const firstLine = lines[0] || '';
            const separator = firstLine.includes(';') ? ';' : ',';

            // Header detection: if first column doesn't look like a date, skip it
            const looksLikeDate = (s: string) => /^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(s.trim());
            const startIndex = looksLikeDate(lines[0].split(separator)[0]) ? 0 : 1;

            for (let i = startIndex; i < lines.length; i++) {
                const columns = lines[i].split(separator);
                if (columns.length < 2) continue;

                let dateStr = columns[0].trim();
                let rawAmount = "";

                // Flexible Amount detection: 
                // Check column index 1 (user format) or last column (common format)
                const valIndex1 = columns[1]?.replace('R$', '').trim() || "";
                const valLast = columns[columns.length - 1]?.replace('R$', '').trim() || "";

                // If column 1 is a valid number (potentially with comma or dot), use it
                const isNum = (s: string) => !isNaN(parseFloat(s.replace(/\./g, '').replace(',', '.')));

                if (isNum(valIndex1)) {
                    rawAmount = valIndex1;
                } else if (isNum(valLast)) {
                    rawAmount = valLast;
                }

                // Parse numeric amount correctly handling BR format (1.234,56) and US/Standard (1234.56)
                let numericAmount = 0;
                let cleanVal = rawAmount;

                if (cleanVal.includes(',') && cleanVal.includes('.')) {
                    numericAmount = parseFloat(cleanVal.replace(/\./g, '').replace(',', '.'));
                } else if (cleanVal.includes(',')) {
                    numericAmount = parseFloat(cleanVal.replace(',', '.'));
                } else {
                    numericAmount = parseFloat(cleanVal);
                }

                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const [d, m, y] = parts;
                        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                }

                if (!isNaN(numericAmount) && dateStr) {
                    parsedData.push({
                        date: dateStr,
                        description: "Transação Importada",
                        amount: numericAmount,
                        category: 'Importação CSV'
                    });
                }
            }
        } else if (fileName.toLowerCase().endsWith('.ofx')) {
            // Very basic OFX parser using regex
            const txBlocks = content.split('<STMTTRN>');
            txBlocks.shift(); // remove header

            txBlocks.forEach(block => {
                const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
                const amountMatch = block.match(/<TRNAMT>([-+]?\d+(\.\d+)?)/);

                if (dateMatch && amountMatch) {
                    const rawDate = dateMatch[1];
                    const dateStr = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
                    const numericAmount = parseFloat(amountMatch[1]);

                    parsedData.push({
                        date: dateStr,
                        description: "Transação Importada",
                        amount: numericAmount,
                        category: 'Importação CSV'
                    });
                }
            });
        }

        if (parsedData.length === 0) {
            addToast({ title: 'Dados não encontrados', description: 'O formato do arquivo pode não ser compatível.', type: 'error' });
            setImportStep(1);
        } else {
            setMockParsedData(parsedData);
        }
    };

    const confirmImport = () => {
        if (!importAccount) return;

        const importName = "Importação CSV";
        const expenseCat = categories.find(c => c.name === importName && c.type === 'EXPENSE');
        const incomeCat = categories.find(c => c.name === importName && c.type === 'INCOME');

        const safeExpenseId = expenseCat?.id || categories.find(c => c.type === 'EXPENSE')?.id || categories[0].id;
        const safeIncomeId = incomeCat?.id || categories.find(c => c.type === 'INCOME')?.id || categories[0].id;

        const newTransactions: any[] = mockParsedData.map(row => {
            const isExpense = row.amount < 0;
            const forcedCatId = isExpense ? safeExpenseId : safeIncomeId;

            return {
                description: "Transação Importada", // Forced as requested
                amount: Math.abs(row.amount),
                date: row.date,
                type: isExpense ? 'EXPENSE' : 'INCOME',
                categoryId: forcedCatId,
                accountId: importAccount.id,
                isRecurring: false,
                isImported: true,
                tags: ['Importação CSV']
            };
        });

        importTransactions(newTransactions);

        addToast({
            title: 'Importação Concluída',
            description: `${newTransactions.length} transações importadas.`,
            type: 'success'
        });

        closeImportWizard();
    };

    return (
        <div className="space-y-8 pb-10">
            <PageHeader
                title="Carteira"
                description="Gerencie suas contas bancárias e acompanhe seu fluxo de caixa."
                action={
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsFormOpen(true);
                        }}
                    >
                        <Plus size={18} className="mr-2" />
                        Nova Conta
                    </Button>
                }
            />

            <Modal
                isOpen={isFormOpen}
                onClose={resetForm}
                title={editingId ? 'Editar Conta' : 'Nova Conta'}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
                    <Input
                        label="Nome da Conta"
                        placeholder="Ex: Conta Principal..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />

                    <Input
                        label="Instituição Financeira"
                        placeholder="Ex: Nubank..."
                        value={institution}
                        onChange={e => setInstitution(e.target.value)}
                    />

                    <Select
                        label="Tipo de Conta"
                        options={[
                            { value: 'CHECKING', label: 'Conta Corrente' },
                            { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                            { value: 'CASH', label: 'Dinheiro / Caixa' },
                            { value: 'INVESTMENT', label: 'Investimento' }
                        ]}
                        value={type}
                        onChange={(e) => setType(e.target.value as AccountType)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-corporate-300">Cor</label>
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                className="h-10 w-full rounded-md border border-corporate-800 bg-corporate-950 p-1 cursor-pointer"
                            />
                        </div>
                        <Input
                            label="Saldo Inicial"
                            type="number"
                            step="0.01"
                            value={initialBalance}
                            onChange={e => setInitialBalance(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={resetForm}>Cancelar</Button>
                        <Button type="submit" className="flex-1">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((acc) => {
                    const currentBalance = getAccountBalance(acc.id);
                    const abbrev = getBankAbbreviation(acc.institution || acc.name);
                    const isCredit = acc.type === 'CREDIT_CARD';
                    const isPositive = currentBalance >= 0;

                    return (
                        <div key={acc.id} className="group relative bg-white dark:bg-[#151a23] rounded-2xl shadow-sm border border-corporate-200 dark:border-corporate-800 p-6 transition-all hover:shadow-md h-[260px] flex flex-col justify-between overflow-hidden">
                            <div className="absolute top-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => openImportWizard(acc)} className="p-1.5 text-corporate-400 hover:text-indigo-500 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30"><Upload size={16} /></button>
                                <button onClick={() => handleEdit(acc)} className="p-1.5 text-corporate-400 hover:text-corporate-700 dark:hover:text-white rounded-md hover:bg-corporate-100 dark:hover:bg-corporate-800"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-corporate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30"><Trash2 size={16} /></button>
                            </div>

                            <div>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm mb-4" style={{ backgroundColor: acc.bankColor }}>{abbrev}</div>
                                <h3 className="text-lg font-bold text-corporate-900 dark:text-white leading-tight">{acc.name}</h3>
                                <p className="text-sm text-corporate-500 dark:text-corporate-400 font-medium mt-1">{acc.institution || 'Instituição Financeira'}</p>
                                <div className="mt-4"><span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-corporate-100 dark:bg-corporate-800 text-corporate-600 dark:text-corporate-300 border border-corporate-200 dark:border-corporate-700">{getTypeLabel(acc.type)}</span></div>
                            </div>

                            <div className="flex items-end justify-between pt-4 border-t border-corporate-100 dark:border-corporate-800/50 mt-2">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isCredit ? 'text-rose-500' : 'text-corporate-400'}`}>{isCredit ? 'Fatura Atual' : 'Saldo Atual'}</p>
                                    <p className={`text-2xl font-bold tracking-tight ${isCredit ? 'text-rose-500' : 'text-corporate-900 dark:text-white'}`}>{formatCurrency(currentBalance)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="group bg-corporate-50/50 dark:bg-[#151a23]/30 rounded-2xl border-2 border-dashed border-corporate-200 dark:border-corporate-800 hover:border-emerald-500 transition-all h-[260px] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-corporate-800 shadow-sm border border-corporate-100 dark:border-corporate-700 flex items-center justify-center text-corporate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-4"><Plus size={24} /></div>
                    <h3 className="font-bold text-corporate-700 dark:text-corporate-200 text-lg group-hover:text-corporate-900 dark:group-hover:text-white transition-colors">Adicionar Nova Conta</h3>
                    <p className="text-sm text-corporate-500 dark:text-corporate-500 mt-2 max-w-[200px]">Conecte um novo banco ou adicione uma carteira manual.</p>
                </button>
            </div>

            <Modal
                isOpen={isImportModalOpen && !!importAccount}
                onClose={closeImportWizard}
                title="Importar Extrato"
                maxWidth="max-w-2xl"
            >
                <div className="flex flex-col max-h-[70vh]">
                    {importAccount && (
                        <div className="mb-4 px-6 pt-4">
                            <p className="text-sm text-corporate-500 dark:text-corporate-400">Para: <span className="font-semibold text-corporate-800 dark:text-corporate-200">{importAccount.name}</span></p>
                        </div>
                    )}

                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="flex items-center justify-center mb-8">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-corporate-200 dark:bg-corporate-800 text-corporate-500'}`}>1</div>
                            <div className={`w-12 h-1 ${importStep >= 2 ? 'bg-emerald-500' : 'bg-corporate-200 dark:bg-corporate-800'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-corporate-200 dark:bg-corporate-800 text-corporate-500'}`}>2</div>
                            <div className={`w-12 h-1 ${importStep >= 3 ? 'bg-emerald-500' : 'bg-corporate-200 dark:bg-corporate-800'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep >= 3 ? 'bg-emerald-500 text-white' : 'bg-corporate-200 dark:bg-corporate-800 text-corporate-500'}`}>3</div>
                        </div>

                        {importStep === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-lg flex gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Atenção à Duplicidade</h4>
                                        <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">Evite importar períodos já lançados.</p>
                                    </div>
                                </div>
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-corporate-300 dark:border-corporate-700 hover:border-emerald-500 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all">
                                    <input type="file" accept=".csv,.ofx" className="hidden" ref={fileInputRef} onChange={handleFileDrop} />
                                    {isParsing ? <Loader2 size={32} className="text-emerald-500 animate-spin" /> : <Upload size={24} className="text-corporate-400" />}
                                    <p className="text-sm font-medium mt-2">Clique ou arraste seu arquivo aqui</p>
                                </div>
                            </div>
                        )}

                        {importStep === 2 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="border border-corporate-200 dark:border-corporate-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-corporate-50 dark:bg-corporate-800 text-corporate-500">
                                            <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2 text-right">Valor</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-corporate-100 dark:divide-corporate-700/50">
                                            {mockParsedData.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="dark:text-corporate-200">
                                                    <td className="px-4 py-2 text-xs">{row.date}</td>
                                                    <td className="px-4 py-2 font-medium">{row.description}</td>
                                                    <td className={`px-4 py-2 text-right font-bold ${row.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(row.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {importStep === 3 && (
                            <div className="flex flex-col items-center py-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={32} /></div>
                                <h3 className="text-xl font-bold">Tudo Pronto!</h3>
                                <p className="text-corporate-500">Serão importadas <strong>{mockParsedData.length} transações</strong>.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-corporate-100 dark:border-corporate-800 flex justify-between">
                        {importStep === 1 && <Button variant="ghost" onClick={closeImportWizard}>Cancelar</Button>}
                        {importStep > 1 && <Button variant="ghost" onClick={() => setImportStep(prev => prev - 1)}>Voltar</Button>}
                        {importStep === 1 && <Button disabled={!importedFile} onClick={() => setImportStep(2)}>Próximo</Button>}
                        {importStep === 2 && <Button onClick={() => setImportStep(3)}>Revisar</Button>}
                        {importStep === 3 && <Button onClick={confirmImport}>Confirmar</Button>}
                    </div>
                </div>
            </Modal>
        </div>
    );
};