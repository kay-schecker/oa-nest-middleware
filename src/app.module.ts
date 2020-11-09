import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';

import { AppController } from './app.controller';
import { MiddlewareModule } from './lib';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: resolve(__dirname, '../src/static'),
    }),
    MiddlewareModule.register({
      spec: require('./specs/petstore.json'),
      excludes: ['.well-known/(.*)']
    }),
  ],
  controllers: [AppController],
})
export class AppModule {
}
