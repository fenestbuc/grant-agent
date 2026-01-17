import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Create a response that we'll modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle auth callback - exchange code for session
  if (request.nextUrl.pathname === '/auth/callback') {
    const code = request.nextUrl.searchParams.get('code');

    if (code) {
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

          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = startup ? '/grants' : '/onboarding';
          redirectUrl.searchParams.delete('code');

          // Create redirect response and copy cookies from the current response
          const redirectResponse = NextResponse.redirect(redirectUrl);
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });

          return redirectResponse;
        }
      } else {
        // Auth error - redirect to login with error
        console.error('Auth callback error:', error.message);
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('error', error.message);
        loginUrl.searchParams.delete('code');
        return NextResponse.redirect(loginUrl);
      }
    }

    // No code - let the page handle it (might be hash fragment)
    return response;
  }

  // Refresh the session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/', '/grants', '/kb', '/applications', '/watchlist', '/settings', '/notifications', '/submit-grant'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname === path ||
    (path !== '/' && request.nextUrl.pathname.startsWith(path))
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/grants';
    return NextResponse.redirect(url);
  }

  return response;
}
