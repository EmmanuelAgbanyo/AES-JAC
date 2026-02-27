
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, className, ...props }) => {
  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-1">{label}</label>}
      <textarea
        id={id}
        className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-dark-secondary border ${error ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-dark-textSecondary ${className || ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Textarea;
