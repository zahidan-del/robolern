'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

type Role = 'murid' | 'guru';
const LEVELS = ['SD', 'SMP', 'SMA/SMK', 'Kuliah'] as const;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [role, setRole] = useState<Role>('murid');
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    schoolLevel: '', schoolName: '', subject: '', teachingLevels: [] as string[],
    nisn: '', nim: '',
  });
  const [docFiles, setDocFiles] = useState<{ name: string; url: string }[]>([]);

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const toggleTeachLevel = (lvl: string) => {
    setForm(f => ({
      ...f,
      teachingLevels: f.teachingLevels.includes(lvl)
        ? f.teachingLevels.filter(l => l !== lvl)
        : [...f.teachingLevels, lvl],
    }));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDocs(true);
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `teacher_docs/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) {
        toast.error(`Gagal upload ${file.name}: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
      setDocFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl }]);
    }
    setUploadingDocs(false);
    toast.success(locale === 'id' ? 'File berhasil diunggah!' : 'Files uploaded!');
    // Reset input
    e.target.value = '';
  };

  const removeDoc = (idx: number) => {
    setDocFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Password tidak sama!'); return; }
    if (form.password.length < 8) { toast.error('Password minimal 8 karakter'); return; }
    setLoading(true);

    const supabase = createClient();

    // Step 1: SignUp dengan field dasar yang sudah dikenal trigger
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role,
          school_level: role === 'murid' ? form.schoolLevel : null,
          school_name: form.schoolName || null,
          subject: role === 'guru' ? form.subject : null,
          teaching_level: role === 'guru' ? form.teachingLevels.join(', ') : null,
          status: role === 'guru' ? 'pending' : 'active',
        },
      },
    });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Step 2: Update profile dengan field tambahan (nisn/nim/documents)
    if (data.user) {
      const extraData: Record<string, any> = {};
      if (role === 'murid' && form.schoolLevel !== 'Kuliah' && form.nisn) {
        extraData.nisn = form.nisn;
      }
      if (role === 'murid' && form.schoolLevel === 'Kuliah' && form.nim) {
        extraData.nim = form.nim;
      }
      if (role === 'guru' && docFiles.length > 0) {
        extraData.documents = docFiles;
      }

      if (Object.keys(extraData).length > 0) {
        await supabase.from('profiles').update(extraData).eq('id', data.user.id);
      }
    }

    toast.success('Registrasi berhasil!');
    if (role === 'guru') {
      router.push(`/${locale}/auth/pending`);
    } else {
      router.push(`/${locale}/dashboard/murid`);
    }
    setLoading(false);
  };

  const isKuliah = form.schoolLevel === 'Kuliah';

  return (
    <div className="auth-page" style={{ paddingTop: '2rem', paddingBottom: '2rem', alignItems: 'flex-start' }}>
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div style={{ fontSize: '2rem' }}>🤖</div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.25rem',
            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>RoboLearn</span>
        </div>

        <h1 className="auth-title">{t('registerTitle')}</h1>
        <p className="auth-subtitle">{t('registerSubtitle')}</p>

        {/* Role Selector */}
        <div className="role-selector">
          {(['murid', 'guru'] as Role[]).map(r => (
            <button
              key={r}
              type="button"
              className={`role-option ${role === r ? 'selected' : ''}`}
              onClick={() => setRole(r)}
              id={`role-${r}-btn`}
            >
              <span className="role-option-label">{r === 'murid' ? t('roleStudent') : t('roleTeacher')}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{t('fullName')} *</label>
            <input id="reg-name" type="text" className="form-input" placeholder={locale === 'id' ? 'Nama lengkap Anda' : 'Your full name'}
              value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('email')} *</label>
            <input id="reg-email" type="email" className="form-input" placeholder="nama@email.com"
              value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('password')} *</label>
              <input id="reg-password" type="password" className="form-input" placeholder="Min. 8 karakter"
                value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('confirmPassword')} *</label>
              <input id="reg-confirm-password" type="password" className="form-input" placeholder={locale === 'id' ? 'Ulangi password' : 'Repeat password'}
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
            </div>
          </div>

          {/* ── MURID FIELDS ── */}
          {role === 'murid' && (
            <>
              <div className="form-group">
                <label className="form-label">{t('schoolLevel')} *</label>
                <select id="reg-school-level" className="form-select" value={form.schoolLevel}
                  onChange={e => set('schoolLevel', e.target.value)} required>
                  <option value="">{t('selectSchoolLevel')}</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* NISN / NIM */}
              {form.schoolLevel && (
                <div className="form-group">
                  <label className="form-label">
                    {isKuliah ? 'NIM' : 'NISN'}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      ({isKuliah
                        ? (locale === 'id' ? 'Nomor Induk Mahasiswa' : 'Student ID Number')
                        : (locale === 'id' ? 'Nomor Induk Siswa Nasional' : 'National Student ID')
                      })
                    </span>
                  </label>
                  {isKuliah ? (
                    <input id="reg-nim" type="text" className="form-input"
                      placeholder={locale === 'id' ? 'Masukkan NIM Anda' : 'Enter your Student ID'}
                      value={form.nim} onChange={e => set('nim', e.target.value)} />
                  ) : (
                    <input id="reg-nisn" type="text" className="form-input"
                      placeholder={locale === 'id' ? 'Masukkan NISN Anda (10 digit)' : 'Enter your NISN (10 digits)'}
                      value={form.nisn} onChange={e => set('nisn', e.target.value)}
                      maxLength={10} pattern="[0-9]*" />
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{t('schoolName')} <span style={{ color: 'var(--text-muted)' }}>({locale === 'id' ? 'Opsional' : 'Optional'})</span></label>
                <input id="reg-institution" type="text" className="form-input" placeholder={locale === 'id' ? 'Nama sekolah (opsional)' : 'School name (optional)'}
                  value={form.schoolName}
                  onChange={e => set('schoolName', e.target.value)} />
              </div>
            </>
          )}

          {/* ── GURU FIELDS ── */}
          {role === 'guru' && (
            <>
              <div className="form-group">
                <label className="form-label">{t('schoolName')} *</label>
                <input id="reg-school-name" type="text" className="form-input" placeholder={locale === 'id' ? 'Nama sekolah/institusi' : 'School/Institution'}
                  value={form.schoolName} onChange={e => set('schoolName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('subject')} *</label>
                <input id="reg-subject" type="text" className="form-input" placeholder={locale === 'id' ? 'Misal: Robotika, STEM, Elektronika' : 'e.g. Robotics, STEM'}
                  value={form.subject} onChange={e => set('subject', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('teachingLevel')} *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {LEVELS.map(lvl => (
                    <button key={lvl} type="button"
                      className={`badge ${form.teachingLevels.includes(lvl) ? 'badge-primary' : 'badge-accent'}`}
                      style={{ cursor: 'pointer', padding: '0.4rem 0.875rem', border: '1px solid var(--border-color)' }}
                      onClick={() => toggleTeachLevel(lvl)}
                      id={`teach-level-${lvl.replace('/', '-')}`}
                    >
                      {form.teachingLevels.includes(lvl) ? '✓ ' : ''}{lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Upload */}
              <div className="form-group">
                <label className="form-label">
                  {locale === 'id' ? 'Dokumen Pendukung' : 'Supporting Documents'}{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ({locale === 'id' ? 'Sertifikat, CV, Ijazah, dll.' : 'Certificates, CV, Diploma, etc.'})
                  </span>
                </label>

                <div style={{
                  border: '2px dashed var(--border-color)', borderRadius: 12,
                  padding: '1.25rem', textAlign: 'center', position: 'relative',
                  background: 'var(--bg-secondary)', transition: 'border-color 0.2s ease'
                }}>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleDocUpload} disabled={uploadingDocs}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    id="reg-doc-upload" />
                  {uploadingDocs ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span className="spinner spinner-sm" />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {locale === 'id' ? 'Mengunggah...' : 'Uploading...'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {locale === 'id' ? 'Klik atau drag file ke sini' : 'Click or drag files here'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        PDF, JPG, PNG, DOC ({locale === 'id' ? 'maks. beberapa file' : 'multiple files allowed'})
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded files list */}
                {docFiles.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {docFiles.map((doc, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem', background: 'var(--bg-surface)',
                        borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem'
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {doc.name}
                        </span>
                        <button type="button" onClick={() => removeDoc(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <button id="reg-submit-btn" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? <><span className="spinner" />{t('registerBtn')}</> : t('registerBtn')}
          </button>
        </form>

        {role === 'guru' && (
          <div style={{
            marginTop: '1rem', padding: '0.875rem', background: 'var(--warning-light)',
            border: '1px solid var(--warning)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--warning)'
          }}>
            {locale === 'id'
              ? 'Akun guru memerlukan persetujuan admin sebelum dapat digunakan. Upload dokumen pendukung akan mempercepat proses verifikasi.'
              : 'Teacher accounts require admin approval. Uploading supporting documents will speed up the verification process.'}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/auth/login`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
