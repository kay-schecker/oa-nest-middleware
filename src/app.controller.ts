import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('/pets')
  getPets(): string {
    return 'HELLO PETS';
  }

  @Post('/pets')
  createPet(): string {
    return 'HELLO PETS';
  }

}
