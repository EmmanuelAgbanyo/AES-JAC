
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

const Select: React.FC<SelectProps & { variant?: 'default' | 'glass' }> = ({ label, id, error, options, className, value, variant = 'default', ...props }) => {
  const isPlaceholderSelected = value === "" || value === undefined;

  const baseStyles = "mt-1 block w-full pl-3 pr-10 py-2 text-base focus:outline-none sm:text-sm rounded-md transition-all";

  const variantStyles = {
    default: `bg-white dark:bg-dark-secondary border border-gray-300 dark:border-dark-border focus:ring-primary focus:border-primary ${isPlaceholderSelected ? 'text-gray-500 dark:text-dark-textSecondary' : 'text-gray-900 dark:text-dark-text'}`,
    glass: `bg-white/10 border border-white/10 focus:bg-white/20 focus:border-aesYellow/50 focus:ring-1 focus:ring-aesYellow/50 backdrop-blur-sm ${isPlaceholderSelected ? 'text-white/30' : 'text-white'}`
  };

  const placeholderText = options.length === 0
    ? (label ? `No ${label.toLowerCase()} available` : 'No options available')
    : `Select ${label?.toLowerCase() || 'an option'}`;

  // Disable placeholder if field is required and no actual value is selected,
  // or if there are no options to choose from at all.
  const isPlaceholderDisabled = (props.required && isPlaceholderSelected) || options.length === 0;

  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className={`block text-sm font-medium mb-1 ${variant === 'glass' ? 'text-white/80 uppercase tracking-wider text-xs' : 'text-gray-700 dark:text-dark-textSecondary'}`}>{label}</label>}
      <select
        id={id}
        value={value}
        className={`${baseStyles} ${variantStyles[variant]} ${error ? 'border-red-500' : ''} ${className || ''}`}
        {...props}
      >
        <option value="" disabled={isPlaceholderDisabled} hidden={isPlaceholderSelected && props.required}> {/* Hide placeholder from list if required and selected for better UX */}
          {placeholderText}
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="text-gray-900 dark:text-dark-text dark:bg-dark-primary"> {/* Ensure options have dark text */}
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
