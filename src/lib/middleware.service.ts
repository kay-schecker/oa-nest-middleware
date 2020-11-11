import { Inject, Injectable, NestMiddleware, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { difference, uniq } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { Adapter } from './adapter/adapter.interface';
import { AuthGuard } from './auth/guard/auth-guard';
import { AuthGuardFactory } from './auth/guard/auth-guard.factory';
import { MiddlewareConfig } from './config/middleware-config.interface';
import { ErrorService } from './error/error.service';
import { OperationForbiddenException } from './exceptions';
import { MiddlewareLogger } from './middleware.logger';

@Injectable()
export class MiddlewareService implements NestMiddleware, OnModuleInit {

  protected readonly document: OpenAPIV3.Document;

  constructor(
    @Inject(Adapter) private readonly adapter: Adapter,
    @Inject(MiddlewareConfig) options: MiddlewareConfig,
    private readonly guardFactory: AuthGuardFactory,
    private readonly errorService: ErrorService,
    private readonly logger: MiddlewareLogger,
  ) {
    this.document = options.spec;
  }

  async onModuleInit() {
    //
  }

  async use(req: Request, res: Response, next: Function) {

    // req.method = 'post'
    this.logger.log('handle request')

    const operation = await this.adapter.getOperationByRequest(req);
    this.adapter.validateRequestHeaders(req, operation);

    const responseContentType = await this.adapter.getResponseContentTypeByRequest(req);
    const operationPermissions = await this.adapter.getRequiredPermissionsByOperation(operation);

    // console.log(operationPermissions)

    if (operationPermissions.size > 0) {

      const authResults = await this.authenticate(req, operationPermissions.keys());

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
          this.logger.log('handle request success')
          next();
          return;
        }

      }

      this.errorService.throw(new OperationForbiddenException(permission));

    }

    this.logger.log('handle request success')
    next();

  }

  protected async authenticate(req: Request, guardNames: IterableIterator<string>) {

    const guards = await this.adapter.guards;

    const map = new Map<string, {
      guard: AuthGuard,
      getPermissions: () => Promise<string[]>,
    }>();

    for (const name of guardNames) {

      const guard = guards.get(name);

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
