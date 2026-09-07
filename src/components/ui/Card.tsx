import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function Card({ children, className = '', animate = true }: CardProps) {
  const Wrapper = animate ? motion.div : 'div';
  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' },
      }
    : {};

  return (
    <Wrapper
      className={`bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 md:p-8 ${className}`}
      {...animationProps}
    >
      {children}
    </Wrapper>
  );
}
