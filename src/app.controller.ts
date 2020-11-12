import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('/pets')
  getPets() {
    return [];
  }

  @Get('/posts')
  getPosts() {
    return [];
  }

  @Post('/pets')
  createPet(@Body() pet: any) {
    return pet
  }

}
