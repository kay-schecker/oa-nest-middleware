import { Request } from 'express';
import { Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { MiddlewareAdapter } from './adapter/middleware-adapter.interface';
import { MiddlewareErrorService } from './error/middleware-error.service';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { difference, uniq } from 'lodash';
import { MiddlewareAuthGuard } from './auth/guard/middleware-auth-guard';
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
    const operationPermissions = await this.adapter.getRequiredPermissionsByOperation(operation);
    // const schemaPermissions = await this.adapter.getRequiredPermissionsBySchema(operation.requestBody[]);

    const guards = await this.adapter.getAuthGuardsForOperation(operation);

    if (guards.size > 0) {

      const authResults = await this.authenticate(req, guards);
      this.errorService.throwIfTruthy(authResults.size < 1, UnauthorizedException)

      const permission = new Map<string, {
        granted: string[]
        missing: string[]
        required: {
          forAll: string[]
          forOperation: string[]
        };
      }>();

      for (const [name, auth] of authResults) {

        const forOperation = operationPermissions.get(name) || [];

        const res = {
          granted: await auth.getPermissions(),
          required: {
            forAll: uniq([...forOperation]),
            forOperation,
          },
        }

        const missingPermissions = difference(res.required.forAll, res.granted);
        permission.set(name, {...res, missing: missingPermissions});

        if (missingPermissions.length < 1) {
          next();
          return;
        }

      }

      this.errorService.throw(new OperationForbiddenException(permission));

    }

    next();

  }

  protected async authenticate(req: Request, guards: Map<string, MiddlewareAuthGuard>) {

    const map = new Map<string, {
      guard: MiddlewareAuthGuard,
      getPermissions: () => Promise<string[]>,
    }>();

    for (const [name, guard] of guards) {

      if (!await guard.canHandle(req)) {
        continue;
      }

      const result = await guard.authenticate(req);

      if (!result || result.length < 1) {
        continue;
      }

      map.set(name, {
        guard,
        getPermissions: () => guard.getPermissions(result)
      });

    }

    return map;
  }

}
