
import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { GrantsService } from './grants.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GrantFilterDto } from '../../common/dto/api.dto';

@Controller('grants')
@UseGuards(SupabaseAuthGuard)
export class GrantsController {
  constructor(private readonly grantsService: GrantsService) {}

  @Get()
  findAll(@Query() query: GrantFilterDto) {
    return this.grantsService.findAll(query);
  }

  @Get('recommended')
  getRecommended(@Req() req: any) {
    return this.grantsService.getRecommended(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grantsService.findOne(id);
  }
}
