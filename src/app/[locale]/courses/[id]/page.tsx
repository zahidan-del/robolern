'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Course, Module } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const LEVEL_COLORS: Record<string, string> = { SD: 'level-sd', SMP: 'level-smp', 'SMA/SMK': 'level-sma', Kuliah: 'level-kuliah' };

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ role: string, school_level: string | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: enrollment } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', id).single();
        setIsEnrolled(!!enrollment);
        const { data: profile } = await supabase.from('profiles').select('role, school_level').eq('id', user.id).single();
        setUserProfile(profile);
      }
      const { data: courseData } = await supabase.from('courses').select('*, teacher:profiles(full_name, teaching_level)').eq('id', id).single();
      const { data: modulesData } = await supabase.from('modules').select('*, lessons(id, title, duration_minutes, order_index)').eq('course_id', id).order('order_index');
      setCourse(courseData);
      setModules(modulesData || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleEnroll = async () => {
    if (!userId) { router.push(`/${locale}/auth/login`); return; }
    if (!code.trim()) { toast.error('Masukkan kode kursus'); return; }
    setEnrollLoading(true);
    const supabase = createClient();
    const { data: courseCheck } = await supabase.from('courses').select('id, level').eq('id', id).eq('enrollment_code', code.toUpperCase().trim()).single();
    if (!courseCheck) { toast.error('Kode tidak valid untuk kursus ini'); setEnrollLoading(false); return; }
    if (userProfile?.role === 'murid' && courseCheck.level !== userProfile.school_level) {
      toast.error('Anda hanya bisa mengikuti kursus yang sesuai dengan jenjang sekolah Anda');
      setEnrollLoading(false);
      return;
    }
    const { error } = await supabase.from('enrollments').insert({ student_id: userId, course_id: id });
    if (error) { toast.error('Gagal mendaftar'); setEnrollLoading(false); return; }
    setIsEnrolled(true);
    toast.success('Berhasil bergabung ke kursus! 🎉');
    setShowModal(false);
    setEnrollLoading(false);
  };

  const handleUnenroll = async () => {
    if (!window.confirm('Yakin ingin keluar dari kursus ini? Semua progress Anda akan hilang.')) return;
    setLoading(true);
    const supabase = createClient();
    if (!userId) return;
    const { error } = await supabase.from('enrollments').delete().eq('student_id', userId).eq('course_id', id);
    if (error) {
      toast.error('Gagal keluar dari kursus');
      setLoading(false);
      return;
    }
    toast.success('Berhasil keluar dari kursus');
    setIsEnrolled(false);
    setLoading(false);
  };

  const firstLesson = modules?.[0]?.lessons?.[0];
  const totalLessons = modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner spinner-lg" /></div>;
  if (!course) return <div style={{ textAlign: 'center', padding: '4rem' }}>Kursus tidak ditemukan</div>;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Toaster position="top-center" />

      {/* Hero */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '3rem 0' }}>
        <div className="container">
          <Link href={`/${locale}/courses`} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.5rem' }}>
            ← Kembali ke Kursus
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
            <div>
              <span className={`level-pill ${LEVEL_COLORS[course.level] || ''}`} style={{ marginBottom: '1rem', display: 'inline-flex' }}>
                {course.level}
              </span>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '1rem' }}>{course.title}</h1>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>{course.description}</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <span>👨‍🏫 {(course as any).teacher?.full_name}</span>
                <span>📚 {totalLessons} lesson</span>
                <span>📁 {modules.length} modul</span>
              </div>
            </div>

            {/* Action Card */}
            <div className="card" style={{ width: 280, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              {isEnrolled ? (
                <>
                  <span className="badge badge-success" style={{ marginBottom: '1rem', display: 'inline-flex' }}>✓ Sudah Terdaftar</span>
                  <Link href={`/${locale}/courses/${id}/learn${firstLesson ? `/${firstLesson.id}` : ''}`}
                    className="btn btn-primary w-full" id="start-learn-btn" style={{ marginBottom: '0.5rem' }}>
                    Mulai Belajar →
                  </Link>
                  <button className="btn btn-ghost w-full" style={{ color: 'var(--danger)' }} onClick={handleUnenroll} id="unenroll-btn">
                    Keluar dari Kursus
                  </button>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Butuh kode dari guru untuk bergabung
                  </p>
                  <button className="btn btn-primary w-full" onClick={() => userId ? setShowModal(true) : router.push(`/${locale}/auth/login`)} id="join-course-btn">
                    🔑 Masukkan Kode Kelas
                  </button>
                  {!userId && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Login diperlukan untuk bergabung</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>📚 Konten Kursus</h2>
        {modules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Belum ada konten</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {modules.map((mod, mi) => (
              <div key={mod.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-primary">{mi + 1}</span>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{mod.title}</h3>
                  <span style={{ marginLeft: 'auto', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {mod.lessons?.length || 0} lesson
                  </span>
                </div>
                <div>
                  {(mod.lessons || []).sort((a, b) => a.order_index - b.order_index).map((lesson, li) => (
                    <div key={lesson.id} style={{
                      padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                      borderBottom: li < (mod.lessons?.length || 0) - 1 ? '1px solid var(--border-color)' : 'none'
                    }}>
                      <span style={{ color: isEnrolled ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1rem' }}>
                        {isEnrolled ? '▶️' : '🔒'}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.9rem' }}>{lesson.title}</span>
                      {lesson.duration_minutes && (
                        <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>⏱ {lesson.duration_minutes} mnt</span>
                      )}
                      {isEnrolled && (
                        <Link href={`/${locale}/courses/${id}/learn/${lesson.id}`} className="btn btn-ghost btn-sm" id={`lesson-link-${lesson.id}`}>
                          Buka
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔑 Masukkan Kode Kelas</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Masukkan kode yang diberikan guru untuk <strong>{course.title}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input id="detail-code-input" type="text" className="form-input"
                placeholder="Contoh: ROB-7X2K"
                value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.1em' }}
                onKeyDown={e => e.key === 'Enter' && handleEnroll()} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost w-full" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary w-full" onClick={handleEnroll} disabled={enrollLoading} id="detail-enroll-btn">
                {enrollLoading ? <span className="spinner" /> : null} Bergabung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
