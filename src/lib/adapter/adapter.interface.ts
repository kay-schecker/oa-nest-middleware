import { Request } from 'express';
import { AuthGuard } from '../auth/guard/auth-guard';

export const Adapter = Symbol('Adapter');

type ReturnType<T> = Promise<T> | T

export interface Adapter<Operation = unknown, Schema = unknown> {

  guards: Map<string, AuthGuard>

  getOperation(req: Request): ReturnType<Operation>

  getRequestBodySchema(req: Request, operation: Operation): ReturnType<Schema | undefined>

  getResponseContentTypeByRequest(req: Request): ReturnType<string>

  // permissions
  getGrantedPermissions(req: Request): ReturnType<string[]>

  getPropertyPermissions(schema: Schema): ReturnType<Map<string, Map<string, string[]>>>

  getOperationPermissions(operation: Operation): ReturnType<Map<string, string[]>>

  // validations
  validateRequestHeaders(req: Request, operation: Operation);

}
