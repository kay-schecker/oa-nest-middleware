import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { dereference } from 'swagger-parser';
import { OpenAPIV3 as _, OpenAPIV3 } from 'openapi-types';
import { MiddlewareDefaultAdapter } from './adapter/middleware-default-adapter';
import { MiddlewareErrorService } from './error/middleware-error.service';
import { MiddlewareService } from './middleware.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareAuthGuards } from './auth/guard/middleware-auth-guards.token';
import { MiddlewareAuthGuardFactory } from './auth/guard/middleware-auth-guard.factory';
import { MiddlewareLogger } from './middleware.logger';

@Module({
  providers: [
    MiddlewareLogger,
    MiddlewareErrorService,
  ]
})
export class MiddlewareModule implements NestModule {

  static async register(options: MiddlewareConfig): Promise<DynamicModule> {

    const {doc, securitySchemes} = await MiddlewareModule.loadSpec(options.spec);
    options.spec = doc;

    return {
      global: false,
      module: MiddlewareModule,
      providers: [
        {provide: MiddlewareConfig, useValue: options},
        {provide: MiddlewareAdapter, useClass: options.adapter || MiddlewareDefaultAdapter},
        {provide: MiddlewareAuthGuards, useValue: securitySchemes},
      ],
    }
  }

  private static async loadSpec(spec: OpenAPIV3.Document) {

    const doc = await dereference(spec) as OpenAPIV3.Document;

    return {
      doc,
      securitySchemes: (
        await Promise.all(Object
          .entries(doc.components?.securitySchemes || {})
          .map(async ([key, cfg]) => [
            key,
            await MiddlewareAuthGuardFactory.factory(cfg as _.SecuritySchemeObject),
          ]))
      ).reduce((acc, [key, scheme]) => ({
        ...acc,
        [String(key)]: scheme,
      }), {}),
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
