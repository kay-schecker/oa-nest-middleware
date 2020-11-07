import { Request } from 'express';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareErrorService } from './error/middleware-error.service';
import { MiddlewareConfig } from './config/middleware-config.interface';

@Injectable()
export class MiddlewareService implements NestMiddleware {

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
