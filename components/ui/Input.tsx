
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps & { variant?: 'default' | 'glass' }> = ({ label, id, error, className, type, variant = 'default', ...props }) => {
  const isDateInput = type === 'date';

  const baseStyles = "mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none sm:text-sm transition-all";
  const variantStyles = {
    default: "bg-white dark:bg-dark-secondary border border-gray-300 dark:border-dark-border focus:ring-primary focus:border-primary text-gray-900 dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-dark-textSecondary",
    glass: "bg-white/10 border border-white/10 text-white placeholder-white/30 focus:bg-white/20 focus:border-aesYellow/50 focus:ring-1 focus:ring-aesYellow/50 backdrop-blur-sm"
  };

  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className={`block text-sm font-medium mb-1 ${variant === 'glass' ? 'text-white/80 uppercase tracking-wider text-xs' : 'text-gray-700 dark:text-dark-textSecondary'}`}>{label}</label>}
      <div className="relative"> {/* Wrapper for input and potential icon */}
        <input
          id={id}
          type={type}
          className={`${baseStyles} ${variantStyles[variant]} ${error ? 'border-red-500' : ''} ${isDateInput ? 'pr-10 cursor-pointer' : ''} ${className || ''}`}
          {...props}
        />
        {isDateInput && (
          // This icon is purely visual. The native calendar picker indicator 
          // should ideally be hidden or made transparent via global CSS (see index.html).
          // The emoji matches the icon style used elsewhere in the app.
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-1"> {/* top-1 aligns with input's mt-1 */}
            <span className="text-gray-400 dark:text-dark-textSecondary text-lg">🗓️</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Input;
