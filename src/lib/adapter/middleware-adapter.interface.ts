import { Request } from 'express';
import { OpenAPIV3 as _ } from 'openapi-types';

export const MiddlewareAdapter = Symbol('MiddlewareAdapter');

type ReturnType<T> = Promise<T> | T

export interface MiddlewareAdapter {

  getOperationByRequest(req: Request): ReturnType<_.OperationObject>
  getRequiredPermissionsBySchema(schema: _.SchemaObject): ReturnType<string[]>
  getRequiredPermissionsByOperation(operation: _.OperationObject): ReturnType<string[]>

  getResponseContentTypeByRequest(req: Request): ReturnType<string>

}
