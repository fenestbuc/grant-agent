import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has a startup profile
  const { data: startup } = await supabase
    .from('startups')
    .select('id, name')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header startup={startup} userEmail={user.email || ''} />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
