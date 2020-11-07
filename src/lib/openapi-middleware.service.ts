import { Request } from 'express';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { OpenApiMiddlewareConfig } from './interfaces/openapi-middleware.config';
import { OpenApiAdapter } from './interfaces/openapi-adapter';
import { OpenApiMiddlewareExceptionService } from './openapi-middleware-exception.service';

@Injectable()
export class OpenApiMiddlewareService implements NestMiddleware {

  constructor(
    @Inject(OpenApiAdapter) private readonly adapter: OpenApiAdapter,
    @Inject(OpenApiMiddlewareConfig) private readonly options: OpenApiMiddlewareConfig,
    private readonly exceptionService: OpenApiMiddlewareExceptionService,
  ) {
  }

  async use(req: Request, res: Response, next: Function) {

    const operation = await this.adapter.getOperationByRequest(req);
    this.exceptionService.throwIfFalsy(operation, 'operationNotFound', req);

    const responseContentType = await this.adapter.getResponseContentTypeByRequest(req);
    this.exceptionService.throwIfFalsy(responseContentType, 'badContentType', req);

    next();

  }

}
