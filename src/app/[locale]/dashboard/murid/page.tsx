'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Course, Enrollment } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function MuridDashboard() {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData?.role !== 'murid') { router.push(`/${locale}/dashboard/${profileData?.role}`); return; }
      setProfile(profileData);

      const { data: enrolls } = await supabase.from('enrollments').select('*, course:courses(*, teacher:profiles(full_name))').eq('student_id', user.id);
      setEnrollments(enrolls || []);

      // Load progress per course
      if (enrolls?.length) {
        const progressObj: Record<string, number> = {};
        for (const e of enrolls) {
          const { data: mods } = await supabase.from('modules').select('lessons(id)').eq('course_id', e.course_id);
          const allLessonIds = mods?.flatMap(m => m.lessons?.map((l: any) => l.id)) || [];
          if (allLessonIds.length === 0) { progressObj[e.course_id] = 0; continue; }
          const { count } = await supabase.from('lesson_progress').select('id', { count: 'exact' })
            .eq('student_id', user.id).eq('is_completed', true).in('lesson_id', allLessonIds);
          progressObj[e.course_id] = Math.round(((count || 0) / allLessonIds.length) * 100);
        }
        setProgressMap(progressObj);
      }
      setLoading(false);
    };
    load();
  }, [locale, router]);

  const handleEnroll = async () => {
    if (!code.trim()) { toast.error('Masukkan kode kursus'); return; }
    setEnrollLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: course } = await supabase.from('courses').select('id, title, level').eq('enrollment_code', code.toUpperCase().trim()).single();
    if (!course) { toast.error('Kode tidak valid'); setEnrollLoading(false); return; }
    if (profile?.role === 'murid' && course.level !== profile.school_level) {
      toast.error('Anda hanya bisa mengikuti kursus yang sesuai dengan jenjang sekolah Anda');
      setEnrollLoading(false);
      return;
    }
    if (enrollments.some(e => e.course_id === course.id)) { toast.error('Sudah terdaftar'); setEnrollLoading(false); return; }
    const { error } = await supabase.from('enrollments').insert({ student_id: user!.id, course_id: course.id });
    if (error) { toast.error('Gagal'); setEnrollLoading(false); return; }
    toast.success(`Bergabung ke: ${course.title} 🎉`);
    setCode('');
    setShowCodeModal(false);
    window.location.reload();
  };

  const handleUnenroll = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Yakin ingin keluar dari kursus "${courseTitle}"? Semua progress Anda akan hilang.`)) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('enrollments').delete().eq('student_id', user.id).eq('course_id', courseId);
    if (error) {
      toast.error('Gagal keluar dari kursus');
      setLoading(false);
      return;
    }
    toast.success(`Keluar dari kursus ${courseTitle}`);
    setEnrollments(prev => prev.filter(e => e.course_id !== courseId));
    setLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner spinner-lg" /></div>;

  const completed = enrollments.filter(e => progressMap[e.course_id] === 100).length;
  const inProgress = enrollments.filter(e => progressMap[e.course_id] > 0 && progressMap[e.course_id] < 100).length;

  return (
    <div className="dashboard-layout">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: profile?.avatar_url ? '#000' : 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, overflow: 'hidden' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: (profile.avatar_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: profile.avatar_position || 'center', transform: `scale(${profile.avatar_scale ?? 1})` }} />
              ) : (
                profile?.full_name?.charAt(0) || 'M'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.school_level}</div>
            </div>
          </div>
        </div>
        <div className="sidebar-section-title">{t('menuAdmin').replace('Admin', '')}</div>
        <button className="sidebar-item active" id="sidebar-dashboard">{t('welcomeAdmin').split(' ')[0]}</button>
        <Link href={`/${locale}/courses`} className="sidebar-item" id="sidebar-courses">{t('myCourses').replace('Saya', 'Semua').replace('My ', 'All ')}</Link>
        <button className="sidebar-item" onClick={() => setShowCodeModal(true)} id="sidebar-enter-code">{t('enterCodeTitle')}</button>
        <Link href={`/${locale}/dashboard/profile`} className="sidebar-item" id="sidebar-profile">{locale === 'id' ? 'Edit Profil' : 'Edit Profile'}</Link>
      </aside>

      {/* Content */}
      <div className="dashboard-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{t('welcomeStudent')}, {profile?.full_name?.split(' ')[0]}!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('welcomeStudentDesc')}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: locale === 'id' ? 'Jumlah Kursus' : 'All Courses', val: enrollments.length, color: 'var(--primary-light)' },
            { label: t('inProgress'), val: inProgress, color: 'var(--accent-light)' },
            { label: t('completed'), val: completed, color: 'var(--success-light)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My Courses */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{t('myCourses')}</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCodeModal(true)} id="add-course-btn">
              + {t('enterCodeTitle')}
            </button>
          </div>

          {enrollments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('noStudentCourses')}</p>
              <button className="btn btn-primary" onClick={() => setShowCodeModal(true)} id="empty-enter-code-btn">{t('enterCodeTitle')}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {enrollments.map(e => {
                const course = (e as any).course;
                const progress = progressMap[e.course_id] || 0;
                const firstLessonId = null; // simplified
                return (
                  <div key={e.id} className="course-card">
                    <div className="course-thumbnail-placeholder" style={{ backgroundColor: course?.thumbnail_url ? '#000' : undefined }}>
                      {course?.thumbnail_url
                        ? <img src={course.thumbnail_url} alt={course.title} className="course-thumbnail" style={{ objectFit: (course.thumbnail_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: course.thumbnail_position || 'center', transform: `scale(${course.thumbnail_scale ?? 1})` }} />
                        : <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>?</span>
                      }
                    </div>
                    <div className="course-body">
                      <h3 className="course-title">{course?.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {course?.teacher?.full_name}
                      </p>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{progress}%</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                      </div>
                    </div>
                    <div className="course-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/${locale}/courses/${e.course_id}/learn`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }} id={`continue-${e.id}`}>
                        {progress > 0 ? 'Lanjut Belajar' : 'Mulai Belajar'} →
                      </Link>
                      <button 
                        className="btn btn-ghost" 
                        style={{ color: 'var(--danger)', padding: '0 0.75rem', border: '1px solid var(--danger-light)' }}
                        onClick={() => handleUnenroll(e.course_id, course?.title || 'Kursus')}
                        title="Keluar dari kursus"
                        id={`unenroll-${e.course_id}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('enterCodeTitle')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCodeModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {t('enterCodeDesc')}
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input id="dashboard-code-input" type="text" className="form-input"
                placeholder="Contoh: ROB-7X2K"
                value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.1em' }}
                onKeyDown={e => e.key === 'Enter' && handleEnroll()} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost w-full" onClick={() => setShowCodeModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary w-full" onClick={handleEnroll} disabled={enrollLoading} id="dashboard-enroll-btn">
                {enrollLoading ? <span className="spinner" /> : null} {t('join')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
