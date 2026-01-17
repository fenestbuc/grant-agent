'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // Check for hash fragment (magic link tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Check for code in query params (PKCE flow)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus(`Error: ${errorDescription || error}`);
        setTimeout(() => router.push('/login?error=' + encodeURIComponent(errorDescription || error)), 2000);
        return;
      }

      try {
        if (accessToken && refreshToken) {
          // Handle hash fragment tokens (magic link)
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }
        } else if (code) {
          // Handle PKCE code exchange
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          // No tokens found, redirect to login
          setStatus('No authentication data found');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Successfully authenticated - check for startup profile
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: startup } = await supabase
            .from('startups')
            .select('id')
            .eq('user_id', user.id)
            .single();

          setStatus('Authenticated! Redirecting...');

          if (!startup) {
            router.push('/onboarding');
          } else {
            router.push('/grants');
          }
        } else {
          router.push('/login?error=Could not get user');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('Authentication failed');
        setTimeout(() => router.push('/login?error=Authentication failed'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
