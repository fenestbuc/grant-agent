import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/grants';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a startup profile
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: startup } = await supabase
          .from('startups')
          .select('id')
          .eq('user_id', user.id)
          .single();

        // If no startup profile, redirect to onboarding
        if (!startup) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login page on error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
