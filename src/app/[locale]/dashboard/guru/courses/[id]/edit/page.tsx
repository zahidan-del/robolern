'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import type { Course, Module, Lesson } from '@/types';

const LEVELS = ['SD', 'SMP', 'SMA/SMK', 'Kuliah'] as const;

export default function EditCoursePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const locale = useLocale();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = useTranslations('dashboard');
  
  // New module/lesson form
  const [newModule, setNewModule] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [newLesson, setNewLesson] = useState<{ 
    moduleId: string; title: string; content: string; video_url: string; duration: string; file_url: string;
    has_assignment: boolean; assignment_desc: string; assignment_deadline: string; assignment_allow_late: boolean;
  } | null>(null);
  
  // View submissions state
  const [submissionsModal, setSubmissionsModal] = useState<{ lessonId: string; title: string } | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `thumb-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('course-materials').upload(`thumbnails/${fileName}`, file);
    if (error) {
      toast.error('Gagal mengunggah gambar');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(`thumbnails/${fileName}`);
      setCourse(c => c ? { ...c, thumbnail_url: publicUrl } : c);
      toast.success('Gambar berhasil dipakai');
    }
    setThumbUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${courseId}/${fileName}`;
    
    const { error } = await supabase.storage.from('course-materials').upload(filePath, file);
    if (error) { toast.error('Upload gagal: ' + error.message); setUploading(false); return; }
    
    const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(filePath);
    setNewLesson(l => l ? { ...l, file_url: publicUrl } : l);
    setUploading(false);
    toast.success('File berhasil diunggah ✅');
  };

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).eq('teacher_id', user.id).single();
      if (!courseData) { router.push(`/${locale}/dashboard/guru`); return; }
      setCourse(courseData);

      const { data: modsData } = await supabase.from('modules').select('*, lessons(*)').eq('course_id', courseId).order('order_index');
      setModules(modsData?.map(m => ({ ...m, lessons: m.lessons?.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index) })) || []);
      setLoading(false);
    };
    load();
  }, [courseId, locale, router]);

  const saveCourse = async () => {
    if (!course) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('courses').update({
      title: course.title, description: course.description,
      level: course.level, thumbnail_url: course.thumbnail_url,
      thumbnail_position: course.thumbnail_position,
      thumbnail_scale: course.thumbnail_scale,
      is_published: course.is_published,
    }).eq('id', courseId);
    toast.success('Kursus disimpan ✅');
    setSaving(false);
  };

  const addModule = async () => {
    if (!newModule.trim()) return;
    const supabase = createClient();
    const { data } = await supabase.from('modules').insert({
      course_id: courseId, title: newModule, order_index: modules.length,
    }).select().single();
    if (data) { setModules(prev => [...prev, { ...data, lessons: [] }]); setNewModule(''); setAddingModule(false); }
    toast.success('Modul ditambahkan');
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Hapus modul ini beserta semua lesson-nya?')) return;
    const supabase = createClient();
    await supabase.from('modules').delete().eq('id', moduleId);
    setModules(prev => prev.filter(m => m.id !== moduleId));
    toast.success('Modul dihapus');
  };

  const addLesson = async () => {
    if (!newLesson || !newLesson.title.trim()) { toast.error('Judul lesson wajib diisi'); return; }
    const supabase = createClient();
    const mod = modules.find(m => m.id === newLesson.moduleId);
    const { data, error } = await supabase.from('lessons').insert({
      module_id: newLesson.moduleId, title: newLesson.title,
      content: newLesson.content || null, video_url: newLesson.video_url || null,
      file_url: newLesson.file_url || null,
      duration_minutes: newLesson.duration ? parseInt(newLesson.duration) : null,
      has_assignment: newLesson.has_assignment,
      assignment_desc: newLesson.assignment_desc || null,
      assignment_deadline: newLesson.assignment_deadline ? new Date(newLesson.assignment_deadline).toISOString() : null,
      assignment_allow_late: newLesson.assignment_allow_late,
      order_index: mod?.lessons?.length || 0,
    }).select().single();
    
    if (error) {
      toast.error('Gagal menambahkan lesson: ' + error.message);
      return;
    }
    
    if (data) {
      setModules(prev => prev.map(m => m.id === newLesson.moduleId
        ? { ...m, lessons: [...(m.lessons || []), data] } : m
      ));
    }
    setNewLesson(null);
    toast.success('Lesson ditambahkan ✅');
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm('Hapus lesson ini?')) return;
    const supabase = createClient();
    await supabase.from('lessons').delete().eq('id', lessonId);
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, lessons: (m.lessons || []).filter((l: Lesson) => l.id !== lessonId) } : m
    ));
    toast.success('Lesson dihapus');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner spinner-lg" /></div>;
  if (!course) return null;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Toaster position="top-center" />

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0' }}>
        <div className="container">
          <Link href={`/${locale}/dashboard/guru`} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'inline-flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
            ← Kembali ke Dashboard
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Edit: {course.title}</h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="code-display" style={{ padding: '0.5rem 0.875rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode:</span>
                <span className="code-value" style={{ fontSize: '1rem' }}>{course.enrollment_code}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(course.enrollment_code); toast.success('Kode disalin!'); }} id="copy-code-header">Copy</button>
              </div>
              <button className="btn btn-primary" onClick={saveCourse} disabled={saving} id="save-course-btn">
                {saving ? <span className="spinner" /> : ''} Simpan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Modules & Lessons */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{t('modulesAndLessons')}</h2>
            <button className="btn btn-accent btn-sm" onClick={() => setAddingModule(true)} id="add-module-btn">
              {t('addModule')}
            </button>
          </div>

          {/* Add Module Form */}
          {addingModule && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('title')} *</label>
                <input id="new-module-input" type="text" className="form-input" placeholder={t('newModulePlaceholder')}
                  value={newModule} onChange={e => setNewModule(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addModule()} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setAddingModule(false)}>{t('cancel')}</button>
                <button className="btn btn-accent" onClick={addModule} id="save-module-btn">{t('addModule')}</button>
              </div>
            </div>
          )}

          {modules.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <p style={{ color: 'var(--text-muted)' }}>Belum ada modul. Tambahkan modul pertama!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modules.map((mod, mi) => (
                <div key={mod.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Module Header */}
                  <div style={{ padding: '0.875rem 1.25rem', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="badge badge-primary">{mi + 1}</span>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{mod.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setNewLesson({ moduleId: mod.id, title: '', content: '', video_url: '', duration: '', file_url: '', has_assignment: false, assignment_desc: '', assignment_deadline: '', assignment_allow_late: false })} id={`add-lesson-${mod.id}`}>
                        {t('addLesson')}
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                        onClick={() => deleteModule(mod.id)} id={`delete-module-${mod.id}`}>Hapus</button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {(mod.lessons || []).map((lesson: Lesson, li: number) => (
                    <div key={lesson.id} style={{
                      padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                      borderBottom: li < (mod.lessons?.length || 0) - 1 ? '1px solid var(--border-color)' : 'none'
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>{li + 1}.</span>
                      <span style={{ flex: 1, fontSize: '0.875rem' }}>{lesson.title}</span>
                      {lesson.video_url && <span title="Ada video">🎬</span>}
                      {lesson.duration_minutes && <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>⏱ {lesson.duration_minutes}m</span>}
                      {lesson.has_assignment && (
                        <button className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={async () => {
                            setSubmissionsModal({ lessonId: lesson.id, title: lesson.title });
                            setLoadingSubmissions(true);
                            const supabase = createClient();
                            const { data } = await supabase.from('lesson_submissions').select('*, student:profiles(full_name)').eq('lesson_id', lesson.id);
                            setSubmissions(data || []);
                            setLoadingSubmissions(false);
                          }}>
                          📥 Tugas
                        </button>
                      )}
                      <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                        onClick={() => deleteLesson(lesson.id, mod.id)} id={`delete-lesson-${lesson.id}`}>Hapus</button>
                    </div>
                  ))}

                  {/* Add lesson inline form */}
                  {newLesson?.moduleId === mod.id && (
                    <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>{t('addLesson')}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div className="form-group">
                          <label className="form-label">{t('lessonTitle')} *</label>
                          <input id={`lesson-title-${mod.id}`} type="text" className="form-input" 
                            value={newLesson.title} onChange={e => setNewLesson(l => l ? { ...l, title: e.target.value } : l)} autoFocus />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('lessonContent')}</label>
                          <textarea className="form-textarea" 
                            value={newLesson.content} onChange={e => setNewLesson(l => l ? { ...l, content: e.target.value } : l)} style={{ minHeight: 80 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">{t('videoUrl')} (YouTube)</label>
                            <input type="url" className="form-input" placeholder="https://www.youtube.com/embed/..."
                              value={newLesson.video_url} onChange={e => setNewLesson(l => l ? { ...l, video_url: e.target.value } : l)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">{t('duration')}</label>
                            <input type="number" className="form-input" placeholder="10"
                              value={newLesson.duration} onChange={e => setNewLesson(l => l ? { ...l, duration: e.target.value } : l)} style={{ width: 80 }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('uploadFile')}</label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ fontSize: '0.8rem' }} />
                            {uploading && <span className="spinner spinner-sm" />}
                            {newLesson.file_url && <span style={{ color: 'var(--success)' }}>✓ Uploaded</span>}
                          </div>
                        </div>

                        {/* Assignment Section */}
                        <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: newLesson.has_assignment ? '1rem' : 0 }}>
                            <input type="checkbox" checked={newLesson.has_assignment} onChange={e => setNewLesson(l => l ? { ...l, has_assignment: e.target.checked } : l)} />
                            Aktifkan Pengumpulan Tugas Murid
                          </label>
                          
                          {newLesson.has_assignment && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                              <div className="form-group">
                                <label className="form-label">Instruksi Tugas</label>
                                <textarea className="form-textarea" style={{ minHeight: 60, fontSize: '0.8rem' }} placeholder="Jelaskan apa yang harus dikerjakan..."
                                  value={newLesson.assignment_desc} onChange={e => setNewLesson(l => l ? { ...l, assignment_desc: e.target.value } : l)} />
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Batas Waktu (Deadline)</label>
                                  <input type="datetime-local" className="form-input"
                                    value={newLesson.assignment_deadline} onChange={e => setNewLesson(l => l ? { ...l, assignment_deadline: e.target.value } : l)} />
                                </div>
                                <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={newLesson.assignment_allow_late} onChange={e => setNewLesson(l => l ? { ...l, assignment_allow_late: e.target.checked } : l)} />
                                    Izinkan Terlambat Kumpul
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setNewLesson(null)}>{t('cancel')}</button>
                          <button className="btn btn-accent btn-sm" onClick={addLesson} id={`save-lesson-${mod.id}`}>{t('saveLesson')}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Course Info Edit */}
        <div className="card" style={{ position: 'sticky', top: '5rem' }}>
          <h2 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem' }}>{t('courseInfo')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('title')} *</label>
              <input id="edit-title" type="text" className="form-input"
                value={course.title} onChange={e => setCourse(c => c ? { ...c, title: e.target.value } : c)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('description')}</label>
              <textarea className="form-textarea" style={{ minHeight: 80 }}
                value={course.description || ''} onChange={e => setCourse(c => c ? { ...c, description: e.target.value } : c)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('level')}</label>
              <select id="edit-level" className="form-select" value={course.level}
                onChange={e => setCourse(c => c ? { ...c, level: e.target.value as any } : c)}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('thumbnailUrl')} (Atau Upload Foto)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                 <input type="file" accept="image/*" className="form-input" onChange={handleThumbUpload} disabled={thumbUploading} style={{ fontSize: '0.8rem' }} />
                 {thumbUploading && <span className="spinner spinner-sm" style={{ alignSelf: 'center' }} />}
              </div>
              <input id="edit-thumbnail" type="url" className="form-input" placeholder="https://..."
                value={course.thumbnail_url || ''} onChange={e => setCourse(c => c ? { ...c, thumbnail_url: e.target.value } : c)} />
            </div>
            
            <div className="form-group">
              <label className="form-label">{locale === 'id' ? 'Fokus Gambar (Position)' : 'Image Focus (Position)'}</label>
              {course.thumbnail_url && (
                <div style={{ marginBottom: '0.5rem', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#000' }}>
                  <img 
                    src={course.thumbnail_url} 
                    alt="Preview" 
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: (course.thumbnail_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: course.thumbnail_position || 'center', transform: `scale(${course.thumbnail_scale ?? 1})`, display: 'block' }} 
                  />
                </div>
              )}
              <select className="form-select" value={course.thumbnail_position || 'center'}
                onChange={e => setCourse(c => c ? { ...c, thumbnail_position: e.target.value } : c)} style={{ marginBottom: '1rem' }}>
                <option value="top">{locale === 'id' ? 'Atas' : 'Top'}</option>
                <option value="center">{locale === 'id' ? 'Tengah' : 'Center'}</option>
                <option value="bottom">{locale === 'id' ? 'Bawah' : 'Bottom'}</option>
              </select>
              {course.thumbnail_url && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Zoom</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round((course.thumbnail_scale ?? 1) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" max="2" step="0.1" 
                    value={course.thumbnail_scale ?? 1}
                    onChange={e => setCourse(c => c ? { ...c, thumbnail_scale: parseFloat(e.target.value) } : c)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>
            
            <div className="form-group" style={{ padding: '0.75rem', background: 'var(--bg-glass)', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={course.is_published} onChange={e => setCourse(c => c ? { ...c, is_published: e.target.checked } : c)} />
                <span style={{ color: course.is_published ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {course.is_published ? (locale === 'id' ? 'Publik' : 'Public') : (locale === 'id' ? 'Privat' : 'Private')}
                </span>
              </label>
            </div>
          </div>
          <button className="btn btn-primary w-full" style={{ marginTop: '1.5rem' }} onClick={saveCourse} disabled={saving} id="save-course-sidebar-btn">
            {saving ? <span className="spinner" /> : '💾 ' + t('saveChanges')}
          </button>
        </div>
      </div>

      {/* Submissions Modal */}
      {submissionsModal && (
        <div className="modal-overlay" onClick={() => setSubmissionsModal(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📥 Pengumpulan Tugas: {submissionsModal.title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSubmissionsModal(null)}>✕</button>
            </div>
            
            {loadingSubmissions ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner spinner-lg" /></div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada murid yang mengumpulkan tugas ini.</div>
            ) : (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'var(--bg-glass)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Siswa</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Waktu Kumpul</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{sub.student?.full_name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(sub.submitted_at).toLocaleString('id-ID')}
                          {sub.is_late && <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Terlambat</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <a href={sub.file_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Buka File</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
