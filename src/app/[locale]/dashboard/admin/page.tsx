'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

type Tab = 'overview' | 'users' | 'courses' | 'announcements';

export default function AdminDashboard() {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ users: 0, courses: 0, enrollments: 0, pendingGuru: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', target_role: 'all' });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announceSaving, setAnnounceSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData?.role !== 'admin') { router.push(`/${locale}/dashboard`); return; }
      setProfile(profileData);

      // Load stats
      const [{ count: u }, { count: c }, { count: e }, { count: p }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('enrollments').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'guru').eq('status', 'pending'),
      ]);
      setStats({ users: u || 0, courses: c || 0, enrollments: e || 0, pendingGuru: p || 0 });

      setLoading(false);
    };
    load();
  }, [locale, router]);

  const loadUsers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const loadCourses = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('courses').select('*, teacher:profiles(full_name)').order('created_at', { ascending: false });
    setCourses(data || []);
  };

  const loadAnnouncements = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('announcements').select('*, author:profiles(full_name)').order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'courses') loadCourses();
    if (tab === 'announcements') loadAnnouncements();
  }, [tab]);

  const approveGuru = async (userId: string) => {
    const supabase = createClient();
    await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
    toast.success('Guru disetujui');
    loadUsers();
  };

  const suspendUser = async (userId: string, current: string) => {
    const supabase = createClient();
    const newStatus = current === 'suspended' ? 'active' : 'suspended';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    toast.success(newStatus === 'suspended' ? 'User dibekukan' : 'User diaktifkan');
    loadUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm(locale === 'id' ? 'Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.' : 'Are you sure you want to delete this user? This action cannot be undone.')) return;
    const supabase = createClient();
    
    // Memanggil RPC Supabase untuk menghapus data secara menyeluruh (auth & profile)
    const { error } = await supabase.rpc('delete_user', { user_id_to_delete: userId });
    
    if (error) {
      toast.error('Gagal menghapus: ' + error.message);
    } else {
      toast.success(locale === 'id' ? 'Pengguna berhasil dihapus sepenuhnya' : 'User completely deleted');
      loadUsers();
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Hapus kursus ini?')) return;
    const supabase = createClient();
    await supabase.from('courses').delete().eq('id', courseId);
    toast.success('Kursus dihapus');
    loadCourses();
  };

  const postAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast.error('Judul dan konten wajib diisi'); return;
    }
    setAnnounceSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('announcements').insert({ ...announcementForm, author_id: user!.id });
    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } else {
      toast.success('Pengumuman dikirim');
      setAnnouncementForm({ title: '', content: '', target_role: 'all' });
      loadAnnouncements();
    }
    setAnnounceSaving(false);
  };

  const deleteAnnouncement = async (id: string) => {
    const supabase = createClient();
    await supabase.from('announcements').delete().eq('id', id);
    toast.success('Pengumuman dihapus');
    loadAnnouncements();
  };

  const ROLE_BADGE: Record<string, string> = { admin: 'badge-danger', guru: 'badge-accent', murid: 'badge-primary' };
  const STATUS_BADGE: Record<string, string> = { active: 'badge-success', pending: 'badge-warning', suspended: 'badge-danger' };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="dashboard-layout">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: profile?.avatar_url ? '#000' : 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, overflow: 'hidden' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: (profile.avatar_scale ?? 1) < 1 ? 'contain' : 'cover', objectPosition: profile.avatar_position || 'center', transform: `scale(${profile.avatar_scale ?? 1})` }} />
              ) : (
                profile?.full_name?.charAt(0) || 'A'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</div>
            </div>
          </div>
        </div>
        <div className="sidebar-section-title">{t('menuAdmin')}</div>
        {([
          { id: 'overview', label: t('overview') },
          { id: 'users', label: t('users') },
          { id: 'courses', label: t('courses') },
          { id: 'announcements', label: t('announcements') },
        ] as { id: Tab; label: string }[]).map(item => (
          <button key={item.id} className={`sidebar-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)} id={`sidebar-${item.id}`}>
            {item.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="dashboard-content">
        {tab === 'overview' && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{t('welcomeAdmin')}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>{t('welcomeAdminDesc')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: locale === 'id' ? 'Jumlah Pengguna' : 'All Users', val: stats.users, color: 'var(--primary-light)' },
                { label: locale === 'id' ? 'Jumlah Kursus' : 'All Courses', val: stats.courses, color: 'var(--accent-light)' },
                { label: locale === 'id' ? 'Pendaftaran' : 'All Enrollments', val: stats.enrollments, color: 'var(--success-light)' },
                { label: t('pendingTeachers'), val: stats.pendingGuru, color: 'var(--warning-light)', urgent: stats.pendingGuru > 0 },
              ].map(s => (
                <div key={s.label} className="stat-card" style={s.urgent ? { borderColor: 'var(--warning)' } : {}}>
                  <div className="stat-value">{s.val}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            {stats.pendingGuru > 0 && (
              <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{stats.pendingGuru} {t('pendingTeachers')}</span>
                <button className="btn btn-sm" style={{ background: 'var(--warning)', color: '#000', fontWeight: 700 }}
                  onClick={() => setTab('users')} id="view-pending-btn">
                  {t('viewNow')}
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('users')}>
                <h3 style={{ fontWeight: 700 }}>Kelola Pengguna</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Approve guru, kelola akun</p>
              </div>
              <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('courses')}>
                <h3 style={{ fontWeight: 700 }}>Kelola Kursus</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Monitor & hapus kursus</p>
              </div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>{t('users')}</h1>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Akun Info</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {u.full_name}
                          <span className={`badge ${ROLE_BADGE[u.role] || 'badge-primary'} badge-sm`}>{u.role}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {u.email || '-'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {u.school_name || u.school_level || u.teaching_level || '-'}
                        </div>
                        {u.role === 'murid' && (u.nisn || u.nim) && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {u.nim ? `NIM: ${u.nim}` : `NISN: ${u.nisn}`}
                          </div>
                        )}
                        {u.role === 'guru' && u.documents && (u.documents as any[]).length > 0 && (
                          <div style={{ marginTop: '0.4rem' }}>
                            <details style={{ fontSize: '0.8rem' }}>
                              <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                                {locale === 'id' ? `Lihat ${(u.documents as any[]).length} Dokumen` : `View ${(u.documents as any[]).length} Documents`}
                              </summary>
                              <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {(u.documents as any[]).map((doc: any, i: number) => (
                                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                    style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                    {doc.name}
                                  </a>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[u.status] || 'badge-primary'}`}>{u.status || 'active'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {u.role === 'guru' && u.status === 'pending' && (
                            <button className="btn btn-success btn-sm" onClick={() => approveGuru(u.id)} id={`approve-${u.id}`}>
                              {t('approve')}
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <>
                              <button className="btn btn-sm" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}
                                onClick={() => suspendUser(u.id, u.status)} id={`suspend-${u.id}`}>
                                {u.status === 'suspended' ? t('activate') : t('suspend')}
                              </button>
                              <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                                onClick={() => deleteUser(u.id)} id={`delete-${u.id}`}>
                                {t('delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'courses' && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>{t('courses')}</h1>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>{t('title')}</th><th>Guru</th><th>{t('level')}</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.teacher?.full_name}</td>
                      <td><span className="badge badge-accent">{c.level}</span></td>
                      <td><span className={`badge ${c.is_published ? 'badge-success' : 'badge-warning'}`}>{c.is_published ? t('active') : t('draft')}</span></td>
                      <td>
                        <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                          onClick={() => deleteCourse(c.id)} id={`admin-delete-course-${c.id}`}>{t('delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'announcements' && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>{t('announcements')}</h1>
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>{t('createAnnouncement')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('title')} *</label>
                  <input id="announce-title" type="text" className="form-input" placeholder={t('title')}
                    value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('content')} *</label>
                  <textarea id="announce-content" className="form-textarea" placeholder={t('content')}
                    value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tujuan Pengumuman (Target)</label>
                  <select className="form-select" value={announcementForm.target_role} onChange={e => setAnnouncementForm(f => ({ ...f, target_role: e.target.value }))}>
                    <option value="all">Semua Pengguna</option>
                    <option value="guru">Hanya Guru</option>
                    <option value="murid">Hanya Murid</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={postAnnouncement} disabled={announceSaving} id="post-announce-btn">
                  {announceSaving ? <span className="spinner" /> : ''} {t('sendAnnouncement')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.map(a => (
                <div key={a.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontWeight: 700, margin: 0 }}>{a.title}</h3>
                        <span className={`badge ${a.target_role === 'guru' ? 'badge-accent' : a.target_role === 'murid' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.6rem' }}>
                          {a.target_role === 'guru' ? 'Guru' : a.target_role === 'murid' ? 'Murid' : 'Semua'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{a.content}</p>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        oleh {a.author?.full_name} · {new Date(a.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', flexShrink: 0 }}
                      onClick={() => deleteAnnouncement(a.id)} id={`delete-announce-${a.id}`}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
