import { Request } from 'express';
import { OpenAPIV3 as _ } from 'openapi-types';
import { AuthGuard } from '../auth/guard/auth-guard';

export const MiddlewareAdapter = Symbol('MiddlewareAdapter');

type ReturnType<T> = Promise<T> | T

export interface MiddlewareAdapter {

  guards: Map<string, AuthGuard>

  getOperationByRequest(req: Request): ReturnType<_.OperationObject>

  getResponseContentTypeByRequest(req: Request): ReturnType<string>

  // permissions
  getGrantedPermissionsByRequest(req: Request): ReturnType<string[]>

  getRequiredPermissionsBySchema(schema: _.SchemaObject): ReturnType<Map<string, string[]>>
  getRequiredPermissionsByOperation(operation: _.OperationObject): ReturnType<Map<string, string[]>>

  // validations
  validateRequestHeaders(req: Request, operation: _.OperationObject);

}
