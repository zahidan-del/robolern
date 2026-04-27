'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Course } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function GuruDashboard() {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, { students: number; lessons: number }>>({});
  const [uniqueStudents, setUniqueStudents] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData?.role !== 'guru') { router.push(`/${locale}/dashboard/${profileData?.role}`); return; }
      setProfile(profileData);

      const { data: coursesData } = await supabase
        .from('courses').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false });
      setCourses(coursesData || []);

      // Load stats per course
      const sm: Record<string, { students: number; lessons: number }> = {};
      for (const c of (coursesData || [])) {
        const { count: students } = await supabase.from('enrollments').select('id', { count: 'exact' }).eq('course_id', c.id);
        const { data: mods } = await supabase.from('modules').select('lessons(id)').eq('course_id', c.id);
        const lessons = mods?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
        sm[c.id] = { students: students || 0, lessons };
      }
      setStatsMap(sm);

      const courseIds = (coursesData || []).map(c => c.id);
      if (courseIds.length > 0) {
        const { data: allEnrolls } = await supabase.from('enrollments').select('student_id').in('course_id', courseIds);
        setUniqueStudents(new Set((allEnrolls || []).map(e => e.student_id)).size);
      } else {
        setUniqueStudents(0);
      }

      setLoading(false);
    };
    load();
  }, [locale, router]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Kode disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };



  const deleteCourse = async (courseId: string) => {
    if (!confirm('Hapus kursus ini?')) return;
    const supabase = createClient();
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
    toast.success('Kursus dihapus');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="dashboard-layout">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: profile?.avatar_url ? '#000' : 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, overflow: 'hidden' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: (profile.avatar_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: profile.avatar_position || 'center', transform: `scale(${profile.avatar_scale ?? 1})` }} />
              ) : (
                profile?.full_name?.charAt(0) || 'G'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.subject}</div>
            </div>
          </div>
        </div>
        <div className="sidebar-section-title">{t('menuGuru')}</div>
        <button className="sidebar-item active" id="sidebar-dashboard">{t('welcomeAdmin').split(' ')[0]}</button>
        <Link href={`/${locale}/dashboard/guru/courses/new`} className="sidebar-item" id="sidebar-create-course">{t('createCourse').replace('+', '')}</Link>
        <Link href={`/${locale}/courses`} className="sidebar-item" id="sidebar-browse-courses">{t('myCourses').replace('Saya', 'Semua').replace('My ', 'All ')}</Link>
        <Link href={`/${locale}/dashboard/profile`} className="sidebar-item" id="sidebar-profile">{locale === 'id' ? 'Edit Profil' : 'Edit Profile'}</Link>
      </aside>

      {/* Content */}
      <div className="dashboard-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{t('welcomeGuru')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('welcomeGuruDesc')}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: locale === 'id' ? 'Jumlah Kursus' : 'All Courses', val: courses.length, color: 'var(--primary-light)' },
            { label: locale === 'id' ? 'Jumlah Murid' : 'All Students', val: uniqueStudents, color: 'var(--accent-light)' },
            { label: locale === 'id' ? 'Kursus Publik' : 'Published Courses', val: courses.filter(c => c.is_published).length, color: 'var(--success-light)' },
            { label: locale === 'id' ? 'Kursus Privat' : 'Private Courses', val: courses.filter(c => !c.is_published).length, color: 'var(--warning-light)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Courses Management */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{t('myCourses')}</h2>
          <Link href={`/${locale}/dashboard/guru/courses/new`} className="btn btn-primary btn-sm" id="create-course-btn">
            {t('createCourse')}
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>—</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('noCourses')}</p>
            <Link href={`/${locale}/dashboard/guru/courses/new`} className="btn btn-primary" id="empty-create-btn">
              {t('createCourse')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {courses.map(course => (
              <div key={course.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{course.title}</h3>
                      <span className={`badge ${course.is_published ? 'badge-success' : 'badge-warning'}`}>
                        {course.is_published ? (locale === 'id' ? 'Publik' : 'Published') : (locale === 'id' ? 'Privat' : 'Private')}
                      </span>
                      <span className="level-pill level-sd" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {course.level}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{course.description}</p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{statsMap[course.id]?.students || 0} {t('students')}</span>
                      <span>{statsMap[course.id]?.lessons || 0} {t('lessons')}</span>
                    </div>
                  </div>

                  {/* Enrollment Code */}
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('enrollmentCode')}
                    </div>
                    <div className="code-display">
                      <span className="code-value">{course.enrollment_code}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => copyCode(course.enrollment_code, course.id)} id={`copy-code-${course.id}`}>
                        {copiedId === course.id ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 140 }}>
                    <Link href={`/${locale}/dashboard/guru/courses/${course.id}/edit`} className="btn btn-ghost btn-sm" id={`edit-course-${course.id}`}>
                      {t('editCourse')}
                    </Link>

                    <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                      onClick={() => deleteCourse(course.id)} id={`delete-course-${course.id}`}>
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
