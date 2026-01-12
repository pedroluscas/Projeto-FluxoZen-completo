import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const baseInputStyles = "w-full rounded-lg border border-corporate-300 dark:border-corporate-700 bg-white dark:bg-corporate-900/50 py-2.5 text-sm placeholder:text-corporate-400 focus:outline-none focus:ring-2 focus:ring-corporate-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:text-white transition-all";

export const Input: React.FC<InputProps> = ({ label, error, icon, rightElement, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-500 dark:text-corporate-400">{label}</label>}
      <div className="relative">
        {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-corporate-400">
                {icon}
            </div>
        )}
        <input 
            className={`${baseInputStyles} ${icon ? 'pl-10' : 'px-3'} ${rightElement ? 'pr-10' : ''} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`} 
            {...props} 
        />
        {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {rightElement}
            </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-corporate-500 dark:text-corporate-400">{label}</label>}
      <select className={`${baseInputStyles} px-3 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};