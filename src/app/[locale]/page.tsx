'use client';

import { useTranslations, useLocale } from '@/components/layout/I18nProvider';
import Link from 'next/link';

export default function HomePage() {
  const locale = useLocale();
  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations();


  const levels = [
    { key: 'sd', icon: '🎮', color: 'level-sd', label: t('levels.sd'), desc: t('levels.sdDesc') },
    { key: 'smp', icon: '⚙️', color: 'level-smp', label: t('levels.smp'), desc: t('levels.smpDesc') },
    { key: 'sma', icon: '🔧', color: 'level-sma', label: t('levels.sma'), desc: t('levels.smaDesc') },
    { key: 'kuliah', icon: '🤖', color: 'level-kuliah', label: t('levels.kuliah'), desc: t('levels.kuliahDesc') },
  ];

  const features = [
    { icon: '🎬', title: t('features.f1Title'), desc: t('features.f1Desc') },
    { icon: '🔑', title: t('features.f2Title'), desc: t('features.f2Desc') },
    { icon: '📈', title: t('features.f3Title'), desc: t('features.f3Desc') },
    { icon: '🌐', title: t('features.f4Title'), desc: t('features.f4Desc') },
    { icon: '🏆', title: t('features.f5Title'), desc: t('features.f5Desc') },
    { icon: '📱', title: t('features.f6Title'), desc: t('features.f6Desc') },
  ];

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="container" style={{ padding: '4rem 1.5rem' }}>
          <div className="hero-content" style={{ maxWidth: 640 }}>
            <div className="hero-badge">
              <span>🚀</span> {t('hero.badge')}
            </div>
            <h1 className="hero-title">
              {t('hero.title')}<br />
              <span className="hero-title-highlight">{t('hero.titleHighlight')}</span>
            </h1>
            <p className="hero-subtitle">{t('hero.subtitle')}</p>
            <div className="hero-cta">
              <Link href={`/${locale}/auth/register`} className="btn btn-primary btn-lg" id="hero-cta-btn">
                {t('hero.cta')} →
              </Link>
              <Link href={`/${locale}/courses`} className="btn btn-ghost btn-lg" id="hero-browse-btn">
                {t('hero.ctaSecondary')}
              </Link>
            </div>
            <div className="hero-stats">
              {[
                { val: '2,400+', label: t('hero.statsStudents') },
                { val: '120+', label: t('hero.statsCourses') },
                { val: '85+', label: t('hero.statsTeachers') },
              ].map(s => (
                <div key={s.label}>
                  <div className="hero-stat-value">{s.val}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Robot SVG Illustration */}
          <div className="robot-decoration">
            <svg viewBox="0 0 400 450" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Body */}
              <rect x="100" y="160" width="200" height="180" rx="20" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              {/* Head */}
              <rect x="120" y="70" width="160" height="110" rx="16" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              {/* Eyes */}
              <circle cx="160" cy="115" r="18" fill="var(--primary)" opacity="0.9"/>
              <circle cx="240" cy="115" r="18" fill="var(--primary)" opacity="0.9"/>
              <circle cx="160" cy="115" r="8" fill="var(--accent)"/>
              <circle cx="240" cy="115" r="8" fill="var(--accent)"/>
              <circle cx="163" cy="112" r="3" fill="white"/>
              <circle cx="243" cy="112" r="3" fill="white"/>
              {/* Mouth */}
              <rect x="155" y="148" width="90" height="8" rx="4" fill="var(--accent)" opacity="0.8"/>
              {/* Antenna */}
              <line x1="200" y1="70" x2="200" y2="30" stroke="var(--primary)" strokeWidth="3"/>
              <circle cx="200" cy="22" r="10" fill="var(--accent)"/>
              {/* Arms */}
              <rect x="40" y="170" width="60" height="20" rx="10" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              <rect x="300" y="170" width="60" height="20" rx="10" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              <circle cx="40" cy="180" r="14" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              <circle cx="360" cy="180" r="14" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              {/* Chest panel */}
              <rect x="130" y="195" width="140" height="100" rx="10" fill="var(--bg-glass)" stroke="var(--border-color)" strokeWidth="1"/>
              <circle cx="200" cy="220" r="16" fill="var(--primary)" opacity="0.6"/>
              <circle cx="200" cy="220" r="8" fill="var(--accent)"/>
              <rect x="150" y="255" width="30" height="6" rx="3" fill="var(--success)" opacity="0.8"/>
              <rect x="190" y="255" width="50" height="6" rx="3" fill="var(--primary)" opacity="0.6"/>
              <rect x="150" y="270" width="50" height="6" rx="3" fill="var(--accent)" opacity="0.6"/>
              <rect x="210" y="270" width="30" height="6" rx="3" fill="var(--warning)" opacity="0.6"/>
              {/* Legs */}
              <rect x="130" y="340" width="55" height="80" rx="12" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              <rect x="215" y="340" width="55" height="80" rx="12" fill="var(--bg-surface-2)" stroke="var(--primary)" strokeWidth="2"/>
              {/* Feet */}
              <rect x="118" y="405" width="77" height="22" rx="10" fill="var(--primary)" opacity="0.8"/>
              <rect x="203" y="405" width="77" height="22" rx="10" fill="var(--primary)" opacity="0.8"/>
              {/* Glow effect */}
              <circle cx="200" cy="220" r="80" fill="var(--primary)" opacity="0.04"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── LEVELS ── */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('levels.title')}</h2>
            <p className="section-subtitle">{t('levels.subtitle')}</p>
          </div>
          <div className="grid grid-4" style={{ gap: '1.5rem' }}>
            {levels.map(lvl => (
              <Link key={lvl.key} href={`/${locale}/courses?level=${lvl.key.toUpperCase()}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{lvl.icon}</div>
                  <span className={`level-pill ${lvl.color}`} style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
                    {lvl.label}
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {lvl.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('features.title')}</h2>
            <p className="section-subtitle">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-3" style={{ gap: '1.5rem' }}>
            {features.map(f => (
              <div key={f.title} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{
            background: 'var(--gradient-primary)', borderRadius: 24,
            padding: '4rem 3rem', textAlign: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
              {t('hero.ctaTitle')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1.1rem' }}>
              {t('hero.ctaSubtitle')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/${locale}/auth/register`} className="btn btn-lg" style={{
                background: '#fff', color: 'var(--primary)', fontWeight: 700
              }} id="cta-register-btn">
                {t('hero.ctaRegister')} →
              </Link>
              <Link href={`/${locale}/courses`} className="btn btn-lg btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }} id="cta-browse-btn">
                {t('hero.ctaBrowse')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)',
        padding: '2rem 0'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="navbar-logo">
            <div className="navbar-logo-icon">🤖</div>
            RoboLearn
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            © 2025 RoboLearn. {t('hero.footerCopy')}
          </p>
        </div>
      </footer>
    </>
  );
}
