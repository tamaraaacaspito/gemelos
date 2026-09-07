import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'danger';
  className?: string;
}

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
};

export function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full
        text-sm font-semibold border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
