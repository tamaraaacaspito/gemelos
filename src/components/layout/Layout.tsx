import { ReactNode } from 'react';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-violet-50 via-white to-cyan-50 overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#7c3aed', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <Header />
      <main className="w-full flex-1 flex flex-col justify-center max-w-lg sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 py-2 sm:py-4 overflow-y-auto overscroll-none">
        {children}
      </main>
    </div>
  );
}
