import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action, children }) => {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-corporate-900 dark:text-white tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-corporate-500 dark:text-slate-400 mt-1">
                        {description}
                    </p>
                )}
            </div>
            {(action || children) && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {children}
                    {action}
                </div>
            )}
        </div>
    );
};
