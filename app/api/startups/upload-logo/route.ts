// app/api/startups/upload-logo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('logo') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  // Convert File to ArrayBuffer for Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('startup-assets')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('startup-assets')
    .getPublicUrl(filePath);

  const logoUrl = urlData.publicUrl;

  // Update the startup record with the logo URL
  const { error: updateError } = await supabase
    .from('startups')
    .update({ logo_url: logoUrl })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Update error:', updateError);
    return NextResponse.json({ error: 'Failed to update startup record' }, { status: 500 });
  }

  return NextResponse.json({ logoUrl });
}
