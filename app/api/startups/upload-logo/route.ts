// app/api/startups/upload-logo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPG, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      );
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const storagePath = `${startup.id}/logo.${extension}`;

    // Delete old logo if exists (different extension)
    if (startup.logo_url) {
      // Extract old path from URL
      const oldPathMatch = startup.logo_url.match(/startup-logos\/(.+)$/);
      if (oldPathMatch && oldPathMatch[1] !== storagePath) {
        await supabase.storage.from('startup-logos').remove([oldPathMatch[1]]);
      }
    }

    // Upload new logo
    const { error: uploadError } = await supabase.storage
      .from('startup-logos')
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      );
    }

    // Get public URL with cache-busting timestamp
    const { data: publicUrlData } = supabase.storage
      .from('startup-logos')
      .getPublicUrl(storagePath);

    // Add timestamp to bust browser/CDN cache
    const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    // Update startup record
    const { error: updateError } = await supabase
      .from('startups')
      .update({ logo_url: logoUrl })
      .eq('id', startup.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update startup' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { logo_url: logoUrl },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    if (!startup.logo_url) {
      return NextResponse.json({ message: 'No logo to delete' });
    }

    // Extract path from URL and delete from storage
    const pathMatch = startup.logo_url.match(/startup-logos\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('startup-logos').remove([pathMatch[1]]);
    }

    // Clear logo_url in database
    const { error: updateError } = await supabase
      .from('startups')
      .update({ logo_url: null })
      .eq('id', startup.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update startup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
