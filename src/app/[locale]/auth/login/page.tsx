'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Get profile to check role & status
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', data.user.id).single();

    if (profile?.role === 'guru' && profile?.status === 'pending') {
      router.push(`/${locale}/auth/pending`);
    } else if (profile?.role === 'admin') {
      router.push(`/${locale}/dashboard/admin`);
    } else if (profile?.role === 'guru') {
      router.push(`/${locale}/dashboard/guru`);
    } else {
      router.push(`/${locale}/dashboard/murid`);
    }

    router.refresh();
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤖</div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.5rem',
            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            RoboLearn
          </span>
        </div>

        <h1 className="auth-title">{t('loginTitle')}</h1>
        <p className="auth-subtitle">{t('loginSubtitle')}</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="nama@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button id="login-submit-btn" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? <><span className="spinner" />{t('loginBtn')}</>  : t('loginBtn')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {t('registerLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
