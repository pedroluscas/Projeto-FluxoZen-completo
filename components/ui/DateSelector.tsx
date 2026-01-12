import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateSelectorProps {
    date: Date;
    label: string;
    onPrev: () => void;
    onNext: () => void;
    variant?: 'header' | 'default';
}

export const DateSelector: React.FC<DateSelectorProps> = ({
    date,
    label,
    onPrev,
    onNext,
    variant = 'default'
}) => {
    if (variant === 'header') {
        return (
            <div className="flex items-center bg-corporate-100 dark:bg-[#1e293b] rounded-lg p-1 border border-corporate-200 dark:border-corporate-700">
                <button onClick={onPrev} className="p-1 hover:bg-white dark:hover:bg-corporate-700 rounded-md shadow-sm transition-all text-corporate-600 dark:text-corporate-300">
                    <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center text-sm font-bold text-corporate-700 dark:text-corporate-200 select-none">
                    <Calendar size={14} className="opacity-70" />
                    <span>{label}</span>
                </div>
                <button onClick={onNext} className="p-1 hover:bg-white dark:hover:bg-corporate-700 rounded-md shadow-sm transition-all text-corporate-600 dark:text-corporate-300">
                    <ChevronRight size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-corporate-900 border-b border-corporate-200 dark:border-corporate-800 py-2 px-4 flex justify-center items-center print:hidden">
            <button onClick={onPrev} className="p-2 text-corporate-500">
                <ChevronLeft size={20} />
            </button>
            <span className="mx-4 font-semibold text-corporate-800 dark:text-white">{label}</span>
            <button onClick={onNext} className="p-2 text-corporate-500">
                <ChevronRight size={20} />
            </button>
        </div>
    );
};
