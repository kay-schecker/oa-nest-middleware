import { Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { difference, has, uniq } from 'lodash';
import { Adapter } from '../adapter/adapter.interface';
import { MiddlewareConfig } from '../config/middleware-config.interface';

interface ValidationResultForGuard {
  authenticated: boolean,
  authorized: boolean,
}

@Injectable()
export class AuthService {

  constructor(
    @Inject(Adapter) private readonly adapter: Adapter,
    @Inject(MiddlewareConfig) options: MiddlewareConfig,
  ) {
  }

  async checkPermissions(operation, requestBodySchema, req: Request): Promise<Map<string, ValidationResultForGuard>> {

    const operationPermissions = await this.adapter.getOperationPermissions(operation);
    const reqBodyPermissions = requestBodySchema && await this.adapter.getPropertyPermissions(requestBodySchema);

    const guardNames = uniq([
      ...operationPermissions.keys(),
      ...(reqBodyPermissions ? reqBodyPermissions.keys() : []),
    ]);

    const grantedPermissions = await this.getGrantedPermissions(req, operationPermissions.keys());

    return guardNames.reduce((acc, guardName) => {

      const granted = grantedPermissions.get(guardName);
      const authorized = grantedPermissions.has(guardName);

      const required = {
        forOperation: operationPermissions.get(guardName),
        forProperty: Array
          .from(reqBodyPermissions && reqBodyPermissions.get(guardName) || [])
          .filter(([key]) => has(req.body, key)),
      }

      const missing = {
        forOperation: difference(required.forOperation, granted),
        forProperty: required.forProperty.reduce((acc, [propPath, propPerms]) => {

          if (has(req.body, propPath)) {
            const missingPropPerms = difference(propPerms, granted);
            if (missingPropPerms.length > 0) {
              acc.set(propPath, missingPropPerms);
            }
          }

          return acc;
        }, new Map())
      }

      acc.set(guardName, {
        authenticated: missing.forOperation.length < 1 && missing.forProperty.size < 1,
        authorized,
      })

      return acc;
    }, new Map());

  }

  protected async getGrantedPermissions(req: Request, guardNames: IterableIterator<string>) {

    const guards = await this.adapter.guards;
    const map = new Map<string, string[]>();

    for (const name of guardNames) {

      const guard = guards.get(name);
      if (!await guard.canHandle(req)) {
        continue;
      }

      const result = await guard.authenticate(req);
      if (!result || result.length < 1) {
        continue;
      }

      map.set(name, await guard.getPermissions(result));

    }

    return map;

  }

}
