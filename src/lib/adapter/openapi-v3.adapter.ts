import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Request } from 'express';
import jsonpath from 'jsonpath';
import { trimEnd, trimStart, uniq } from 'lodash';
import { OpenAPIV3 as _ } from 'openapi-types';
import { parse as parseUrl } from 'url';
import { AuthGuardFactory } from '../auth/guard/auth-guard.factory';
import { MiddlewareConfig } from '../config/middleware-config.interface';
import { ErrorService } from '../error/error.service';
import * as e from '../exceptions';

import { Adapter } from './adapter.interface';

@Injectable()
export class OpenApiV3Adapter implements Adapter, OnModuleInit {

  public readonly guards = new Map();

  protected readonly basePaths: string[];
  protected readonly document: MiddlewareConfig['spec'];

  protected readonly paths: Map<string, _.PathItemObject> = new Map();
  protected readonly regPaths: Map<RegExp, _.PathItemObject> = new Map();

  constructor(
    @Inject(MiddlewareConfig) protected readonly options: MiddlewareConfig,
    private readonly errorService: ErrorService,
    private readonly guardFactory: AuthGuardFactory,
  ) {
    this.document = options.spec
    this.basePaths = uniq(this.document.servers.map(({url}) => parseUrl(url).pathname));

    for (const path of Object.keys(this.document.paths)) {
      for (const basePath of this.basePaths) {
        const p = `${trimEnd(basePath, '/')}/${trimStart(path, '/')}`;
        const r = p.replace(/(\{([a-z]+)\})/igm, '(?<$2>.+)');

        this.paths.set(p, this.document.paths[path]);
        this.regPaths.set(new RegExp(`^${r}$`, 'i'), this.document.paths[path]);
      }
    }
  }

  async onModuleInit() {
    for (const [name, scheme] of Object.entries(this.document?.components?.securitySchemes || {})) {
      this.guards.set(name, await this.guardFactory.create(scheme as _.SecuritySchemeObject));
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
