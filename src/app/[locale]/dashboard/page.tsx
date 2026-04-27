import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from('profiles').select('role, status').eq('id', user.id).single();

  if (!profile) redirect(`/${locale}/auth/login`);
  if (profile.role === 'guru' && profile.status === 'pending') redirect(`/${locale}/auth/pending`);
  if (profile.role === 'admin') redirect(`/${locale}/dashboard/admin`);
  if (profile.role === 'guru') redirect(`/${locale}/dashboard/guru`);
  redirect(`/${locale}/dashboard/murid`);
}
