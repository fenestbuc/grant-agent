import { Controller, Get, Post, Req, Body, UseGuards } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('watchlist')
@UseGuards(SupabaseAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.watchlistService.findAll(req.user.id);
  }

  @Post()
  add(@Req() req: any, @Body() body: any) {
    // Scaffold implementation
    return { success: true };
  }
}
