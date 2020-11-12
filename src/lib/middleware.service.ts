import { Inject, Injectable, NestMiddleware, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Adapter } from './adapter/adapter.interface';
import { AuthService } from './auth/auth.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { ErrorService } from './error/error.service';
import { OperationForbiddenException } from './exceptions';
import { MiddlewareLogger } from './middleware.logger';

@Injectable()
export class MiddlewareService implements NestMiddleware, OnModuleInit {

  protected readonly document: MiddlewareConfig['spec'];

  constructor(
    @Inject(Adapter) private readonly adapter: Adapter,
    @Inject(MiddlewareConfig) options: MiddlewareConfig,
    private readonly authService: AuthService,
    private readonly errorService: ErrorService,
    private readonly logger: MiddlewareLogger,
  ) {
    this.document = options.spec;
  }

  async onModuleInit() {
    //
  }

  async use(req: Request, res: Response, next: Function) {

    this.logger.log('handle request')

    const operation = await this.adapter.getOperation(req);
    this.adapter.validateRequestHeaders(req, operation);

    const requestBodySchema = this.adapter.getRequestBodySchema(req, operation);
    const result = await this.authService.checkPermissions(operation, requestBodySchema, req);
    const resultEntries = Object.entries(result)

    if (resultEntries.length > 0) {
      const authorizedGuards = resultEntries.filter(([, {authorized}]) => authorized);
      if (authorizedGuards.length < 1) {
        this.errorService.throw(UnauthorizedException);
      }

      const authenticatedGuards = authorizedGuards.filter(([, {authenticated}]) => authenticated);
      if (authenticatedGuards.length < 1) {
        this.errorService.throw(new OperationForbiddenException(result));
      }
    }

    this.logger.log('handle request success')
    next();

  }

}
