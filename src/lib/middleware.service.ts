import { Request } from 'express';
import { Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareErrorService } from './error/middleware-error.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { difference } from 'lodash';
import { OperationForbiddenException } from './exceptions';

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
    this.adapter.validateRequestHeaders(req, operation);

    const responseContentType = await this.adapter.getResponseContentTypeByRequest(req);
    const requiredPermissions = await this.adapter.getRequiredPermissionsByOperation(operation);

    if (requiredPermissions && requiredPermissions.length > 0) {
      const grantedPermissions = await this.adapter.getGrantedPermissionsByRequest(req);
      this.errorService.throwIfTruthy(grantedPermissions.length < 1, UnauthorizedException);

      const missingOperationPermissions = difference(requiredPermissions, grantedPermissions);
      this.errorService.throwIfTruthy(missingOperationPermissions.length > 0, new OperationForbiddenException(
        grantedPermissions,
        requiredPermissions,
        missingOperationPermissions,
      ))
    }

    next();

  }

}
