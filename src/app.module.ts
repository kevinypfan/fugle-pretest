import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RateLimitGuard } from './rate-limit.guard';
import { ConfigModule } from '@nestjs/config';
import { StreamModule } from './stream/stream.module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StreamModule,
    RedisModule.forRoot({
      config: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, RateLimitGuard],
})
export class AppModule {}
