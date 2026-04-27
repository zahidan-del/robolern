'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslations } from '@/components/layout/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Lesson, Module, Quiz } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') && parsed.pathname === '/watch') {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    } else if (parsed.hostname.includes('youtu.be')) {
      const v = parsed.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch (e) {
    // Ignore invalid URLs
  }
  return url;
};

export default function LessonPlayerPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Assignment state
  const [submission, setSubmission] = useState<any>(null);
  const [uploadingAssignment, setUploadingAssignment] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/${locale}/auth/login`); return; }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments').select('id')
        .eq('student_id', user.id).eq('course_id', courseId).single();
      if (!enrollment) { router.push(`/${locale}/courses/${courseId}`); return; }
      setUserId(user.id);

      // Load lesson
      const { data: lessonData } = await supabase
        .from('lessons').select('*').eq('id', lessonId).single();
      setLesson(lessonData);

      // Load quiz
      const { data: quizData } = await supabase
        .from('quizzes').select('*, questions(*)').eq('lesson_id', lessonId).single();
      if (quizData) setQuiz(quizData);

      // Load progress
      const { data: progress } = await supabase
        .from('lesson_progress').select('is_completed')
        .eq('student_id', user.id).eq('lesson_id', lessonId).single();
      setIsCompleted(progress?.is_completed || false);
      
      // Load submission if any
      const { data: subData } = await supabase
        .from('lesson_submissions').select('*')
        .eq('student_id', user.id).eq('lesson_id', lessonId).single();
      if (subData) setSubmission(subData);

      // Load sidebar modules
      const { data: modsData } = await supabase
        .from('modules').select('*, lessons(id, title, order_index)')
        .eq('course_id', courseId).order('order_index');
      setModules(modsData || []);
      setLoading(false);
    };
    load();
  }, [courseId, lessonId, locale, router]);

  const markComplete = async () => {
    if (!userId || isCompleted) return;
    const supabase = createClient();
    await supabase.from('lesson_progress').upsert({
      student_id: userId, lesson_id: lessonId,
      is_completed: true, completed_at: new Date().toISOString()
    }, { onConflict: 'student_id,lesson_id' });
    setIsCompleted(true);
    toast.success('Lesson selesai! ✅');
  };

  const handleAssignmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !lessonId) return;
    if (file.type !== 'application/pdf') { toast.error('Harap unggah file PDF'); return; }
    
    setUploadingAssignment(true);
    const supabase = createClient();
    const fileName = `tugasmurid-${userId}-${Date.now()}.pdf`;
    
    const { error: uploadError } = await supabase.storage.from('course-materials').upload(`submissions/${fileName}`, file);
    if (uploadError) { toast.error('Upload gagal'); setUploadingAssignment(false); return; }
    
    const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(`submissions/${fileName}`);
    
    const isLate = lesson?.assignment_deadline ? new Date() > new Date(lesson.assignment_deadline) : false;
    
    const { data: subData, error: dbError } = await supabase.from('lesson_submissions').insert({
      lesson_id: lessonId, student_id: userId, file_url: publicUrl, is_late: isLate
    }).select().single();
    
    if (dbError) { toast.error('Gagal mencatat tugas'); }
    else { 
      setSubmission(subData); 
      toast.success('Tugas berhasil dikumpulkan! 🎉');
      await markComplete();
    }
    setUploadingAssignment(false);
  };

  const handleDeleteAssignment = async () => {
    if (!submission) return;
    const isPastDeadline = lesson?.assignment_deadline ? new Date() > new Date(lesson.assignment_deadline) : false;
    if (isPastDeadline && !lesson?.assignment_allow_late) {
      toast.error('Batas waktu sudah lewat, tidak bisa mengganti jawaban.');
      return;
    }
    if (!confirm('Yakin ingin menghapus jawaban ini? Anda harus mengunggah ulang!')) return;
    
    setUploadingAssignment(true);
    const supabase = createClient();
    
    // Hapus dari bucket storage jika memungkinkan
    try {
      const urlParts = submission.file_url.split('/submissions/');
      if (urlParts.length > 1) {
        const fileName = urlParts[1];
        await supabase.storage.from('course-materials').remove([`submissions/${fileName}`]);
      }
    } catch (e) {
      // Abaikan error jika file tidak ditemukan di storage
    }

    const { error } = await supabase.from('lesson_submissions').delete().eq('id', submission.id);
    if (error) {
      toast.error('Gagal menghapus tugas: ' + error.message);
    } else {
      setSubmission(null);
      toast.success('Jawaban terhapus. Silakan unggah file baru.');
    }
    setUploadingAssignment(false);
  };

  const submitQuiz = async () => {
    if (!quiz?.questions) return;
    let correct = 0;
    quiz.questions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined && q.options[selectedIdx]?.is_correct) correct++;
    });
    const finalScore = Math.round((correct / quiz.questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    const supabase = createClient();
    await supabase.from('quiz_attempts').insert({
      student_id: userId, quiz_id: quiz.id, score: finalScore, answers
    });

    if (finalScore >= quiz.passing_score) {
      await markComplete();
      toast.success(`Quiz selesai! Nilai: ${finalScore} 🎉`);
    } else {
      toast.error(`Nilai: ${finalScore}. Minimum lulus: ${quiz.passing_score}`);
    }
  };

  const allLessons = modules.flatMap(m =>
    (m.lessons || []).sort((a, b) => a.order_index - b.order_index)
  );
  const currentIdx = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = allLessons[currentIdx - 1];
  const nextLesson = allLessons[currentIdx + 1];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <div className="lesson-layout">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="lesson-sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <Link href={`/${locale}/courses/${courseId}`}
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ← {t('back')?.replace('Kembali', 'Kembali ke kursus')?.replace('Back', 'Back to course')}
          </Link>
        </div>
        {modules.map((mod, mi) => (
          <div key={mod.id}>
            <div style={{
              padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
              background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)'
            }}>
              Modul {mi + 1}: {mod.title}
            </div>
            {(mod.lessons || []).sort((a, b) => a.order_index - b.order_index).map(ls => (
              <Link key={ls.id} href={`/${locale}/courses/${courseId}/learn/${ls.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', fontSize: '0.825rem',
                  background: ls.id === lessonId ? 'var(--primary-light)' : 'transparent',
                  color: ls.id === lessonId ? 'var(--primary)' : 'var(--text-secondary)',
                  borderLeft: ls.id === lessonId ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s', fontWeight: ls.id === lessonId ? 600 : 400,
                  textDecoration: 'none'
                }}>
                <span>{ls.id === lessonId ? '▶' : '○'}</span>
                <span style={{ flex: 1 }}>{ls.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>

      {/* Content */}
      <div className="lesson-content">
        {lesson && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{lesson.title}</h1>
              {isCompleted && <span className="badge badge-success">✓ {t('completed')}</span>}
            </div>

            {/* Video */}
            {lesson.video_url && (
              <div className="video-container">
                <iframe src={getEmbedUrl(lesson.video_url)} title={lesson.title} allowFullScreen frameBorder="0" />
              </div>
            )}

            {/* Text Content */}
            {lesson.content && (
              <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                <ReactMarkdown>{lesson.content}</ReactMarkdown>
              </div>
            )}

            {/* File download */}
            {lesson.file_url && (
              <div style={{ marginBottom: '2rem' }}>
                <a href={lesson.file_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  id="download-file-btn">
                  📄 Download: {lesson.title}
                </a>
              </div>
            )}
            
            {/* Assignment Section */}
            {lesson.has_assignment && (
              <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--primary-light)' }}>
                <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>📤 Pengumpulan Tugas</h2>
                {lesson.assignment_desc && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', whiteSpace: 'pre-wrap' }}>
                    {lesson.assignment_desc}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.625rem 1rem', background: 'var(--bg-glass)', borderRadius: '10px', flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Batas Waktu</div>
                    <div style={{ fontWeight: 600 }}>{lesson.assignment_deadline ? new Date(lesson.assignment_deadline).toLocaleString('id-ID') : 'Tidak ada batas waktu'}</div>
                  </div>
                  <div style={{ padding: '0.625rem 1rem', background: 'var(--bg-glass)', borderRadius: '10px', flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status Penyerahan</div>
                    <div style={{ fontWeight: 600, color: submission ? 'var(--success)' : 'var(--warning)' }}>
                      {submission ? (submission.is_late ? 'Diserahkan (Terlambat)' : 'Selesai Diserahkan') : 'Belum Dikumpulkan'}
                    </div>
                  </div>
                </div>
                
                {submission && (
                  <div style={{ padding: '1rem', background: 'var(--success-light)', borderRadius: '10px', border: '1px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>Tugas telah direkam!</div>
                      {submission.is_late && lesson.assignment_deadline && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                          Terlambat: {Math.floor((new Date(submission.submitted_at).getTime() - new Date(lesson.assignment_deadline).getTime()) / 60000)} menit
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <a href={submission.file_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                        Cek File Jawaban
                      </a>
                      {!(lesson.assignment_deadline && new Date() > new Date(lesson.assignment_deadline) && !lesson.assignment_allow_late) && (
                        <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={handleDeleteAssignment} disabled={uploadingAssignment}>
                          {uploadingAssignment ? '⏳' : '🗑 Ganti'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {!submission && (
                  <div style={{ padding: '1.25rem', background: 'var(--bg-glass)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                    {(() => {
                      const isPastDeadline = lesson.assignment_deadline ? new Date() > new Date(lesson.assignment_deadline) : false;
                      if (isPastDeadline && !lesson.assignment_allow_late) {
                        return <div style={{ color: 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>Batas waktu pengumpulan telah berakhir. Anda tidak bisa mengumpulkan tugas ini lagi.</div>;
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Format diizinkan: <strong>.PDF</strong></div>
                          {isPastDeadline && <div className="badge badge-warning">Peringatan: Kumpul sekarang akan terhitung terlambat!</div>}
                          {uploadingAssignment ? (
                            <div className="btn btn-primary" style={{ opacity: 0.7 }}><span className="spinner" /> Mengunggah...</div>
                          ) : (
                            <input type="file" accept=".pdf,application/pdf" className="form-input" style={{ maxWidth: '300px', cursor: 'pointer' }} onChange={handleAssignmentUpload} />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Quiz Section */}
            {quiz && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>📝 {quiz.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Nilai minimum lulus: <strong>{quiz.passing_score}</strong>
                </p>
                {!showQuiz ? (
                  <button className="btn btn-accent" onClick={() => setShowQuiz(true)} id="start-quiz-btn">
                    {t('startQuiz')}
                  </button>
                ) : submitted ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                      {score >= quiz.passing_score ? '🎉' : '😔'}
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: score >= quiz.passing_score ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem' }}>
                      {score}
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {score >= quiz.passing_score ? 'Selamat! Kamu lulus quiz ini.' : `Belum lulus. Nilai minimum: ${quiz.passing_score}`}
                    </p>
                    <button className="btn btn-ghost" style={{ marginTop: '1.5rem' }}
                      onClick={() => { setSubmitted(false); setAnswers({}); setShowQuiz(false); }}
                      id="retry-quiz-btn">
                      {t('retryQuiz')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {(quiz.questions || []).sort((a, b) => a.order_index - b.order_index).map((q, qi) => (
                      <div key={q.id}>
                        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{qi + 1}. {q.question_text}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {q.options.map((opt, oi) => (
                            <label key={oi} style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.875rem 1rem', borderRadius: 10, cursor: 'pointer',
                              background: answers[q.id] === oi ? 'var(--primary-light)' : 'var(--bg-glass)',
                              border: `1.5px solid ${answers[q.id] === oi ? 'var(--primary)' : 'var(--border-color)'}`,
                              transition: 'all 0.2s'
                            }}>
                              <input type="radio" name={q.id} checked={answers[q.id] === oi}
                                onChange={() => setAnswers(a => ({ ...a, [q.id]: oi }))} />
                              <span>{opt.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={submitQuiz}
                      disabled={Object.keys(answers).length < (quiz.questions?.length || 0)}
                      id="submit-quiz-btn">
                      {t('submitQuiz')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />
              
            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
              {prevLesson ? (
                <Link href={`/${locale}/courses/${courseId}/learn/${prevLesson.id}`} className="btn btn-ghost" id="prev-lesson-btn">
                  ← {prevLesson.title}
                </Link>
              ) : <div />}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {!isCompleted && !quiz && (
                  <button className="btn btn-success" onClick={markComplete} id="mark-complete-btn">
                    {t('markComplete')}
                  </button>
                )}
                {nextLesson && (
                  <Link href={`/${locale}/courses/${courseId}/learn/${nextLesson.id}`} className="btn btn-primary" id="next-lesson-btn">
                    {nextLesson.title} →
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
