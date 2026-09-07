import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border-2
            bg-gray-50 text-gray-900 placeholder-gray-400 text-base
            transition-colors duration-200
            focus:outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20
            ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
