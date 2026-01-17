// app/api/user-grants/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET: List user's submitted grants
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    const { data: submissions, error } = await supabase
      .from('user_submitted_grants')
      .select('*')
      .eq('startup_id', startup.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ data: submissions });
  } catch (error) {
    console.error('User grants GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST: Create a new user-submitted grant
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile found' }, { status: 400 });
    }

    const { url, name, provider, is_google_form } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check for duplicate submissions
    const { data: existing } = await supabase
      .from('user_submitted_grants')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('url', url)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You have already submitted this grant URL' }, { status: 400 });
    }

    // Insert the submission
    const { data: submission, error } = await supabase
      .from('user_submitted_grants')
      .insert({
        startup_id: startup.id,
        url,
        name: name || null,
        provider: provider || null,
        is_google_form: is_google_form || false,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating submission:', error);
      return NextResponse.json({ error: 'Failed to submit grant' }, { status: 500 });
    }

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    console.error('User grants POST error:', error);
    return NextResponse.json({ error: 'Failed to submit grant' }, { status: 500 });
  }
}
