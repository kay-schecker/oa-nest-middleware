import { Request } from 'express';

export abstract class AuthGuard<Config = unknown, AuthenticationResult = unknown> {

  abstract async init(config: Config);

  abstract async canHandle(req: Request): Promise<boolean>;

  abstract authenticate(req: Request): Promise<AuthenticationResult[] | false | undefined | null>;

  abstract getPermissions(req: AuthenticationResult[]): Promise<string[]>;

}
