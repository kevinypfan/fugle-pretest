import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getData(): Promise<number[]> {
    const url =
      'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty';

    const response = await fetch(url);
    if (response.status !== 200) throw `status not equals 200`;
    const data = await response.json();
    return data as number[];
  }
}
