import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 shadow-lg shadow-violet-500/25',
  secondary:
    'bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-400 shadow-lg shadow-cyan-500/25',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 shadow-lg shadow-red-500/25',
  ghost:
    'bg-transparent text-violet-600 hover:bg-violet-50 focus:ring-violet-400 border border-violet-200',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs sm:text-sm rounded-lg',
  md: 'px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base rounded-xl',
  lg: 'px-5 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        className={`
          inline-flex items-center justify-center font-semibold
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
