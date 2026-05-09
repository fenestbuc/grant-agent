import { NotificationsModule } from './modules/notifications/notifications.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { KbModule } from './modules/kb/kb.module';
import { ApplicationsModule } from './modules/applications/applications.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrantsModule } from './modules/grants/grants.module';

@Module({
  imports: [
    NotificationsModule,
    WatchlistModule,
    KbModule,
    ApplicationsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    GrantsModule,
  ],
})
export class AppModule {}
