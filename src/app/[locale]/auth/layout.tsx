import { Toaster } from 'react-hot-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
        }
      }} />
      {children}
    </>
  );
}
