import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { ITrade } from '../app.interface';
import { CHANNELS } from './steam.constants';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {
    setInterval(() => {
      this.logTrades();
    }, 30000);
  }

  async logTrades() {
    const results = await Promise.all(
      CHANNELS.map((channel) => this.getTrades(channel)),
    );
    const pureResults = CHANNELS.map((channel, index) => ({
      currencyPair: channel,
      data: results[index],
    })).filter((result) => result.data.length > 0);

    this.logger.log(pureResults);
  }

  async getTrades(currencyPair: string): Promise<ITrade[]> {
    const keys = await this.redis.keys(`trade:${currencyPair}:*`);
    // console.log(keys);
    if (keys.length < 1) return [];
    const data = await this.redis.mget(keys);

    return data.map((d) => JSON.parse(d));
  }

  async getOpenCloseTrade(
    currencyPair: string,
  ): Promise<{ O: ITrade; C: ITrade }> {
    const trades = await this.getTrades(currencyPair);
    trades.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
    // console.log({
    //   trades: trades.map((trade) => trade.timestamp),
    // });

    return {
      O: trades[0] || null,
      C: trades[trades.length - 1] || null,
    };
  }

  async getHighLowTrade(
    currencyPair: string,
  ): Promise<{ H: ITrade; L: ITrade }> {
    const trades = await this.getTrades(currencyPair);
    trades.sort((a, b) => a.price - b.price);
    // console.log({
    //   trades: trades.map((trade) => trade.price),
    // });
    return { H: trades[trades.length - 1] || null, L: trades[0] || null };
  }
}
