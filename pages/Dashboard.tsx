import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, isSameMonth, groupTransactionsByDate, getCategoryIcon, getBankAbbreviation } from '../utils';
import {
    Wallet, TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Search,
    Sparkles, AlertTriangle, Send, Bot, Zap, X, CalendarClock, PiggyBank, Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

import { PageHeader } from '../components/ui/PageHeader';
import { TransactionItem } from '../components/TransactionItem';
import { StatCard } from '../components/ui/Card';

// --- Types ---
interface AiMessage {
    id: string;
    type: 'user' | 'bot';
    text: string;
}

interface InsightCard {
    id: string;
    icon: React.ElementType;
    variant: 'warning' | 'success' | 'info';
    title: string;
    text: string;
}

export const Dashboard: React.FC = () => {
    const {
        totalBalance, monthlyIncome, monthlyExpense, fixedCostProjection,
        filteredTransactions, transactions, selectedDate,
        categories, accounts
    } = useFinancial();

    // --- Financial Indicators ---
    const netResult = monthlyIncome - monthlyExpense;

    // --- New Logic: Real-Time Financial Health (Revenue Based) ---

    // 1. Expense Ratio: How much of the revenue is consumed by expenses?
    // Formula: (Expense / Income) * 100
    const expenseRatio = monthlyIncome > 0
        ? (monthlyExpense / monthlyIncome) * 100
        : (monthlyExpense > 0 ? 100 : 0);

    // 2. Net Margin: What is the actual profit margin?
    // Formula: (Net Result / Income) * 100
    const profitMargin = monthlyIncome > 0
        ? (netResult / monthlyIncome) * 100
        : 0;

    // Visual Helper for Expense Ratio Color
    const getExpenseColor = (ratio: number) => {
        // Always Red (Rose) to represent Expense Category context
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    };

    // --- Safe Balance & Forecast Logic ---
    const today = new Date();
    const upcomingBills = useMemo(() => {
        // Filter expenses that are AFTER today in the current month
        return filteredTransactions.filter(t => {
            if (t.type !== 'EXPENSE') return false;
            const tDate = new Date(t.date);
            // Only show bills strictly in the future for "Safe Balance" calculation context
            return tDate.getTime() > today.getTime();
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredTransactions]);

    const pendingExpensesAmount = upcomingBills.reduce((sum, t) => sum + t.amount, 0);
    const safeBalance = totalBalance - pendingExpensesAmount;

    const runwayMonths = fixedCostProjection > 0
        ? Math.floor(totalBalance / fixedCostProjection)
        : 0;

    // --- 1. Real Data Logic for Insights ---
    const dynamicInsights = useMemo<InsightCard[]>(() => {
        const insights: InsightCard[] = [];

        // Insight A: Cash Flow Health
        if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
            const diff = monthlyExpense - monthlyIncome;
            insights.push({
                id: 'health',
                icon: AlertTriangle,
                variant: 'warning',
                title: 'Alerta de Caixa',
                text: `Despesas superam receitas em ${formatCurrency(diff)}. Atenção ao capital de giro.`
            });
        } else if (monthlyIncome > 0) {
            insights.push({
                id: 'health',
                icon: TrendingUp,
                variant: 'success',
                title: 'Fluxo Positivo',
                text: `Receitas superam despesas. Ótimo momento para alocar reservas.`
            });
        }

        // Insight B: Top Expense Category
        if (monthlyExpense > 0) {
            const catMap: Record<string, number> = {};
            filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
                catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
            });

            const topCatId = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];
            if (topCatId) {
                const catName = categories.find(c => c.id === topCatId)?.name || 'Geral';
                const catVal = catMap[topCatId];
                const percent = Math.round((catVal / monthlyExpense) * 100);

                insights.push({
                    id: 'top_spend',
                    icon: TrendingDown,
                    variant: 'info',
                    title: 'Maior Gasto',
                    text: `'${catName}' representa ${percent}% das saídas (${formatCurrency(catVal)}).`
                });
            }
        }

        if (insights.length === 0) {
            insights.push({
                id: 'empty',
                icon: Sparkles,
                variant: 'info',
                title: 'Monitoramento Ativo',
                text: 'O sistema está analisando suas transações em tempo real.'
            });
        }

        return insights;
    }, [monthlyIncome, monthlyExpense, filteredTransactions, categories]);


    // --- 2. Chat Logic ---
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [chatMode, setChatMode] = useState(false);
    const [chatHistory, setChatHistory] = useState<AiMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMode && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, chatMode]);

    const handleAiSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const query = aiQuery.trim().toLowerCase();
        if (!query) return;

        if (!chatMode) setChatMode(true);
        setChatHistory(prev => [...prev, { id: Date.now().toString(), type: 'user', text: aiQuery }]);
        setAiQuery('');
        setIsAiLoading(true);

        // --- ZenAI Intelligence Engine (Rule-based local analysis) ---
        setTimeout(() => {
            let response = "";

            if (query.includes("saldo") || query.includes("quanto tenho") || query.includes("dinheiro")) {
                response = `Seu saldo total acumulado em todas as contas é de ${formatCurrency(totalBalance)}.`;
                if (safeBalance < totalBalance) {
                    response += ` Considerando seus compromissos futuros, seu saldo livre (seguro) é de ${formatCurrency(safeBalance)}.`;
                }
            }
            else if (query.includes("ganh") || query.includes("receit") || query.includes("faturamento") || query.includes("entrei")) {
                response = `Neste mês, você teve uma entrada total de ${formatCurrency(monthlyIncome)}.`;
            }
            else if (query.includes("gast") || query.includes("despes") || query.includes("saíd") || query.includes("paguei")) {
                response = `Suas despesas totais este mês somam ${formatCurrency(monthlyExpense)}.`;
                if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
                    response += " Atenção: suas despesas estão superando suas receitas no momento.";
                }
            }
            else if (query.includes("saúde") || query.includes("saude") || query.includes("como estou") || query.includes("estável") || query.includes("análise")) {
                if (netResult > 0) {
                    response = `Sua saúde financeira está positiva! Você tem um lucro operacional de ${formatCurrency(netResult)} (${profitMargin.toFixed(1)}% de margem).`;
                } else if (netResult < 0) {
                    response = `Sua saúde financeira requer atenção. Você está com um déficit de ${formatCurrency(Math.abs(netResult))} este mês.`;
                } else {
                    response = "Seus dados estão equilibrados, mas você ainda não possui movimentações expressivas para uma análise profunda.";
                }
            }
            else if (query.includes("categoria") || query.includes("onde") || query.includes("maior")) {
                const catMap: Record<string, number> = {};
                filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
                    catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
                });
                const topCatId = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];

                if (topCatId) {
                    const catName = categories.find(c => c.id === topCatId)?.name || 'Geral';
                    response = `Sua maior fonte de gastos é '${catName}', com um total de ${formatCurrency(catMap[topCatId])}.`;
                } else {
                    response = "Não identifiquei gastos categorizados o suficiente para essa análise.";
                }
            }
            else if (query.includes("vencimento") || query.includes("vencer") || query.includes("pagar") || query.includes("boleto") || query.includes("próximo") || query.includes("proximo") || query.includes("conta")) {
                if (upcomingBills.length > 0) {
                    const nextBill = upcomingBills[0];
                    const billDate = new Date(nextBill.date).toLocaleDateString('pt-BR');
                    response = `Seu próximo vencimento é '${nextBill.description}', no valor de ${formatCurrency(nextBill.amount)}, para o dia ${billDate}.`;
                    if (upcomingBills.length > 1) {
                        response += ` Além desta, você tem mais ${upcomingBills.length - 1} contas previstas para este mês.`;
                    }
                } else {
                    response = "Você não possui contas ou vencimentos pendentes para os próximos dias do mês atual.";
                }
            }
            else {
                response = "Olá! Consigo analisar seu saldo, receitas, despesas, categorias e vencimentos. O que exatamente você gostaria de saber sobre suas finanças?";
            }

            setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'bot', text: response }]);
            setIsAiLoading(false);
        }, 1200);
    };

    const closeChat = () => {
        setChatMode(false);
        setChatHistory([]);
    };

    // --- 3. Chart Data ---
    const chartData = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const data = [];
        let incAcc = 0;
        let expAcc = 0;
        const targetInc = monthlyIncome;
        const targetExp = monthlyExpense;

        for (let day = 1; day <= daysInMonth; day += 2) {
            const progress = day / daysInMonth;

            // Only add noise/steps if there is actual data to distribute
            const incStep = targetInc > 0 ? (targetInc / (daysInMonth / 2)) * (0.5 + Math.random()) : 0;
            const expStep = targetExp > 0 ? (targetExp / (daysInMonth / 2)) * (Math.random() * (progress > 0.7 ? 2 : 1)) : 0;

            incAcc = targetInc > 0 ? Math.min(incAcc + incStep, targetInc) : 0;
            expAcc = targetExp > 0 ? Math.min(expAcc + expStep, targetExp) : 0;

            data.push({
                day,
                label: day === 1 ? 'inicio' : (day >= daysInMonth - 1 ? 'hoje' : day.toString()),
                income: incAcc,
                expense: expAcc
            });
        }
        return data;
    }, [selectedDate, monthlyIncome, monthlyExpense]);

    const groupedTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return groupTransactionsByDate(sorted);
    }, [filteredTransactions]);

    return (
        <div className="space-y-8 pb-10">
            <PageHeader
                title="Visão Geral"
                description="Acompanhe seu fluxo de caixa e insights inteligentes."
                action={
                    <Link
                        to="/transactions?new=true"
                        className="hidden md:flex items-center text-sm font-medium text-corporate-primary hover:text-indigo-400 transition-colors"
                    >
                        Nova Transação <ArrowRight size={16} className="ml-1" />
                    </Link>
                }
            />

            {/* --- CARDS ROW (Updated Logic) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                {/* CARD 1: Saldo Total */}
                <div className="bg-[#151a23] p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-400">Saldo Total</p>
                            <div className="p-2 bg-slate-800 rounded-lg text-slate-400 border border-slate-700">
                                <Wallet size={20} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-white tracking-tight mb-2">{formatCurrency(totalBalance)}</h3>

                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#312e81]/50 border border-indigo-500/30">
                                <PiggyBank size={12} className="text-indigo-400" />
                                <span className="text-xs font-medium text-slate-300">Livre: <span className="text-indigo-200 font-bold">{formatCurrency(safeBalance)}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: Receitas */}
                <div className="bg-[#151a23] p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-400">Receitas</p>
                            <div className="p-2 bg-[#064e3b]/40 rounded-lg text-emerald-500 border border-emerald-900/50">
                                <ArrowUpRight size={20} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-emerald-500 tracking-tight mb-3">{formatCurrency(monthlyIncome)}</h3>

                            {/* Green Line Going UP */}
                            <div className="flex items-end justify-between">
                                <div className="h-8 w-32 flex items-end">
                                    <svg viewBox="0 0 100 40" className="w-full h-full stroke-emerald-500 fill-none stroke-[3]" preserveAspectRatio="none">
                                        <path d="M0 35 L 20 35 L 40 25 L 60 25 L 100 5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 3: Despesas (Updated Logic: Ratio of Income) */}
                <div className="bg-[#151a23] p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-400">Despesas</p>
                            <div className="p-2 bg-[#881337]/30 rounded-lg text-rose-500 border border-rose-900/50">
                                <ArrowDownRight size={20} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-rose-500 tracking-tight mb-3">{formatCurrency(monthlyExpense)}</h3>

                            <div className="flex items-end justify-between">
                                {/* Red Line Trend */}
                                <div className="h-8 w-24 flex items-end">
                                    <svg viewBox="0 0 100 40" className="w-full h-full stroke-rose-500 fill-none stroke-[3]" preserveAspectRatio="none">
                                        <path d="M0 5 Q 30 5 40 20 T 100 35" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 4: Resultado / Lucro (Updated Logic: Net Margin) */}
                <div className="bg-[#151a23] p-6 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-400">Resultado / Lucro</p>
                            <div className={`p-2 rounded-lg border transition-colors ${netResult >= 0 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' : 'bg-rose-900/30 text-rose-400 border-rose-900/50'}`}>
                                {netResult >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                        </div>
                        <div>
                            <h3 className={`text-3xl font-bold tracking-tight mb-3 ${netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {netResult > 0 ? '+' : ''}{formatCurrency(netResult)}
                            </h3>

                            <div className="flex items-end justify-between h-8">
                                <p className={`text-xs font-medium mr-2 self-center ${netResult >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                    {netResult >= 0 ? 'Operação saudável' : 'Atenção necessária'}
                                </p>

                                {/* Profit Margin Badge */}
                                <div className="flex flex-col items-end">
                                    <div className={`px-2 py-0.5 rounded-full border text-xs font-bold ${netResult >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                        {profitMargin.toFixed(1)}%
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">margem líq.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid (3 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Col: ZenAI Insights (25% width) */}
                <div className="lg:col-span-3 flex flex-col h-[520px] bg-[#151a23] dark:bg-[#151a23] rounded-xl border border-slate-800 shadow-lg overflow-hidden relative">
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#151a23]">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-500 fill-indigo-500/20" />
                            <h3 className="font-bold text-lg text-indigo-400">ZenAI</h3>
                        </div>
                        {chatMode ? (
                            <button onClick={closeChat} className="p-1 hover:bg-slate-800 rounded-full text-slate-400"><X size={16} /></button>
                        ) : (
                            <div className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1e1b4b] text-indigo-300 border border-indigo-900/50">ONLINE</div>
                        )}
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#11141c]">
                        {!chatMode && (
                            <div className="space-y-4">
                                {dynamicInsights.map((card) => {
                                    const Icon = card.icon;
                                    let containerClass = "bg-[#1e293b] border-slate-700";
                                    let iconBoxClass = "bg-slate-800 text-slate-300";
                                    let titleClass = "text-slate-300";
                                    if (card.variant === 'warning') { containerClass = "bg-[#451a03]/20 border-amber-900/50"; iconBoxClass = "bg-amber-900/30 text-amber-500"; titleClass = "text-amber-500"; }
                                    else if (card.variant === 'info') { containerClass = "bg-[#172554]/20 border-blue-900/50"; iconBoxClass = "bg-blue-900/30 text-blue-400"; titleClass = "text-blue-400"; }

                                    return (
                                        <div key={card.id} className={`p-4 rounded-xl border ${containerClass} transition-all hover:brightness-110`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg shrink-0 ${iconBoxClass}`}><Icon size={16} /></div>
                                                <div>
                                                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${titleClass}`}>{card.title}</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-medium">{card.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Chat UI ... */}
                        {chatMode && (
                            <div className="space-y-4">
                                <div className="flex justify-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Bot size={16} className="text-white" /></div>
                                    <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-none text-sm max-w-[90%] border border-slate-700">Olá! Analisei suas finanças. O que gostaria de saber?</div>
                                </div>
                                {chatHistory.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                                        <div className={`px-4 py-3 rounded-2xl text-sm max-w-[90%] ${msg.type === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>{msg.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Footer Input ... */}
                    <div className="p-4 bg-[#151a23] border-t border-slate-800">
                        <form onSubmit={handleAiSubmit} className="relative">
                            <input type="text" placeholder="Pergunte..." className="w-full pl-4 pr-10 py-3 rounded-lg bg-[#0b0e14] border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 transition-all" value={aiQuery} onChange={e => setAiQuery(e.target.value)} disabled={isAiLoading} />
                            <button type="submit" disabled={!aiQuery.trim() || isAiLoading} className="absolute right-2 top-2 p-1.5 text-indigo-500 hover:text-white transition-colors"><Send size={16} /></button>
                        </form>
                        <div className="mt-4 flex items-center justify-between text-xs px-1">
                            <div className="flex items-center gap-1.5 text-slate-500"><Wallet size={12} /><span>Reserva</span></div>
                            <span className={`font-bold ${runwayMonths < 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{runwayMonths} meses de caixa</span>
                        </div>
                    </div>
                </div>

                {/* Middle Col: Upcoming Bills (Forecast) (35% width approx) */}
                <div className="lg:col-span-4 flex flex-col h-[520px] bg-[#151a23] dark:bg-[#151a23] rounded-xl border border-slate-800 shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#151a23]">
                        <div className="flex items-center gap-2">
                            <CalendarClock size={18} className="text-rose-500" />
                            <h3 className="font-bold text-lg text-white">Próximos Vencimentos</h3>
                        </div>
                        <div className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            Total: {formatCurrency(pendingExpensesAmount)}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 bg-[#11141c] custom-scrollbar">
                        {upcomingBills.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                <PiggyBank size={48} className="text-slate-600 mb-4" />
                                <p className="text-slate-400 font-medium">Nenhuma conta prevista</p>
                                <p className="text-xs text-slate-600">Você está livre de despesas pelos próximos dias.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {upcomingBills.map(bill => {
                                    const billDate = new Date(bill.date);
                                    const isToday = billDate.getDate() === today.getDate();
                                    const dayNum = billDate.getDate();
                                    const monthShort = billDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

                                    return (
                                        <div key={bill.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800">
                                            {/* Date Box */}
                                            <div className={`
                                        flex flex-col items-center justify-center w-12 h-12 rounded-lg border 
                                        ${isToday ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-400'}
                                    `}>
                                                <span className="text-xs font-bold uppercase">{monthShort}</span>
                                                <span className="text-lg font-bold leading-none">{dayNum}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-200 truncate">{bill.description}</p>
                                                    {isToday && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {bill.isRecurring && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Fixa</span>
                                                    )}
                                                    {bill.installments && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            {bill.installments.current}/{bill.installments.total}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500 truncate">
                                                        {accounts.find(a => a.id === bill.accountId)?.name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right">
                                                <p className="font-bold text-rose-500">{formatCurrency(bill.amount)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Chart (Remaining width) */}
                <div className="lg:col-span-5 bg-[#151a23] dark:bg-[#151a23] rounded-xl border border-slate-800 shadow-lg p-6 h-[520px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-lg text-white">Fluxo de Caixa</h3>
                        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-2 text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>DESPESAS</div>
                            <div className="flex items-center gap-2 text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>RECEITAS</div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" dy={10} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} itemStyle={{ fontSize: '12px', fontWeight: 600 }} formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : 'Despesa']} />
                                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={3} fill="url(#colorExpense)" name="expense" activeDot={{ r: 6, strokeWidth: 0, fill: '#F43F5E' }} />
                                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fill="url(#colorIncome)" name="income" activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Transaction List Section - Light/Dark Hybrid */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-xl text-corporate-900 dark:text-white mb-6">
                    Transações de {selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>

                <div className="bg-white dark:bg-[#151a23] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <Search size={24} />
                            </div>
                            <p className="text-slate-500 font-medium">Nenhuma transação encontrada</p>
                        </div>
                    ) : (
                        Object.keys(groupedTransactions).map(dateKey => (
                            <div key={dateKey} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                                <div className="bg-slate-50 dark:bg-[#11141c] px-6 py-2 border-b border-slate-100 dark:border-slate-800/50">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateKey}</p>
                                </div>
                                <div>
                                    {groupedTransactions[dateKey].map(t => (
                                        <TransactionItem
                                            key={t.id}
                                            transaction={t}
                                            category={categories.find(c => c.id === t.categoryId)}
                                            account={accounts.find(a => a.id === t.accountId)}
                                            variant="compact"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};