'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function PendingPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('status').eq('id', user.id).single();
        if (data) {
          setStatus(data.status);
        }
      }
    };
    checkStatus();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
  };

  if (status === 'active') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--success)' }}>
            {t('approvedTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
            {t('approvedDesc')}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href={`/${locale}/dashboard`} className="btn btn-primary" style={{ flex: 1 }}>
              {t('goToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          {t('pendingTitle')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
          {t('pendingDesc')}
        </p>
        <div style={{
          background: 'var(--warning-light)', border: '1px solid var(--warning)',
          borderRadius: 12, padding: '1rem', marginBottom: '2rem'
        }}>
          <p style={{ color: 'var(--warning)', fontSize: '0.875rem' }}>
            {t('pendingNote')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href={`/${locale}/courses`} className="btn btn-ghost" id="pending-browse-btn">
            {t('browseCourses')}
          </Link>
          <button className="btn btn-outline" onClick={handleLogout} id="pending-logout-btn">
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
