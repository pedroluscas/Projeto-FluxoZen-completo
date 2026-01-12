import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Inputs';
import { Upload, Save, ShieldCheck, LogOut, Tags, Plus, Trash2, Edit2, X, CircleDollarSign, Check, Building2, ArrowRight, ArrowRightLeft } from 'lucide-react';
import { TransactionType, Category } from '../types';
import { AVAILABLE_ICONS, getCategoryIcon } from '../utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';

// Color Palette for Categories
const CATEGORY_COLORS = [
    '#10B981', // Emerald
    '#34D399', // Emerald Light
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#EA580C', // Orange
    '#CA8A04', // Yellow
    '#64748B', // Slate
    '#9CA3AF'  // Gray
];

export const Settings: React.FC = () => {
    const { companyName, setCompanyName, cnpj, setCnpj, logo, setLogo, logout, categories, addCategory, updateCategory, deleteCategory } = useFinancial();
    const { addToast } = useToast();

    // Company Settings State
    const [tempName, setTempName] = useState(companyName);
    const [tempCnpj, setTempCnpj] = useState(cnpj);
    const [tempLogo, setTempLogo] = useState<string | null>(logo);

    // Category Modal State
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [catName, setCatName] = useState('');
    const [catType, setCatType] = useState<TransactionType>('EXPENSE');
    const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
    const [catIcon, setCatIcon] = useState('Tag');

    useEffect(() => {
        setTempName(companyName);
        setTempCnpj(cnpj);
        setTempLogo(logo);
    }, [companyName, cnpj, logo]);

    // --- Company Handlers ---
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (e.g. 2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                addToast({ title: 'Arquivo muito grande', description: 'O logo deve ter no máximo 2MB.', type: 'error' });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setTempLogo(reader.result as string);
                addToast({ title: 'Imagem carregada', description: 'Clique em "Salvar Perfil" para confirmar.', type: 'info' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCompany = (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyName(tempName);
        setCnpj(tempCnpj);
        setLogo(tempLogo);
        addToast({
            title: 'Perfil Salvo',
            description: 'As informações da empresa foram atualizadas.',
            type: 'success'
        });
    };

    const handleLogout = () => {
        addToast({ title: 'Sessão', description: 'Encerrando sessão...', type: 'info' });
        setTimeout(() => {
            if (window.location.hash) window.location.hash = '';
            logout();
        }, 1000);
    };

    // --- Category Handlers ---
    const openCatModal = (cat?: Category) => {
        if (cat) {
            setEditingCatId(cat.id);
            setCatName(cat.name);
            setCatType(cat.type);
            setCatColor(cat.color || CATEGORY_COLORS[0]);
            setCatIcon(cat.iconKey || 'Tag');
        } else {
            setEditingCatId(null);
            setCatName('');
            setCatType('EXPENSE');
            setCatColor(CATEGORY_COLORS[0]);
            setCatIcon('Tag');
        }
        setIsCatModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catName.trim()) return;

        if (editingCatId) {
            await updateCategory({
                id: editingCatId,
                name: catName,
                type: catType,
                color: catColor,
                iconKey: catIcon
            });
            addToast({ title: 'Categoria Atualizada', type: 'success' });
        } else {
            await addCategory({
                name: catName,
                type: catType,
                color: catColor,
                iconKey: catIcon
            });
            addToast({ title: 'Categoria Criada', type: 'success' });
        }
        setIsCatModalOpen(false);
    };

    const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await deleteCategory(id);
        if (result.success) {
            addToast({ title: 'Categoria excluída', type: 'success' });
        } else {
            addToast({ title: 'Ação Bloqueada', description: result.message, type: 'error' });
        }
    };

    const expenseCats = categories.filter(c => c.type === 'EXPENSE');
    const incomeCats = categories.filter(c => c.type === 'INCOME');
    const PreviewIcon = getCategoryIcon(catIcon);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10 font-sans">
            <PageHeader
                title="Configurações"
                description="Gerencie o perfil da sua empresa e preferências do sistema."
            />

            {/* --- SECTION 1: PERFIL DA EMPRESA --- */}
            <div className="bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-corporate-100 dark:border-corporate-700 flex items-center gap-3">
                    <Building2 size={20} className="text-corporate-500" />
                    <h3 className="font-bold text-base text-corporate-900 dark:text-white">Perfil da Empresa</h3>
                </div>

                <div className="p-6 md:p-8">
                    <form onSubmit={handleSaveCompany}>
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Logo Upload Area */}
                            <div className="shrink-0">
                                <label className="w-40 h-40 bg-white dark:bg-corporate-900 border-2 border-dashed border-corporate-300 dark:border-corporate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-corporate-50 dark:hover:bg-corporate-800 transition-colors group relative overflow-hidden">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />

                                    {tempLogo ? (
                                        <>
                                            <img src={tempLogo} alt="Logo da Empresa" className="w-full h-full object-contain p-2" />
                                            {/* Overlay for Change Action */}
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload size={20} className="text-white mb-2" />
                                                <span className="text-xs text-white font-medium">Trocar Imagem</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-corporate-50 dark:bg-corporate-800 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <Upload size={20} className="text-corporate-400" />
                                            </div>
                                            <span className="text-xs text-corporate-500 font-medium">Alterar Logo</span>
                                        </>
                                    )}
                                </label>
                            </div>

                            {/* Form Inputs */}
                            <div className="flex-1 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-wider">Nome Fantasia</label>
                                    <input
                                        className="w-full bg-white dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-700 rounded-lg px-3 py-2.5 text-sm text-corporate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        placeholder="Ex: Minha Empresa"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-corporate-400 uppercase tracking-wider">CNPJ</label>
                                    <input
                                        className="w-full bg-white dark:bg-corporate-900 border border-corporate-200 dark:border-corporate-700 rounded-lg px-3 py-2.5 text-sm text-corporate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        value={tempCnpj}
                                        onChange={(e) => setTempCnpj(e.target.value)}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-4 border-t border-corporate-100 dark:border-corporate-700/50 flex justify-end">
                            <button
                                onClick={handleSaveCompany}
                                className="bg-[#6366F1] hover:bg-[#4f46e5] text-white font-bold py-2 px-6 rounded-lg shadow-sm shadow-indigo-500/20 flex items-center gap-2 text-sm transition-all"
                            >
                                <Save size={16} />
                                Salvar Perfil
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- SECTION 2: GERENCIAR CATEGORIAS --- */}
            <div className="bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-corporate-100 dark:border-corporate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Tags size={20} className="text-corporate-500" />
                        <h3 className="font-bold text-base text-corporate-900 dark:text-white">Gerenciar Categorias</h3>
                    </div>
                    <button
                        onClick={() => openCatModal()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-corporate-200 dark:border-corporate-600 text-xs font-bold text-corporate-600 dark:text-corporate-300 hover:bg-corporate-50 dark:hover:bg-corporate-700 transition-colors bg-white dark:bg-corporate-800"
                    >
                        <Plus size={14} />
                        Nova Categoria
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Column 1: Receitas */}
                    <div>
                        <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4">Receitas</h4>
                        <div className="space-y-3">
                            {incomeCats.map(cat => {
                                const Icon = getCategoryIcon(cat.iconKey);
                                return (
                                    <div
                                        key={cat.id}
                                        className="flex items-center justify-between group cursor-pointer"
                                        onClick={() => openCatModal(cat)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shadow-sm" style={{ backgroundColor: cat.color || '#10B981' }}>
                                                <Icon size={14} />
                                            </div>
                                            <span className="text-corporate-600 dark:text-corporate-300 text-sm group-hover:text-corporate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteCategory(cat.id, e)}
                                            className="text-corporate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Column 2: Despesas */}
                    <div>
                        <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-4">Despesas</h4>
                        <div className="space-y-3">
                            {expenseCats.map(cat => {
                                const Icon = getCategoryIcon(cat.iconKey);
                                return (
                                    <div
                                        key={cat.id}
                                        className="flex items-center justify-between group cursor-pointer"
                                        onClick={() => openCatModal(cat)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shadow-sm" style={{ backgroundColor: cat.color || '#F43F5E' }}>
                                                <Icon size={14} />
                                            </div>
                                            <span className="text-corporate-600 dark:text-corporate-300 text-sm group-hover:text-corporate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteCategory(cat.id, e)}
                                            className="text-corporate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: PLANO ENTERPRISE --- */}
            <div className="bg-[#1e1b4b] rounded-xl shadow-lg border border-indigo-900/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                        <ShieldCheck size={24} className="text-indigo-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg mb-0.5">Plano Enterprise</h3>
                        <p className="text-indigo-200 text-sm max-w-md leading-relaxed">Sua assinatura está ativa e inclui recursos de Business Intelligence e Whitelabel.</p>
                    </div>
                </div>

                <button className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors relative z-10 shrink-0">
                    Gerenciar Assinatura <ArrowRight size={14} />
                </button>
            </div>

            {/* --- SECTION 4: SESSÃO --- */}
            <div className="bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-corporate-100 dark:border-corporate-700 flex items-center gap-3">
                    <ArrowRightLeft size={20} className="text-corporate-500" />
                    <h3 className="font-bold text-base text-corporate-900 dark:text-white">Sessão</h3>
                </div>

                <div className="p-6 md:p-8">
                    <p className="text-corporate-500 dark:text-corporate-400 text-sm mb-6">
                        Deseja sair do sistema? Ao encerrar a sessão, você será redirecionado para a tela de login.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="bg-[#DC2626] hover:bg-[#b91c1c] text-white font-bold py-2.5 px-6 rounded-lg shadow-sm shadow-red-900/20 flex items-center gap-2 text-sm transition-all"
                    >
                        <LogOut size={16} />
                        Sair da Conta
                    </button>
                </div>
            </div>

            <Modal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                title={editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                maxWidth="max-w-sm"
            >
                <form onSubmit={handleSaveCategory} className="p-6 space-y-5">
                    <Input
                        label="Nome da Categoria"
                        placeholder="Ex: Marketing, Viagens..."
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        autoFocus
                    />

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-corporate-500 dark:text-corporate-400">Tipo</label>
                        <div className="flex bg-corporate-100 dark:bg-corporate-800 p-1 rounded-lg">
                            <button
                                type="button"
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${catType === 'INCOME' ? 'bg-emerald-500 text-white shadow-sm' : 'text-corporate-500 hover:text-corporate-800 dark:text-corporate-400'}`}
                                onClick={() => setCatType('INCOME')}
                            >
                                Receita
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${catType === 'EXPENSE' ? 'bg-rose-500 text-white shadow-sm' : 'text-corporate-500 hover:text-corporate-800 dark:text-corporate-400'}`}
                                onClick={() => setCatType('EXPENSE')}
                            >
                                Despesa
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-corporate-500 dark:text-corporate-400">Cor</label>
                        <div className="grid grid-cols-6 gap-2">
                            {CATEGORY_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setCatColor(color)}
                                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${catColor === color ? 'ring-2 ring-offset-2 ring-corporate-400 dark:ring-offset-corporate-900' : ''}`}
                                    style={{ backgroundColor: color }}
                                >
                                    {catColor === color && <Check size={14} className="text-white/80" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-corporate-500 dark:text-corporate-400">Ícone da Categoria</label>
                        <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                            {AVAILABLE_ICONS.map(key => {
                                const Icon = getCategoryIcon(key);
                                const isSelected = catIcon === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setCatIcon(key)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'text-white shadow-sm scale-105' : 'text-corporate-400 hover:bg-corporate-100 dark:hover:bg-corporate-800 hover:text-corporate-900 dark:hover:text-white'}`}
                                        style={{ backgroundColor: isSelected ? catColor : 'transparent' }}
                                    >
                                        <Icon size={18} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-corporate-50 dark:bg-corporate-800/50 p-4 rounded-lg flex items-center justify-center gap-3">
                        <span className="text-xs text-corporate-400 uppercase font-medium">Preview:</span>
                        <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-2" style={{ backgroundColor: catColor }}>
                            <PreviewIcon size={14} />
                            {catName || 'Nome da Categoria'}
                        </div>
                    </div>

                    <Button type="submit" className="w-full">Salvar</Button>
                </form>
            </Modal>
        </div>
    );
};