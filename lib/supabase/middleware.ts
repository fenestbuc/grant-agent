import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
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

          const url = request.nextUrl.clone();
          url.pathname = startup ? '/grants' : '/onboarding';
          url.searchParams.delete('code');
          return NextResponse.redirect(url, { headers: supabaseResponse.headers });
        }
      }
    }
    // If no code or error, let the page handle it
    return supabaseResponse;
  }

  // Refresh the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return supabaseResponse;
}
