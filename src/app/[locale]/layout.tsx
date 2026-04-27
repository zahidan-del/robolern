import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { I18nProvider } from '@/components/layout/I18nProvider';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

const LOCALES = ['id', 'en'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale)) notFound();

  // Import messages directly from JSON
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <I18nProvider messages={messages} locale={locale}>
      <ThemeProvider locale={locale}>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
        <Navbar />
        <main>{children}</main>
      </ThemeProvider>
    </I18nProvider>
  );
}
