import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { formatCurrency, getBankAbbreviation, getCategoryIcon } from '../utils';
import { Anomaly } from '../types';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, Trophy, Filter, X, Download, FileText, FileSpreadsheet,
    ShieldAlert, ShieldCheck, CheckCircle2, Search, Ban, Fingerprint, CalendarClock, User, Wallet,
    Share2, ChevronDown, Moon, Sun
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { PageHeader } from '../components/ui/PageHeader';

// --- CUSTOM TOOLTIP COMPONENT FOR RAIO-X ---
const CustomXRayTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f172a] text-white p-3 rounded-xl shadow-xl border border-slate-700 flex flex-col items-center min-w-[140px] relative">
                {/* Little Triangle Pointer (Visual CSS hack) */}
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0f172a] border-r border-b border-slate-700 rotate-45 transform"></div>

                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{label}</span>
                </div>

                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color === '#10B981' ? '#10B981' : '#F43F5E' }}></div>
                        <span className="font-mono font-bold">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// --- CUSTOM AXIS TICK FOR ACCOUNTS ---
const CustomAxisTick = (props: any) => {
    const { x, y, payload, data } = props;
    const entry = data[payload.index];
    const color = entry ? entry.color : '#94a3b8';

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={16}
                textAnchor="middle"
                fill={color}
                fontSize={12}
                fontWeight={600}
                className="transition-all duration-300"
            >
                {payload.value}
            </text>
        </g>
    );
};

export const Reports: React.FC = () => {
    const {
        transactions, accounts, categories, getAccountBalance,
        totalBalance, filteredTransactions, selectedDate,
        companyName, monthlyIncome, monthlyExpense,
        anomalies, dismissAnomaly, deleteTransaction
    } = useFinancial();

    const { theme, toggleTheme } = useTheme();
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
    const { addToast } = useToast();

    // Export Dropdown State
    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    // Chart Refs for PDF export
    const xRayRef = useRef<HTMLDivElement>(null);
    const distributionRef = useRef<HTMLDivElement>(null);

    // Security Modal State
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

    // Derived Transaction for Modal
    const selectedAnomalyTx = useMemo(() => {
        if (!selectedAnomaly) return null;
        return transactions.find(t => t.id === selectedAnomaly.transactionId);
    }, [selectedAnomaly, transactions]);

    // Derived Transaction for Inline Display (First item)
    const firstAnomaly = anomalies.length > 0 ? anomalies[0] : null;
    const firstAnomalyTx = useMemo(() => {
        if (!firstAnomaly) return null;
        return transactions.find(t => t.id === firstAnomaly.transactionId);
    }, [firstAnomaly, transactions]);

    // Close export dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [exportRef]);

    const handleExport = async (type: 'PDF' | 'CSV') => {
        setIsExportOpen(false);
        const sortedData = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (type === 'CSV') {
            try {
                const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor', 'Status'];
                const rows = sortedData.map(t => {
                    const catName = categories.find(c => c.id === t.categoryId)?.name || 'N/A';
                    const accName = accounts.find(a => a.id === t.accountId)?.name || 'N/A';
                    const dateStr = new Date(t.date).toLocaleDateString('pt-BR');
                    const descClean = `"${t.description.replace(/"/g, '""')}"`;
                    const catClean = `"${catName}"`;
                    const accClean = `"${accName}"`;
                    const typeLabel = t.type === 'INCOME' ? 'Receita' : 'Despesa';
                    const valStr = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    const status = t.isRecurring ? 'Fixa' : (t.installments ? `Parc. ${t.installments.current}/${t.installments.total}` : 'Normal');
                    return [dateStr, descClean, catClean, accClean, typeLabel, valStr, status].join(';');
                });
                const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `FluxoZen_Relatorio_${selectedDate.toLocaleString('pt-BR', { month: 'numeric', year: 'numeric' }).replace('/', '-')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                addToast({ title: 'Download Concluído', description: 'O arquivo Excel (CSV) foi gerado com sucesso.', type: 'success' });
            } catch (err) { console.error(err); addToast({ title: 'Erro no Export', description: 'Não foi possível gerar o arquivo.', type: 'error' }); }
        } else {
            try {
                addToast({ title: 'Gerando PDF...', description: 'Capturando gráficos e formatando dados.', type: 'info' });

                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Color Palette
                const colors = {
                    primary: [79, 70, 229], // Indigo 600
                    secondary: [30, 41, 59], // Slate 800
                    text: [71, 85, 105], // Slate 600
                    income: [16, 185, 129], // Emerald 500
                    expense: [244, 63, 94], // Rose 500
                    border: [226, 232, 240] // Slate 200
                };

                // 1. Header & Branding
                doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.rect(0, 0, pageWidth, 40, 'F');

                doc.setFontSize(24);
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.text(companyName, 14, 25);

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Relatório de Inteligência Financeira: ${selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`, 14, 33);

                doc.setTextColor(255, 255, 255, 0.8);
                doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, 33, { align: 'right' });

                // 2. Performance Summary Cards
                let currentY = 55;
                doc.setFontSize(14);
                doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                doc.text("Resumo de Performance", 14, currentY);
                currentY += 10;

                // Create 3 columns for Summary
                const colWidth = (pageWidth - 28) / 3;

                // Income Card
                doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                doc.setLineWidth(0.1);
                doc.roundedRect(14, currentY, colWidth - 4, 25, 3, 3);
                doc.setFontSize(8);
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.text("TOTAL RECEITAS", 18, currentY + 7);
                doc.setFontSize(12);
                doc.setTextColor(colors.income[0], colors.income[1], colors.income[2]);
                doc.text(formatCurrency(monthlyIncome), 18, currentY + 18);

                // Expense Card
                doc.roundedRect(14 + colWidth, currentY, colWidth - 4, 25, 3, 3);
                doc.setFontSize(8);
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.text("TOTAL DESPESAS", 18 + colWidth, currentY + 7);
                doc.setFontSize(12);
                doc.setTextColor(colors.expense[0], colors.expense[1], colors.expense[2]);
                doc.text(formatCurrency(monthlyExpense), 18 + colWidth, currentY + 18);

                // Result Card
                const balance = monthlyIncome - monthlyExpense;
                doc.roundedRect(14 + (colWidth * 2), currentY, colWidth - 4, 25, 3, 3);
                doc.setFontSize(8);
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.text("FLUXO LÍQUIDO", 18 + (colWidth * 2), currentY + 7);
                doc.setFontSize(12);
                doc.setTextColor(balance >= 0 ? colors.income[0] : colors.expense[0], balance >= 0 ? colors.income[1] : colors.expense[1], balance >= 0 ? colors.income[2] : colors.expense[2]);
                doc.text(formatCurrency(balance), 18 + (colWidth * 2), currentY + 18);

                currentY += 35;

                // 3. Visual Charts Integration
                if (xRayRef.current) {
                    try {
                        const canvas = await html2canvas(xRayRef.current, { scale: 2, backgroundColor: '#151a23' });
                        const imgData = canvas.toDataURL('image/png');
                        doc.setFontSize(14);
                        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                        doc.text("Raio-X Mensal por Conta", 14, currentY);
                        currentY += 5;
                        doc.addImage(imgData, 'PNG', 14, currentY, pageWidth - 28, 60);
                        currentY += 70;
                    } catch (e) { console.error("Chart capture error:", e); }
                }

                if (distributionRef.current) {
                    try {
                        const canvas = await html2canvas(distributionRef.current, { scale: 2, backgroundColor: '#ffffff' });
                        const imgData = canvas.toDataURL('image/png');
                        doc.setFontSize(14);
                        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                        doc.text("Distribuição por Categoria", 14, currentY);
                        currentY += 5;
                        // Center the distribution chart
                        const distWidth = 120;
                        doc.addImage(imgData, 'PNG', (pageWidth - distWidth) / 2, currentY, distWidth, 50);
                        currentY += 60;
                    } catch (e) { console.error("Chart capture error:", e); }
                }

                // 4. Detailed Transaction Table (Page 2)
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.text("Extrato Detalhado", 14, 20);

                const tableColumn = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Tipo"];
                const tableRows = sortedData.map(t => {
                    const catName = categories.find(c => c.id === t.categoryId)?.name || 'N/A';
                    const accName = accounts.find(a => a.id === t.accountId)?.name || 'N/A';
                    return [
                        new Date(t.date).toLocaleDateString('pt-BR'),
                        t.description,
                        catName,
                        accName,
                        formatCurrency(t.amount),
                        t.type === 'INCOME' ? 'Receita' : 'Despesa'
                    ];
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 25,
                    theme: 'striped',
                    headStyles: { fillColor: colors.primary as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 3 },
                    columnStyles: {
                        4: { halign: 'right', fontStyle: 'bold' },
                        5: { halign: 'center' }
                    },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index === 4) {
                            const rowIdx = data.row.index;
                            const type = sortedData[rowIdx].type;
                            if (type === 'EXPENSE') data.cell.styles.textColor = colors.expense as [number, number, number];
                            else data.cell.styles.textColor = colors.income as [number, number, number];
                        }
                    }
                });

                // Footer with Page Numbers
                const totalPages = (doc as any).internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                    doc.text("FluxoZen Intelligence • www.fluxozen.com.br", 14, pageHeight - 10);
                }

                doc.save(`FluxoZen_Relatorio_${companyName.replace(/\s+/g, '_')}_${selectedDate.getMonth() + 1}_${selectedDate.getFullYear()}.pdf`);
                addToast({ title: 'PDF Gerado', description: 'O download do relatório inteligente foi iniciado.', type: 'success' });
            } catch (err) {
                console.error("PDF Gen Error:", err);
                addToast({ title: 'Erro ao gerar PDF', description: 'Houve um problema ao criar o arquivo altamente visual.', type: 'error' });
            }
        }
    };

    // --- Data Processing (Retained) ---
    const accountFlowData = useMemo(() => {
        return accounts.map(acc => {
            const accTxs = filteredTransactions.filter(t => t.accountId === acc.id);
            const income = accTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
            const expense = accTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
            return { id: acc.id, name: acc.name, abbrev: getBankAbbreviation(acc.institution || acc.name), color: acc.bankColor, income, expense };
        }).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
    }, [accounts, filteredTransactions]);

    const topEarner = [...accountFlowData].sort((a, b) => b.income - a.income)[0];
    const topSpender = [...accountFlowData].sort((a, b) => b.expense - a.expense)[0];
    const totalExpenses = accountFlowData.reduce((sum, item) => sum + item.expense, 0);

    const liquidityData = useMemo(() => {
        return accounts.map(acc => {
            const balance = getAccountBalance(acc.id);
            const isCredit = acc.type === 'CREDIT_CARD';
            const totalVolume = accounts.reduce((sum, a) => sum + Math.abs(getAccountBalance(a.id)), 0);
            const absBalance = Math.abs(balance);
            return { ...acc, balance, isCredit, percent: totalVolume > 0 ? (absBalance / totalVolume) * 100 : 0, barColor: isCredit ? '#F43F5E' : acc.bankColor };
        }).sort((a, b) => { if (a.type !== 'CREDIT_CARD' && b.type === 'CREDIT_CARD') return -1; if (a.type === 'CREDIT_CARD' && b.type !== 'CREDIT_CARD') return 1; return b.balance - a.balance; });
    }, [accounts, getAccountBalance]);

    const getCategoryStats = (type: 'INCOME' | 'EXPENSE') => {
        return categories.filter(c => c.type === type).map(cat => {
            const catTxs = filteredTransactions.filter(t => t.categoryId === cat.id);
            const total = catTxs.reduce((sum, t) => sum + t.amount, 0);
            const accountUsage: { [key: string]: number } = {};
            catTxs.forEach(t => { accountUsage[t.accountId] = (accountUsage[t.accountId] || 0) + t.amount; });
            const primaryAccountId = Object.keys(accountUsage).sort((a, b) => accountUsage[b] - accountUsage[a])[0];
            const primaryAccount = accounts.find(a => a.id === primaryAccountId);
            return { id: cat.id, name: cat.name, value: total, color: cat.color || '#cbd5e1', iconKey: cat.iconKey, primaryAccount, txCount: catTxs.length };
        }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    };

    const expenseData = useMemo(() => getCategoryStats('EXPENSE'), [filteredTransactions, categories]);
    const incomeData = useMemo(() => getCategoryStats('INCOME'), [filteredTransactions, categories]);

    const tableData = useMemo(() => {
        if (selectedCategoryFilter) {
            const catTxs = filteredTransactions.filter(t => t.categoryId === selectedCategoryFilter);
            const accGroup: { [key: string]: number } = {};
            catTxs.forEach(t => { accGroup[t.accountId] = (accGroup[t.accountId] || 0) + t.amount; });
            return Object.keys(accGroup).map(accId => {
                const acc = accounts.find(a => a.id === accId);
                const val = accGroup[accId];
                return { id: accId, label: acc?.name || 'Desconhecido', subLabel: acc?.institution, value: val, percent: (val / (catTxs.reduce((s, t) => s + t.amount, 0) || 1)) * 100, icon: null, color: acc?.bankColor, badge: getBankAbbreviation(acc?.name || ''), badgeColor: acc?.bankColor };
            }).sort((a, b) => b.value - a.value);
        } else {
            const allStats = [...expenseData, ...incomeData].sort((a, b) => b.value - a.value);
            const totalVolume = allStats.reduce((sum, item) => sum + item.value, 0);
            return allStats.map(item => ({ id: item.id, label: item.name, subLabel: expenseData.find(e => e.id === item.id) ? 'Despesa' : 'Receita', value: item.value, percent: (item.value / totalVolume) * 100, icon: item.iconKey, color: item.color, badge: item.primaryAccount ? getBankAbbreviation(item.primaryAccount.name) : null, badgeColor: item.primaryAccount?.bankColor }));
        }
    }, [selectedCategoryFilter, expenseData, incomeData, filteredTransactions, accounts]);

    const handlePieClick = (data: any) => {
        if (selectedCategoryFilter === data.id) { setSelectedCategoryFilter(null); } else { setSelectedCategoryFilter(data.id); }
    };

    // --- AUDIT ACTIONS ---
    const handleConfirmLegit = (anomaly?: Anomaly) => {
        const target = anomaly || selectedAnomaly;
        if (target) {
            dismissAnomaly(target.transactionId);
            addToast({ title: 'Aprovado', description: 'Transação aprovada e integrada ao fluxo.', type: 'success' });
            setSelectedAnomaly(null);
        }
    };

    const handleReject = () => {
        if (selectedAnomaly && selectedAnomalyTx) {
            deleteTransaction(selectedAnomalyTx.id);
            // Also dismiss to ensure it's cleared from state if delete logic is separate
            dismissAnomaly(selectedAnomaly.transactionId);
            addToast({ title: 'Rejeitado', description: 'Transação removida. Alerta de segurança enviado ao admin.', type: 'error' });
            setSelectedAnomaly(null);
        }
    };

    // Helper to get formatted date with weekday for the Modal
    const getDetailedDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-8 pb-10">
            <PageHeader
                title="Business Intelligence"
                description="Análise estratégica de fluxo e liquidez."
                action={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-lg text-corporate-500 hover:bg-corporate-100 dark:hover:bg-corporate-800 transition-colors"
                            title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <div className="relative" ref={exportRef}>
                            <button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-corporate-800 border border-corporate-200 dark:border-corporate-700 rounded-lg text-sm font-bold text-corporate-700 dark:text-corporate-200 hover:bg-corporate-50 dark:hover:bg-corporate-700 transition-all shadow-sm"
                            >
                                <Download size={16} />
                                <span>Exportar Relatório</span>
                            </button>

                            {isExportOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-corporate-800 rounded-xl shadow-xl border border-corporate-200 dark:border-corporate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-corporate-100 dark:border-corporate-700">
                                        <p className="text-xs font-bold text-corporate-400 uppercase tracking-wider">Exportar como</p>
                                    </div>
                                    <div className="py-1">
                                        <button
                                            onClick={() => handleExport('PDF')}
                                            className="w-full text-left px-4 py-3 text-sm text-corporate-700 dark:text-corporate-200 hover:bg-corporate-50 dark:hover:bg-corporate-700 flex items-center gap-2 transition-colors"
                                        >
                                            <FileText size={16} className="text-red-500" />
                                            <span>Documento PDF</span>
                                        </button>
                                        <button
                                            onClick={() => handleExport('CSV')}
                                            className="w-full text-left px-4 py-3 text-sm text-corporate-700 dark:text-corporate-200 hover:bg-corporate-50 dark:hover:bg-corporate-700 flex items-center gap-2 transition-colors"
                                        >
                                            <FileSpreadsheet size={16} className="text-emerald-500" />
                                            <span>Planilha Excel</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                }
            />

            {/* --- SECURITY AUDIT CARD (Redesigned) --- */}
            <div className="break-inside-avoid">
                <div className="bg-[#0f1115] border border-orange-500/30 border-l-4 border-l-orange-500 rounded-xl overflow-hidden shadow-lg relative">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Auditoria de Segurança</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {anomalies.length > 0 ? `${anomalies.length} irregularidades encontradas na análise automática.` : 'Monitoramento ativo. Nenhuma anomalia.'}
                                    </p>
                                </div>
                            </div>
                            {anomalies.length > 0 && (
                                <div className="px-4 py-1.5 rounded-full border border-orange-500/50 text-orange-500 text-xs font-bold uppercase tracking-wider bg-orange-500/5">
                                    Ação Requerida
                                </div>
                            )}
                        </div>

                        {/* Anomaly Row */}
                        {firstAnomaly && firstAnomalyTx ? (
                            <div className="bg-[#161b22] rounded-xl border border-slate-800 p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <AlertTriangle className="text-orange-500" size={20} />
                                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                                        <span className="font-bold text-white text-sm">
                                            {firstAnomaly.type === 'DUPLICATE' ? 'Duplicidade' : firstAnomaly.type === 'WEEKEND' ? 'Horário Atípico' : 'Valor Atípico'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
                                            {firstAnomalyTx.description} ({formatCurrency(firstAnomalyTx.amount)})
                                        </span>
                                        <span className="text-xs text-slate-500 hidden md:inline">
                                            {firstAnomaly.message} • {new Date(firstAnomalyTx.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleConfirmLegit(firstAnomaly)}
                                        className="px-6 py-2 bg-[#1a202c] hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                                        Validar
                                    </button>
                                    <button
                                        onClick={() => setSelectedAnomaly(firstAnomaly)}
                                        className="px-6 py-2 bg-[#1a202c] hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                                    >
                                        <Search size={16} />
                                        Investigar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#10B981]/10 p-4 rounded-xl flex items-center gap-3 text-[#10B981] border border-[#10B981]/20">
                                <CheckCircle2 size={20} />
                                <span className="font-medium text-sm">Tudo certo! Nenhuma anomalia detectada no período.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CHARTS GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Raio-X das Contas (UPDATED DESIGN) */}
                <div ref={xRayRef} className="lg:col-span-2 bg-[#151a23] rounded-[2rem] border border-slate-800 shadow-xl p-8">
                    <div className="flex flex-col md:flex-row justify-between md:items-start mb-10 gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight">Raio-X das Contas</h3>
                            <p className="text-sm text-slate-400 mt-1">Análise mensal de fluxo de caixa</p>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Entradas
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> Saídas
                            </div>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={accountFlowData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barGap={6}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    tick={<CustomAxisTick data={accountFlowData} />}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.5, radius: 12 }}
                                    content={<CustomXRayTooltip />}
                                />
                                <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} barSize={16} />
                                <Bar dataKey="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Insight Cards (Top Earner/Spender) */}
                <div className="space-y-6">
                    {/* Green Card */}
                    <div className="bg-white dark:bg-corporate-800 p-6 rounded-xl border border-corporate-200 dark:border-corporate-700 shadow-sm relative overflow-hidden h-[155px] flex flex-col justify-between">
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>

                        <div className="flex justify-between items-start relative z-10">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Maior Recebedor</p>
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
                                <Trophy size={18} />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <h4 className="font-bold text-corporate-900 dark:text-white text-lg leading-none mb-2">{topEarner?.name || 'N/A'}</h4>
                            <p className="text-3xl font-bold text-emerald-600 tracking-tight">{formatCurrency(topEarner?.income || 0)}</p>
                            <p className="text-[11px] text-corporate-500 mt-2 font-medium">Recebeu a maior parte das entradas este mês.</p>
                        </div>
                    </div>

                    {/* Red Card */}
                    <div className="bg-white dark:bg-corporate-800 p-6 rounded-xl border border-corporate-200 dark:border-corporate-700 shadow-sm relative overflow-hidden h-[155px] flex flex-col justify-between">
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none"></div>

                        <div className="flex justify-between items-start relative z-10">
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Maior Saída</p>
                            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center">
                                <AlertTriangle size={18} />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <h4 className="font-bold text-corporate-900 dark:text-white text-lg leading-none mb-2">{topSpender?.name || 'N/A'}</h4>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-rose-600 tracking-tight">{formatCurrency(topSpender?.expense || 0)}</p>
                                <span className="text-xs font-bold text-rose-600 bg-rose-600/10 px-1.5 py-0.5 rounded">({Math.round((topSpender?.expense || 0) / (totalExpenses || 1) * 100)}%)</span>
                            </div>
                            <p className="text-[11px] text-corporate-500 mt-2 font-medium">Atenção à concentração de gastos nesta conta.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LIQUIDITY SECTION --- */}
            <div className="break-inside-avoid">
                <h3 className="font-bold text-lg text-corporate-900 dark:text-white mb-4">Liquidez & Distribuição</h3>
                <div className="bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {liquidityData.map((acc, i) => (
                            <div key={acc.id} className="w-full">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: acc.barColor }}></div>
                                    <span className="text-xs font-bold text-corporate-500 uppercase">{acc.name}</span>
                                    {acc.isCredit && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-bold rounded">DÍVIDA</span>}
                                </div>
                                <div className="flex items-end justify-between mb-3">
                                    <span className={`text-xl font-bold tracking-tight ${acc.isCredit ? 'text-rose-500' : 'text-corporate-900 dark:text-white'}`}>{formatCurrency(acc.balance)}</span>
                                    <span className="text-xs font-bold text-corporate-400">{Math.round(acc.percent)}%</span>
                                </div>
                                <div className="h-2 w-full bg-corporate-100 dark:bg-corporate-900 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${acc.percent}%`, backgroundColor: acc.barColor }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- RETAINED: CATEGORY DRILL DOWN --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-before-page">
                <Card title="Detalhamento por Categoria (Interativo)" className="break-inside-avoid shadow-sm overflow-hidden">
                    <div ref={distributionRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80 bg-white dark:bg-corporate-800">
                        {/* Expense Donut */}
                        <div className="relative">
                            <p className="text-center text-xs font-bold text-corporate-400 mb-2 uppercase">Despesas</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" onClick={handlePieClick} cursor="pointer">
                                        {expenseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={selectedCategoryFilter === entry.id ? '#fff' : 'none'} strokeWidth={2} opacity={selectedCategoryFilter && selectedCategoryFilter !== entry.id ? 0.3 : 1} />))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Income Donut */}
                        <div className="relative">
                            <p className="text-center text-xs font-bold text-corporate-400 mb-2 uppercase">Receitas</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incomeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" onClick={handlePieClick} cursor="pointer">
                                        {incomeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={selectedCategoryFilter === entry.id ? '#fff' : 'none'} strokeWidth={2} opacity={selectedCategoryFilter && selectedCategoryFilter !== entry.id ? 0.3 : 1} />))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <p className="text-center text-xs text-corporate-400 mt-2 print:hidden">💡 Clique em uma fatia para filtrar a tabela abaixo.</p>
                </Card>

                {/* Enhanced Detail Table */}
                <div className="bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 overflow-hidden flex flex-col break-inside-avoid">
                    <div className="px-6 py-4 border-b border-corporate-100 dark:border-corporate-700 bg-corporate-50/50 dark:bg-corporate-800 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-corporate-800 dark:text-corporate-100 flex items-center gap-2">
                            {selectedCategoryFilter ? (<><Filter size={18} className="text-corporate-primary" /> Detalhamento: {categories.find(c => c.id === selectedCategoryFilter)?.name}</>) : 'Visão Geral'}
                        </h3>
                        {selectedCategoryFilter && (<button onClick={() => setSelectedCategoryFilter(null)} className="text-xs flex items-center gap-1 text-corporate-500 hover:text-corporate-800 dark:hover:text-white print:hidden"> <X size={14} /> Limpar Filtro </button>)}
                    </div>
                    <div className="overflow-y-auto max-h-[320px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-corporate-500 uppercase bg-corporate-50 dark:bg-corporate-700/50 sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-3">{selectedCategoryFilter ? 'Conta Origem' : 'Categoria'}</th>
                                    <th className="px-6 py-3">{selectedCategoryFilter ? 'Instituição' : 'Origem Principal'}</th>
                                    <th className="px-6 py-3 text-center">% do Total</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-corporate-100 dark:divide-corporate-700/50">
                                {tableData.map((item, idx) => {
                                    const Icon = getCategoryIcon(item.icon);
                                    return (
                                        <tr key={idx} className="bg-white dark:bg-corporate-800 hover:bg-corporate-50 dark:hover:bg-corporate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-corporate-900 dark:text-white flex items-center gap-3">
                                                {item.icon ? (<div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shadow-sm" style={{ backgroundColor: item.color }}><Icon size={16} /></div>) : (<div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: item.color }}>{item.badge}</div>)}
                                                <div><div className="font-semibold">{item.label}</div><div className="text-xs text-corporate-400 font-normal">{item.subLabel}</div></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.badge && !selectedCategoryFilter ? (<span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: item.badgeColor }}>{item.badge}</span>) : (<span className="text-corporate-500 text-xs">{item.subLabel}</span>)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2"><span className="text-xs font-medium text-corporate-600 dark:text-corporate-300 w-8 text-right">{Math.round(item.percent)}%</span><div className="w-16 bg-corporate-200 dark:bg-corporate-700 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-corporate-500 dark:bg-corporate-400 rounded-full" style={{ width: `${item.percent}%` }}></div></div></div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-corporate-800 dark:text-white">{formatCurrency(item.value)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {tableData.length === 0 && (<div className="p-8 text-center text-corporate-400 text-sm">Nenhum dado encontrado para o filtro atual.</div>)}
                    </div>
                </div>
            </div>

            {/* --- SECURITY REVIEW MODAL --- */}
            {selectedAnomaly && selectedAnomalyTx && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => setSelectedAnomaly(null)}
                    ></div>
                    <div className="relative bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-300">
                        {/* Forensic Header */}
                        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-mono font-bold text-slate-100 tracking-tight">
                                            Revisão de Segurança <span className="text-slate-500">#{selectedAnomaly.id.split('_')[1] || '9021'}</span>
                                        </h2>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-orange-900/50 text-orange-400 border border-orange-800">
                                            Risco {selectedAnomaly.severity === 'HIGH' ? 'Alto' : 'Médio'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 font-mono">
                                        Detectado em: {new Date().toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAnomaly(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Section A: Analysis (The Why) */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Fingerprint size={14} /> Análise Forense
                                </h3>
                                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-orange-500">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        <span className="font-bold text-orange-400">Motivo do Alerta:</span> {selectedAnomaly.message}
                                        {selectedAnomaly.type === 'OUTLIER' && " Este valor foge significativamente do padrão de gastos desta categoria nos últimos 90 dias."}
                                        {selectedAnomaly.type === 'DUPLICATE' && " Identificamos outra transação com metadados idênticos processada no mesmo ciclo."}
                                        {selectedAnomaly.type === 'WEEKEND' && " Movimentações corporativas em dias não úteis exigem justificativa adicional."}
                                    </p>
                                </div>
                            </div>

                            {/* Section B: Snapshot */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Search size={14} /> Dados da Transação
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-3 rounded border border-slate-800 flex items-center gap-3">
                                        <CalendarClock className="text-slate-600" size={18} />
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase">Data & Hora</p>
                                            <p className="text-sm text-slate-200 font-mono">{getDetailedDate(selectedAnomalyTx.date)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded border border-slate-800 flex items-center gap-3">
                                        <User className="text-slate-600" size={18} />
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase">Beneficiário / Descrição</p>
                                            <p className="text-sm text-slate-200 font-mono truncate max-w-[200px]">{selectedAnomalyTx.description}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded border border-slate-800 flex items-center gap-3">
                                        <Wallet className="text-slate-600" size={18} />
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase">Valor</p>
                                            <p className="text-sm text-emerald-400 font-mono font-bold">{formatCurrency(selectedAnomalyTx.amount)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded border border-slate-800 flex items-center gap-3">
                                        <ShieldCheck className="text-slate-600" size={18} />
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase">Categoria</p>
                                            <p className="text-sm text-slate-200 font-mono">
                                                {categories.find(c => c.id === selectedAnomalyTx.categoryId)?.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row gap-4 justify-end">
                            <button
                                onClick={() => handleConfirmLegit()}
                                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Validar como Legítimo
                            </button>
                            <button
                                onClick={handleReject}
                                className="px-6 py-3 rounded-lg bg-rose-900/50 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Ban size={18} />
                                Rejeitar / Estornar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};