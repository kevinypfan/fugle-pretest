import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/data')
  @UseGuards(RateLimitGuard)
  async getData(@Query('user') userId): Promise<object> {
    console.log(userId);
    const result = await this.appService.getData();
    return { result };
  }
}
