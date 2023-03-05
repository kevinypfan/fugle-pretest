import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { RedisService } from './redis.service';
import { v4 as uuid } from 'uuid';

// import { Observable } from 'rxjs';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { RL_TTL, RL_LIMIT_ID, RL_LIMIT_IP } = process.env;
    console.log({ RL_TTL, RL_LIMIT_ID, RL_LIMIT_IP });

    const req = context.switchToHttp().getRequest();

    const userId = req.query.user;
    const ip = req.ip;
    const userIdCount = await this.rlCheck({ key: userId, ttl: +RL_TTL });
    const ipCount = await this.rlCheck({ key: ip, ttl: +RL_TTL });
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
    const batch = this.redisService.client.multi();
    batch.zremrangebyscore(`rl:${key}`, 0, clearBefore);
    batch.zadd(`rl:${key}`, String(now), uuid());
    batch.zrange(`rl:${key}`, 0, -1, 'WITHSCORES');
    batch.expire(`rl:${key}`, ttl);

    const results = await batch.exec();
    const arr: any = results[2];
    const count = arr[1].length / 2;

    return count;
  }
}
