import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { OpenApiMiddlewareService } from './openapi-middleware.service';
import { OpenApiMiddlewareExceptionService } from './openapi-middleware-exception.service';
import { dereference } from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { MiddlewareConfig } from './config/openapi-middleware.config';
import { MiddlewareDefaultAdapter } from './adapter/middleware-default-adapter';

@Module({
  providers: [
    OpenApiMiddlewareExceptionService,
  ]
})
export class OpenApiMiddlewareModule implements NestModule {

  static async register(options: MiddlewareConfig): Promise<DynamicModule> {

    options.spec = await dereference(options.spec) as OpenAPIV3.Document;

    return {
      module: OpenApiMiddlewareModule,
      providers: [
        {provide: MiddlewareConfig, useValue: options},
        {provide: MiddlewareDefaultAdapter, useClass: options.adapter || MiddlewareDefaultAdapter},
      ],
    }
  }

  constructor(
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig
  ) {
  }

  configure(consumer: MiddlewareConsumer) {
    const mw = consumer.apply(OpenApiMiddlewareService)

    if (this.options.excludes && this.options.excludes.length > 0) {
      mw.exclude(...this.options.excludes);
    }

    mw.forRoutes(...(this.options.routes || ['*']));
  }

}
