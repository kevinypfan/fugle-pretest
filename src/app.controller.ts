import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RateLimitGuard } from './rate-limit.guard';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { TradeService } from './stream/trade.service';
import { isNumeric } from './utils';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly tradeService: TradeService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/data')
  @UseGuards(RateLimitGuard)
  async getData(@Query('user') userId): Promise<object> {
    console.log(userId);
    if (!isNumeric(userId))
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'User ID invalid',
      });

    if (+userId < 1 || +userId > 1000)
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'User ID must be 1 ~ 1000',
      });
    const result = await this.appService.getData();
    return { result };
  }

  @Get('/trades')
  async getTrades(@Query('currencyPair') currencyPair) {
    return this.tradeService.getTrades(currencyPair);
  }

  @Get('/trades-ohlc')
  async getTradesOHLC(@Query('currencyPair') currencyPair) {
    const data = {
      ...(await this.tradeService.getOpenCloseTrade(currencyPair)),
      ...(await this.tradeService.getHighLowTrade(currencyPair)),
    };
    return data;
  }
}
