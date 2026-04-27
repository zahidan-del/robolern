'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { useTheme } from './ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import type { Profile } from '@/types';

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedAnns, setDismissedAnns] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    });

    const fetchAnns = async () => {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(data || []);
    };
    fetchAnns();
  }, []);

  const switchLocale = () => {
    const nextLocale = locale === 'id' ? 'en' : 'id';
    // Update cookie and reload with new locale
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000`;
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    router.push(newPath);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setMenuOpen(false);
    window.location.href = `/${locale}/auth/login`;
  };

  const getDashboardPath = () => {
    if (!profile) return `/${locale}/dashboard`;
    return `/${locale}/dashboard/${profile.role === 'admin' ? 'admin' : profile.role === 'guru' ? 'guru' : 'murid'}`;
  };

  const activeAnns = announcements.filter(a => {
    if (dismissedAnns.has(a.id)) return false;
    if (a.target_role === 'all') return true;
    if (profile?.role === 'admin') return true; // admin sees everything
    if (profile && a.target_role === profile.role) return true;
    if (!profile) return true; // Unauthenticated users see everything that is 'all', wait, handled by 'all' check above
    return false;
  });

  return (
    <>
      {activeAnns.map((ann) => (
        <div key={ann.id} style={{ 
          background: 'var(--gradient-primary)', color: 'white', padding: '0.625rem 1rem', 
          textAlign: 'center', position: 'relative', fontWeight: 500, fontSize: '0.85rem',
          zIndex: 101, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
        }}>
          📢 <strong style={{ opacity: 0.9 }}>{ann.title}</strong>{' '}
          <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>—</span>{' '}
          <span>{ann.content}</span>
          
          <button 
            onClick={() => {
              const newSet = new Set(dismissedAnns);
              newSet.add(ann.id);
              setDismissedAnns(newSet);
            }}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', cursor: 'pointer', position: 'absolute', right: '1rem',
              transition: 'background 0.2s ease', 
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            title="Tutup"
          >
            ✕
          </button>
        </div>
      ))}
      <nav className="navbar">
      <div className="container navbar-inner">
        {/* Logo */}
        <Link href={`/${locale}`} className="navbar-logo">
          <div className="navbar-logo-icon">🤖</div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.25rem',
            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>RoboLearn</span>
        </Link>

        {/* Nav Links */}
        <div className="navbar-nav">
          <Link href={`/${locale}/courses`} className={`navbar-link ${pathname.includes('/courses') ? 'active' : ''}`}>
            {t('courses')}
          </Link>
          {profile && (
            <Link href={getDashboardPath()} className={`navbar-link ${pathname.includes('/dashboard') ? 'active' : ''}`}>
              {t('dashboard')}
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Language Toggle */}
          <button className="lang-toggle" onClick={switchLocale} title="Switch Language" id="lang-toggle-btn">
            {locale === 'id' ? '🇬🇧' : '🇮🇩'}
          </button>

          {/* Theme Toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme" id="theme-toggle-btn">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setMenuOpen(!menuOpen)}
                  id="user-menu-btn"
                >
                  {profile.avatar_url ? (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: (profile.avatar_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: profile.avatar_position || 'center', transform: `scale(${profile.avatar_scale ?? 1})` }} />
                    </div>
                  ) : (
                    <span>👤</span>
                  )}
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.full_name.split(' ')[0]}
                  </span>
                </button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)', borderRadius: 12, padding: '0.5rem',
                    minWidth: 180, zIndex: 200, boxShadow: 'var(--shadow-lg)'
                  }}>
                    <Link href={getDashboardPath()} className="sidebar-item" onClick={() => setMenuOpen(false)}>
                      {t('dashboard')}
                    </Link>
                    <Link href={`/${locale}/dashboard/profile`} className="sidebar-item" onClick={() => setMenuOpen(false)}>
                      {locale === 'id' ? 'Edit Profil' : 'Edit Profile'}
                    </Link>
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '0.25rem 0' }} />
                    <button className="sidebar-item" style={{ color: 'var(--danger)' }} onClick={handleLogout} id="logout-btn">
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href={`/${locale}/auth/login`} className="btn btn-ghost btn-sm" id="nav-login-btn">
                {t('login')}
              </Link>
              <Link href={`/${locale}/auth/register`} className="btn btn-primary btn-sm" id="nav-register-btn">
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}
