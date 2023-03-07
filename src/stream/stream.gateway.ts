import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ICargo, ITrade } from 'src/app.interface';
import { Server } from 'ws';
import { StreamService } from './stream.service';
import { v4 as uuid } from 'uuid';
import { TradeService } from 'src/stream/trade.service';
import { CHANNELS } from './steam.constants';

@WebSocketGateway({ path: '/streaming' })
export class StreamGateway {
  constructor(
    private readonly streamService: StreamService,
    private readonly tradeService: TradeService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.streamService.server = server;
  }

  handleConnection(client, req) {
    client.uuid = uuid();
    this.streamService.subCounter[client.uuid] = new Set();
    this.streamService.clients.push(client);

    // const userID = req.headers['sec-websocket-key'];
    // this.clientMap[userID] = client;
    // console.log(
    //   'connected: ' + userID + ' in ' + Object.getOwnPropertyNames(client),
    // );
  }

  handleDisconnect(client) {
    delete this.streamService.subCounter[client.uuid];
    for (let i = 0; i < this.streamService.clients.length; i++) {
      if (this.streamService.clients[i] === client) {
        this.streamService.clients.splice(i, 1);
        break;
      }
    }

    CHANNELS.forEach((currencyPair) => {
      const clients = this.streamService.subMap[currencyPair];

      for (let i = 0; i < clients.length; i++) {
        if (clients[i] === client) {
          clients.splice(i, 1);
          break;
        }
      }
    });
    // this.broadcast('disconnect',{});
  }

  private broadcast(event, message: any) {
    const broadCastMessage = JSON.stringify({ event, message });
    for (const c of this.streamService.clients) {
      c.send(broadCastMessage);
    }
  }

  @SubscribeMessage('bts:OHLC')
  async getOHLC(client: any, data: any): Promise<ICargo<any>> {
    const reuslt = data.currencyPairs.map(async (currencyPair) => {
      const data = {
        ...(await this.tradeService.getOpenCloseTrade(currencyPair)),
        ...(await this.tradeService.getHighLowTrade(currencyPair)),
      };

      return data;
    });

    return {
      event: 'bts:OHLC',
      currencyPairs: data.currencyPairs,
      data: await Promise.all(reuslt),
    };
  }

  @SubscribeMessage('bts:subscribe')
  subscribe(client: any, data: any): ICargo<ITrade> {
    const copySet = new Set([
      ...Array.from(this.streamService.subCounter[client.uuid]),
      ...data.currencyPairs,
    ]);

    // console.log(copySet.size);
    if (copySet.size > 10)
      return {
        event: 'bts:subscription_failded',
        currencyPairs: data.currencyPairs,
        data: null,
      };

    data.currencyPairs.forEach((currencyPair) => {
      if (
        this.streamService.subMap[currencyPair] &&
        this.streamService.subMap[currencyPair].indexOf(client) < 0
      ) {
        this.streamService.subMap[currencyPair].push(client);
        this.streamService.subCounter[client.uuid].add(currencyPair);
      }
    });

    return {
      event: 'bts:subscription_succeeded',
      currencyPairs: Array.from(this.streamService.subCounter[client.uuid]),
      data: null,
    };
  }

  @SubscribeMessage('bts:unsubscribe')
  async unsubscribe(client: any, data: any): Promise<ICargo<ITrade>> {
    const unsubCurrencyPairs = [];
    data.currencyPairs.forEach((currencyPair) => {
      const clients = this.streamService.subMap[currencyPair];

      for (let i = 0; i < clients.length; i++) {
        if (clients[i] === client) {
          clients.splice(i, 1);
          const isDeleted =
            this.streamService.subCounter[client.uuid].delete(currencyPair);
          if (isDeleted) unsubCurrencyPairs.push(currencyPair);
          break;
        }
      }
    });
    return {
      event: 'bts:unsubscription_succeeded',
      currencyPairs: unsubCurrencyPairs,
      data: null,
    };
  }
}
