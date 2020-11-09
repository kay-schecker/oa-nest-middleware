import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/pets')
  getPets(): string {
    return 'HELLO PETS';
  }

  @Post('/pets')
  createPet(): string {
    return 'HELLO PETS';
  }

}
