import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { startsWith } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { dereference } from 'swagger-parser';
import { Adapter } from './adapter/adapter.interface';
import { OpenApiV3Adapter } from './adapter/openapi-v3.adapter';
import { AuthService } from './auth/auth.service';
import { AuthGuardFactory } from './auth/guard/auth-guard.factory';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { ErrorService } from './error/error.service';
import { MiddlewareLogger } from './middleware.logger';
import { MiddlewareService } from './middleware.service';

@Module({
  providers: [
    MiddlewareLogger,
    AuthService,
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
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig,
  ) {
  }

  configure(consumer: MiddlewareConsumer) {
    const mw = consumer.apply(MiddlewareService)

    if (this.options.excludes && this.options.excludes.length > 0) {
      mw.exclude(...this.options.excludes);
    }

    // @todo register only for routes define in spec? Feature flag?
    mw.forRoutes(...(this.options.routes || ['*']));
  }

}
