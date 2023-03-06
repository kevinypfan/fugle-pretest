import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { isNumeric } from './utils';
// import { Observable } from 'rxjs';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { RL_TTL, RL_LIMIT_ID, RL_LIMIT_IP } = process.env;

    const req = context.switchToHttp().getRequest();

    const userId = req.query.user;
    const ip = req.ip;

    const ipCount = await this.rlCheck({ key: ip, ttl: +RL_TTL });

    this.validateUserId(userId);

    const userIdCount = await this.rlCheck({ key: userId, ttl: +RL_TTL });

    if (ipCount > +RL_LIMIT_IP || userIdCount > +RL_LIMIT_ID)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: { ip: ipCount, id: userIdCount },
        },
        429,
      );
    return true;
  }

  async rlCheck({ key, ttl = 60 }: { key: string; ttl?: number }) {
    const now = Date.now();
    const clearBefore = now - ttl * 1000;
    const batch = this.redis.multi();
    batch.zremrangebyscore(`rl:${key}`, 0, clearBefore);
    batch.zadd(`rl:${key}`, String(now), uuid());
    batch.zrange(`rl:${key}`, 0, -1, 'WITHSCORES');
    batch.expire(`rl:${key}`, ttl);

    const results = await batch.exec();
    const arr: any = results[2];
    const count = arr[1].length / 2;

    return count;
  }

  validateUserId(userId) {
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
  }
}
