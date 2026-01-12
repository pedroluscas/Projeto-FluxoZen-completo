import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white dark:bg-corporate-800 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 transition-colors ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-corporate-100 dark:border-corporate-700 flex justify-between items-center">
          {title && <h3 className="text-lg font-semibold text-corporate-800 dark:text-corporate-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}> = ({ label, value, icon, colorClass = 'text-corporate-800 dark:text-white' }) => {
  return (
    <div className="bg-white dark:bg-corporate-800 p-6 rounded-xl shadow-sm border border-corporate-200 dark:border-corporate-700 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-corporate-500 dark:text-corporate-400 mb-1">{label}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-full bg-corporate-50 dark:bg-corporate-700 ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
};
