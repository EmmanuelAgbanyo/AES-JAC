
import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'ghost' | 'danger-ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = "font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ease-in-out duration-200 flex items-center justify-center transform hover:scale-105";

  const variantStyles = {
    primary: 'bg-aesBlue hover:bg-blue-700 text-white shadow-md hover:shadow-lg focus:ring-aesBlue',
    secondary: 'bg-white hover:bg-gray-50 text-gray-800 border-2 border-slate-200 hover:border-slate-300 shadow-sm focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-md focus:ring-green-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md focus:ring-yellow-500',
    info: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md focus:ring-cyan-500',
    ghost: 'bg-white/20 hover:bg-white/30 text-white border border-white/20 shadow-sm backdrop-blur-sm focus:ring-white/50',
    'danger-ghost': 'bg-red-500/10 hover:bg-red-500/20 text-red-100 border border-red-500/20 focus:ring-red-500/40'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''} ${className || ''}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
