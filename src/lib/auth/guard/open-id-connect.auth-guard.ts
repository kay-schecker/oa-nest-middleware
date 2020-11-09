import { OpenAPIV3 as _ } from 'openapi-types';
import { Client, Issuer, } from 'openid-client';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Request } from 'express';
import { JWT } from 'jose';
import { MiddlewareAuthGuard } from './middleware-auth-guard';
import { compact, startsWith, flatten } from 'lodash';

type Config = _.OpenIdSecurityScheme;

export class OpenIdConnectAuthGuard extends MiddlewareAuthGuard<JWT.completeResult> {

  public static readonly type = 'openIdConnect';

  public readonly description: string;
  public readonly openIdConnectUrl: string;

  private readonly client: Observable<Issuer<Client>>;
  private readonly jwksClient: Observable<Issuer<Client>>;

  public static async factory(cfg: _.OpenIdSecurityScheme) {
    return new OpenIdConnectAuthGuard({...cfg})
  }

  constructor(cfg: Config) {
    super()
    this.description = cfg.description;
    this.openIdConnectUrl = cfg.openIdConnectUrl;
    this.client = of(this.openIdConnectUrl).pipe(
      switchMap(connectUrl => Issuer.discover(connectUrl)),
    )
  }

  async canHandle(req) {
    if (typeof req.headers.authorization !== 'string') {
      return false
    }

    const authorizations = this.getAuthorizations(req).filter(a => startsWith(a.toLowerCase(), 'bearer'))
    return authorizations.length > 0
  }

  async authenticate(req: Request) {
    const client = await this.client.toPromise();
    const keystore = await client.keystore();
    const tokens = await this.getJWTs(req);

    return compact(tokens.map((jwt) => {
      try {
        return JWT.verify(jwt, keystore, {complete: true});
      } catch (e) {
        return null;
      }
    }))
  }

  async getPermissions(auth): Promise<string[]> {
    return flatten(auth.map(a => a.payload.permissions));
  }

  protected getAuthorizations(req: Request) {
    return req.headers.authorization.split(',')
  }

  protected getJWTs(req: Request) {
    return this.getAuthorizations(req).map(a => a.replace(/bearer/i, '').trim());
  }

  protected async getVerifiedJWTs(req: Request) {

    const client = await this.client.toPromise();
    const keystore = await client.keystore();
    const jwts = await this.getJWTs(req);

    return compact(jwts.map((jwt) => {
      try {
        return JWT.verify(jwt, keystore, {complete: true});
      } catch (e) {
        return null;
      }
    }))

  }

}
