import { Module } from '@nestjs/common';
import { StreamGateway } from './Stream.gateway';
import { StreamService } from './stream.service';
import { TradeService } from './trade.service';

@Module({
  providers: [StreamGateway, StreamService, TradeService],
  exports: [TradeService],
})
export class StreamModule {}
