import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if user has a startup profile
    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (startup) {
      redirect('/grants');
    } else {
      redirect('/onboarding');
    }
  } else {
    redirect('/login');
  }
}
