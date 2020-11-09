import { OpenAPIV3 as _ } from 'openapi-types';
import { Client, Issuer, } from 'openid-client';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Request } from 'express';
import { JWKS, JWT } from 'jose';
import { MiddlewareAuthGuard } from './middleware-auth-guard';
import { compact, startsWith, flatten } from 'lodash';
import * as cacheManager from 'cache-manager';


type Config = _.OpenIdSecurityScheme;
const ttl = 300;

export class OpenIdConnectAuthGuard extends MiddlewareAuthGuard<JWT.completeResult> {

  public static readonly type = 'openIdConnect';

  public readonly description: string;
  public readonly openIdConnectUrl: string;

  private readonly client: Observable<Issuer<Client>>;
  private readonly keystore: Observable<JWKS.KeyStore>;
  private readonly jwtCache = cacheManager.caching({store: 'memory', max: 100, ttl})

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

    this.keystore = this.client.pipe(
      switchMap(client => client.keystore())
    );
  }

  async canHandle(req) {
    if (typeof req.headers.authorization !== 'string') {
      return false
    }

    const authorizations = this.getAuthorizations(req).filter(a => startsWith(a.toLowerCase(), 'bearer'))
    return authorizations.length > 0
  }

  async authenticate(req: Request) {
    const res = await Promise.all((await this.getJWTs(req)).map(async (jwt) => {
      const cachedItem = await this.jwtCache.get(jwt);

      if (cachedItem !== undefined) {
        return cachedItem;
      }

      try {
        const res = JWT.verify(jwt, await this.keystore.toPromise(), {complete: true});
        await this.jwtCache.set(jwt, res, {ttl});
        return res;
      } catch (e) {
        await this.jwtCache.set(jwt, null, {ttl});
        return null;
      }
    }));

    return compact(res)
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
