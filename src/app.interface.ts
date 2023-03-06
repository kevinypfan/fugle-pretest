export interface ITrade {
  id: number;
  amount: number;
  amount_str: string;
  price: number;
  price_str: string;
  type: number;
  timestamp: string;
  microtimestamp: string;
  buy_order_id: number;
  sell_order_id: number;
}

export interface IMessage {
  data: ITrade;
  channel: string;
  event: string;
}

export interface ICargo<T> {
  data: T;
  currencyPairs: string[];
  event: string;
}
