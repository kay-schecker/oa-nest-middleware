import { Inject, Injectable } from '@nestjs/common';
import { OpenAPIV3 as _ } from 'openapi-types';
import { Request } from 'express';
import { flattenDeep, trimEnd, trimStart, uniq } from 'lodash';

import { MiddlewareAdapter } from './middleware-adapter.interface';
import { MiddlewareConfig } from '../config/middleware-config.interface';
import { parse as parseUrl } from 'url';
import jsonpath from 'jsonpath';
import { MiddlewareErrorService } from '../error/middleware-error.service';

@Injectable()
export class MiddlewareDefaultAdapter implements MiddlewareAdapter {

  protected readonly basePaths: string[];
  protected readonly spec: MiddlewareConfig['spec'];

  protected readonly paths: Map<string, _.PathItemObject> = new Map();
  protected readonly regPaths: Map<RegExp, _.PathItemObject> = new Map();

  constructor(
    @Inject(MiddlewareConfig) protected readonly options: MiddlewareConfig,
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
  }

  getRequiredPermissionsByOperation(operation: _.OperationObject): string[] {
    if (!operation.security || operation.security.length < 1) {
      return;
    }

    return flattenDeep(operation.security.map((sec) => Object.values(sec)));
  }

  getRequiredPermissionsBySchema(schema: _.SchemaObject): string[] {
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

  getResponseContentTypeByRequest = (req: Request) => 'application/json';

  validateRequestHeaders(req: Request, operation: _.OperationObject) {
    // a content-type header was sent but unexpected
    this.errorService.throwIfTruthy(
      req.headers['content-type'] && !operation.requestBody,
      'reqBadHeader', req
    );

    if (operation.requestBody) {
      // the requested content-type is not supported
      this.errorService.throwIfFalsy(
        operation.requestBody[req.headers['content-type']],
        'reqBadContentType', req
      );
    }
  }

}
