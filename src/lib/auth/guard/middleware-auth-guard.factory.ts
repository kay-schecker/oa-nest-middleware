import { Request } from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { OpenIdConnectAuthGuard } from './open-id-connect.auth-guard';

export class MiddlewareAuthGuardFactory {

  public static factory(cfg: OpenAPIV3.SecuritySchemeObject) {
    switch (cfg.type) {
      case 'openIdConnect':
        return OpenIdConnectAuthGuard.factory(cfg);
      default:
        throw new Error(`Security scheme of type "${cfg.type}" currently not supported, please open a pull request`)
    }
  }

}
