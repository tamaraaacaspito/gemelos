import { motion } from 'framer-motion';

interface LoadingProps {
  text?: string;
}

export function Loading({ text = 'Cargando...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full"
      />
      <p className="mt-4 text-gray-500 font-medium">{text}</p>
    </div>
  );
}
