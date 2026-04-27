'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

const LEVELS = ['SD', 'SMP', 'SMA/SMK', 'Kuliah'] as const;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    avatar_url: '',
    school_level: '',
    school_name: '',
    subject: '',
    teaching_level: '',
    bio: '',
    role: '',
    created_at: '',
    avatar_position: 'center',
    avatar_scale: 1,
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }
      setEmail(user.email || '');

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setForm({
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
          school_level: profile.school_level || '',
          school_name: profile.school_name || '',
          subject: profile.subject || '',
          teaching_level: profile.teaching_level || '',
          bio: profile.bio || '',
          role: profile.role || '',
          created_at: profile.created_at || '',
          avatar_position: profile.avatar_position || 'center',
          avatar_scale: profile.avatar_scale ?? 1,
        });
      }
      setLoading(false);
    };
    load();
  }, [locale, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Upload gagal: ' + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
    // Append timestamp to bust cache
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();
    setForm(f => ({ ...f, avatar_url: publicUrl }));
    setUploading(false);
    toast.success('Foto berhasil diunggah!');
  };

  const removeAvatar = () => {
    setForm(f => ({ ...f, avatar_url: '', avatar_position: 'center', avatar_scale: 1 }));
  };

  const toggleTeachLevel = (lvl: string) => {
    setForm(f => {
      const levels = f.teaching_level ? f.teaching_level.split(', ').filter(Boolean) : [];
      const updated = levels.includes(lvl)
        ? levels.filter(l => l !== lvl)
        : [...levels, lvl];
      return { ...f, teaching_level: updated.join(', ') };
    });
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Nama tidak boleh kosong'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: Record<string, any> = {
      full_name: form.full_name.trim(),
      avatar_url: form.avatar_url || null,
      avatar_position: form.avatar_position || 'center',
      avatar_scale: form.avatar_scale,
      school_name: form.school_name || null,
      bio: form.bio || null,
    };
    if (form.role === 'murid') {
      updates.school_level = form.school_level || null;
    }
    if (form.role === 'guru') {
      updates.subject = form.subject || null;
      updates.teaching_level = form.teaching_level || null;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } else {
      toast.success(t('saved'));
    }
    setSaving(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner spinner-lg" /></div>;

  const dashPath = form.role === 'admin' ? `/${locale}/dashboard/admin` : form.role === 'guru' ? `/${locale}/dashboard/guru` : `/${locale}/dashboard/murid`;

  return (
    <div className="container" style={{ maxWidth: 640, padding: '2rem 1.5rem' }}>
      <Toaster position="top-center" />

      <Link href={dashPath} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'inline-flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
        ← {locale === 'id' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}
      </Link>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>{t('title')}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        {t('memberSince')} {new Date(form.created_at).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {/* Avatar Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>{t('avatar')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            background: form.avatar_url ? '#000' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0,
            border: '3px solid var(--border-color)'
          }}>
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: form.avatar_scale < 1 ? 'contain' : 'cover', objectPosition: form.avatar_position, transform: `scale(${form.avatar_scale})` }} />
            ) : (
              form.full_name.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', position: 'relative' }}>
                {uploading ? <span className="spinner spinner-sm" /> : t('changeAvatar')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  disabled={uploading}
                />
              </label>
              {form.avatar_url && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={removeAvatar}>
                  {t('removeAvatar')}
                </button>
              )}
            </div>
            
            {form.avatar_url && (
              <div style={{ marginTop: '0.5rem', maxWidth: 200, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    {locale === 'id' ? 'Fokus Gambar (Posisi)' : 'Image Focus (Position)'}
                  </label>
                  <select 
                    className="form-select" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', height: 'auto' }}
                    value={form.avatar_position}
                    onChange={e => setForm(f => ({ ...f, avatar_position: e.target.value }))}
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>
                      Zoom
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(form.avatar_scale * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" max="2" step="0.1" 
                    value={form.avatar_scale}
                    onChange={e => setForm(f => ({ ...f, avatar_scale: parseFloat(e.target.value) }))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">{t('fullName')} *</label>
            <input type="text" className="form-input" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input type="email" className="form-input" value={email} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('role')}</label>
            <input type="text" className="form-input" value={form.role === 'guru' ? (locale === 'id' ? 'Guru' : 'Teacher') : form.role === 'murid' ? (locale === 'id' ? 'Murid' : 'Student') : 'Admin'} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('bio')}</label>
            <textarea className="form-textarea" placeholder={t('bioPlaceholder')} value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ minHeight: 100 }} />
          </div>
        </div>
      </div>

      {/* Role-specific fields */}
      {form.role === 'murid' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>{locale === 'id' ? 'Informasi Sekolah' : 'School Info'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{t('schoolLevel')}</label>
              <select className="form-select" value={form.school_level}
                onChange={e => setForm(f => ({ ...f, school_level: e.target.value }))}>
                <option value="">{locale === 'id' ? 'Pilih jenjang' : 'Select level'}</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('schoolName')}</label>
              <input type="text" className="form-input" value={form.school_name}
                onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                placeholder={locale === 'id' ? 'Nama sekolah Anda' : 'Your school name'} />
            </div>
          </div>
        </div>
      )}

      {form.role === 'guru' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>{locale === 'id' ? 'Informasi Mengajar' : 'Teaching Info'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{t('subject')}</label>
              <input type="text" className="form-input" value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder={locale === 'id' ? 'Misal: Robotika, STEM' : 'e.g. Robotics, STEM'} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('schoolName')}</label>
              <input type="text" className="form-input" value={form.school_name}
                onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                placeholder={locale === 'id' ? 'Nama sekolah/institusi' : 'School/Institution name'} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('teachingLevels')}</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {LEVELS.map(lvl => (
                  <button key={lvl} type="button"
                    className={`badge ${(form.teaching_level || '').includes(lvl) ? 'badge-primary' : 'badge-accent'}`}
                    style={{ cursor: 'pointer', padding: '0.4rem 0.875rem', border: '1px solid var(--border-color)' }}
                    onClick={() => toggleTeachLevel(lvl)}>
                    {(form.teaching_level || '').includes(lvl) ? '✓ ' : ''}{lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <Link href={dashPath} className="btn btn-ghost">{locale === 'id' ? 'Batal' : 'Cancel'}</Link>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" /> {t('saving')}</> : t('save')}
        </button>
      </div>
    </div>
  );
}
