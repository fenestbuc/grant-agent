/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { Controller, Get, Post, Put, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('applications')
@UseGuards(SupabaseAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(@Req() req: any, @Query('grantId') grantId?: string) {
    return this.applicationsService.findAll(req.user.id, grantId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    return this.applicationsService.createOrUpdate(req.user.id, dto);
  }

  @Put()
  async update(@Req() req: any, @Body() dto: any) {
    return this.applicationsService.createOrUpdate(req.user.id, dto);
  }

  @Post('generate')
  async generate(@Req() req: any, @Body() dto: { grantId: string; questionId: string }) {
    return this.applicationsService.generateAnswer(req.user.id, dto.grantId, dto.questionId);
  }
}
