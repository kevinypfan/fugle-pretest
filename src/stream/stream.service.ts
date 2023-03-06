import { Injectable, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { timer } from 'rxjs';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { ICargo, IMessage, ITrade } from 'src/app.interface';
import { CHANNELS } from './steam.constants';
import { Server } from 'ws';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {
    CHANNELS.forEach((channel) => (this.subMap[channel] = []));
    this.connect();
    setInterval(() => {
      this.logClients();
    }, 20000);
  }

  logClients() {
    const { subMap, subCounter, clients } = this;
    const subMapLens = {};
    const subCounterSizes = {};
    const subCounterMap = {};
    Object.keys(subMap).forEach((key) => {
      subMapLens[key] = subMap[key].length;
    });
    Object.keys(subMapLens).forEach((key) => {
      if (subMapLens[key] === 0) delete subMapLens[key];
    });

    Object.keys(subCounter).forEach((key) => {
      subCounterSizes[key] = subCounter[key].size;
      subCounterMap[key] = Array.from(subCounter[key]);
    });

    Object.keys(subCounter).forEach((key) => {
      if (subCounterSizes[key] === 0) delete subCounterSizes[key];
      subCounterMap[key] = Array.from(subCounter[key]);
    });

    this.logger.log({
      subMapLens,
      subCounterMap,
      subCounterSizes,
      clientsLen: clients.length,
    });
  }

  subMap = {};
  subCounter: { [key: string]: Set<string> } = {};
  clients = [];

  client: WebSocket;
  server: Server;

  isConnect = false;

  connect() {
    // this.redis.set('test', 'qwe');
    // this.redis.expire('test', 40);
    this.client = new WebSocket('wss://ws.bitstamp.net');
    this.client.on('open', () => {
      console.log('connected!');
      this.isConnect = true;
      CHANNELS.forEach((channel) => this.subscribeTrade(channel));
    });

    this.client.on('error', (message) => {
      this.client.close();
      this.isConnect = false;
    });

    this.client.on('close', (message) => {
      timer(1000).subscribe(() => {
        this.isConnect = false;
        this.connect();
      });
    });

    this.client.on('message', (message) => {
      //handler
      const msg: IMessage = JSON.parse(message.toString());
      if (msg.event === 'trade') {
        const currencyPair = msg.channel.substring(12);
        const key = `${msg.event}:${currencyPair}:${msg.data.timestamp}`;
        const batch = this.redis.multi();
        batch.set(key, JSON.stringify(msg.data));
        batch.expire(key, 60);
        batch.exec();

        const cargo: ICargo<ITrade> = {
          event: msg.event,
          currencyPairs: [currencyPair],
          data: msg.data,
        };

        this.subMap[currencyPair].forEach((ws) => {
          ws.send(JSON.stringify(cargo));
        });
      }
    });
  }

  getIsConnect() {
    return this.isConnect;
  }

  subscribeTrade(currencyPair: string) {
    const message = {
      event: 'bts:subscribe',
      data: {
        channel: 'live_trades_' + currencyPair,
      },
    };

    this.client.send(JSON.stringify(message));
  }

  unsubscribeTrade(currencyPair: string) {
    const message = {
      event: 'bts:unsubscribe',
      data: {
        channel: 'live_trades_' + currencyPair,
      },
    };
    this.client.send(JSON.stringify(message));
  }
}
