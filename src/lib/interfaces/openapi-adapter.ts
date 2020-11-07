import { Request } from 'express';
import { OpenAPIV3 as _ } from 'openapi-types';

export const OpenApiAdapter = Symbol('OpenApiAdapter');

type ReturnType<T> = Promise<T> | T

export interface OpenApiAdapter {

  getOperationByRequest(req: Request): ReturnType<_.OperationObject>
  getRequiredPermissionsBySchema(schema: _.SchemaObject): ReturnType<string[]>
  getRequiredPermissionsByOperation(operation: _.OperationObject): ReturnType<string[]>

  getResponseContentTypeByRequest(req: Request): ReturnType<string>

}
