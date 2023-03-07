import { Injectable } from '@nestjs/common';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { ITrade } from '../app.interface';

@Injectable()
export class TradeService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getTrades(currencyPair: string): Promise<ITrade[]> {
    const keys = await this.redis.keys(`trade:${currencyPair}:*`);
    if (keys.length < 1) return [];
    const data = await this.redis.mget(keys);

    return data.map((d) => JSON.parse(d));
  }

  async getOpenCloseTrade(
    currencyPair: string,
  ): Promise<{ O: ITrade; C: ITrade }> {
    const trades = await this.getTrades(currencyPair);
    trades.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

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

    return { H: trades[trades.length - 1] || null, L: trades[0] || null };
  }
}
