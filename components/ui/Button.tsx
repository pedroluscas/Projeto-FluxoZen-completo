import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg";
  
  const variants = {
    primary: "bg-corporate-primary hover:bg-corporate-primary-dark text-white shadow-sm focus:ring-corporate-primary",
    secondary: "bg-white dark:bg-corporate-800 text-corporate-700 dark:text-corporate-200 border border-corporate-300 dark:border-corporate-600 hover:bg-corporate-50 dark:hover:bg-corporate-700 focus:ring-corporate-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "bg-transparent hover:bg-corporate-100 dark:hover:bg-corporate-800 text-corporate-600 dark:text-corporate-400"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
