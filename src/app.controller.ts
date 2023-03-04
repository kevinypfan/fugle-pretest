import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import fetch from 'node-fetch';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/data')
  async getData(@Query('user') userId): Promise<object> {
    console.log(userId);
    const result = await this.appService.getData();
    return { result };
  }
}
