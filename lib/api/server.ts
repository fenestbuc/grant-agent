
import { createClient } from '@/lib/supabase/server';

export async function fetchApiServer(endpoint: string, options: RequestInit = {}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const urlPath = endpoint.replace(/^\/api/, '');
  
  return fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers,
  });
}
