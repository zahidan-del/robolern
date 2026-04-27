'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslations } from '@/components/layout/I18nProvider';

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'ROB-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const LEVELS = ['SD', 'SMP', 'SMA/SMK', 'Kuliah'] as const;

export default function CreateCoursePage() {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', level: 'SD' as typeof LEVELS[number],
    thumbnail_url: '', thumbnail_position: 'center', thumbnail_scale: 1, enrollment_code: '',
  });

  useEffect(() => {
    setForm(f => ({ ...f, enrollment_code: generateCode() }));
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'guru') { router.push(`/${locale}/dashboard`); return; }
      setUserId(user.id);
    };
    check();
  }, [locale, router]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

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
      set('thumbnail_url', publicUrl);
      toast.success('Gambar berhasil dipakai');
    }
    setThumbUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('courses').insert({
      title: form.title,
      description: form.description,
      level: form.level,
      thumbnail_url: form.thumbnail_url || null,
      thumbnail_position: form.thumbnail_position,
      thumbnail_scale: form.thumbnail_scale,
      teacher_id: userId,
      enrollment_code: form.enrollment_code,
      is_published: false,
    }).select().single();

    if (error) { toast.error('Gagal membuat kursus: ' + error.message); setLoading(false); return; }
    toast.success('Kursus berhasil dibuat! 🎉');
    router.push(`/${locale}/dashboard/guru/courses/${data.id}/edit`);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Toaster position="top-center" />
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '2rem 0' }}>
        <div className="container">
          <Link href={`/${locale}/dashboard/guru`} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
            ← Kembali ke Dashboard
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{t('createCourse')}</h1>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 720 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontWeight: 800, marginBottom: '1.5rem' }}>{t('courseInfo')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">{t('title')} *</label>
                <input id="course-title" type="text" className="form-input"
                  value={form.title} onChange={e => set('title', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('description')}</label>
                <textarea id="course-desc" className="form-textarea"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('level')} *</label>
                  <select id="course-level" className="form-select" value={form.level} onChange={e => set('level', e.target.value)}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('thumbnailUrl')} (Atau Upload Foto)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                     <input type="file" accept="image/*" className="form-input" onChange={handleThumbUpload} disabled={thumbUploading} style={{ fontSize: '0.8rem' }} />
                     {thumbUploading && <span className="spinner spinner-sm" style={{ alignSelf: 'center' }} />}
                  </div>
                  <input id="course-thumbnail" type="url" className="form-input" placeholder="Atau paste URL dari google..." value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'id' ? 'Fokus Gambar (Position)' : 'Image Focus (Position)'}</label>
                  {form.thumbnail_url && (
                    <div style={{ marginBottom: '0.5rem', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#000' }}>
                      <img 
                        src={form.thumbnail_url} 
                        alt="Preview" 
                        style={{ width: '100%', aspectRatio: '16/9', objectFit: form.thumbnail_scale < 1 ? 'contain' : 'cover', objectPosition: form.thumbnail_position || 'center', transform: `scale(${form.thumbnail_scale})`, display: 'block' }} 
                      />
                    </div>
                  )}
                  <select className="form-select" value={form.thumbnail_position} onChange={e => set('thumbnail_position', e.target.value)} style={{ marginBottom: '1rem' }}>
                    <option value="top">{locale === 'id' ? 'Atas' : 'Top'}</option>
                    <option value="center">{locale === 'id' ? 'Tengah' : 'Center'}</option>
                    <option value="bottom">{locale === 'id' ? 'Bawah' : 'Bottom'}</option>
                  </select>
                  {form.thumbnail_url && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Zoom</label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(form.thumbnail_scale * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" max="2" step="0.1" 
                        value={form.thumbnail_scale}
                        onChange={e => set('thumbnail_scale', parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>{t('enrollmentCode')}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="code-display" style={{ flex: 1 }}>
                <span className="code-value">{form.enrollment_code}</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => set('enrollment_code', generateCode())} id="regen-code-btn">
                Regenerate
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link href={`/${locale}/dashboard/guru`} className="btn btn-ghost">{t('cancel')}</Link>
            <button id="create-course-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : t('createCourse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
