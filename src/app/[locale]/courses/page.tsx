'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Course } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const LEVELS = ['SD', 'SMP', 'SMA/SMK', 'Kuliah'] as const;
const LEVEL_COLORS: Record<string, string> = { SD: 'level-sd', SMP: 'level-smp', 'SMA/SMK': 'level-sma', Kuliah: 'level-kuliah' };

export default function CoursesPage() {
  const t = useTranslations('courses');
  const locale = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filtered, setFiltered] = useState<Course[]>([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ role: string, school_level: string | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let profile = null;
      if (user) {
        setUserId(user.id);
        const { data: enrolls } = await supabase.from('enrollments').select('course_id').eq('student_id', user.id);
        setEnrolledIds(enrolls?.map(e => e.course_id) || []);
        const { data: p } = await supabase.from('profiles').select('role, school_level').eq('id', user.id).single();
        profile = p;
        setUserProfile(p);
      }
      let query = supabase.from('courses').select('*, teacher:profiles(full_name)').eq('is_published', true).order('created_at', { ascending: false });
      if (profile?.role === 'murid' && profile?.school_level) {
        query = query.eq('level', profile.school_level);
      }
      const { data } = await query;
      setCourses(data || []);
      setFiltered(data || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    let result = courses;
    if (levelFilter) result = result.filter(c => c.level === levelFilter);
    if (search) result = result.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [levelFilter, search, courses]);

  const handleEnroll = async () => {
    if (!userId) { toast.error('Silakan login terlebih dahulu'); return; }
    if (!code.trim()) { toast.error('Masukkan kode kursus'); return; }
    setEnrollLoading(true);
    const supabase = createClient();
    const { data: course } = await supabase.from('courses').select('id, title, level').eq('enrollment_code', code.toUpperCase().trim()).single();
    if (!course) { toast.error('Kode tidak valid'); setEnrollLoading(false); return; }
    if (userProfile?.role === 'murid' && course.level !== userProfile.school_level) {
      toast.error('Anda hanya bisa mengikuti kursus yang sesuai dengan jenjang sekolah Anda');
      setEnrollLoading(false);
      return;
    }
    if (enrolledIds.includes(course.id)) { toast.error('Anda sudah terdaftar di kursus ini'); setEnrollLoading(false); return; }
    const { error } = await supabase.from('enrollments').insert({ student_id: userId, course_id: course.id });
    if (error) { toast.error('Gagal mendaftar'); setEnrollLoading(false); return; }
    setEnrolledIds(prev => [...prev, course.id]);
    toast.success(`Berhasil bergabung: ${course.title} 🎉`);
    setCode('');
    setShowModal(false);
    setEnrollLoading(false);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Toaster position="top-center" />

      {/* Page Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '3rem 0' }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
            {t('title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('subtitle')}</p>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              id="course-search"
              type="text"
              className="form-input"
              placeholder={t('search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            {userProfile?.role !== 'murid' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`badge ${!levelFilter ? 'badge-primary' : 'badge-accent'}`}
                  style={{ cursor: 'pointer', padding: '0.4rem 1rem', border: '1px solid var(--border-color)' }}
                  onClick={() => setLevelFilter('')}
                  id="filter-all"
                >
                  {t('filterAll')}
                </button>
                {LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    className={`badge ${levelFilter === lvl ? 'badge-primary' : 'badge-accent'}`}
                    style={{ cursor: 'pointer', padding: '0.4rem 1rem', border: '1px solid var(--border-color)' }}
                    onClick={() => setLevelFilter(lvl === levelFilter ? '' : lvl)}
                    id={`filter-${lvl.replace('/', '-')}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}

            {userId && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="enter-code-btn" style={{ marginLeft: 'auto' }}>
                🔑 {t('enrollCode')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p>{t('noCoursesFound')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filtered.map(course => {
              const isEnrolled = enrolledIds.includes(course.id);
              const levelColor = LEVEL_COLORS[course.level] || 'badge-primary';
              return (
                <div key={course.id} className="course-card">
                  <div className="course-thumbnail-placeholder" style={{ backgroundColor: course.thumbnail_url ? '#000' : undefined }}>
                    {course.thumbnail_url
                      ? <img src={course.thumbnail_url} alt={course.title} className="course-thumbnail" style={{ objectFit: (course.thumbnail_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: course.thumbnail_position || 'center', transform: `scale(${course.thumbnail_scale ?? 1})` }} />
                      : <span>🤖</span>
                    }
                  </div>
                  <div className="course-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`level-pill ${levelColor}`}>{course.level}</span>
                      {isEnrolled && <span className="badge badge-success">✓ {t('enrolled')}</span>}
                    </div>
                    <h3 className="course-title">{course.title}</h3>
                    {course.description && <p className="course-desc">{course.description}</p>}
                    <div className="course-meta">
                      <span>👨‍🏫 {(course as any).teacher?.full_name || 'Guru'}</span>
                    </div>
                  </div>
                  <div className="course-footer">
                    {isEnrolled ? (
                      <Link href={`/${locale}/courses/${course.id}/learn`} className="btn btn-primary w-full" id={`continue-course-${course.id}`}>
                        {t('continuLearn')} →
                      </Link>
                    ) : (
                      <Link href={`/${locale}/courses/${course.id}`} className="btn btn-outline w-full" id={`view-course-${course.id}`}>
                        {t('viewDetail')}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enroll Code Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔑 {t('enrollCode')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} id="close-enroll-modal">✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Masukkan kode yang diberikan oleh guru Anda untuk bergabung ke kursus.
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input
                id="enroll-code-input"
                type="text"
                className="form-input"
                placeholder={t('enrollCodePlaceholder')}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.1em' }}
                onKeyDown={e => e.key === 'Enter' && handleEnroll()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost w-full" onClick={() => setShowModal(false)} id="cancel-enroll-btn">Batal</button>
              <button className="btn btn-primary w-full" onClick={handleEnroll} disabled={enrollLoading} id="submit-enroll-btn">
                {enrollLoading ? <span className="spinner" /> : null}
                {t('enrollBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
