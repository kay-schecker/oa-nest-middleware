import { Request } from 'express';

export abstract class MiddlewareAuthGuard<AuthenticationResult = unknown> {

  abstract async canHandle(req: Request): Promise<boolean>;

  abstract authenticate(req: Request): Promise<AuthenticationResult[] | false | undefined | null>;

  abstract getPermissions(req: AuthenticationResult[]): Promise<string[]>;
}
