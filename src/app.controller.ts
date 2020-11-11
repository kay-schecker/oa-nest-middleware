import { Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('/pets')
  getPets(): string {
    console.log('GET PETS')
    return 'HELLO PETS';
  }

  @Get('/posts')
  getPosts(): string {
    console.log('GET POSTS')
    return 'HELLO POSTS';
  }

  @Post('/pets')
  createPet(): string {
    return 'HELLO PETS';
  }

}
