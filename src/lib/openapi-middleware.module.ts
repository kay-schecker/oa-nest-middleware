import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { OpenApiMiddlewareConfig } from './interfaces/openapi-middleware.config';
import { OpenApiMiddlewareService } from './openapi-middleware.service';
import { OpenApiAdapter } from './interfaces/openapi-adapter';
import { OpenApiDefaultAdapter } from './adapters/openapi-default-adapter';
import { OpenApiMiddlewareExceptionService } from './openapi-middleware-exception.service';
import { dereference } from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';

@Module({
  providers: [
    OpenApiMiddlewareExceptionService,
  ]
})
export class OpenApiMiddlewareModule implements NestModule {

  static async register(options: OpenApiMiddlewareConfig): Promise<DynamicModule> {

    options.spec = await dereference(options.spec) as OpenAPIV3.Document;

    return {
      module: OpenApiMiddlewareModule,
      providers: [
        {provide: OpenApiMiddlewareConfig, useValue: options},
        {
          provide: OpenApiAdapter, useClass: options.adapter || OpenApiDefaultAdapter,
        }
      ],
    }
  }

  constructor(
    @Inject(OpenApiMiddlewareConfig) private readonly options: OpenApiMiddlewareConfig
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
