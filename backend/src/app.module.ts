
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrantsModule } from './modules/grants/grants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GrantsModule,
  ],
})
export class AppModule {}
