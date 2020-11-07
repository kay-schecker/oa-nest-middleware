import { Request } from 'express';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareConfig } from './config/openapi-middleware.config';
import { MiddlewareErrorService } from './error/middleware-error.service';

@Injectable()
export class OpenApiMiddlewareService implements NestMiddleware {

  constructor(
    @Inject(MiddlewareAdapter) private readonly adapter: MiddlewareAdapter,
    @Inject(MiddlewareConfig) private readonly options: MiddlewareConfig,
    private readonly errorService: MiddlewareErrorService,
  ) {
  }

  async use(req: Request, res: Response, next: Function) {

    const operation = await this.adapter.getOperationByRequest(req);
    this.errorService.throwIfFalsy(operation, 'operationNotFound', req);

    const responseContentType = await this.adapter.getResponseContentTypeByRequest(req);
    this.errorService.throwIfFalsy(responseContentType, 'badResponseContentType', req);

    next();

  }

}
