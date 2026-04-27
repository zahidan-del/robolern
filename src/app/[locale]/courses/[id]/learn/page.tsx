import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Redirects to first lesson of the course
export default async function LearnRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from('modules')
    .select('lessons(id, order_index)')
    .eq('course_id', id)
    .order('order_index')
    .limit(1);

  const firstLesson = modules?.[0]?.lessons
    ?.sort((a: any, b: any) => a.order_index - b.order_index)[0];

  if (firstLesson) {
    redirect(`/${locale}/courses/${id}/learn/${firstLesson.id}`);
  } else {
    redirect(`/${locale}/courses/${id}`);
  }
}
