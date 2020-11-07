import { Request } from 'express';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareErrorService } from './error/middleware-error.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { OpenAPIV3 as _ } from 'openapi-types';

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
    this.errorService.throwIfFalsy(operation, 'reqOperationNotFound', req);
    this.adapter.validateRequestHeaders(req, operation);

    const responseContentType = await this.adapter.getResponseContentTypeByRequest(req);
    this.errorService.throwIfFalsy(responseContentType, 'resBadContentType', req);

    const requiredPermissions = await this.adapter.getRequiredPermissionsByOperation(operation);

    if (requiredPermissions && requiredPermissions.length > 0) {
      const grantedPermissions = await this.adapter.getGrantedPermissionsByRequest(req);

      if (!grantedPermissions || grantedPermissions.length < 1) {
        this.errorService.throw('reqUnauthorized', req);
      }
    }

    next();

  }

}
