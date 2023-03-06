import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ICargo, IMessage, ITrade } from 'src/app.interface';
import { Server } from 'ws';
import { StreamService } from './stream.service';
import { v4 as uuid } from 'uuid';
import { TradeService } from 'src/stream/trade.service';

interface ICpToClientMap {
  [key: string]: any[];
}

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
    this.streamService.clients.push(client);

    // const userID = req.headers['sec-websocket-key'];
    // this.clientMap[userID] = client;
    // console.log(
    //   'connected: ' + userID + ' in ' + Object.getOwnPropertyNames(client),
    // );
  }

  handleDisconnect(client) {
    for (let i = 0; i < this.streamService.clients.length; i++) {
      if (this.streamService.clients[i] === client) {
        this.streamService.clients.splice(i, 1);
        break;
      }
    }
    // this.broadcast('disconnect',{});
  }

  private broadcast(event, message: any) {
    const broadCastMessage = JSON.stringify({ event, message });
    for (const c of this.streamService.clients) {
      c.send(broadCastMessage);
    }
  }

  @SubscribeMessage('bts:OHLC')
  async test(client: any, data: any): Promise<ICargo<any>> {
    const reuslt = data.currencyPairs.map(async (currencyPair) => {
      //   this.streamService.subscribeTrade(currencyPair);
      console.log(currencyPair);

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
    data.currencyPairs.forEach((currencyPair) => {
      this.streamService.subMap[currencyPair].push(client);
    });

    return {
      event: 'bts:subscription_succeeded',
      currencyPairs: data.currencyPairs,
      data: null,
    };
  }

  @SubscribeMessage('bts:unsubscribe')
  async unsubscribe(client: any, data: any): Promise<ICargo<ITrade>> {
    data.currencyPairs.forEach((currencyPair) => {
      const clients = this.streamService.subMap[currencyPair];

      for (let i = 0; i < clients.length; i++) {
        if (clients[i] === client) {
          clients.splice(i, 1);
          break;
        }
      }
    });
    return {
      event: 'bts:unsubscription_succeeded',
      currencyPairs: data.currencyPairs,
      data: null,
    };
  }
}
