import { Request } from 'express';
import { OpenAPIV3 as _ } from 'openapi-types';

export const MiddlewareAdapter = Symbol('MiddlewareAdapter');

type ReturnType<T> = Promise<T> | T | Promise<undefined> | undefined

export interface MiddlewareAdapter {

  getOperationByRequest(req: Request): ReturnType<_.OperationObject>

  getResponseContentTypeByRequest(req: Request): ReturnType<string>

  // permissions
  getGrantedPermissionsByRequest(req: Request): ReturnType<string[]>

  getRequiredPermissionsBySchema(schema: _.SchemaObject): ReturnType<string[]>

  getRequiredPermissionsByOperation(operation: _.OperationObject): ReturnType<string[]>

  // validations
  validateRequestHeaders(req: Request, operation: _.OperationObject);

}
