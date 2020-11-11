import * as cacheManager from 'cache-manager';
import { Request } from 'express';
import { JWKS, JWT } from 'jose';
import { compact, flatten, startsWith } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { Client, Issuer, } from 'openid-client';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthGuard } from './auth-guard';
import OpenIdSecurityScheme = OpenAPIV3.OpenIdSecurityScheme;

const ttl = 300;

export class OpenIdConnectAuthGuard extends AuthGuard<OpenIdSecurityScheme, JWT.completeResult> {

  public static readonly type = 'openIdConnect';

  private description: string;
  private openIdConnectUrl: string;

  private client: Observable<Issuer<Client>>;
  private keystore: Observable<JWKS.KeyStore>;

  private readonly jwtCache = cacheManager.caching({store: 'memory', max: 100, ttl})

  async init(cfg: OpenIdSecurityScheme) {
    this.description = cfg.description;
    this.openIdConnectUrl = cfg.openIdConnectUrl;
    this.client = of(this.openIdConnectUrl).pipe(
      switchMap(connectUrl => Issuer.discover(connectUrl)),
    )

    this.keystore = this.client.pipe(
      switchMap(client => client.keystore()),
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
      const cachedJWT = await this.jwtCache.get(jwt);

      if (cachedJWT !== undefined) {
        return cachedJWT;
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

}
