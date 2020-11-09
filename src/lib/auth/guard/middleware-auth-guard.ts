import { Request } from 'express';
import { OpenAPIV3 } from 'openapi-types';

export abstract class MiddlewareAuthGuard<AuthenticationResult = unknown> {

  abstract async init(scheme: OpenAPIV3.SecuritySchemeObject);

  abstract async canHandle(req: Request): Promise<boolean>;

  abstract authenticate(req: Request): Promise<AuthenticationResult[] | false | undefined | null>;

  abstract getPermissions(req: AuthenticationResult[]): Promise<string[]>;
}
