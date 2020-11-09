import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OpenAPIV3 as _ } from 'openapi-types';
import { Request } from 'express';
import { flattenDeep, trimEnd, trimStart, uniq } from 'lodash';
import jsonpath from 'jsonpath';
import { parse as parseUrl } from 'url';

import { MiddlewareAdapter } from './middleware-adapter.interface';
import { MiddlewareConfig } from '../config/middleware-config.interface';
import { MiddlewareErrorService } from '../error/middleware-error.service';
import * as e from '../exceptions';
import { MiddlewareAuthGuards } from '../auth/guard/middleware-auth-guards.token';
import { MiddlewareAuthGuard } from '../auth/guard/middleware-auth-guard';

@Injectable()
export class MiddlewareDefaultAdapter implements MiddlewareAdapter {

  protected readonly basePaths: string[];
  protected readonly spec: MiddlewareConfig['spec'];

  protected readonly paths: Map<string, _.PathItemObject> = new Map();
  protected readonly regPaths: Map<RegExp, _.PathItemObject> = new Map();

  constructor(
    @Inject(MiddlewareConfig) protected readonly options: MiddlewareConfig,
    @Inject(MiddlewareAuthGuards) protected readonly securitySchemes: Record<string, MiddlewareAuthGuard>,
    private readonly errorService: MiddlewareErrorService,
  ) {
    this.spec = options.spec
    this.basePaths = uniq(this.spec.servers.map(({url}) => parseUrl(url).pathname));

    for (const path of Object.keys(this.spec.paths)) {
      for (const basePath of this.basePaths) {
        const p = `${trimEnd(basePath, '/')}/${trimStart(path, '/')}`;
        const r = p.replace(/(\{([a-z]+)\})/igm, '(?<$2>.+)');

        this.paths.set(p, this.spec.paths[path]);
        this.regPaths.set(new RegExp(`^${r}$`, 'i'), this.spec.paths[path]);
      }
    }
  }

  async getOperationByRequest(req: Request) {
    for (const [regExp, value] of this.regPaths.entries()) {
      if (req.baseUrl.match(regExp)) {
        for (const method in value) {
          if (method.toLowerCase() === req.method.toLowerCase() && value.hasOwnProperty(method)) {
            return value[method];
          }
        }
      }
    }

    this.errorService.throw(e.OperationNotFoundException);
  }

  getAuthGuardsForOperation(operation: _.OperationObject) {
    const schemes = uniq(flattenDeep(operation.security.map((a) => Object.keys(a))));
    return new Map(schemes.map((name) => [name, this.securitySchemes[name]]));
  }

  getRequiredPermissionsByOperation(operation: _.OperationObject) {
    const map = new Map();
    for (const sec of (operation.security || [])) {
      for (const [name, perm] of Object.entries(sec)) {
        map.set(name, perm);
      }
    }
    return map;
  }

  getRequiredPermissionsBySchema(schema: _.SchemaObject) {

    return new Map();

    const nodes = jsonpath.nodes(schema.properties, '$..["x-permissions"]');
    return nodes.reduce((acc, node) => {

      const propPath = node.path.slice(1, -1).join('.');

      for (const permission of node.value) {

        if (!acc[propPath]) {
          acc[propPath] = [];
        }

        acc[propPath] = acc[propPath].concat(permission);
      }

      return acc;
    }, {});
  }

  getGrantedPermissionsByRequest(req: Request): string[] {
    // @todo implement me
    return []
  }

  getResponseContentTypeByRequest = (req: Request) => {
    // this.errorService.throw(e.ContentTypeNotSupportedException);
    return 'application/json';
  };

  validateRequestHeaders(req: Request, operation: _.OperationObject) {

    const reqContentType = req.headers['content-type'];

    // a content-type header was sent but unexpected
    this.errorService.throwIfTruthy(reqContentType && !operation.requestBody, e.BadHeaderException);

    if (operation.requestBody) {
      // the requested content-type is not supported
      const {content} = (operation.requestBody as _.RequestBodyObject)
      this.errorService.throwIfFalsy(content[reqContentType], BadRequestException);
    }
  }

}
