import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, ArrowRightLeft, PieChart, Sun, Moon, User, Menu, X, ChevronLeft, ChevronRight, Calendar, Settings, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useFinancial } from '../context/FinancialContext';
import { formatMonthYear } from '../utils';
import { DateSelector } from './ui/DateSelector';

// Updated NavItem to support the "Active Button" look
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
        ${isActive
          ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20'
          : 'text-corporate-600 dark:text-corporate-400 hover:bg-corporate-100 dark:hover:bg-corporate-800 hover:text-corporate-900 dark:hover:text-white'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { selectedDate, nextMonth, prevMonth, companyName, logo, userName, userEmail } = useFinancial();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const dateLabel = formatMonthYear(selectedDate);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-corporate-50 dark:bg-corporate-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-corporate-200 dark:border-corporate-800 print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* LEFT CLUSTER: LOGO + DATE */}
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Zap size={18} className="text-white fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-corporate-900 dark:text-white hidden lg:block truncate max-w-[200px]">
                FluxoZen
              </span>
            </div>

            {/* Date Selector */}
            <div className="hidden md:flex">
              <DateSelector
                date={selectedDate}
                label={`${dateLabel.month} ${dateLabel.year}`}
                onPrev={prevMonth}
                onNext={nextMonth}
                variant="header"
              />
            </div>
          </div>

          {/* CENTER CLUSTER: NAVIGATION */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavItem to="/transactions" icon={<ArrowRightLeft size={18} />} label="Transações" />
            <NavItem to="/accounts" icon={<Wallet size={18} />} label="Contas" />
            <NavItem to="/reports" icon={<PieChart size={18} />} label="Relatórios" />
          </nav>

          {/* RIGHT CLUSTER: ACTIONS */}
          <div className="flex items-center gap-3">
            {/* Settings (Moved to Right) */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `p-2 rounded-full transition-colors flex items-center justify-center
                    ${isActive
                  ? 'text-[#6366F1] bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/30'
                  : 'text-corporate-500 hover:text-corporate-900 dark:text-corporate-400 dark:hover:text-white hover:bg-corporate-100 dark:hover:bg-corporate-800'
                }`
              }
              title="Configurações"
            >
              <Settings size={20} />
            </NavLink>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-corporate-500 hover:text-corporate-900 dark:text-corporate-400 dark:hover:text-white hover:bg-corporate-100 dark:hover:bg-corporate-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="w-px h-6 bg-corporate-200 dark:bg-corporate-700 mx-1 hidden sm:block"></div>

            {/* Profile */}
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-corporate-50 dark:hover:bg-corporate-800/50 transition-all cursor-pointer group" title={companyName}>
              <div className="w-9 h-9 rounded-full bg-corporate-100 dark:bg-corporate-800 border-2 border-white dark:border-corporate-700 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                {logo ? (
                  <img src={logo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-corporate-400 dark:text-corporate-500" />
                )}
              </div>
              <div className="hidden lg:flex flex-col items-start leading-none pr-1">
                <span className="text-xs font-bold text-corporate-900 dark:text-white mb-0.5 group-hover:text-indigo-500 transition-colors">{companyName}</span>
                <span className="text-[10px] text-corporate-500 dark:text-corporate-400 max-w-[120px] truncate">{userEmail}</span>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-corporate-600 dark:text-corporate-400 ml-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Date Selector (Only visible on small screens) */}
      <div className="md:hidden">
        <DateSelector
          date={selectedDate}
          label={`${dateLabel.month} ${dateLabel.year}`}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-corporate-900 border-b border-corporate-200 dark:border-corporate-800 px-4 py-4 space-y-2 print:hidden shadow-xl">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem to="/transactions" icon={<ArrowRightLeft size={18} />} label="Transações" />
          <NavItem to="/accounts" icon={<Wallet size={18} />} label="Contas" />
          <NavItem to="/reports" icon={<PieChart size={18} />} label="Relatórios" />
          <NavItem to="/settings" icon={<Settings size={18} />} label="Configurações" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl animate-in fade-in duration-500">
        {/* Print Header for reports */}
        <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold text-black">{companyName}</h1>
          <p className="text-sm text-gray-600">Relatório Financeiro: {dateLabel.month} {dateLabel.year}</p>
        </div>
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-corporate-400 dark:text-corporate-600 print:hidden">
        <p>&copy; {new Date().getFullYear()} {companyName}. Gestão Corporativa.</p>
      </footer>
    </div>
  );
};