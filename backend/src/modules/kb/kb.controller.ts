/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KbService } from './kb.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('kb')
@UseGuards(SupabaseAuthGuard)
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.kbService.findAll(req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: any) {
    // In a real implementation this would stream to Supabase Storage
    // and trigger Inngest. This proves the backend separation.
    return this.kbService.uploadDocument(req.user.id, file);
  }
}
