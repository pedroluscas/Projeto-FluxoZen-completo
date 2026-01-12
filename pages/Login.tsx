import React, { useState } from 'react';
import { Input } from '../components/ui/Inputs';
import { Button } from '../components/ui/Button';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Building2, LineChart, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabase';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { addToast } = useToast();

    const handleGoogleLogin = async () => {
        setIsLoadingGoogle(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            addToast({ title: 'Erro na Autenticação', description: error.message, type: 'error' });
            setIsLoadingGoogle(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            addToast({ title: 'Atenção', description: 'Preencha todos os campos.', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                addToast({ title: 'Bem-vindo de volta!', description: 'Acesso liberado ao painel.', type: 'success' });
                onLogin();
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;

                addToast({
                    title: 'Verifique seu e-mail',
                    description: 'Enviamos um link de confirmação para sua conta.',
                    type: 'info'
                });
                setIsLogin(true);
            }
        } catch (error: any) {
            addToast({ title: 'Erro', description: error.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const isGlobalLoading = isLoading || isLoadingGoogle;

    return (
        <div className="min-h-screen flex font-sans">

            {/* --- LEFT SIDE: BRAND EXPERIENCE --- */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-16 bg-[#04091a] overflow-hidden">
                {/* Background Ambient Effects */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px]"></div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full justify-center max-w-xl mx-auto w-full">

                    {/* Headline */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
                            O Comando Financeiro <br />da Sua Empresa.
                        </h1>
                        <p className="text-lg text-slate-400 font-normal">
                            Inteligência, controle e segurança em um só lugar.
                        </p>
                    </div>

                    {/* Feature Cards */}
                    <div className="space-y-4">

                        {/* Card 1 */}
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0f1424] border border-slate-800/60 hover:border-emerald-500/30 transition-all duration-300">
                            <div className="shrink-0 p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <LineChart size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Visão Total do Fluxo</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Centralize contas bancárias e cartões. Saiba exatamente para onde cada centavo está indo em tempo real.
                                </p>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0f1424] border border-slate-800/60 hover:border-indigo-500/30 transition-all duration-300">
                            <div className="shrink-0 p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <BrainCircuit size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Inteligência para Negócios</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Relatórios automáticos de DRE, separação de custos fixos e análise de liquidez por conta.
                                </p>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0f1424] border border-slate-800/60 hover:border-blue-500/30 transition-all duration-300">
                            <div className="shrink-0 p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <ShieldCheck size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Segurança e Suporte 24h</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Seus dados protegidos com nível bancário. Nossa equipe de especialistas está disponível a qualquer hora.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span>FluxoZen © 2026.</span>
                    <span className="flex items-center gap-1.5 text-emerald-500">
                        <Lock size={12} />
                        SSL Secured & Encrypted
                    </span>
                </div>
            </div>

            {/* --- RIGHT SIDE: LOGIN FORM --- */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#090a0c]">
                <div className="w-full max-w-[400px] space-y-8 animate-in slide-in-from-right-8 duration-500">

                    {/* Logo & Header */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Zap size={18} className="text-white fill-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">FluxoZen</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Gerencie o fluxo de caixa da sua empresa com inteligência.
                        </p>
                    </div>

                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isGlobalLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#111316] border border-slate-800 rounded-xl text-slate-200 hover:bg-[#1a1d21] hover:border-slate-600 transition-all text-sm font-bold disabled:opacity-50"
                    >
                        {isLoadingGoogle ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
                                Entrar com Google
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink-0 mx-4 text-xs text-slate-500">Ou continue com e-mail</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">E-mail Corporativo</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    placeholder="seu.nome@empresa.com"
                                    className="w-full bg-[#111316] border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isGlobalLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full bg-[#111316] border border-slate-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isGlobalLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex justify-end">
                                <a href="#" className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
                                    Esqueceu a senha?
                                </a>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isGlobalLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold h-11 rounded-lg shadow-lg shadow-emerald-900/20 border-0 transition-all"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Entrando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{isLogin ? 'Entrar no Sistema' : 'Criar Conta'}</span>
                                    <ArrowRight size={18} />
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Footer Toggle */}
                    <div className="text-center pt-2">
                        <p className="text-slate-400 text-sm">
                            {isLogin ? 'Não tem conta?' : 'Já possui cadastro?'} {' '}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                disabled={isGlobalLoading}
                                className="font-bold text-white hover:text-emerald-400 transition-colors"
                            >
                                {isLogin ? 'Cadastre-se' : 'Fazer Login'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
