import { Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { difference, has, uniq } from 'lodash';

import { Adapter } from '../adapter/adapter.interface';
import { MiddlewareConfig } from '../config/middleware-config.interface';
import { AuthResult } from './auth-result.model';

@Injectable()
export class AuthService {

  constructor(
    @Inject(Adapter) private readonly adapter: Adapter,
    @Inject(MiddlewareConfig) options: MiddlewareConfig,
  ) {
  }

  async checkPermissions(operation, requestBodySchema, req: Request): Promise<AuthResult> {

    const operationPermissions = await this.adapter.getOperationPermissions(operation);
    const reqBodyPermissions = requestBodySchema && await this.adapter.getPropertyPermissions(requestBodySchema);

    const guardNames = uniq([
      ...operationPermissions.keys(),
      ...(reqBodyPermissions ? reqBodyPermissions.keys() : []),
    ]);

    const grantedPermissions = await this.getGrantedPermissions(req, guardNames);

    return guardNames.reduce((acc, guardName) => {

      const granted = grantedPermissions.get(guardName);

      const required = {
        forOperation: operationPermissions.get(guardName),
        forProperty: Array
          .from(reqBodyPermissions && reqBodyPermissions.get(guardName) || [])
          .filter(([key]) => has(req.body, key)),
      }

      const missing = {
        forOperation: difference(required.forOperation, granted),
        forProperty: required.forProperty
          // check only the permissions for the properties that were sent.
          .filter(([propPath]) => has(req.body, propPath))
          // validate ...
          .reduce((pAcc, [propPath, propPerms]) => {
            const missingPropPerms = difference(propPerms, granted);
            return missingPropPerms.length > 0 ? {...pAcc, [propPath]: missingPropPerms} : pAcc;
          }, {})
      }

      return {
        ...acc,
        [guardName]: {
          authorized: grantedPermissions.has(guardName),
          authenticated: missing.forOperation.length < 1 && Object.keys(missing.forProperty).length < 1,
          permissions: {required, missing, granted},
        }
      }

    }, {});

  }

  protected async getGrantedPermissions(req: Request, guardNames: string[]) {

    const map = new Map<string, string[]>();
    const guards = await this.adapter.guards;

    for (const name of guardNames) {
      const guard = guards.get(name);
      if (!await guard.canHandle(req)) {
        continue;
      }

      const result = await guard.authenticate(req);
      if (result && result.length > 0) {
        map.set(name, await guard.getPermissions(result));
      }
    }

    return map;

  }

}
