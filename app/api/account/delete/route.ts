import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Unauthorized', 401);
    }

    // Verify confirmation
    const { confirmation } = await request.json();
    if (confirmation !== 'DELETE') {
      return apiError('Invalid confirmation. Please type DELETE to confirm.', 400);
    }

    // Get startup data
    const { data: startup } = await supabase
      .from('startups')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single();

    if (startup) {
      // Delete KB documents from storage
      const { data: documents } = await supabase
        .from('kb_documents')
        .select('storage_path')
        .eq('startup_id', startup.id);

      if (documents && documents.length > 0) {
        const paths = documents.map(doc => doc.storage_path);
        await supabase.storage.from('kb-documents').remove(paths);
      }

      // Delete logo from storage
      if (startup.logo_url) {
        const logoPath = startup.logo_url.match(/startup-logos\/(.+?)(\?|$)/)?.[1];
        if (logoPath) {
          await supabase.storage.from('startup-logos').remove([logoPath]);
        }
      }
    }

    // Create admin client to delete the user
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Delete the user (cascades to all related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return apiError('Failed to delete account', 500);
    }

    return apiSuccess({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return apiError('Failed to delete account', 500);
  }
}
