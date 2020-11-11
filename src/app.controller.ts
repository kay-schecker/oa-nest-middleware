import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('/pets')
  getPets(): string {
    return 'HELLO PETS';
  }

  @Get('/posts')
  getPosts(): string {
    return 'HELLO POSTS';
  }

  @Post('/pets')
  createPet(): string {
    return 'HELLO PETS';
  }

}
