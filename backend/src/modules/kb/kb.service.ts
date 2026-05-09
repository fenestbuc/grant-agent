
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class KbService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAll(userId: string) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    const { data, error } = await this.supabase
      .from('kb_documents')
      .select('*')
      .eq('startup_id', startup.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    const { data: startup } = await this.supabase
      .from('startups')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!startup) throw new BadRequestException('Startup not found');

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = `${startup.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from('kb-documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new InternalServerErrorException('Failed to upload file to storage');

    // Create DB Record
    const { data: document, error: docError } = await this.supabase
      .from('kb_documents')
      .insert({
        startup_id: startup.id,
        filename: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        storage_path: storagePath,
        status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      await this.supabase.storage.from('kb-documents').remove([storagePath]);
      throw new InternalServerErrorException('Failed to create document record');
    }

    // Trigger Inngest webhook 
    // In a full implementation, we hit the Inngest API here:
    try {
      await fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/inngest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'kb/document.uploaded',
          data: {
            documentId: document.id,
            startupId: startup.id,
            storagePath: storagePath,
            fileType: file.mimetype,
          }
        })
      });
    } catch (e) {
      console.warn('Failed to trigger inngest, continuing anyway.', e);
    }

    return { data: document, message: 'File uploaded successfully' };
  }
}
