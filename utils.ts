import {
  Briefcase, ShoppingBag, RefreshCw, TrendingUp,
  Home, Truck, Users, FileText, Car, Megaphone, Monitor, Paperclip,
  CircleDollarSign, FileSpreadsheet, Utensils, Zap, Building2, PieChart,
  Smartphone, Laptop, Wifi, Cloud, Heart, GraduationCap, Plane, Gift,
  Dumbbell, AlertTriangle, PiggyBank, CreditCard, Wrench, Tag, Star,
  Music, Coffee, ShoppingCart, Landmark, Anchor, Bike, Bus, Ticket,
  Hammer, Stethoscope, BookOpen, Lightbulb,
  Beer, Camera, Cake, Coins, Gamepad2, Ghost, Globe,
  Moon, Palette, PartyPopper, Rocket, Shield, Smile, Sun, Trophy,
  Wallet, Watch, Wine
} from 'lucide-react';
import React from 'react';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const formatMonthYear = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const parts = formatter.formatToParts(date);
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return {
    label: `${month} ${year}`, // "Janeiro 2026"
    month: month ? month.charAt(0).toUpperCase() + month.slice(1) : '',
    year
  };
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// --- ICON SYSTEM ---

// Master Map of available icons
export const CATEGORY_ICONS: { [key: string]: React.ElementType } = {
  // Essentials
  Home, Utensils, ShoppingBag, Car, Zap, ShoppingCart,

  // Business
  Briefcase, Building2, Users, FileText, PieChart, Landmark, Monitor, Megaphone, Paperclip, FileSpreadsheet,

  // Tech / Services
  Smartphone, Laptop, Wifi, Cloud, Lightbulb, Rocket, Globe,

  // Health / Life
  Heart, GraduationCap, Plane, Gift, Dumbbell, Stethoscope, BookOpen, Smile, Palette,

  // Leisure / Fun
  Beer, Wine, Coffee, Music, Gamepad2, PartyPopper, Cake, Trophy, Ticket,

  // Misc / Money
  AlertTriangle, PiggyBank, CreditCard, Wrench, Tag, Star, Hammer, Anchor, Bike, Bus,
  Coins, Wallet, Watch, Shield, Sun, Moon, Ghost, Camera,

  // Default / System
  RefreshCw, TrendingUp, CircleDollarSign
};

// Export keys for the UI Picker
export const AVAILABLE_ICONS = Object.keys(CATEGORY_ICONS).filter(k => k !== 'CircleDollarSign');

// Map Icon Keys to Components with Fallback
export const getCategoryIcon = (key?: string) => {
  return (key && CATEGORY_ICONS[key]) ? CATEGORY_ICONS[key] : CircleDollarSign;
};

export const isSameMonth = (d1: Date, d2: Date) => {
  return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
};

export const groupTransactionsByDate = (transactions: any[]) => {
  const groups: { [key: string]: any[] } = {};

  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);

    let key = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date);

    if (date.toDateString() === today.toDateString()) key = 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) key = 'Ontem';

    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  return groups;
};

// Helper to get Bank Abbreviation (e.g. Nubank -> NU)
export const getBankAbbreviation = (name: string) => {
  if (!name) return '??';
  const upper = name.toUpperCase();
  if (upper.includes('NUBANK')) return 'NU';
  if (upper.includes('BRASIL') || upper.includes('BB')) return 'BB';
  if (upper.includes('CAIXA') || upper.includes('CEF')) return 'CX';
  if (upper.includes('ITAU')) return 'IT';
  if (upper.includes('SANTANDER')) return 'ST';
  if (upper.includes('INTER')) return 'IN';
  if (upper.includes('DINHEIRO') || upper.includes('CASH')) return '$$';
  return name.substring(0, 2).toUpperCase();
};