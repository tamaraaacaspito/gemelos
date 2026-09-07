import { ReactNode } from 'react';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-violet-50 via-white to-cyan-50">
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
      <main className="max-w-lg mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
