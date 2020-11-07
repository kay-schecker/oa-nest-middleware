import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenApiMiddlewareModule } from './lib';

@Module({
  imports: [
    OpenApiMiddlewareModule.register({
      spec: require('./specs/petstore.json'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
