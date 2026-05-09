
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { GrantsService } from './grants.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('grants')
@UseGuards(SupabaseAuthGuard)
export class GrantsController {
  constructor(private readonly grantsService: GrantsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.grantsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grantsService.findOne(id);
  }
}
