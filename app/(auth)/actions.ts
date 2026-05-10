'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { error: "Configuration Error: NEXT_PUBLIC_SUPABASE_URL is not set on Vercel." };
  }
  
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://grant-agent-sigma.vercel.app'}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: `Fetch Exception: ${err.message || 'Unknown error'}` };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getStartup() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return startup;
}
