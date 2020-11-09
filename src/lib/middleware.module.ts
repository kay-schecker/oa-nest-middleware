import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { dereference } from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { startsWith } from 'lodash';
import { ErrorService } from './error/error.service';
import { MiddlewareService } from './middleware.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { MiddlewareLogger } from './middleware.logger';
import { AuthGuardFactory } from './auth/guard/auth-guard.factory';
import { Adapter } from './adapter/adapter.interface';
import { OpenApiV3Adapter } from './adapter/openapi-v3.adapter';

@Module({
  providers: [
    MiddlewareLogger,
    AuthGuardFactory,
    ErrorService,
  ]
})
export class MiddlewareModule implements NestModule {

  static async register(options: MiddlewareConfig): Promise<DynamicModule> {
    options.spec = await dereference(options.spec) as OpenAPIV3.Document;
    const adapter = options.adapter || startsWith(options.spec.openapi, '3.') ? OpenApiV3Adapter : undefined

    return {
      global: false,
      module: MiddlewareModule,
      providers: [
        {provide: Adapter, useClass: adapter},
        {provide: MiddlewareConfig, useValue: options},
      ],
    }
  }

  constructor(
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig
  ) {
  }

  configure(consumer: MiddlewareConsumer) {
    const mw = consumer.apply(MiddlewareService)

    if (this.options.excludes && this.options.excludes.length > 0) {
      mw.exclude(...this.options.excludes);
    }

    mw.forRoutes(...(this.options.routes || ['*']));
  }

}
